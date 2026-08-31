export type GovernanceRecordStatus =
  | "Authoritative"
  | "Authoritative draft"
  | "Pending authoritative assignment"
  | "Superseded";

export interface GovernanceCampaign {
  governanceRecordId: string | null;
  governanceStatus: GovernanceRecordStatus;
  internalTitle: string;
  campaignCode: string | null;
  taxonomyVersion: string | null;
  authoritativeSource: string;
  fiscalAssignment: string | null;
  trackingParameters: Record<string, string> | null;
  validation: { valid: boolean; issues: string[] | null } | null;
  supersession: { superseded: boolean; replacementId: string | null } | null;
  providerResponse: Record<string, unknown>;
}

export interface GovernanceActivity {
  governanceRecordId: string;
  governanceStatus: GovernanceRecordStatus;
  activityCode: string | null;
  taxonomyVersion: string | null;
  authoritativeSource: string;
  providerResponse: Record<string, unknown>;
}
export interface GovernanceProvider {
  readonly label: string;
  readonly source: string;
  isConnected(): Promise<boolean>;
  searchCampaigns(query: string): Promise<GovernanceCampaign[]>;
  getCampaign(id: string): Promise<GovernanceCampaign | null>;
  createDraftCampaignRequest(input: Record<string, unknown>, idempotencyKey: string): Promise<GovernanceCampaign>;
  createActivity(campaignId: string, input: Record<string, unknown>, idempotencyKey: string): Promise<GovernanceActivity>;
  getTaxonomy(scope: string): Promise<Record<string, unknown>>;
  getTaxonomyVersion(): Promise<string | null>;
  getNamingRules(): Promise<Record<string, unknown>>;
  generateInternalTitle(parts: string[]): Promise<string>;
  reserveCampaignCode(): Promise<string | null>;
  reserveActivityCode(): Promise<string | null>;
  generateTrackingParameters(input: Record<string, string>): Promise<Record<string, string>>;
  validateCampaign(input: Record<string, unknown>): Promise<{ valid: boolean; issues: string[] | null }>;
  getFiscalAssignment(date: string): Promise<string | null>;
  getSupersessionStatus(id: string): Promise<{ superseded: boolean; replacementId: string | null }>;
}

export class DevelopmentGovernanceAdapter implements GovernanceProvider {
  readonly label = "Governance status: Pending authoritative assignment";

  readonly source = "Development Governance Adapter";

  async isConnected(): Promise<boolean> { return false; }

  async searchCampaigns(): Promise<GovernanceCampaign[]> { return []; }

  async getCampaign(): Promise<GovernanceCampaign | null> { return null; }

  async createDraftCampaignRequest(input: Record<string, unknown>): Promise<GovernanceCampaign> {
    return {
      governanceRecordId: null,
      governanceStatus: "Pending authoritative assignment",
      internalTitle: String(input["internalTitle"] ?? "Pending governed title"),
      campaignCode: null,
      taxonomyVersion: null,
      authoritativeSource: this.source,
      fiscalAssignment: null,
      trackingParameters: {},
      validation: { valid: false, issues: ["Authoritative governance provider is not configured"] },
      supersession: { superseded: false, replacementId: null },
      providerResponse: {},
    };
  }

  async getTaxonomy(): Promise<Record<string, unknown>> { return { status: "unavailable" }; }

  async getTaxonomyVersion(): Promise<string | null> { return null; }

  async getNamingRules(): Promise<Record<string, unknown>> { return { status: "development-pattern-only" }; }

  async generateInternalTitle(parts: string[]): Promise<string> { return parts.filter(Boolean).join(" | "); }

  async reserveCampaignCode(): Promise<string | null> { return null; }

  async reserveActivityCode(): Promise<string | null> { return null; }

  async generateTrackingParameters(_input: Record<string, string>): Promise<Record<string, string>> { return {}; }

  async validateCampaign(): Promise<{ valid: boolean; issues: string[] | null }> {
    return { valid: false, issues: ["Authoritative governance provider is not configured"] };
  }

  async getFiscalAssignment(_date: string): Promise<string | null> { return null; }

  async getSupersessionStatus(): Promise<{ superseded: boolean; replacementId: string | null }> {
    return { superseded: false, replacementId: null };
  }

  async createActivity(): Promise<GovernanceActivity> { throw new Error("Authoritative governance provider is not configured"); }
}

type FoundationCampaign = {
  campaignKey: string;
  name: string;
  status: string;
  taxonomyVersion?: string;
  fiscalAssignment?: string;
  fiscalPeriod?: string;
  trackingParameters?: Record<string, string>;
  validation?: { valid?: boolean; issues?: string[] };
  supersededByCampaignKey?: string | null;
  [key: string]: unknown;
};

type FoundationSummary = {
  taxonomyVersion?: string;
  principles?: string[];
};

type FoundationTaxonomyValue = Record<string, unknown> & {
  id: string;
  stableKey: string;
  category: string;
  displayName: string;
  status: string;
  taxonomyVersion: string;
};

type GovernanceFetch = typeof fetch;

export class GovernanceContractError extends Error {
  constructor(endpoint: string, detail: string) {
    super(`Invalid governance response from ${endpoint}: ${detail}`);
    this.name = "GovernanceContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCampaign(value: unknown, endpoint: string): FoundationCampaign {
  if (!isRecord(value)) {
    throw new GovernanceContractError(endpoint, "expected an object");
  }
  if (typeof value["campaignKey"] !== "string" || value["campaignKey"].length === 0) {
    throw new GovernanceContractError(endpoint, "campaignKey must be a non-empty string");
  }
  if (typeof value["name"] !== "string" || value["name"].length === 0) {
    throw new GovernanceContractError(endpoint, "name must be a non-empty string");
  }
  if (typeof value["status"] !== "string" || value["status"].length === 0) {
    throw new GovernanceContractError(endpoint, "status must be a non-empty string");
  }
  return value as FoundationCampaign;
}

function parseCampaignList(value: unknown, endpoint: string): FoundationCampaign[] {
  if (!Array.isArray(value)) {
    throw new GovernanceContractError(endpoint, "expected an array");
  }
  return value.map((record) => parseCampaign(record, endpoint));
}

function parseSummary(value: unknown, endpoint: string): FoundationSummary {
  if (!isRecord(value)) {
    throw new GovernanceContractError(endpoint, "expected an object");
  }
  const taxonomyVersion = value["taxonomyVersion"];
  const principles = value["principles"];
  if (taxonomyVersion !== undefined && typeof taxonomyVersion !== "string") {
    throw new GovernanceContractError(endpoint, "taxonomyVersion must be a string");
  }
  if (
    principles !== undefined
    && (!Array.isArray(principles) || !principles.every((item) => typeof item === "string"))
  ) {
    throw new GovernanceContractError(endpoint, "principles must be an array of strings");
  }
  return { taxonomyVersion, principles };
}

function parseTaxonomyValue(value: unknown, endpoint: string): FoundationTaxonomyValue {
  if (!isRecord(value)) {
    throw new GovernanceContractError(endpoint, "expected each taxonomy value to be an object");
  }
  for (const field of [
    "id",
    "stableKey",
    "category",
    "displayName",
    "status",
    "taxonomyVersion",
  ] as const) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      throw new GovernanceContractError(
        endpoint,
        `taxonomy value ${field} must be a non-empty string`,
      );
    }
  }
  return value as FoundationTaxonomyValue;
}

function parseTaxonomyValues(value: unknown, endpoint: string): FoundationTaxonomyValue[] {
  if (!Array.isArray(value)) {
    throw new GovernanceContractError(endpoint, "expected an array");
  }
  return value.map((entry) => parseTaxonomyValue(entry, endpoint));
}

export class CampaignGovernanceFoundationAdapter implements GovernanceProvider {
  readonly label = "Governance status: Connected to Campaign Governance Foundation";

  readonly source = "Campaign Governance Foundation";

  private readonly baseUrl: string;

  private readonly fetchImpl: GovernanceFetch;

  private readonly timeoutMs: number;

  constructor(
    baseUrl = process.env.GOVERNANCE_BASE_URL
      ?? "https://campaign-governance-foundation.replit.app",
    fetchImplOrToken: GovernanceFetch | string = fetch,
    timeoutMs = 5_000,
    token = process.env.GOVERNANCE_SERVICE_TOKEN,
  ) {
    this.baseUrl = baseUrl;
    this.fetchImpl = typeof fetchImplOrToken === "function" ? fetchImplOrToken : fetch;
    this.timeoutMs = timeoutMs;
    this.token = typeof fetchImplOrToken === "string" ? fetchImplOrToken : token;
  }

  private headers(idempotencyKey?: string): Record<string, string> {
    return {
      accept: "application/json",
      origin: new URL(this.baseUrl).origin,
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchImpl(new URL(path, this.baseUrl), {
      ...init,
      headers: { ...this.headers(), ...init.headers },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Governance request failed (${response.status})`);
    }
    try {
      return await response.json() as unknown;
    } catch {
      throw new GovernanceContractError(path, "expected valid JSON");
    }
  }

  private mapCampaign(record: FoundationCampaign): GovernanceCampaign {
    return {
      governanceRecordId: record.campaignKey,
      governanceStatus: record.status === "superseded"
        ? "Superseded"
        : record.status === "draft"
          ? "Authoritative draft"
          : "Authoritative",
      internalTitle: record.name,
      campaignCode: record.campaignKey,
      taxonomyVersion: record.taxonomyVersion ?? null,
      authoritativeSource: this.source,
      fiscalAssignment: record.fiscalAssignment ?? record.fiscalPeriod ?? null,
      trackingParameters: record.trackingParameters ?? null,
      validation: record.validation?.valid === undefined ? null : {
        valid: record.validation.valid,
        issues: record.validation.issues ?? null,
      },
      supersession: record.status !== "superseded" && record.supersededByCampaignKey === undefined ? null : {
        superseded: record.status === "superseded",
        replacementId: record.supersededByCampaignKey ?? null,
      },
      providerResponse: record,
    };
  }

  async isConnected(): Promise<boolean> {
    if (!this.token?.trim()) return false;
    try {
      const health = await this.request("/api/healthz") as Record<string, unknown>;
      if (!isRecord(health) || health["status"] !== "ok") return false;
      await this.request("/api/auth/user");
      return true;
    } catch {
      return false;
    }
  }

  async searchCampaigns(query: string): Promise<GovernanceCampaign[]> {
    const path = `/api/campaigns?search=${encodeURIComponent(query)}`;
    const records = parseCampaignList(await this.request(path), path);
    return records.map((record) => this.mapCampaign(record));
  }

  async getCampaign(id: string): Promise<GovernanceCampaign | null> {
    const path = `/api/campaigns/${encodeURIComponent(id)}`;
    const response = await this.fetchImpl(new URL(path, this.baseUrl), {
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Governance request failed (${response.status})`);
    let payload: unknown;
    try {
      payload = await response.json() as unknown;
    } catch {
      throw new GovernanceContractError(path, "expected valid JSON");
    }
    return this.mapCampaign(parseCampaign(payload, path));
  }

  async createDraftCampaignRequest(input: Record<string, unknown>, idempotencyKey: string): Promise<GovernanceCampaign> {
    this.requireWriteAuthentication();
    const created = parseCampaign(await this.request("/api/campaigns", {
      method: "POST",
      headers: { ...this.headers(idempotencyKey), "content-type": "application/json" },
      body: JSON.stringify(input),
    }), "/api/campaigns");
    const submitted = parseCampaign(await this.request(
      `/api/campaigns/${encodeURIComponent(created.campaignKey)}/submit`,
      {
        method: "POST",
        headers: { ...this.headers(`${idempotencyKey}:submit`), "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    ), `/api/campaigns/${encodeURIComponent(created.campaignKey)}/submit`);
    if (submitted.campaignKey !== created.campaignKey) {
      throw new Error("Governance campaign submission returned a different campaignKey");
    }
    return this.mapCampaign(submitted);
  }

  async getTaxonomy(scope: string): Promise<Record<string, unknown>> {
    const path = `/api/taxonomy/values?category=${encodeURIComponent(scope)}`;
    const values = parseTaxonomyValues(await this.request(path), path);
    return { scope, values };
  }

  async getTaxonomyVersion(): Promise<string | null> {
    const path = "/api/foundation/summary";
    const summary = parseSummary(await this.request(path), path);
    return summary.taxonomyVersion ?? null;
  }

  async getNamingRules(): Promise<Record<string, unknown>> {
    const path = "/api/foundation/summary";
    const summary = parseSummary(await this.request(path), path);
    return { principles: summary.principles ?? [] };
  }

  async generateInternalTitle(parts: string[]): Promise<string> {
    return parts.filter(Boolean).join(" | ");
  }

  async reserveCampaignCode(): Promise<string | null> { return null; }

  async reserveActivityCode(): Promise<string | null> { return null; }

  async generateTrackingParameters(_input: Record<string, string>): Promise<Record<string, string>> { return {}; }

  async validateCampaign(): Promise<{ valid: boolean; issues: string[] | null }> {
    return {
      valid: false,
      issues: ["The governance system does not expose a documented validation endpoint"],
    };
  }

  async getFiscalAssignment(_date: string): Promise<string | null> { return null; }

  async getSupersessionStatus(): Promise<{ superseded: boolean; replacementId: string | null }> {
    return { superseded: false, replacementId: null };
  }

  private readonly token: string | undefined;

  private requireWriteAuthentication(): void {
    if (!this.token?.trim()) {
      throw new Error("GOVERNANCE_SERVICE_TOKEN is required for governance writes");
    }
  }

  async createActivity(campaignId: string, input: Record<string, unknown>, idempotencyKey: string): Promise<GovernanceActivity> {
    this.requireWriteAuthentication();
    const response = await this.request(
      `/api/campaigns/${encodeURIComponent(campaignId)}/activities`,
      {
        method: "POST",
        headers: { ...this.headers(idempotencyKey), "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    ) as Record<string, unknown>;
    const rawId = response["activityKey"] ?? response["activityCode"] ?? response["id"];
    if (typeof rawId !== "string" || !rawId.trim()) {
      throw new Error("Governance activity response did not include an official string identifier");
    }
    const id = rawId.trim();
    const activityCode = typeof response["activityCode"] === "string" && response["activityCode"].trim()
      ? response["activityCode"]
      : null;
    const status = typeof response["status"] === "string" ? response["status"] : null;
    return {
      governanceRecordId: id,
      governanceStatus: status === "superseded"
        ? "Superseded"
        : status === "draft" || status === null
          ? "Authoritative draft"
          : "Authoritative",
      activityCode,
      taxonomyVersion: typeof response["taxonomyVersion"] === "string" ? response["taxonomyVersion"] : null,
      authoritativeSource: this.source,
      providerResponse: response,
    };
  }
}

export const governanceProvider = new CampaignGovernanceFoundationAdapter();
