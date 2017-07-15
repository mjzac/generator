/**
 * Module dependencies.
 */
import * as bodyParser from "body-parser";
import * as compression from "compression";  // compresses requests
import * as mongo from "connect-mongo"; // (session)
import * as dotenv from "dotenv";
import * as errorHandler from "errorhandler";
import * as express from "express";
import * as flash from "express-flash";
import * as session from "express-session";
import * as lusca from "lusca";
import * as mongoose from "mongoose";
import * as logger from "morgan";
import * as passport from "passport";
import * as path from "path";
import expressValidator = require("express-validator");

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env.example" });

/**
 * Routes
 */
import accountRouter from "./routes/account";
import apiRouter from "./routes/api";
import contactRouter from "./routes/contact";
import oauthRouter from "./routes/oauth";
import rootRouter from "./routes/root";

/**
 * API keys and Passport configuration.
 */
import * as passportConfig from "./config/passport";
class App {

  // ref to Express instance
  public express: express.Application;
  private readonly MongoStore = mongo(session);

  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
    this.launchConf();

  }
  private middleware(): void {
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
    this.express.use((req, res, next) => {
      res.locals.user = req.user;
      next();
    });
    this.express.use((req, res, next) => {
      // After successful login, redirect back to the intended page
      if (!req.user &&
        req.path !== "/login" &&
        req.path !== "/signup" &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
      } else if (req.user &&
        req.path === "/account") {
        req.session.returnTo = req.path;
      }
      next();
    });
    this.express.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));
  }
  /**
   * Primary app routes.
   */
  private routes(): void {
    this.express.use("/", rootRouter);
    this.express.use("/api", apiRouter);
    this.express.use("/auth", oauthRouter);
    this.express.use("/account", accountRouter);
    this.express.use("/contact", contactRouter);
  }

  private launchConf() {
    // mongoose.Promise = global.Promise;
    mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);

    mongoose.connection.on("error", () => {
      // tslint:disable-next-line:no-console
      console.log("MongoDB connection error. Please make sure MongoDB is running.");
      process.exit();
    });

    this.express.use(errorHandler());

    /**
     * Start Express server.
     */
    this.express.listen(this.express.get("port"), () => {
      // tslint:disable-next-line:no-console
      console.log(("  App is running at http://localhost:%d \
      in %s mode"), this.express.get("port"), this.express.get("env"));
      // tslint:disable-next-line:no-console
      console.log("  Press CTRL-C to stop\n");
    });
  }
}

export default new App().express;
