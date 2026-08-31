import assert from "node:assert/strict";
import test from "node:test";
import {
  CampaignGovernanceFoundationAdapter,
  GovernanceContractError,
} from "./governance.ts";

type FetchHandler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

function adapter(handler: FetchHandler, timeoutMs = 5_000) {
  const fetchImpl = ((input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    handler(new URL(String(input)), init)) as typeof fetch;
  return new CampaignGovernanceFoundationAdapter("https://governance.example", fetchImpl, timeoutMs);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("healthy endpoint reports connected", async () => {
  const governance = adapter(() => json({ status: "ok" }));
  assert.equal(await governance.isConnected(), true);
});

test("unavailable endpoint reports disconnected", async () => {
  const governance = adapter(() => json({ error: "unavailable" }, 503));
  assert.equal(await governance.isConnected(), false);
});

test("unavailable campaign endpoint fails explicitly", async () => {
  const governance = adapter(() => json({ error: "unavailable" }, 503));
  await assert.rejects(
    governance.searchCampaigns("appeal"),
    /Governance request failed \(503\)/,
  );
});

test("timeouts fail closed without throwing", async () => {
  const governance = adapter((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  }), 5);
  assert.equal(await governance.isConnected(), false);
});

test("campaign search validates and maps the Foundation response", async () => {
  const governance = adapter((url) => {
    assert.equal(url.pathname, "/api/campaigns");
    assert.equal(url.searchParams.get("search"), "annual appeal");
    return json([
      { campaignKey: "CMP-101", name: "Annual Appeal", status: "active" },
      { campaignKey: "CMP-099", name: "Old Appeal", status: "superseded" },
    ]);
  });

  assert.deepEqual(await governance.searchCampaigns("annual appeal"), [
    {
      governanceRecordId: "CMP-101",
      governanceStatus: "Authoritative",
      internalTitle: "Annual Appeal",
      campaignCode: "CMP-101",
      taxonomyVersion: null,
      authoritativeSource: "Campaign Governance Foundation",
    },
    {
      governanceRecordId: "CMP-099",
      governanceStatus: "Superseded",
      internalTitle: "Old Appeal",
      campaignCode: "CMP-099",
      taxonomyVersion: null,
      authoritativeSource: "Campaign Governance Foundation",
    },
  ]);
});

test("campaign lookup returns null for not found", async () => {
  const governance = adapter(() => json({ error: "not found" }, 404));
  assert.equal(await governance.getCampaign("missing"), null);
});

test("renamed campaign fields are rejected as malformed", async () => {
  const governance = adapter(() => json([{ id: "CMP-101", title: "Annual Appeal", state: "active" }]));
  await assert.rejects(
    governance.searchCampaigns("appeal"),
    (error: unknown) => error instanceof GovernanceContractError
      && error.message.includes("campaignKey"),
  );
});

test("invalid JSON campaign payload is rejected as malformed", async () => {
  const governance = adapter(() => new Response("{", {
    status: 200,
    headers: { "content-type": "application/json" },
  }));
  await assert.rejects(governance.getCampaign("CMP-101"), GovernanceContractError);
});

test("taxonomy values and summary fields are validated and mapped", async () => {
  const governance = adapter((url) => {
    if (url.pathname === "/api/taxonomy/values") {
      assert.equal(url.searchParams.get("category"), "audience");
      return json([{
        id: "tax-101",
        stableKey: "SEGMENT_ALUMNI",
        category: "audience",
        displayName: "Alumni",
        status: "active",
        taxonomyVersion: "2026.08",
      }]);
    }
    return json({
      taxonomyVersion: "2026.08",
      principles: ["Use approved audience terms"],
    });
  });

  assert.deepEqual(await governance.getTaxonomy("audience"), {
    scope: "audience",
    values: [{
      id: "tax-101",
      stableKey: "SEGMENT_ALUMNI",
      category: "audience",
      displayName: "Alumni",
      status: "active",
      taxonomyVersion: "2026.08",
    }],
  });
  assert.equal(await governance.getTaxonomyVersion(), "2026.08");
  assert.deepEqual(await governance.getNamingRules(), {
    principles: ["Use approved audience terms"],
  });
});

test("malformed taxonomy and summary payloads are rejected", async () => {
  const malformedTaxonomy = adapter(() => json({ values: [] }));
  await assert.rejects(
    malformedTaxonomy.getTaxonomy("audience"),
    GovernanceContractError,
  );

  const malformedSummary = adapter(() => json({ taxonomyVersion: 202608 }));
  await assert.rejects(
    malformedSummary.getTaxonomyVersion(),
    GovernanceContractError,
  );
});

test("renamed, missing, and wrong-type taxonomy entry fields are rejected", async () => {
  const validEntry = {
    id: "tax-101",
    stableKey: "SEGMENT_ALUMNI",
    category: "segment",
    displayName: "Alumni",
    status: "active",
    taxonomyVersion: "2026.08",
  };

  for (const malformedEntry of [
    { ...validEntry, label: validEntry.displayName, displayName: undefined },
    { ...validEntry, stableKey: undefined },
    { ...validEntry, taxonomyVersion: 202608 },
  ]) {
    const governance = adapter(() => json([malformedEntry]));
    await assert.rejects(
      governance.getTaxonomy("segment"),
      GovernanceContractError,
    );
  }
});