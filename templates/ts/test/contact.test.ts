import * as supertest from "supertest";
import { default as app } from "../src/server";
const request = supertest("localhost:3000");

describe("GET /contact", () => {
  it("should return 200 OK", (done) => {
    request.get("/contact")
      .expect(200, done);
  });
});
