import assert from "node:assert/strict";
import test from "node:test";
import { buildTrackedUrl, containsDirectPii, hasRequiredCampaignDetails, hasRequiredWebinarOwnership, isOpaqueExternalPersonReference } from "./privacy.ts";

test("tracking parameters permit governed UTM values", () => {
  assert.equal(containsDirectPii("https://example.com/register", {
    utm_source: "email", utm_campaign: "FY26_WEBINAR",
  }), false);
});

test("tracking URLs and parameter names reject direct PII", () => {
  assert.equal(containsDirectPii("https://example.com/?email=person@example.com", {}), true);
  assert.equal(containsDirectPii("https://example.com/register", { person_email: "person@example.com" }), true);
  assert.equal(containsDirectPii("not a URL", {}), true);
});

test("campaign and webinar acceptance details are explicitly required", () => {
  assert.equal(hasRequiredCampaignDetails({
    campaignType: "Demand generation", audienceSegment: "Enterprise", fiscalPeriod: "FY26 Q2", description: "Launch plan",
  }), true);
  assert.equal(hasRequiredCampaignDetails({ campaignType: "Demand generation" }), false);
  assert.equal(hasRequiredWebinarOwnership({
    registrationPending: true, webinarOwner: "Webinar owner", emailMarketingOwner: "Email owner",
  }), true);
  assert.equal(hasRequiredWebinarOwnership({ registrationPending: true, webinarOwner: "Webinar owner" }), false);
});

test("only opaque external person references are accepted", () => {
  assert.equal(isOpaqueExternalPersonReference("crm:003xx00000ABCDE"), true);
  assert.equal(isOpaqueExternalPersonReference("person@example.com"), false);
  assert.equal(isOpaqueExternalPersonReference("https://crm.example/person/1"), false);
  assert.equal(isOpaqueExternalPersonReference("Ada Lovelace"), false);
});

test("tracked URL is rebuilt from the immutable base URL and UTM parameters", () => {
  assert.equal(buildTrackedUrl("https://example.com/register?legacy=remove", {
    utm_source: "email", utm_campaign: "FY26",
  }), "https://example.com/register?legacy=remove&utm_source=email&utm_campaign=FY26");
});