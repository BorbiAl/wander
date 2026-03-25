#include "httplib.h"
#include "json.hpp"

int main() {
    httplib::Server svr;

    svr.Get("/ping", [](const httplib::Request&, httplib::Response& res) {
        nlohmann::json body = {
            {"status", "ok"}
        };
        res.set_content(body.dump(), "application/json");
        res.status = 200;
    });

    svr.listen("0.0.0.0", 8081);
    return 0;
}
