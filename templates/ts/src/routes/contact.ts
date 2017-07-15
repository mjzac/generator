import { NextFunction, Request, Response, Router } from "express";

import * as contactController from "../controllers/contact";
class Contact {
  public router: Router;
  public constructor() {
    this.router = Router();
    this.init();
  }
  private init() {
    this.router.get("/", contactController.getContact);
    this.router.post("/", contactController.postContact);
  }
}

const contactRoutes = new Contact();
export default contactRoutes.router;
