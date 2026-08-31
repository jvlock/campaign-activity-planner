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

export const governanceProvider = new DevelopmentGovernanceAdapter();