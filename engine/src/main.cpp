#include <iostream>
#include <fstream>
#include <string>
#include <unordered_map>
#include <vector>
#include <atomic>
#include <mutex>
#include <random>

#include "algorithms.hpp"
#include "graph.hpp"
#include "httplib.h"
#include "impact.hpp"
#include "json.hpp"

using json = nlohmann::json;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
static std::string find_data_file(const std::string& name) {
  for (const auto& prefix : {"data/", "engine/data/"}) {
    std::ifstream f(prefix + name);
    if (f.is_open()) return prefix + name;
  }
  return "";
}

static json load_json_array(const std::string& name) {
  const std::string path = find_data_file(name);
  if (path.empty()) return json::array();
  std::ifstream f(path);
  try { return json::parse(f); } catch (...) { return json::array(); }
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
static std::unordered_map<std::string, json> experience_lookup;  // id → full exp JSON
static std::unordered_map<std::string, json> village_lookup;     // id → full village JSON
// per-village dynamic CWS delta (incremented on each booking)
static std::unordered_map<std::string, std::atomic<int>> village_cws_delta;
static std::mutex cws_mutex;

static std::atomic<int> booking_counter{1};

// ---------------------------------------------------------------------------
// Build graph + lookup maps
// ---------------------------------------------------------------------------
static void load_data(PropertyGraph& graph) {
  // --- villages ---
  json villages = load_json_array("villages.json");
  for (const auto& v : villages) {
    if (!v.is_object() || !v.contains("id") || !v["id"].is_string()) continue;
    const std::string id = v["id"].get<std::string>();
    village_lookup[id] = v;
    graph.add_node(id);
    graph.set_node_prop(id, "is_experience", 0.0);
    if (v.contains("cws_base") && v["cws_base"].is_number()) {
      graph.set_node_prop(id, "cws_base", v["cws_base"].get<double>());
    }
  }

  // --- experiences ---
  json experiences = load_json_array("experiences.json");
  for (const auto& exp : experiences) {
    if (!exp.is_object() || !exp.contains("id") || !exp["id"].is_string()) continue;
    const std::string id = exp["id"].get<std::string>();
    const std::string village_id =
        (exp.contains("village_id") && exp["village_id"].is_string())
            ? exp["village_id"].get<std::string>()
            : "";

    graph.add_node(id);
    graph.set_node_prop(id, "is_experience", 1.0);

    if (exp.contains("personality_weights") && exp["personality_weights"].is_array()) {
      const auto& pw = exp["personality_weights"];
      for (std::size_t i = 0; i < pw.size(); ++i) {
        if (pw[i].is_number())
          graph.set_node_prop(id, "personality_weight_" + std::to_string(i), pw[i].get<double>());
      }
    }

    if (!village_id.empty()) {
      graph.add_node(village_id);
      graph.set_node_prop(village_id, "is_experience", 0.0);
      graph.add_edge(village_id, id, 1.0);
    }

    experience_lookup[id] = exp;
  }
}

// ---------------------------------------------------------------------------
// CWS helper
// ---------------------------------------------------------------------------
static int get_cws(const std::string& village_id) {
  int base = 0;
  auto vit = village_lookup.find(village_id);
  if (vit != village_lookup.end() && vit->second.contains("cws_base") && vit->second["cws_base"].is_number())
    base = vit->second["cws_base"].get<int>();
  std::lock_guard<std::mutex> lk(cws_mutex);
  auto dit = village_cws_delta.find(village_id);
  int delta = (dit != village_cws_delta.end()) ? dit->second.load() : 0;
  return base + delta;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
int main() {
  PropertyGraph graph;
  load_data(graph);

  // Pre-compute baseline ranks (used for diagnostics only)
  auto ranks  = pagerank(graph);
  auto labels = label_propagation(graph);

  std::cout << "Engine bootstrap complete" << std::endl;
  std::cout << "Villages: " << village_lookup.size()
            << "  Experiences: " << experience_lookup.size()
            << "  Nodes: " << graph.nodes().size() << std::endl;

  httplib::Server svr;
  svr.set_default_headers({{"Access-Control-Allow-Origin", "*"}});

  // ---- GET /health --------------------------------------------------------
  svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("{\"status\":\"ok\"}", "application/json");
  });

  // ---- POST /graph/match --------------------------------------------------
  svr.Post("/graph/match",
    [&graph](const httplib::Request& req, httplib::Response& res) {
      try {
        json payload = json::parse(req.body);
        if (!payload.contains("personality_vector") || !payload["personality_vector"].is_array()) {
          res.status = 400;
          res.set_content("{\"error\":\"personality_vector required\"}", "application/json");
          return;
        }
        std::vector<double> pv;
        for (const auto& x : payload["personality_vector"]) {
          if (!x.is_number()) { pv.push_back(0.0); continue; }
          pv.push_back(x.get<double>());
        }

        auto ranked = personalized_pagerank(graph, pv, 0.15, 30, 10);

        json out = json::array();
        for (const auto& [id, score] : ranked) {
          auto it = experience_lookup.find(id);
          if (it == experience_lookup.end()) continue;
          const auto& src = it->second;
          json item;
          item["id"]    = id;
          item["score"] = score;
          item["name"]  = src.value("title", src.value("name", ""));
          item["village_id"]          = src.value("village_id", "");
          item["type"]                = src.value("type", "");
          item["price_eur"]           = src.value("price_eur", 0.0);
          item["personality_weights"] = src.contains("personality_weights")
                                        ? src["personality_weights"] : json::array();
          item["description"]         = src.value("description", "");
          item["tags"]                = src.contains("tags") ? src["tags"] : json::array();
          out.push_back(item);
        }
        res.set_content(out.dump(), "application/json");
      } catch (...) {
        res.status = 400;
        res.set_content("{\"error\":\"invalid json\"}", "application/json");
      }
    });

  // ---- POST /graph/book ---------------------------------------------------
  svr.Post("/graph/book",
    [](const httplib::Request& req, httplib::Response& res) {
      try {
        json payload = json::parse(req.body);
        const std::string exp_id  = payload.value("experience_id", "");
        const double amount_eur   = payload.value("amount_eur", 0.0);

        auto eit = experience_lookup.find(exp_id);
        if (eit == experience_lookup.end()) {
          res.status = 404;
          res.set_content("{\"error\":\"experience not found\"}", "application/json");
          return;
        }
        const json& exp = eit->second;
        const std::string village_id = exp.value("village_id", "");

        // --- money split ---
        json split_def = exp.contains("impact_split") ? exp["impact_split"] : json::object();
        double host_pct      = split_def.value("host",      0.70);
        double community_pct = split_def.value("community", 0.15);
        double culture_pct   = split_def.value("culture",   0.10);
        double platform_pct  = split_def.value("platform",  0.05);

        json money_flow;
        money_flow["host"]      = amount_eur * host_pct;
        money_flow["community"] = amount_eur * community_pct;
        money_flow["culture"]   = amount_eur * culture_pct;
        money_flow["platform"]  = amount_eur * platform_pct;

        // --- CWS delta: community + culture portions count toward village wellness ---
        int cws_increment = static_cast<int>((community_pct + culture_pct) * amount_eur / 2.0);
        {
          std::lock_guard<std::mutex> lk(cws_mutex);
          village_cws_delta[village_id] += cws_increment;
        }

        int booking_id = booking_counter.fetch_add(1);

        json impact;
        impact["booking_id"]  = booking_id;
        impact["experience_id"] = exp_id;
        impact["village_id"]  = village_id;
        impact["amount_eur"]  = amount_eur;
        impact["money_flow"]  = money_flow;
        impact["cws_before"]  = get_cws(village_id) - cws_increment;
        impact["cws_after"]   = get_cws(village_id);
        impact["cws_delta"]   = cws_increment;

        // Broadcast to stdout (WebSocket stub — replace with real WS in Phase 3)
        std::cout << "IMPACT_UPDATE:" << impact.dump() << std::endl;

        res.set_content(impact.dump(), "application/json");
      } catch (...) {
        res.status = 400;
        res.set_content("{\"error\":\"invalid json\"}", "application/json");
      }
    });

  // ---- GET /graph/village/:id ---------------------------------------------
  svr.Get("/graph/village/:id",
    [&graph](const httplib::Request& req, httplib::Response& res) {
      const std::string id = req.path_params.at("id");

      auto vit = village_lookup.find(id);
      if (vit == village_lookup.end()) {
        res.status = 404;
        res.set_content("{\"error\":\"village not found\"}", "application/json");
        return;
      }

      json out = vit->second;
      out["cws"] = get_cws(id);

      // Collect experiences for this village
      json exps = json::array();
      for (const auto& [eid, exp] : experience_lookup) {
        if (exp.value("village_id", "") == id) {
          exps.push_back(exp);
        }
      }
      out["experiences"] = exps;

      res.set_content(out.dump(), "application/json");
    });

  // ---- GET /graph/leaderboard (stub — Phase 3) ----------------------------
  svr.Get("/graph/leaderboard",
    [](const httplib::Request&, httplib::Response& res) {
      // Will be populated once booking history is tracked per user (Phase 3)
      res.set_content("[]", "application/json");
    });

  // ---- GET /graph/clusters ------------------------------------------------
  svr.Get("/graph/clusters",
    [](const httplib::Request&, httplib::Response& res) {
      // Group villages by cluster_id
      std::unordered_map<std::string, json> clusters;
      for (const auto& [vid, v] : village_lookup) {
        const std::string cid = v.value("cluster_id", "unknown");
        if (!clusters.count(cid)) clusters[cid] = json::array();
        clusters[cid].push_back(vid);
      }
      json out = json::array();
      for (const auto& [cid, vids] : clusters) {
        out.push_back({{"id", cid}, {"villages", vids}});
      }
      res.set_content(out.dump(), "application/json");
    });

  std::cout << "Listening on 0.0.0.0:8081" << std::endl;
  svr.listen("0.0.0.0", 8081);
  return 0;
}
