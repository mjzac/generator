"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var supertest = require("supertest");
var request = supertest("localhost:3000");
describe("GET /api", function () {
    it("should return 200 OK", function () {
        request
            .get("/api")
            .expect(200);
    });
});
