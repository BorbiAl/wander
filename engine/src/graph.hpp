#pragma once

#include <string>
#include <unordered_map>
#include <vector>

struct Node {
  std::string id;
  std::unordered_map<std::string, double> props;
};

struct Edge {
  std::string from;
  std::string to;
  double weight;
};

class PropertyGraph {
 public:
  void add_node(const std::string& id);
  void add_edge(const std::string& from, const std::string& to, double weight = 1.0);
  const std::unordered_map<std::string, Node>& nodes() const;
  const std::vector<Edge>& edges() const;
  std::vector<std::string> neighbors(const std::string& id) const;

 private:
  std::unordered_map<std::string, Node> nodes_;
  std::vector<Edge> edges_;
};
