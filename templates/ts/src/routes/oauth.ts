import { NextFunction, Request, Response, Router } from "express";

import * as passport from "passport";

import * as apiController from "../controllers/api";

import * as passportConfig from "../config/passport";
class Oauth {
  public router: Router;
  public constructor() {
    this.router = Router();
    this.init();
  }
  private init() {
    this.router.get("/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
    this.router.get("/facebook/callback",
      passport.authenticate("facebook", { failureRedirect: "/login" }), (req, res) => {
        res.redirect(req.session.returnTo || "/");
      });
  }
}

const oauthRoutes = new Oauth();
export default oauthRoutes.router;
