
import test, { before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app, { configureRoutes } from "../src/app.js";

before(async () => {
  await configureRoutes();
});

test("GET /health returns 200", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "api-gateway");
});

test("Unknown route returns JSON 404", async () => {
  const response = await request(app).get("/this-route-does-not-exist");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Not Found");
});

test("GET /users without JWT returns 401", async () => {
  const response = await request(app).get("/users");

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Unauthorized");
});

test("GET /products reaches a healthy backend", async () => {
  const response = await request(app).get("/products");

  assert.equal(
    response.status,
    200,
    `Expected 200, received ${response.status}: ${JSON.stringify(response.body)}`,
  );
});

test("Rate limiter returns 429 after five requests", async () => {
  // Use a unique IP so this test doesn't share a rate-limit bucket
  // with other tests.
  const clientIp = "192.0.2.123";

  for (let i = 0; i < 5; i++) {
    const response = await request(app)
      .get("/health")
      .set("X-Forwarded-For", clientIp);

    assert.equal(response.status, 200);
  }

  const response = await request(app)
    .get("/health")
    .set("X-Forwarded-For", clientIp);

  assert.equal(response.status, 429);
  assert.equal(response.body.error, "Too Many Requests");
  assert.equal(response.headers["ratelimit-limit"], "5");
  assert.equal(response.headers["ratelimit-remaining"], "0");
  assert.ok(Number(response.headers["retry-after"]) >= 1);
});
