#pragma once

#include <string>

namespace httplib {
struct Request {};

struct Response {
  void set_content(const std::string&, const std::string&) {}
};

class Server {
 public:
  template <typename Handler>
  void Get(const std::string&, Handler) {}

  template <typename Handler>
  void Post(const std::string&, Handler) {}

  bool listen(const char*, int) { return true; }
};
}
