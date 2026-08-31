import assert from "node:assert/strict";
import test from "node:test";
import { CampaignGovernanceFoundationAdapter } from "./governance.ts";

const governance = new CampaignGovernanceFoundationAdapter();

test("live Foundation health and summary match the adapter contract", async () => {
  assert.equal(await governance.isConnected(), true, "Foundation health endpoint is unavailable");

  const version = await governance.getTaxonomyVersion();
  assert.ok(version, "Foundation summary is missing taxonomyVersion");

  const namingRules = await governance.getNamingRules();
  assert.ok(Array.isArray(namingRules["principles"]));
});

test("live Foundation campaign responses match the adapter contract", async () => {
  const campaigns = await governance.searchCampaigns("campaign");
  assert.ok(campaigns.length > 0, "Campaign search returned no contract sample");

  const campaign = campaigns[0];
  assert.ok(campaign);
  assert.ok(campaign.governanceRecordId);
  assert.deepEqual(
    await governance.getCampaign(campaign.governanceRecordId),
    campaign,
  );
});

test("live Foundation taxonomy response matches the adapter contract", async () => {
  const taxonomy = await governance.getTaxonomy("segment");
  assert.equal(taxonomy["scope"], "segment");
  assert.ok(Array.isArray(taxonomy["values"]));
  const [sample] = taxonomy["values"];
  assert.ok(sample && typeof sample === "object");
  for (const field of [
    "id",
    "stableKey",
    "category",
    "displayName",
    "status",
    "taxonomyVersion",
  ]) {
    assert.equal(typeof (sample as Record<string, unknown>)[field], "string");
    assert.ok((sample as Record<string, string>)[field].length > 0);
  }
});