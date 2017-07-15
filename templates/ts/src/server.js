"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 */
var bodyParser = require("body-parser");
var compression = require("compression"); // compresses requests
var mongo = require("connect-mongo"); // (session)
var dotenv = require("dotenv");
var errorHandler = require("errorhandler");
var express = require("express");
var flash = require("express-flash");
var session = require("express-session");
var lusca = require("lusca");
var mongoose = require("mongoose");
var logger = require("morgan");
var passport = require("passport");
var path = require("path");
var expressValidator = require("express-validator");
/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env.example" });
/**
 * Routes
 */
var account_1 = require("./routes/account");
var api_1 = require("./routes/api");
var contact_1 = require("./routes/contact");
var oauth_1 = require("./routes/oauth");
var root_1 = require("./routes/root");
var App = (function () {
    function App() {
        this.MongoStore = mongo(session);
        this.express = express();
        this.middleware();
        this.routes();
        this.launchConf();
    }
    App.prototype.middleware = function () {
        this.express.set("port", process.env.PORT || 3000);
        this.express.set("views", path.join(__dirname, "../views"));
        this.express.set("view engine", "pug");
        this.express.use(compression());
        this.express.use(logger("dev"));
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: true }));
        this.express.use(expressValidator());
        this.express.use(session({
            resave: true,
            saveUninitialized: true,
            secret: process.env.SESSION_SECRET,
            store: new this.MongoStore({
                autoReconnect: true,
                url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
            }),
        }));
        this.express.use(passport.initialize());
        this.express.use(passport.session());
        this.express.use(flash());
        this.express.use(lusca.xframe("SAMEORIGIN"));
        this.express.use(lusca.xssProtection(true));
        this.express.use(function (req, res, next) {
            res.locals.user = req.user;
            next();
        });
        this.express.use(function (req, res, next) {
            // After successful login, redirect back to the intended page
            if (!req.user &&
                req.path !== "/login" &&
                req.path !== "/signup" &&
                !req.path.match(/^\/auth/) &&
                !req.path.match(/\./)) {
                req.session.returnTo = req.path;
            }
            else if (req.user &&
                req.path === "/account") {
                req.session.returnTo = req.path;
            }
            next();
        });
        this.express.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));
    };
    /**
     * Primary app routes.
     */
    App.prototype.routes = function () {
        this.express.use("/", root_1.default);
        this.express.use("/api", api_1.default);
        this.express.use("/auth", oauth_1.default);
        this.express.use("/account", account_1.default);
        this.express.use("/contact", contact_1.default);
    };
    App.prototype.launchConf = function () {
        var _this = this;
        // mongoose.Promise = global.Promise;
        mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
        mongoose.connection.on("error", function () {
            // tslint:disable-next-line:no-console
            console.log("MongoDB connection error. Please make sure MongoDB is running.");
            process.exit();
        });
        this.express.use(errorHandler());
        /**
         * Start Express server.
         */
        this.express.listen(this.express.get("port"), function () {
            // tslint:disable-next-line:no-console
            console.log(("  App is running at http://localhost:%d \
      in %s mode"), _this.express.get("port"), _this.express.get("env"));
            // tslint:disable-next-line:no-console
            console.log("  Press CTRL-C to stop\n");
        });
    };
    return App;
}());
exports.default = new App().express;
