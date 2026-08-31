import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGovernanceTaxonomy } from "./taxonomy.ts";

test("taxonomy normalization preserves only authoritative provider values", () => {
  assert.deepEqual(normalizeGovernanceTaxonomy("region", {
    values: [
      { stableKey: "na", displayName: "North America", status: "active", taxonomyVersion: "2026.1" },
      { displayName: "Malformed" },
    ],
  }), {
    scope: "region",
    taxonomyVersion: "2026.1",
    values: [{ stableKey: "na", displayName: "North America", status: "active" }],
  });
});

test("taxonomy normalization does not invent fallback dropdown values", () => {
  assert.deepEqual(normalizeGovernanceTaxonomy("any-future-scope", { status: "unavailable" }), {
    scope: "any-future-scope", taxonomyVersion: null, values: [],
  });
});