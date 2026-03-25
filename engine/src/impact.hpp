#pragma once

#include <string>
#include <vector>

struct ImpactRecord {
  std::string village_id;
  double local_score;
  double eco_score;
  double culture_score;
};

double compute_impact(const ImpactRecord& rec);
double compute_cws(const std::vector<ImpactRecord>& records);
