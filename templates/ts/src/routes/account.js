"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var userController = require("../controllers/user");
var passportConfig = require("../config/passport");
var Account = (function () {
    function Account() {
        this.router = express_1.Router();
        this.init();
    }
    Account.prototype.init = function () {
        this.router.get("/", passportConfig.isAuthenticated, userController.getAccount);
        this.router.post("/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
        this.router.post("/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
        this.router.post("/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
        this.router.get("/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink);
    };
    return Account;
}());
var accountRoutes = new Account();
exports.default = accountRoutes.router;
