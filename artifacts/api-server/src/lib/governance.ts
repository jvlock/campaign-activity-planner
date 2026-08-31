export type GovernanceRecordStatus =
  | "Authoritative"
  | "Pending authoritative assignment"
  | "Superseded";

export interface GovernanceCampaign {
  governanceRecordId: string | null;
  governanceStatus: GovernanceRecordStatus;
  internalTitle: string;
  campaignCode: string | null;
  taxonomyVersion: string | null;
  authoritativeSource: string;
}

export interface GovernanceProvider {
  readonly label: string;
  readonly source: string;
  isConnected(): Promise<boolean>;
  searchCampaigns(query: string): Promise<GovernanceCampaign[]>;
  getCampaign(id: string): Promise<GovernanceCampaign | null>;
  createDraftCampaignRequest(input: Record<string, unknown>): Promise<GovernanceCampaign>;
  getTaxonomy(scope: string): Promise<Record<string, unknown>>;
  getTaxonomyVersion(): Promise<string | null>;
  getNamingRules(): Promise<Record<string, unknown>>;
  generateInternalTitle(parts: string[]): Promise<string>;
  reserveCampaignCode(): Promise<string | null>;
  reserveActivityCode(): Promise<string | null>;
  generateTrackingParameters(input: Record<string, string>): Promise<Record<string, string>>;
  validateCampaign(input: Record<string, unknown>): Promise<{ valid: boolean; issues: string[] }>;
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
    };
  }
  async getTaxonomy(): Promise<Record<string, unknown>> { return { status: "unavailable" }; }
  async getTaxonomyVersion(): Promise<string | null> { return null; }
  async getNamingRules(): Promise<Record<string, unknown>> { return { status: "development-pattern-only" }; }
  async generateInternalTitle(parts: string[]): Promise<string> { return parts.filter(Boolean).join(" | "); }
  async reserveCampaignCode(): Promise<string | null> { return null; }
  async reserveActivityCode(): Promise<string | null> { return null; }
  async generateTrackingParameters(): Promise<Record<string, string>> { return {}; }
  async validateCampaign(): Promise<{ valid: boolean; issues: string[] }> {
    return { valid: false, issues: ["Authoritative governance provider is not configured"] };
  }
  async getFiscalAssignment(): Promise<string | null> { return null; }
  async getSupersessionStatus(): Promise<{ superseded: boolean; replacementId: string | null }> {
    return { superseded: false, replacementId: null };
  }
}

type FoundationCampaign = {
  campaignKey: string;
  name: string;
  status: string;
};

type FoundationSummary = {
  taxonomyVersion?: string;
  principles?: string[];
};

export class CampaignGovernanceFoundationAdapter implements GovernanceProvider {
  readonly label = "Governance status: Connected to Campaign Governance Foundation";
  readonly source = "Campaign Governance Foundation";

  constructor(
    private readonly baseUrl = process.env.GOVERNANCE_BASE_URL
      ?? "https://campaign-governance-foundation.replit.app",
  ) {}

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(new URL(path, this.baseUrl), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Governance request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  private mapCampaign(record: FoundationCampaign): GovernanceCampaign {
    return {
      governanceRecordId: record.campaignKey,
      governanceStatus: record.status === "superseded" ? "Superseded" : "Authoritative",
      internalTitle: record.name,
      campaignCode: record.campaignKey,
      taxonomyVersion: null,
      authoritativeSource: this.source,
    };
  }

  async isConnected(): Promise<boolean> {
    try {
      const health = await this.request<{ status?: string }>("/api/healthz");
      return health.status === "ok";
    } catch {
      return false;
    }
  }

  async searchCampaigns(query: string): Promise<GovernanceCampaign[]> {
    const records = await this.request<FoundationCampaign[]>(
      `/api/campaigns?search=${encodeURIComponent(query)}`,
    );
    return records.map((record) => this.mapCampaign(record));
  }

  async getCampaign(id: string): Promise<GovernanceCampaign | null> {
    const response = await fetch(new URL(`/api/campaigns/${encodeURIComponent(id)}`, this.baseUrl), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Governance request failed (${response.status})`);
    return this.mapCampaign(await response.json() as FoundationCampaign);
  }

  async createDraftCampaignRequest(input: Record<string, unknown>): Promise<GovernanceCampaign> {
    return {
      governanceRecordId: null,
      governanceStatus: "Pending authoritative assignment",
      internalTitle: String(input["internalTitle"] ?? "Pending governed title"),
      campaignCode: null,
      taxonomyVersion: await this.getTaxonomyVersion(),
      authoritativeSource: this.source,
    };
  }

  async getTaxonomy(scope: string): Promise<Record<string, unknown>> {
    const values = await this.request<Record<string, unknown>[]>(
      `/api/taxonomy/values?category=${encodeURIComponent(scope)}`,
    );
    return { scope, values };
  }

  async getTaxonomyVersion(): Promise<string | null> {
    const summary = await this.request<FoundationSummary>("/api/foundation/summary");
    return summary.taxonomyVersion ?? null;
  }

  async getNamingRules(): Promise<Record<string, unknown>> {
    const summary = await this.request<FoundationSummary>("/api/foundation/summary");
    return { principles: summary.principles ?? [] };
  }

  async generateInternalTitle(parts: string[]): Promise<string> {
    return parts.filter(Boolean).join(" | ");
  }

  async reserveCampaignCode(): Promise<string | null> { return null; }
  async reserveActivityCode(): Promise<string | null> { return null; }
  async generateTrackingParameters(): Promise<Record<string, string>> { return {}; }

  async validateCampaign(): Promise<{ valid: boolean; issues: string[] }> {
    return {
      valid: false,
      issues: ["The governance system does not expose a documented validation endpoint"],
    };
  }

  async getFiscalAssignment(): Promise<string | null> { return null; }
  async getSupersessionStatus(): Promise<{ superseded: boolean; replacementId: string | null }> {
    return { superseded: false, replacementId: null };
  }
}

export const governanceProvider = new CampaignGovernanceFoundationAdapter();