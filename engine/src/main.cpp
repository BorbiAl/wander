#include <iostream>
#include <string>
#include <vector>

#include "algorithms.hpp"
#include "graph.hpp"
#include "httplib.h"
#include "impact.hpp"
#include "json.hpp"

int main() {
  PropertyGraph graph;
  graph.add_edge("village_a", "exp_1", 1.0);
  graph.add_edge("village_b", "exp_2", 1.0);

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

  std::cout << "Engine bootstrap complete" << std::endl;
  std::cout << "Nodes: " << graph.nodes().size() << std::endl;
  std::cout << "Ranks: " << ranks.size() << std::endl;
  std::cout << "Distances: " << dist.size() << std::endl;
  std::cout << "Labels: " << labels.size() << std::endl;
  return 0;
}
