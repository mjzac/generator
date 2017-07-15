"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var supertest = require("supertest");
var request = supertest("localhost:3000");
describe("GET /login", function () {
    it("should return 200 OK", function () {
        return request.get("/login").then(function (response) {
            expect(response.status).toBe(200);
        });
    });
});
describe("GET /signup", function () {
    it("should return 200 OK", function () {
        return request.get("/signup").then(function (response) {
            expect(response.status).toBe(200);
        });
    });
});
