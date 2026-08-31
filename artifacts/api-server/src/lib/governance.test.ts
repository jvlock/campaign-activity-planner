import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { CampaignGovernanceFoundationAdapter } from "./governance.ts";

test("creates authoritative campaigns and activities with bearer auth and idempotency", async (t) => {
  const requests: Array<{ url: string; authorization?: string; idempotency?: string }> = [];
  const server = createServer((req, res) => {
    requests.push({
      url: req.url ?? "",
      authorization: req.headers.authorization,
      idempotency: req.headers["idempotency-key"] as string | undefined,
    });
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/campaigns") {
      res.end(JSON.stringify({ campaignKey: "CAM-42", name: "Launch", status: "draft" }));
      return;
    }
    if (req.url === "/api/campaigns/CAM-42/submit") {
      res.end(JSON.stringify({
        campaignKey: "CAM-42",
        name: "Launch",
        status: "approved",
        taxonomyVersion: "2026.08",
        fiscalAssignment: "FY27-Q1",
        trackingParameters: { utm_campaign: "CAM-42" },
        validation: { valid: true, issues: [] },
      }));
      return;
    }
    if (req.url === "/api/campaigns/CAM-42/activities") {
      res.end(JSON.stringify({
        activityKey: "ACT-7",
        activityCode: "ACT-7",
        status: "approved",
        taxonomyVersion: "2026.08",
      }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");

  const adapter = new CampaignGovernanceFoundationAdapter(
    `http://127.0.0.1:${address.port}`,
    "service-token",
  );
  const campaign = await adapter.createDraftCampaignRequest({ name: "Launch" }, "request-1");
  const activity = await adapter.createActivity("CAM-42", { name: "Webinar" }, "activity-1");

  assert.equal(campaign.governanceRecordId, "CAM-42");
  assert.equal(campaign.taxonomyVersion, "2026.08");
  assert.equal(campaign.fiscalAssignment, "FY27-Q1");
  assert.deepEqual(campaign.validation, { valid: true, issues: [] });
  assert.equal(activity.activityCode, "ACT-7");
  assert.deepEqual(requests.map(({ url, idempotency }) => [url, idempotency]), [
    ["/api/campaigns", "request-1"],
    ["/api/campaigns/CAM-42/submit", "request-1:submit"],
    ["/api/campaigns/CAM-42/activities", "activity-1"],
  ]);
  assert(requests.every((request) => request.authorization === "Bearer service-token"));
});

test("fails closed before an outbound governance write when authentication is missing", async () => {
  const adapter = new CampaignGovernanceFoundationAdapter("http://127.0.0.1:1", "");
  await assert.rejects(
    adapter.createDraftCampaignRequest({ name: "Launch" }, "request-1"),
    /GOVERNANCE_SERVICE_TOKEN is required/,
  );
  await assert.rejects(
    adapter.createActivity("CAM-42", { name: "Webinar" }, "activity-1"),
    /GOVERNANCE_SERVICE_TOKEN is required/,
  );
});

test("does not infer authoritative fields omitted by Foundation", async (t) => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ campaignKey: "CAM-43", name: "Draft", status: "draft" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  const adapter = new CampaignGovernanceFoundationAdapter(`http://127.0.0.1:${address.port}`, "token");

  const campaign = await adapter.createDraftCampaignRequest({ name: "Draft" }, "request-2");
  assert.equal(campaign.validation, null);
  assert.equal(campaign.trackingParameters, null);
  assert.equal(campaign.supersession, null);
  assert.equal(campaign.governanceStatus, "Authoritative draft");
});

test("rejects malformed campaign responses before they can be persisted", async (t) => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ name: "Missing key", status: "approved" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  const adapter = new CampaignGovernanceFoundationAdapter(`http://127.0.0.1:${address.port}`, "token");
  await assert.rejects(
    adapter.createDraftCampaignRequest({ name: "Missing key" }, "request-3"),
    /campaignKey must be a non-empty string/,
  );
});

test("preserves a draft activity without inventing an activity code or taxonomy", async (t) => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ activityKey: "ACT-8", status: "draft" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  const adapter = new CampaignGovernanceFoundationAdapter(`http://127.0.0.1:${address.port}`, "token");
  const activity = await adapter.createActivity("CAM-42", { name: "Webinar" }, "activity-2");
  assert.equal(activity.governanceRecordId, "ACT-8");
  assert.equal(activity.governanceStatus, "Authoritative draft");
  assert.equal(activity.activityCode, null);
  assert.equal(activity.taxonomyVersion, null);
});

test("rejects malformed activity identifiers", async (t) => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ activityKey: 42, status: "approved" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  const adapter = new CampaignGovernanceFoundationAdapter(`http://127.0.0.1:${address.port}`, "token");
  await assert.rejects(
    adapter.createActivity("CAM-42", { name: "Webinar" }, "activity-3"),
    /official string identifier/,
  );
});