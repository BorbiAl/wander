#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "json.hpp"

using json = nlohmann::json;

struct Node {
    std::string id;
    std::string type;
    json properties;
};

struct Edge {
    std::string target;
    std::string type;
    json properties;
};

class PropertyGraph {
public:
    std::unordered_map<std::string, Node> nodes;
    std::unordered_map<std::string, std::vector<Edge>> adj;

    void add_node(const Node& node) {
        nodes[node.id] = node;
    }

    void add_node(const std::string& id, const std::string& type, const json& properties) {
        nodes[id] = Node{id, type, properties};
    }

    void add_edge(const std::string& source, const Edge& edge) {
        adj[source].push_back(edge);
    }

    void load_from_json(const std::string& data_dir);
};
