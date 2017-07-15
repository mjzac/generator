"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var apiController = require("../controllers/api");
var passportConfig = require("../config/passport");
var Api = (function () {
    function Api() {
        this.router = express_1.Router();
        this.init();
    }
    Api.prototype.init = function () {
        this.router.get("/", apiController.getApi);
        this.router.get("/facebook", passportConfig.isAuthenticated, apiController.getFacebook);
    };
    return Api;
}());
var apiRoutes = new Api();
exports.default = apiRoutes.router;
