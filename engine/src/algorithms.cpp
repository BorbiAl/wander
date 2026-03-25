#include "algorithms.hpp"

#include <limits>
#include <queue>

std::unordered_map<std::string, double> pagerank(const PropertyGraph& graph, int iterations, double damping) {
  std::unordered_map<std::string, double> rank;
  const auto& nodes = graph.nodes();
  if (nodes.empty()) {
    return rank;
  }

  const double init = 1.0 / static_cast<double>(nodes.size());
  for (const auto& [id, node] : nodes) {
    rank[id] = init;
  }

  for (int step = 0; step < iterations; ++step) {
    std::unordered_map<std::string, double> next;
    for (const auto& [id, node] : nodes) {
      next[id] = (1.0 - damping) / static_cast<double>(nodes.size());
    }

    for (const auto& [id, node] : nodes) {
      auto nbrs = graph.neighbors(id);
      if (nbrs.empty()) {
        continue;
      }
      const double share = rank[id] * damping / static_cast<double>(nbrs.size());
      for (const auto& to : nbrs) {
        next[to] += share;
      }
    }
    rank.swap(next);
  }

  return rank;
}

std::unordered_map<std::string, double> dijkstra(const PropertyGraph& graph, const std::string& source) {
  std::unordered_map<std::string, double> dist;
  for (const auto& [id, node] : graph.nodes()) {
    dist[id] = std::numeric_limits<double>::infinity();
  }
  if (dist.find(source) == dist.end()) {
    return dist;
  }

  using Item = std::pair<double, std::string>;
  std::priority_queue<Item, std::vector<Item>, std::greater<Item>> pq;
  dist[source] = 0.0;
  pq.push({0.0, source});

  while (!pq.empty()) {
    auto [cost, at] = pq.top();
    pq.pop();
    if (cost > dist[at]) {
      continue;
    }

    for (const auto& e : graph.edges()) {
      if (e.from != at) {
        continue;
      }
      const double next = cost + e.weight;
      if (next < dist[e.to]) {
        dist[e.to] = next;
        pq.push({next, e.to});
      }
    }
  }

  return dist;
}

std::unordered_map<std::string, int> label_propagation(const PropertyGraph& graph, int) {
  std::unordered_map<std::string, int> labels;
  int idx = 0;
  for (const auto& [id, node] : graph.nodes()) {
    labels[id] = idx++;
  }
  return labels;
}
