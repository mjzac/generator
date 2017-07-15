"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var homeController = require("../controllers/home");
var userController = require("../controllers/user");
var Root = (function () {
    function Root() {
        this.router = express_1.Router();
        this.init();
    }
    Root.prototype.init = function () {
        this.router.get("/", homeController.index);
        this.router.get("/login", userController.getLogin);
        this.router.post("/login", userController.postLogin);
        this.router.get("/logout", userController.logout);
        this.router.get("/forgot", userController.getForgot);
        this.router.post("/forgot", userController.postForgot);
        this.router.get("/reset/:token", userController.getReset);
        this.router.post("/reset/:token", userController.postReset);
        this.router.get("/signup", userController.getSignup);
        this.router.post("/signup", userController.postSignup);
    };
    return Root;
}());
var rootRoutes = new Root();
exports.default = rootRoutes.router;
