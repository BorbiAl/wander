#include <iostream>
#include <fstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
#include <atomic>
#include <mutex>
#include <random>
#include <set>

#include "algorithms.hpp"
#include "graph.hpp"
#include "httplib.h"
#include "impact.hpp"
#include "json.hpp"

using json = nlohmann::json;

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
static std::unordered_map<std::string, json> experience_lookup;
static std::unordered_map<std::string, json> village_lookup;
static std::unordered_map<std::string, int>  village_cws_delta;
static std::mutex cws_mutex;
static std::atomic<int> booking_counter{1};

// Leaderboard: userId -> {score, bookings, villages}
struct UserScore {
  std::string user_id;
  int score = 0;
  int bookings = 0;
  std::unordered_set<std::string> villages;
};
static std::unordered_map<std::string, UserScore> leaderboard;
static std::mutex leaderboard_mutex;

// WebSocket client registry
static std::set<httplib::ws::WebSocket*> ws_clients;
static std::mutex ws_mutex;

static void broadcast_impact(const json& impact) {
  json msg;
  msg["type"] = "IMPACT_UPDATE";
  msg["data"] = impact;
  const std::string text = msg.dump();
  std::lock_guard<std::mutex> lk(ws_mutex);
  for (auto* ws : ws_clients) {
    ws->send(text);
  }
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
static void load_data(PropertyGraph& graph) {
  std::unordered_set<std::string> village_ids;

  for (const auto& path : {"data/villages.json", "engine/data/villages.json"}) {
    std::ifstream f(path);
    if (!f.is_open()) continue;
    json villages;
    try { villages = json::parse(f); } catch (...) { break; }
    if (!villages.is_array()) break;
    for (const auto& v : villages) {
      if (!v.is_object() || !v.contains("id") || !v["id"].is_string()) continue;
      const std::string id = v["id"].get<std::string>();
      village_ids.insert(id);
      village_lookup[id] = v;
      graph.add_node(id);
      graph.set_node_prop(id, "is_experience", 0.0);
      if (v.contains("cws_base") && v["cws_base"].is_number())
        graph.set_node_prop(id, "cws_base", v["cws_base"].get<double>());
    }
    break;
  }

  for (const auto& path : {"data/experiences.json", "engine/data/experiences.json"}) {
    std::ifstream f(path);
    if (!f.is_open()) continue;
    json experiences;
    try { experiences = json::parse(f); } catch (...) { break; }
    if (!experiences.is_array()) break;
    for (const auto& exp : experiences) {
      if (!exp.is_object() || !exp.contains("id") || !exp["id"].is_string()) continue;
      const std::string id = exp["id"].get<std::string>();
      const std::string vid =
          (exp.contains("village_id") && exp["village_id"].is_string())
              ? exp["village_id"].get<std::string>() : "";

      graph.add_node(id);
      graph.set_node_prop(id, "is_experience", 1.0);

      if (exp.contains("personality_weights") && exp["personality_weights"].is_array()) {
        const auto& pw = exp["personality_weights"];
        for (std::size_t i = 0; i < pw.size(); ++i)
          if (pw[i].is_number())
            graph.set_node_prop(id, "personality_weight_" + std::to_string(i), pw[i].get<double>());
      }

      if (!vid.empty()) {
        if (village_ids.find(vid) == village_ids.end()) {
          graph.add_node(vid);
          graph.set_node_prop(vid, "is_experience", 0.0);
        }
        graph.add_edge(vid, id, 1.0);
        graph.add_edge(id, vid, 1.0);
      }

      experience_lookup[id] = exp;
    }
    break;
  }
}

// ---------------------------------------------------------------------------
// CWS helper
// ---------------------------------------------------------------------------
static int get_cws(const std::string& vid) {
  int base = 0;
  auto it = village_lookup.find(vid);
  if (it != village_lookup.end() && it->second.contains("cws_base") && it->second["cws_base"].is_number())
    base = it->second["cws_base"].get<int>();
  std::lock_guard<std::mutex> lk(cws_mutex);
  auto dit = village_cws_delta.find(vid);
  return base + (dit != village_cws_delta.end() ? dit->second : 0);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
int main() {
  PropertyGraph graph;
  load_data(graph);

  auto ranks  = pagerank(graph);
  auto labels = label_propagation(graph);
  const std::string src = village_lookup.empty()
      ? (graph.nodes().empty() ? "" : graph.nodes().begin()->first)
      : village_lookup.begin()->first;
  auto dist = src.empty() ? std::unordered_map<std::string, double>{} : dijkstra(graph, src);

  std::cout << "Engine bootstrap complete" << std::endl;
  std::cout << "Villages: " << village_lookup.size()
            << "  Experiences: " << experience_lookup.size()
            << "  Nodes: " << graph.nodes().size() << std::endl;

  httplib::Server svr;
  svr.set_default_headers({{"Access-Control-Allow-Origin", "*"}});

  // ---- WebSocket /ws -------------------------------------------------------
  svr.WebSocket("/ws",
    [](const httplib::Request&, httplib::ws::WebSocket& ws) {
      {
        std::lock_guard<std::mutex> lk(ws_mutex);
        ws_clients.insert(&ws);
      }
      std::cout << "WS client connected (" << ws_clients.size() << " total)" << std::endl;

      // Keep alive: read until the client disconnects
      std::string payload;
      while (ws.read(payload) != httplib::ReadResult::Fail) {
        // ping/pong handled by httplib; ignore other messages
      }

      {
        std::lock_guard<std::mutex> lk(ws_mutex);
        ws_clients.erase(&ws);
      }
      std::cout << "WS client disconnected (" << ws_clients.size() << " remaining)" << std::endl;
    });

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
        for (const auto& x : payload["personality_vector"])
          pv.push_back(x.is_number() ? x.get<double>() : 0.0);

        auto ranked = personalized_pagerank(graph, pv, 0.15, 30, 10);

        json out = json::array();
        for (const auto& [id, score] : ranked) {
          auto it = experience_lookup.find(id);
          if (it == experience_lookup.end()) continue;
          const auto& src = it->second;
          json item;
          item["id"]                  = id;
          item["score"]               = score;
          item["name"]                = src.value("title", src.value("name", ""));
          item["village_id"]          = src.value("village_id", "");
          item["type"]                = src.value("type", "");
          item["price_eur"]           = src.value("price_eur", 0.0);
          item["description"]         = src.value("description", "");
          item["tags"]                = src.contains("tags") ? src["tags"] : json::array();
          item["personality_weights"] = src.contains("personality_weights")
                                        ? src["personality_weights"] : json::array();
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
        json payload    = json::parse(req.body);
        const std::string exp_id  = payload.value("experience_id", "");
        const double amount_eur   = payload.value("amount_eur", 0.0);
        const std::string user_id = payload.value("user_id", "anonymous");

        auto eit = experience_lookup.find(exp_id);
        if (eit == experience_lookup.end()) {
          res.status = 404;
          res.set_content("{\"error\":\"experience not found\"}", "application/json");
          return;
        }
        const json& exp = eit->second;
        const std::string vid = exp.value("village_id", "");

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

        int cws_delta = static_cast<int>((community_pct + culture_pct) * amount_eur / 2.0);
        {
          std::lock_guard<std::mutex> lk(cws_mutex);
          village_cws_delta[vid] += cws_delta;
        }

        // Score = 10 base + bonus for low-CWS villages (frontier villages score more)
        auto vit = village_lookup.find(vid);
        int cws_base = (vit != village_lookup.end() && vit->second.contains("cws_base"))
                       ? vit->second["cws_base"].get<int>() : 50;
        int booking_score = 10 + std::max(0, (100 - cws_base) / 5);

        {
          std::lock_guard<std::mutex> lk(leaderboard_mutex);
          auto& entry = leaderboard[user_id];
          entry.user_id = user_id;
          entry.score   += booking_score;
          entry.bookings += 1;
          entry.villages.insert(vid);
        }

        int bid = booking_counter.fetch_add(1);
        json impact;
        impact["booking_id"]    = bid;
        impact["experience_id"] = exp_id;
        impact["village_id"]    = vid;
        impact["amount_eur"]    = amount_eur;
        impact["money_flow"]    = money_flow;
        impact["cws_before"]    = get_cws(vid) - cws_delta;
        impact["cws_after"]     = get_cws(vid);
        impact["cws_delta"]     = cws_delta;
        impact["user_id"]       = user_id;
        impact["score_earned"]  = booking_score;

        broadcast_impact(impact);

        res.set_content(impact.dump(), "application/json");
      } catch (...) {
        res.status = 400;
        res.set_content("{\"error\":\"invalid json\"}", "application/json");
      }
    });

  // ---- GET /graph/villages (all villages with live CWS) -------------------
  svr.Get("/graph/villages",
    [](const httplib::Request&, httplib::Response& res) {
      json out = json::array();
      for (const auto& [vid, v] : village_lookup) {
        json entry = v;
        entry["cws"] = get_cws(vid);
        out.push_back(entry);
      }
      res.set_content(out.dump(), "application/json");
    });

  // ---- GET /graph/experiences (all experiences) ---------------------------
  svr.Get("/graph/experiences",
    [](const httplib::Request&, httplib::Response& res) {
      json out = json::array();
      for (const auto& [eid, exp] : experience_lookup)
        out.push_back(exp);
      res.set_content(out.dump(), "application/json");
    });

  // ---- GET /graph/village/:id ---------------------------------------------
  svr.Get("/graph/village/:id",
    [](const httplib::Request& req, httplib::Response& res) {
      const std::string id = req.path_params.at("id");
      auto vit = village_lookup.find(id);
      if (vit == village_lookup.end()) {
        res.status = 404;
        res.set_content("{\"error\":\"village not found\"}", "application/json");
        return;
      }
      json out = vit->second;
      out["cws"] = get_cws(id);
      json exps = json::array();
      for (const auto& [eid, exp] : experience_lookup)
        if (exp.value("village_id", "") == id) exps.push_back(exp);
      out["experiences"] = exps;
      res.set_content(out.dump(), "application/json");
    });

  // ---- GET /graph/leaderboard ---------------------------------------------
  svr.Get("/graph/leaderboard",
    [](const httplib::Request&, httplib::Response& res) {
      std::vector<json> entries;
      {
        std::lock_guard<std::mutex> lk(leaderboard_mutex);
        for (const auto& [uid, u] : leaderboard) {
          json e;
          e["user_id"]       = uid;
          e["score"]         = u.score;
          e["bookings"]      = u.bookings;
          e["villages_count"] = static_cast<int>(u.villages.size());
          entries.push_back(e);
        }
      }
      std::sort(entries.begin(), entries.end(),
        [](const json& a, const json& b) { return a["score"].get<int>() > b["score"].get<int>(); });
      json out = json::array();
      for (std::size_t i = 0; i < std::min(entries.size(), std::size_t(10)); ++i)
        out.push_back(entries[i]);
      res.set_content(out.dump(), "application/json");
    });

  // ---- GET /graph/clusters ------------------------------------------------
  svr.Get("/graph/clusters",
    [](const httplib::Request&, httplib::Response& res) {
      std::unordered_map<std::string, json> clusters;
      for (const auto& [vid, v] : village_lookup) {
        const std::string cid = v.value("cluster_id", "unknown");
        if (!clusters.count(cid)) clusters[cid] = json::array();
        clusters[cid].push_back(vid);
      }
      json out = json::array();
      for (const auto& [cid, vids] : clusters)
        out.push_back({{"id", cid}, {"villages", vids}});
      res.set_content(out.dump(), "application/json");
    });

  // ---- GET /graph/export (for D3 knowledge graph visualization) -----------
  svr.Get("/graph/export",
    [&graph](const httplib::Request&, httplib::Response& res) {
      json nodes_arr = json::array();
      json edges_arr = json::array();

      for (const auto& [id, node] : graph.nodes()) {
        json n;
        n["id"] = id;
        auto vit = village_lookup.find(id);
        auto eit = experience_lookup.find(id);
        if (vit != village_lookup.end()) {
          n["type"]  = "village";
          n["name"]  = vit->second.value("name", id);
          n["cws"]   = get_cws(id);
          n["region"] = vit->second.value("region", "");
        } else if (eit != experience_lookup.end()) {
          n["type"]  = "experience";
          n["name"]  = eit->second.value("title", eit->second.value("name", id));
          n["exp_type"] = eit->second.value("type", "");
        } else {
          n["type"] = "unknown";
          n["name"] = id;
        }
        nodes_arr.push_back(n);
      }

      for (const auto& e : graph.edges()) {
        json edge;
        edge["source"] = e.from;
        edge["target"] = e.to;
        edge["weight"] = e.weight;
        edges_arr.push_back(edge);
      }

      json out;
      out["nodes"] = nodes_arr;
      out["edges"] = edges_arr;
      res.set_content(out.dump(), "application/json");
    });

  std::cout << "Listening on 0.0.0.0:8081" << std::endl;
  svr.listen("0.0.0.0", 8081);
  return 0;
}
