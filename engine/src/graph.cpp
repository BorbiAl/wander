#include "graph.hpp"

#include <fstream>
#include <string>

namespace {
void load_nodes_from_file(PropertyGraph& graph, const std::string& path, const std::string& type) {
    std::ifstream file(path);
    if (!file.is_open()) {
        return;
    }

    try {
        json j = json::parse(file);
        if (!j.is_array()) {
            return;
        }

        for (const auto& item : j) {
            if (!item.is_object() || !item.contains("id") || !item["id"].is_string()) {
                continue;
            }
            graph.add_node(item["id"].get<std::string>(), type, item);
        }
    } catch (...) {
        // Keep startup resilient if a data file is empty or malformed.
    }
}
} // namespace

void PropertyGraph::load_from_json(const std::string& data_dir) {
    load_nodes_from_file(*this, data_dir + "/villages.json", "village");
    load_nodes_from_file(*this, data_dir + "/experiences.json", "experience");
}
