#include <iostream>
#include <fstream>
#include <string>
#include <unordered_map>
#include <vector>

#include "algorithms.hpp"
#include "graph.hpp"
#include "httplib.h"
#include "impact.hpp"
#include "json.hpp"

int main() {
  PropertyGraph graph;

  std::unordered_map<std::string, nlohmann::json> experience_lookup;
  try {
    std::ifstream exp_file("data/experiences.json");
    if (!exp_file.is_open()) {
      exp_file.open("engine/data/experiences.json");
    }
    if (exp_file.is_open()) {
      nlohmann::json experiences = nlohmann::json::parse(exp_file);
      if (experiences.is_array()) {
        for (const auto& exp : experiences) {
          if (!exp.is_object() || !exp.contains("id") || !exp["id"].is_string()) {
            continue;
          }

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
              if (pw[i].is_number()) {
                graph.set_node_prop(id, "personality_weight_" + std::to_string(i), pw[i].get<double>());
              }
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
    }
  } catch (...) {
    // Keep server boot resilient; /graph/match can still return an empty list.
  }

  auto ranks = pagerank(graph);
  auto dist = dijkstra(graph, "village_a");
  auto labels = label_propagation(graph);

  std::vector<ImpactRecord> records = {
      {"village_a", 0.8, 0.7, 0.9},
      {"village_b", 0.6, 0.8, 0.75},
  };

  double cws = compute_cws(records);

  httplib::Server svr;
  svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("{\"status\":\"ok\"}", "application/json");
  });

  svr.Get("/metrics", [cws](const httplib::Request&, httplib::Response& res) {
    nlohmann::json payload;
    payload["cws"] = cws;
    res.set_content(payload.dump(), "application/json");
  });

  svr.Post("/graph/match",
           [&graph, &experience_lookup](const httplib::Request& req, httplib::Response& res) {
             try {
               nlohmann::json payload = nlohmann::json::parse(req.body);
               if (!payload.contains("personality_vector") ||
                   !payload["personality_vector"].is_array()) {
                 res.status = 400;
                 res.set_content(
                     "{\"error\":\"personality_vector must be an array\"}",
                     "application/json");
                 return;
               }

               std::vector<double> pv;
               for (const auto& x : payload["personality_vector"]) {
                 if (!x.is_number()) {
                   res.status = 400;
                   res.set_content(
                       "{\"error\":\"personality_vector must contain only numbers\"}",
                       "application/json");
                   return;
                 }
                 pv.push_back(x.get<double>());
               }

               auto ranked = personalized_pagerank(graph, pv, 0.15, 30, 10);

               nlohmann::json out = nlohmann::json::array();
               for (const auto& [id, score] : ranked) {
                 auto it = experience_lookup.find(id);
                 if (it == experience_lookup.end()) {
                   continue;
                 }

                 const auto& src = it->second;
                 nlohmann::json item;
                 item["id"] = id;
                 item["score"] = score;
                 if (src.contains("name") && src["name"].is_string()) {
                   item["name"] = src["name"];
                 } else if (src.contains("title") && src["title"].is_string()) {
                   item["name"] = src["title"];
                 } else {
                   item["name"] = "";
                 }
                 item["village_id"] =
                     (src.contains("village_id") && src["village_id"].is_string())
                         ? src["village_id"]
                         : nlohmann::json("");
                 item["type"] =
                     (src.contains("type") && src["type"].is_string())
                         ? src["type"]
                         : nlohmann::json("");
                 item["personality_weights"] =
                     (src.contains("personality_weights") && src["personality_weights"].is_array())
                         ? src["personality_weights"]
                         : nlohmann::json::array();
                 item["price_eur"] =
                     (src.contains("price_eur") && src["price_eur"].is_number())
                         ? src["price_eur"]
                         : nlohmann::json(0.0);

                 out.push_back(item);
               }

               res.status = 200;
               res.set_content(out.dump(), "application/json");
             } catch (...) {
               res.status = 400;
               res.set_content("{\"error\":\"invalid json\"}",
                               "application/json");
             }
           });

  std::cout << "Engine bootstrap complete" << std::endl;
  std::cout << "Nodes: " << graph.nodes().size() << std::endl;
  std::cout << "Ranks: " << ranks.size() << std::endl;
  std::cout << "Distances: " << dist.size() << std::endl;
  std::cout << "Labels: " << labels.size() << std::endl;

  std::cout << "Listening on 0.0.0.0:8081" << std::endl;
  svr.listen("0.0.0.0", 8081);
  return 0;
}
