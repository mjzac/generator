import { NextFunction, Request, Response, Router } from "express";

import * as apiController from "../controllers/api";

import * as passportConfig from "../config/passport";
class Api {
  public router: Router;
  public constructor() {
    this.router = Router();
    this.init();
  }
  private init() {
    this.router.get("/", apiController.getApi);
    this.router.get("/facebook", passportConfig.isAuthenticated, apiController.getFacebook);
  }
}

const apiRoutes = new Api();
export default apiRoutes.router;
