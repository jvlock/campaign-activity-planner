export type NormalizedTaxonomyValue = {
  stableKey: string;
  displayName: string;
  status: string;
};

/**
 * Deliberately accepts only the provider payload; the Planner owns no taxonomy
 * fallback list. Malformed provider entries are omitted rather than invented.
 */
export function normalizeGovernanceTaxonomy(
  scope: string,
  payload: Record<string, unknown>,
): { scope: string; taxonomyVersion: string | null; values: NormalizedTaxonomyValue[] } {
  const entries = Array.isArray(payload["values"]) ? payload["values"] : [];
  const values = entries.flatMap((entry): NormalizedTaxonomyValue[] => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const value = entry as Record<string, unknown>;
    if (
      typeof value["stableKey"] !== "string"
      || typeof value["displayName"] !== "string"
      || typeof value["status"] !== "string"
    ) return [];
    return [{ stableKey: value["stableKey"], displayName: value["displayName"], status: value["status"] }];
  });
  const version = values.length > 0
    && typeof (entries[0] as Record<string, unknown>)["taxonomyVersion"] === "string"
    ? (entries[0] as Record<string, unknown>)["taxonomyVersion"] as string
    : null;
  return { scope, taxonomyVersion: version, values };
}