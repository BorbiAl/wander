#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "graph.hpp"

std::unordered_map<std::string, double> pagerank(const PropertyGraph& graph, int iterations = 20, double damping = 0.85);
std::unordered_map<std::string, double> dijkstra(const PropertyGraph& graph, const std::string& source);
std::unordered_map<std::string, int> label_propagation(const PropertyGraph& graph, int max_rounds = 10);
