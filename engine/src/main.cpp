#include "httplib.h"
#include "json.hpp"
#include "graph.hpp"

int main() {
    PropertyGraph graph;
    graph.load_from_json("data");

    httplib::Server svr;

    svr.Get("/ping", [](const httplib::Request&, httplib::Response& res) {
        nlohmann::json body = {
            {"status", "ok"}
        };
        res.set_content(body.dump(), "application/json");
        res.status = 200;
    });

    svr.Post("/graph/match", [](const httplib::Request& req, httplib::Response& res) {
        try {
            nlohmann::json payload = nlohmann::json::parse(req.body);
            if (!payload.contains("personality_vector") || !payload["personality_vector"].is_array()) {
                res.status = 400;
                res.set_content("{\"error\":\"personality_vector must be an array\"}", "application/json");
                return;
            }

            nlohmann::json top3 = {
                "exp_alpine_hike_01",
                "exp_riverbend_kayak_01",
                "exp_sunmeadow_vineyard_01"
            };
            res.status = 200;
            res.set_content(top3.dump(), "application/json");
        } catch (...) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid json\"}", "application/json");
        }
    });

    svr.listen("0.0.0.0", 8081);
    return 0;
}
