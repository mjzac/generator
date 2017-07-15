"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var graph = require("fbgraph");
/**
 * GET /api
 * List of API examples.
 */
exports.getApi = function (req, res) {
    res.render("api/index", {
        title: "API Examples",
    });
};
/**
 * GET /api/facebook
 * Facebook API example.
 */
exports.getFacebook = function (req, res, next) {
    var token = req.user.tokens.find(function (token) { return token.kind === "facebook"; });
    graph.setAccessToken(token.accessToken);
    graph.get(req.user.facebook + "?fields=id,name,email,first_name,  last_name,gender,link,locale,timezone", function (err, results) {
        if (err) {
            return next(err);
        }
        res.render("api/facebook", {
            profile: results,
            title: "Facebook API",
        });
    });
};
