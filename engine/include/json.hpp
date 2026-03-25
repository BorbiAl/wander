#pragma once

#include <string>

namespace nlohmann {
class json {
 public:
  json() = default;

  template <typename T>
  json(const T&) {}

  template <typename T>
  T get() const {
    return T{};
  }

  static json parse(const std::string&) { return json(); }

  std::string dump(int = -1) const { return "{}"; }

  json& operator[](const std::string&) { return *this; }
  const json& operator[](const std::string&) const { return *this; }
};
}
