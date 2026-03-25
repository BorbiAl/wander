#include "algorithms.hpp"

#include <algorithm>
#include <limits>
#include <string>
#include <queue>

namespace {
double get_weight_component(const Node& node, std::size_t i) {
  const std::string k1 = "personality_weight_" + std::to_string(i);
  const std::string k2 = "pw_" + std::to_string(i);
  const std::string k3 = "w" + std::to_string(i);

  auto it = node.props.find(k1);
  if (it != node.props.end()) return it->second;
  it = node.props.find(k2);
  if (it != node.props.end()) return it->second;
  it = node.props.find(k3);
  if (it != node.props.end()) return it->second;

  return 0.2;
}

bool is_experience_node(const Node& node) {
  auto it = node.props.find("is_experience");
  if (it == node.props.end()) {
    return true;
  }
  return it->second > 0.0;
}
}  // namespace

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

std::vector<std::pair<std::string, double>> personalized_pagerank(
    const PropertyGraph& graph,
    const std::vector<double>& personality_vec,
    double alpha,
    int iters,
    std::size_t top_n) {
  std::vector<std::pair<std::string, double>> ranked;
  const auto& nodes = graph.nodes();
  if (nodes.empty() || personality_vec.empty()) {
    return ranked;
  }

  std::vector<std::string> all_ids;
  all_ids.reserve(nodes.size());

  std::unordered_map<std::string, std::vector<std::string>> outgoing;
  std::unordered_map<std::string, std::vector<std::string>> incoming;
  for (const auto& [id, node] : nodes) {
    all_ids.push_back(id);
    outgoing[id] = {};
    incoming[id] = {};
  }
  for (const auto& e : graph.edges()) {
    outgoing[e.from].push_back(e.to);
    incoming[e.to].push_back(e.from);
  }

  std::unordered_map<std::string, double> seed;
  std::vector<std::string> candidates;
  double seed_sum = 0.0;
  for (const auto& [id, node] : nodes) {
    if (!is_experience_node(node)) {
      continue;
    }

    double dot = 0.0;
    for (std::size_t i = 0; i < personality_vec.size(); ++i) {
      dot += personality_vec[i] * get_weight_component(node, i);
    }

    if (dot < 0.0) dot = 0.0;
    seed[id] = dot;
    seed_sum += dot;
    candidates.push_back(id);
  }

  if (candidates.empty()) {
    return ranked;
  }

  if (seed_sum <= 0.0) {
    const double uni = 1.0 / static_cast<double>(candidates.size());
    for (const auto& id : candidates) {
      seed[id] = uni;
    }
  } else {
    for (const auto& id : candidates) {
      seed[id] /= seed_sum;
    }
  }

  std::unordered_map<std::string, double> score;
  for (const auto& id : all_ids) {
    auto it = seed.find(id);
    score[id] = (it == seed.end()) ? 0.0 : it->second;
  }

  for (int step = 0; step < iters; ++step) {
    std::unordered_map<std::string, double> next;
    for (const auto& id : all_ids) {
      const auto seed_it = seed.find(id);
      const double teleport = (seed_it == seed.end()) ? 0.0 : seed_it->second;
      double walk = 0.0;

      for (const auto& src : incoming[id]) {
        const auto out_it = outgoing.find(src);
        if (out_it == outgoing.end() || out_it->second.empty()) {
          continue;
        }
        walk += score[src] / static_cast<double>(out_it->second.size());
      }

      next[id] = alpha * teleport + (1.0 - alpha) * walk;
    }
    score.swap(next);
  }

  ranked.reserve(candidates.size());
  for (const auto& id : candidates) {
    ranked.push_back({id, score[id]});
  }

  std::sort(ranked.begin(), ranked.end(),
            [](const auto& a, const auto& b) { return a.second > b.second; });

  if (ranked.size() > top_n) {
    ranked.resize(top_n);
  }
  return ranked;
}
