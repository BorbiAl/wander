#include "impact.hpp"

double compute_impact(const ImpactRecord& rec) {
  return 0.4 * rec.local_score + 0.3 * rec.eco_score + 0.3 * rec.culture_score;
}

double compute_cws(const std::vector<ImpactRecord>& records) {
  if (records.empty()) {
    return 0.0;
  }

  double total = 0.0;
  for (const auto& rec : records) {
    total += compute_impact(rec);
  }
  return total / static_cast<double>(records.size());
}
