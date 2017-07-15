"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
    auth: {
        pass: process.env.SENDGRID_PASSWORD,
        user: process.env.SENDGRID_USER,
    },
    service: "SendGrid",
});
/**
 * GET /contact
 * Contact form page.
 */
exports.getContact = function (req, res) {
    res.render("contact", {
        title: "Contact",
    });
};
/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
exports.postContact = function (req, res) {
    req.assert("name", "Name cannot be blank").notEmpty();
    req.assert("email", "Email is not valid").isEmail();
    req.assert("message", "Message cannot be blank").notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/contact");
    }
    var mailOptions = {
        from: req.body.name + " <" + req.body.email + ">",
        subject: "Contact Form",
        text: req.body.message,
        to: "your@email.com",
    };
    transporter.sendMail(mailOptions, function (err) {
        if (err) {
            req.flash("errors", { msg: err.message });
            return res.redirect("/contact");
        }
        req.flash("success", { msg: "Email has been sent successfully!" });
        res.redirect("/contact");
    });
};
