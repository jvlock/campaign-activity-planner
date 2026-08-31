/** Reject direct identifiers from URLs and campaign tracking parameters. */
export function containsDirectPii(baseUrl: string, parameters: Record<string, string>): boolean {
  const piiKey = /(^|_)(email|e-mail|phone|mobile|person|first_?name|last_?name|full_?name|address)($|_)/i;
  const piiValue = /(^|[?&=])[^&=\s]*@[^&=\s]+\.[^&=\s]+|(?:\+?\d[\s().-]*){8,}/i;
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return true;
  }
  if (url.username || url.password) return true;
  if ([...url.searchParams.entries()].some(([key, value]) => piiKey.test(key) || piiValue.test(value))) return true;
  return Object.entries(parameters).some(([key, value]) => piiKey.test(key) || piiValue.test(value));
}

export function hasRequiredCampaignDetails(input: Record<string, unknown>): boolean {
  return ["campaignType", "audienceSegment", "fiscalPeriod", "description"]
    .every((field) => typeof input[field] === "string" && input[field].trim().length > 0);
}

export function hasRequiredWebinarOwnership(input: Record<string, unknown>): boolean {
  return typeof input["registrationPending"] === "boolean"
    && typeof input["webinarOwner"] === "string" && input["webinarOwner"].trim().length > 0
    && typeof input["emailMarketingOwner"] === "string" && input["emailMarketingOwner"].trim().length > 0;
}

/** Person references must be opaque IDs, never contact data or URLs. */
export function isOpaqueExternalPersonReference(value: string): boolean {
  if (value.length < 3 || value.length > 256) return false;
  if (/@|:\/\//.test(value)) return false;
  // Names, phone numbers, and unstructured contact values are direct identifiers.
  if (/\s/.test(value) || /(?:\d[\s().-]*){8,}/.test(value)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(value);
}

export function buildTrackedUrl(baseUrl: string, parameters: Record<string, string>): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}