"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var contactController = require("../controllers/contact");
var Contact = (function () {
    function Contact() {
        this.router = express_1.Router();
        this.init();
    }
    Contact.prototype.init = function () {
        this.router.get("/", contactController.getContact);
        this.router.post("/", contactController.postContact);
    };
    return Contact;
}());
var contactRoutes = new Contact();
exports.default = contactRoutes.router;
