import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { requirePlannerWrite } from "../middlewares/authorization.ts";
import { isTrustedPlannerOrigin } from "./cors.ts";

async function startAuthorizationServer(identity?: { id: string; displayName: string; email: string | null }) {
  const app = express();
  let privilegedCalls = 0;
  app.post("/campaigns", (req, _res, next) => {
    req.plannerIdentity = identity;
    next();
  }, requirePlannerWrite, (_req, res) => {
    privilegedCalls += 1;
    res.status(201).json({ created: true });
  });
  app.post("/campaigns/:id/webinar", (req, _res, next) => {
    req.plannerIdentity = identity;
    next();
  }, requirePlannerWrite, (_req, res) => {
    privilegedCalls += 1;
    res.status(201).json({ created: true });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    privilegedCalls: () => privilegedCalls,
  };
}

test("unauthenticated campaign and activity requests cannot reach privileged writes", async (t) => {
  const server = await startAuthorizationServer();
  t.after(server.close);
  for (const path of ["/campaigns", "/campaigns/example/webinar"]) {
    const response = await fetch(`${server.url}${path}`, { method: "POST" });
    assert.equal(response.status, 401);
  }
  assert.equal(server.privilegedCalls(), 0);
});

test("authenticated users without planner permission cannot reach privileged writes", async (t) => {
  process.env.PLANNER_WRITER_IDS = "authorized-user";
  const server = await startAuthorizationServer({ id: "other-user", displayName: "Other User", email: null });
  t.after(() => {
    delete process.env.PLANNER_WRITER_IDS;
    return server.close();
  });
  const response = await fetch(`${server.url}/campaigns`, { method: "POST" });
  assert.equal(response.status, 403);
  assert.equal(server.privilegedCalls(), 0);
});

test("explicitly authorized planner identities can reach campaign and activity writes", async (t) => {
  process.env.PLANNER_WRITER_IDS = "authorized-user";
  process.env.PLANNER_ALLOWED_ORIGINS = "https://planner.example";
  const server = await startAuthorizationServer({ id: "authorized-user", displayName: "Planner", email: null });
  t.after(() => {
    delete process.env.PLANNER_WRITER_IDS;
    delete process.env.PLANNER_ALLOWED_ORIGINS;
    return server.close();
  });
  for (const path of ["/campaigns", "/campaigns/example/webinar"]) {
    const response = await fetch(`${server.url}${path}`, {
      method: "POST",
      headers: { origin: "https://planner.example" },
    });
    assert.equal(response.status, 201);
  }
  assert.equal(server.privilegedCalls(), 2);
});

test("cross-origin form posts cannot use an authorized cookie session", async (t) => {
  process.env.PLANNER_WRITER_IDS = "authorized-user";
  process.env.PLANNER_ALLOWED_ORIGINS = "https://planner.example";
  const server = await startAuthorizationServer({ id: "authorized-user", displayName: "Planner", email: null });
  t.after(() => {
    delete process.env.PLANNER_WRITER_IDS;
    delete process.env.PLANNER_ALLOWED_ORIGINS;
    return server.close();
  });
  const response = await fetch(`${server.url}/campaigns/example/webinar`, {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "eventDate=2026-09-01",
  });
  assert.equal(response.status, 403);
  assert.equal(server.privilegedCalls(), 0);
});

test("browser CORS allows configured planner origins and rejects unknown origins", () => {
  const env = {
    PLANNER_ALLOWED_ORIGINS: "https://planner.example",
    REPLIT_DEV_DOMAIN: "planner-dev.replit.dev",
  };
  assert.equal(isTrustedPlannerOrigin(undefined, env), true);
  assert.equal(isTrustedPlannerOrigin("https://planner.example", env), true);
  assert.equal(isTrustedPlannerOrigin("https://planner-dev.replit.dev", env), true);
  assert.equal(isTrustedPlannerOrigin("https://attacker.example", env), false);
});