"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var supertest = require("supertest");
var request = supertest("localhost:3000");
describe("GET /random-url", function () {
    it("should return 404", function () {
        return request.get("/random-url").then(function (response) {
            expect(response.status).toBe(404);
        });
    });
});
