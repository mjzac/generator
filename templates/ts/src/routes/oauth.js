"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var passport = require("passport");
var Oauth = (function () {
    function Oauth() {
        this.router = express_1.Router();
        this.init();
    }
    Oauth.prototype.init = function () {
        this.router.get("/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
        this.router.get("/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), function (req, res) {
            res.redirect(req.session.returnTo || "/");
        });
    };
    return Oauth;
}());
var oauthRoutes = new Oauth();
exports.default = oauthRoutes.router;
