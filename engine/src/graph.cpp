#include "graph.hpp"

void PropertyGraph::add_node(const std::string& id) {
  if (nodes_.find(id) == nodes_.end()) {
    nodes_[id] = Node{id, {}};
  }
}

void PropertyGraph::add_edge(const std::string& from, const std::string& to, double weight) {
  add_node(from);
  add_node(to);
  edges_.push_back(Edge{from, to, weight});
}

const std::unordered_map<std::string, Node>& PropertyGraph::nodes() const {
  return nodes_;
}

const std::vector<Edge>& PropertyGraph::edges() const {
  return edges_;
}

std::vector<std::string> PropertyGraph::neighbors(const std::string& id) const {
  std::vector<std::string> out;
  for (const auto& e : edges_) {
    if (e.from == id) {
      out.push_back(e.to);
    }
  }
  return out;
}
