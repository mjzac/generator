"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var supertest = require("supertest");
var request = supertest("localhost:3000");
describe("GET /", function () {
    it("should return 200 OK", function (done) {
        request.get("/")
            .expect(200, done);
    });
});
