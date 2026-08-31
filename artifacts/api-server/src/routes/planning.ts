import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  audienceBranchesTable,
  audienceDefinitionsTable,
  campaignActivitiesTable,
  campaignPlansTable,
  changeEventsTable,
  communicationsTable,
  companyDisplayNamesTable,
  contentVersionsTable,
  destinationsTable,
  attendanceResultsTable,
  registrationResultsTable,
  registrationRulesTable,
  personCommunicationStatesTable,
  scheduledInstancesTable,
  scheduleRulesTable,
  trackingLinksTable,
  webinarEventsTable,
  webinarSessionsTable,
  webinarSpeakersTable,
} from "@workspace/db";
import {
  ConfirmRescheduleBody,
  ConfirmRescheduleParams,
  CreateCampaignBody,
  CreateWebinarBody,
  CreateWebinarParams,
  GetCampaignParams,
  GetActivityParams,
  GetCommunicationParams,
  GetGovernanceTaxonomyParams,
  GetCommunicationReadinessParams,
  PreviewRescheduleBody,
  PreviewRescheduleParams,
  UpdateCampaignBody,
  UpdateCampaignParams,
  UpdateCommunicationBody,
  UpdateCommunicationParams,
  RetryCampaignGovernanceParams,
  ExportImplementationWorkbookParams,
  RegisterWebinarPersonParams,
  RegisterWebinarPersonBody,
  RecordWebinarAttendanceParams,
  RecordWebinarAttendanceBody,
  RegisterTrackingLinkParams,
  RegisterTrackingLinkBody,
  CreateCompanyAliasBody,
  ResolveCompanyAliasQueryParams,
  UpdateCompanyAliasParams,
  UpdateCompanyAliasBody,
  DeleteCompanyAliasParams,
} from "@workspace/api-zod";
import { calculateWebinarSchedule } from "../lib/scheduling";
import { governanceProvider, type GovernanceCampaign } from "../lib/governance";
import { buildTrackedUrl, containsDirectPii, hasRequiredCampaignDetails, hasRequiredWebinarOwnership, isOpaqueExternalPersonReference } from "../lib/privacy";
import { normalizeGovernanceTaxonomy } from "../lib/taxonomy";

const router: IRouter = Router();
const actor = "Development User";

function dateOnly(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

function campaignDto(row: typeof campaignPlansTable.$inferSelect, activityCount = 0, warningCount = 0) {
  return {
    id: row.id,
    internalTitle: row.internalTitle,
    shortTitle: row.shortTitle,
    objective: row.objective,
    lifecycleStatus: row.lifecycleStatus,
    governanceStatus: row.governanceStatus,
    governanceRecordId: row.governanceRecordId,
    campaignCode: row.campaignCode,
    owner: row.owner,
    startDate: row.startDate,
    endDate: row.endDate,
    product: row.product,
    geography: row.geography,
    businessUnit: row.businessUnit,
    campaignType: row.campaignType,
    audienceSegment: row.audienceSegment,
    fiscalPeriod: row.fiscalPeriod,
    description: row.description,
    activityCount,
    warningCount,
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

function activityDto(row: typeof campaignActivitiesTable.$inferSelect) {
  return {
    id: row.id,
    campaignId: row.campaignId,
    activityType: row.activityType,
    internalTitle: row.internalTitle,
    shortTitle: row.shortTitle,
    lifecycleStatus: row.lifecycleStatus,
    governanceStatus: row.governanceStatus,
    eventDate: row.anchorDate ?? "1970-01-01",
    startTime: row.anchorTime ?? "00:00",
    timezone: row.timezone ?? "UTC",
    owner: row.owner,
    activityCode: row.activityCode,
    version: row.version,
  };
}

async function communicationDtos(activityIds: string[]) {
  if (activityIds.length === 0) return [];
  const rows = await db
    .select({
      communication: communicationsTable,
      rule: scheduleRulesTable,
      instance: scheduledInstancesTable,
      content: contentVersionsTable,
      destination: destinationsTable,
      link: trackingLinksTable,
    })
    .from(communicationsTable)
    .innerJoin(scheduleRulesTable, eq(scheduleRulesTable.communicationId, communicationsTable.id))
    .innerJoin(scheduledInstancesTable, eq(scheduledInstancesTable.communicationId, communicationsTable.id))
    .leftJoin(contentVersionsTable, and(eq(contentVersionsTable.communicationId, communicationsTable.id), eq(contentVersionsTable.isCurrent, true)))
    .leftJoin(destinationsTable, eq(destinationsTable.activityId, communicationsTable.activityId))
    .leftJoin(trackingLinksTable, eq(trackingLinksTable.communicationId, communicationsTable.id))
    .where(inArray(communicationsTable.activityId, activityIds))
    .orderBy(asc(scheduledInstancesTable.adjustedDate), asc(scheduledInstancesTable.sendTime));
  return rows.map(({ communication, rule, instance, content, destination, link }) => ({
    id: communication.id,
    activityId: communication.activityId,
    internalTitle: communication.internalTitle,
    shortTitle: communication.shortTitle,
    communicationType: communication.communicationType,
    channel: communication.channel,
    audienceBranch: communication.audienceBranch,
    relativeRule: rule.relativeRule,
    originalDate: instance.originalCalculatedDate,
    scheduledDate: instance.adjustedDate,
    sendTime: instance.sendTime,
    timezone: instance.timezone,
    adjustmentReason: instance.adjustmentReason,
    lifecycleStatus: communication.lifecycleStatus,
    approvalStatus: communication.approvalStatus,
    warningCount: communication.warningCount,
    pinned: communication.pinned,
    sent: communication.sent,
    subject: content?.subject ?? null,
    preheader: content?.preheader ?? null,
    body: content?.body ?? null,
    destinationUrl: destination?.baseUrl ?? null,
    header: content?.header ?? null,
    primaryCtaLabel: content?.primaryCta ?? null,
    destinationType: destination?.destinationType ?? null,
    secondaryCtaLabel: content?.secondaryCta ?? null,
    secondaryCtaUrl: content?.secondaryCtaUrl ?? null,
    fromName: content?.senderName ?? null,
    replyTo: content?.replyToAddress ?? null,
    dynamicTokens: communication.dynamicTokens,
    tokenFallbacks: content?.tokenFallbacks ?? {},
    communicationCode: communication.communicationCode,
    utmParameters: (link?.parameters as Record<string, string> | undefined) ?? {},
    owner: communication.owner,
    dependencies: communication.dependencies,
    qaChecklist: communication.qaChecklist,
    version: communication.version,
  }));
}

async function workspace(campaignId: string) {
  const [campaign] = await db.select().from(campaignPlansTable).where(eq(campaignPlansTable.id, campaignId));
  if (!campaign) return null;
  const activities = await db.select().from(campaignActivitiesTable).where(eq(campaignActivitiesTable.campaignId, campaignId));
  const activityIds = activities.map((item) => item.id);
  const communications = await communicationDtos(activityIds);
  const changes = await db.select().from(changeEventsTable)
    .where(inArray(changeEventsTable.recordId, [campaignId, ...activityIds]))
    .orderBy(desc(changeEventsTable.createdAt))
    .limit(20);
  return {
    campaign: campaignDto(campaign, activities.length, communications.reduce((sum, item) => sum + item.warningCount, 0)),
    activities: activities.map(activityDto),
    communications,
    changeEvents: changes.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      summary: event.summary,
      actor: event.actor,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

router.get("/governance/status", async (_req, res): Promise<void> => {
  const connected = await governanceProvider.isConnected();
  res.json({ connected, label: governanceProvider.label, authoritativeSource: governanceProvider.source });
});

router.get("/governance/taxonomy/:scope", async (req, res): Promise<void> => {
  const params = GetGovernanceTaxonomyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "A taxonomy scope is required" }); return; }
  let connected: boolean;
  try {
    connected = await governanceProvider.isConnected();
  } catch (error) {
    req.log.warn({ err: error, scope: params.data.scope }, "Governance connection check failed");
    res.status(503).json({ error: "Governance provider is unavailable; retry taxonomy retrieval" });
    return;
  }
  if (!connected) {
    res.json({ scope: params.data.scope, taxonomyVersion: null, connected: false, values: [] });
    return;
  }
  try {
    const taxonomy = await governanceProvider.getTaxonomy(params.data.scope);
    res.json({ ...normalizeGovernanceTaxonomy(params.data.scope, taxonomy), connected: true });
  } catch (error) {
    req.log.warn({ err: error, scope: params.data.scope }, "Governance taxonomy retrieval failed");
    res.status(503).json({ error: "Governance taxonomy retrieval failed; retry the request" });
  }
});

router.get("/campaigns", async (_req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignPlansTable).orderBy(desc(campaignPlansTable.updatedAt));
  const counts = await db.select({ campaignId: campaignActivitiesTable.campaignId, count: sql<number>`count(*)::int` })
    .from(campaignActivitiesTable).groupBy(campaignActivitiesTable.campaignId);
  const countById = new Map(counts.map((item) => [item.campaignId, item.count]));
  res.json(campaigns.map((row) => campaignDto(row, countById.get(row.id) ?? 0, 0)));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!hasRequiredCampaignDetails(parsed.data)) {
    res.status(400).json({ error: "campaignType, audienceSegment, fiscalPeriod, and description are required" });
    return;
  }
  const startDate = dateOnly(parsed.data.startDate);
  const endDate = dateOnly(parsed.data.endDate);
  const internalTitle = await governanceProvider.generateInternalTitle([parsed.data.shortTitle, startDate, "Campaign"]);
  const governanceConnected = await governanceProvider.isConnected();
  let governedCampaign: GovernanceCampaign = {
    governanceRecordId: null,
    governanceStatus: "Pending authoritative assignment",
    internalTitle,
    campaignCode: null,
    taxonomyVersion: null,
    authoritativeSource: governanceProvider.source,
  };
  let campaignCode: string | null = null;
  let fiscalAssignment: string | null = null;
  let taxonomyVersion: string | null = null;
  if (governanceConnected) {
    try {
      governedCampaign = await governanceProvider.createDraftCampaignRequest({
        internalTitle,
        shortTitle: parsed.data.shortTitle,
        objective: parsed.data.objective,
        product: parsed.data.product,
        geography: parsed.data.geography,
        businessUnit: parsed.data.businessUnit,
        campaignType: parsed.data.campaignType,
        audienceSegment: parsed.data.audienceSegment,
        fiscalPeriod: parsed.data.fiscalPeriod,
      });
      [campaignCode, fiscalAssignment, taxonomyVersion] = await Promise.all([
        governanceProvider.reserveCampaignCode(),
        governanceProvider.getFiscalAssignment(startDate),
        governanceProvider.getTaxonomyVersion(),
      ]);
    } catch (error) {
      req.log.warn({ err: error }, "Governance enrichment unavailable during campaign creation");
    }
  }
  const [campaign] = await db.insert(campaignPlansTable).values({
    shortTitle: parsed.data.shortTitle,
    objective: parsed.data.objective,
    owner: parsed.data.owner,
    startDate,
    endDate,
    product: parsed.data.product,
    geography: parsed.data.geography,
    businessUnit: parsed.data.businessUnit,
    campaignType: parsed.data.campaignType,
    audienceSegment: parsed.data.audienceSegment,
    fiscalPeriod: parsed.data.fiscalPeriod,
    description: parsed.data.description,
    internalTitle: governedCampaign.internalTitle,
    governanceRecordId: governedCampaign.governanceRecordId,
    governanceStatus: governedCampaign.governanceStatus,
    authoritativeSource: governedCampaign.authoritativeSource,
    campaignCode: governedCampaign.campaignCode ?? campaignCode,
    fiscalAssignment,
    taxonomyVersion: governedCampaign.taxonomyVersion ?? taxonomyVersion,
  }).returning();
  await db.insert(changeEventsTable).values({
    recordType: "campaign_plan", recordId: campaign.id, eventType: "created",
    summary: governanceConnected
      ? "Campaign plan created with pending governance assignment"
      : "Campaign plan created; authoritative governance unavailable and retry is required",
    actor, afterValue: campaign,
  });
  res.status(201).json(campaignDto(campaign));
});

router.post("/campaigns/:campaignId/governance/retry", async (req, res): Promise<void> => {
  const parsed = RetryCampaignGovernanceParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid campaign id" }); return; }
  const [campaign] = await db.select().from(campaignPlansTable).where(eq(campaignPlansTable.id, parsed.data.campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  let patch: Partial<typeof campaignPlansTable.$inferInsert> = {
    governanceStatus: "Pending authoritative assignment",
    authoritativeSource: governanceProvider.source,
  };
  let summary = "Governance retry deferred because authoritative provider is unavailable";
  try {
    if (await governanceProvider.isConnected()) {
      const governed = await governanceProvider.createDraftCampaignRequest({
        internalTitle: campaign.internalTitle,
        shortTitle: campaign.shortTitle,
        objective: campaign.objective,
      });
      patch = { ...patch, ...governed };
      summary = `Governance retry completed with status ${governed.governanceStatus}`;
    }
  } catch (error) {
    req.log.warn({ err: error, campaignId: campaign.id }, "Governance retry failed");
    summary = "Governance retry failed; campaign remains pending authoritative assignment";
  }
  const [updated] = await db.update(campaignPlansTable).set({
    ...patch, version: campaign.version + 1, updatedAt: new Date(), updatedBy: actor,
  }).where(eq(campaignPlansTable.id, campaign.id)).returning();
  await db.insert(changeEventsTable).values({
    recordType: "campaign_plan", recordId: campaign.id, eventType: "governance_retry",
    summary, actor, beforeValue: campaign, afterValue: updated,
  });
  res.json(campaignDto(updated));
});

router.get("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const parsed = GetCampaignParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = await workspace(parsed.data.campaignId);
  if (!result) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.json(result);
});

router.patch("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  const body = UpdateCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid campaign update" }); return; }
  const [before] = await db.select().from(campaignPlansTable).where(eq(campaignPlansTable.id, params.data.campaignId));
  if (!before) { res.status(404).json({ error: "Campaign not found" }); return; }
  const [updated] = await db.update(campaignPlansTable).set({
    ...body.data, version: before.version + 1, updatedAt: new Date(), updatedBy: actor,
  }).where(eq(campaignPlansTable.id, params.data.campaignId)).returning();
  await db.insert(changeEventsTable).values({
    recordType: "campaign_plan", recordId: updated.id, eventType: "updated",
    summary: "Campaign plan updated", actor, beforeValue: before, afterValue: updated,
  });
  res.json(campaignDto(updated));
});

router.post("/campaigns/:campaignId/webinar", async (req, res): Promise<void> => {
  const params = CreateWebinarParams.safeParse(req.params);
  const body = CreateWebinarBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid webinar setup" }); return; }
  if (!hasRequiredWebinarOwnership(body.data)) {
    res.status(400).json({ error: "registrationPending, webinarOwner, and emailMarketingOwner are required" });
    return;
  }
  const webinarOwner = body.data.webinarOwner!;
  const emailMarketingOwner = body.data.emailMarketingOwner!;
  const registrationPending = body.data.registrationPending!;
  const [campaign] = await db.select().from(campaignPlansTable).where(eq(campaignPlansTable.id, params.data.campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  const eventDate = dateOnly(body.data.eventDate);
  const title = await governanceProvider.generateInternalTitle([body.data.product, eventDate, "Webinar", body.data.subject, body.data.segment]);
  let activityCode: string | null = null;
  try {
    if (await governanceProvider.isConnected()) activityCode = await governanceProvider.reserveActivityCode();
  } catch (error) {
    req.log.warn({ err: error, campaignId: campaign.id }, "Activity code reservation unavailable");
  }
  const [activity] = await db.insert(campaignActivitiesTable).values({
    campaignId: campaign.id, activityType: "Webinar", internalTitle: title,
    shortTitle: body.data.subject, owner: webinarOwner, anchorDate: eventDate,
    anchorTime: body.data.startTime, timezone: body.data.timezone,
    activityCode,
  }).returning();
  const [webinar] = await db.insert(webinarEventsTable).values({
    activityId: activity.id, externalTitle: body.data.externalTitle, subject: body.data.subject,
    product: body.data.product, topic: body.data.topic, objective: body.data.objective,
    successMeasure: body.data.successMeasure, durationMinutes: body.data.durationMinutes, platform: body.data.platform,
    registrationPending, webinarOwner, emailMarketingOwner,
  }).returning();
  for (const speaker of body.data.speakers ?? []) {
    await db.insert(webinarSpeakersTable).values({
      webinarEventId: webinar.id,
      name: speaker.name,
      title: speaker.title,
      organization: speaker.organization,
      bio: speaker.bio,
    });
  }
  const [audience] = await db.insert(audienceDefinitionsTable).values({
    activityId: activity.id, internalTitle: `${body.data.segment} | ${body.data.geography} | ${body.data.language}`,
    segment: body.data.segment, geography: body.data.geography, language: body.data.language,
    subsegment: body.data.subsegment, persona: body.data.persona,
    customerStatus: body.data.customerStatus, exclusions: body.data.exclusions ?? [],
  }).returning();
  for (const name of ["Recruitment", "Registered", "Attended", "No Show", "Did Not Register"]) {
    await db.insert(audienceBranchesTable).values({
      audienceDefinitionId: audience.id, key: name.toLowerCase().replaceAll(" ", "-"), name,
      suppressionRule: name === "Recruitment" ? { exitOn: "registration" } : {},
    });
  }
  const schedules = calculateWebinarSchedule(eventDate, [], body.data.scheduleOptions);
  await db.insert(registrationRulesTable).values({
    webinarEventId: webinar.id,
    suppressRecruitmentOnRegistration: true,
    ruleDefinition: {
      suppressBranch: "Recruitment",
      enterBranch: "Registered",
      effective: "immediate",
    },
  });
  await db.insert(webinarSessionsTable).values({
    webinarEventId: webinar.id, sessionDate: eventDate, startTime: body.data.startTime,
    durationMinutes: body.data.durationMinutes, timezone: body.data.timezone,
  });
  for (const item of schedules) {
    const [communication] = await db.insert(communicationsTable).values({
      activityId: activity.id, audienceBranch: item.branch, communicationType: item.type,
      internalTitle: `${title} | ${item.title} ${item.rule}`, shortTitle: item.title, owner: emailMarketingOwner,
      activityCode,
    }).returning();
    const [rule] = await db.insert(scheduleRulesTable).values({
      communicationId: communication.id, relativeRule: item.rule, offsetDays: item.offsetDays,
      offsetMinutes: item.offsetMinutes ?? 0,
      direction: item.direction, businessDayStrategy: item.businessDayStrategy,
      audienceLocalTime: item.branch === "Recruitment", sendTime: item.sendTime,
    }).returning();
    await db.insert(scheduledInstancesTable).values({
      communicationId: communication.id, scheduleRuleId: rule.id,
      originalCalculatedDate: item.originalDate, adjustedDate: item.scheduledDate,
      adjustmentReason: item.adjustmentReason, sendTime: item.sendTime, timezone: body.data.timezone,
    });
    await db.insert(contentVersionsTable).values({
      communicationId: communication.id, versionNumber: 1,
      subject: item.type === "Invitation" ? `You're invited: ${body.data.externalTitle}` : null,
      preheader: item.title, body: "", isCurrent: true,
    });
  }
  if (body.data.registrationUrl) {
    await db.insert(destinationsTable).values({
      activityId: activity.id, internalTitle: `${title} | Registration`,
      destinationType: "registration", baseUrl: body.data.registrationUrl, validationStatus: "Pending",
    });
  }
  await db.insert(changeEventsTable).values({
    recordType: "campaign_activity", recordId: activity.id, eventType: "created",
    summary: `Webinar created and ${schedules.length} communications scheduled`, actor, afterValue: activity,
  });
  res.status(201).json(await workspace(campaign.id));
});

async function reschedulePreview(activityId: string, eventDate: string, startTime?: string, timezone?: string) {
  const [activity] = await db.select().from(campaignActivitiesTable).where(eq(campaignActivitiesTable.id, activityId));
  if (!activity || !activity.anchorDate) return null;
  const current = await communicationDtos([activityId]);
  const proposed = calculateWebinarSchedule(eventDate, [], {
    includeStartNotification: current.some((item) => item.communicationType === "Start notification"),
  });
  const byIdentity = new Map(proposed.map((item) => [`${item.title}|${item.branch}|${item.rule}`, item]));
  return {
    oldEventDate: activity.anchorDate,
    newEventDate: eventDate,
    oldStartTime: activity.anchorTime,
    newStartTime: startTime ?? activity.anchorTime,
    oldTimezone: activity.timezone,
    newTimezone: timezone ?? activity.timezone,
    items: current.map((item, index) => ({
      communicationId: item.id,
      title: item.shortTitle,
      oldDate: item.scheduledDate,
      proposedDate: byIdentity.get(`${item.shortTitle}|${item.audienceBranch}|${item.relativeRule}`)?.scheduledDate
        ?? proposed[index]?.scheduledDate ?? item.scheduledDate,
      action: item.sent ? "Retain sent"
        : ["Completed", "Cancelled"].includes(item.lifecycleStatus) ? `Retain ${item.lifecycleStatus.toLowerCase()}`
        : item.adjustmentReason?.toLowerCase().includes("manual") ? "Retain manual override"
        : item.pinned ? "Retain pinned" : "Move",
      warning: item.sent || item.pinned || ["Completed", "Cancelled"].includes(item.lifecycleStatus)
        || Boolean(item.adjustmentReason?.toLowerCase().includes("manual")),
    })),
    warnings: current
      .filter((item) => item.sent || item.pinned || ["Completed", "Cancelled"].includes(item.lifecycleStatus)
        || item.adjustmentReason?.toLowerCase().includes("manual"))
      .map((item) => `${item.shortTitle} will not move because it is ${
        item.sent ? "sent" : item.pinned ? "pinned"
          : item.adjustmentReason?.toLowerCase().includes("manual") ? "manually overridden" : item.lifecycleStatus.toLowerCase()
      }.`),
  };
}

router.post("/activities/:activityId/reschedule", async (req, res): Promise<void> => {
  const params = PreviewRescheduleParams.safeParse(req.params);
  const body = PreviewRescheduleBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid reschedule request" }); return; }
  const preview = await reschedulePreview(params.data.activityId, dateOnly(body.data.eventDate), body.data.startTime, body.data.timezone);
  if (!preview) { res.status(404).json({ error: "Activity not found" }); return; }
  res.json(preview);
});

router.post("/activities/:activityId/confirm-reschedule", async (req, res): Promise<void> => {
  const params = ConfirmRescheduleParams.safeParse(req.params);
  const body = ConfirmRescheduleBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid reschedule request" }); return; }
  const eventDate = dateOnly(body.data.eventDate);
  const preview = await reschedulePreview(params.data.activityId, eventDate, body.data.startTime, body.data.timezone);
  if (!preview) { res.status(404).json({ error: "Activity not found" }); return; }
  const [before] = await db.select().from(campaignActivitiesTable).where(eq(campaignActivitiesTable.id, params.data.activityId));
  await db.transaction(async (tx) => {
    await tx.update(campaignActivitiesTable).set({
      anchorDate: eventDate,
      anchorTime: body.data.startTime ?? before.anchorTime,
      timezone: body.data.timezone ?? before.timezone,
      version: before.version + 1,
      updatedAt: new Date(),
    }).where(eq(campaignActivitiesTable.id, params.data.activityId));
    const [webinar] = await tx.select().from(webinarEventsTable)
      .where(eq(webinarEventsTable.activityId, before.id));
    if (webinar) {
      await tx.update(webinarSessionsTable).set({
        sessionDate: eventDate,
        startTime: body.data.startTime ?? before.anchorTime ?? "00:00",
        timezone: body.data.timezone ?? before.timezone ?? "UTC",
        updatedAt: new Date(),
      }).where(eq(webinarSessionsTable.webinarEventId, webinar.id));
    }
    for (const item of preview.items.filter((candidate) => candidate.action === "Move")) {
      await tx.update(scheduledInstancesTable).set({
        adjustedDate: item.proposedDate,
        originalCalculatedDate: item.proposedDate,
        timezone: body.data.timezone ?? before.timezone ?? "UTC",
        updatedAt: new Date(),
      }).where(eq(scheduledInstancesTable.communicationId, item.communicationId));
    }
    await tx.insert(changeEventsTable).values({
      recordType: "campaign_activity", recordId: before.id, eventType: "rescheduled",
      summary: `Webinar moved from ${preview.oldEventDate} to ${preview.newEventDate}`, actor,
      beforeValue: { eventDate: preview.oldEventDate, schedule: preview.items },
      afterValue: { eventDate: preview.newEventDate, schedule: preview.items },
    });
  });
  res.json(await workspace(before.campaignId));
});

router.patch("/communications/:communicationId", async (req, res): Promise<void> => {
  const params = UpdateCommunicationParams.safeParse(req.params);
  const body = UpdateCommunicationBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid communication update" }); return; }
  const [before] = await db.select().from(communicationsTable).where(eq(communicationsTable.id, params.data.communicationId));
  if (!before) { res.status(404).json({ error: "Communication not found" }); return; }
  // Preflight every read, validation, and provider call before opening the write transaction.
  if (body.data.destinationUrl && containsDirectPii(body.data.destinationUrl, {})) {
    res.status(400).json({ error: "Destination URL must not contain direct personal information" }); return;
  }
  const [currentContent] = await db.select().from(contentVersionsTable)
    .where(and(eq(contentVersionsTable.communicationId, before.id), eq(contentVersionsTable.isCurrent, true)));
  const [existingDestination] = await db.select().from(destinationsTable)
    .where(eq(destinationsTable.activityId, before.activityId));
  const [existingLink] = await db.select().from(trackingLinksTable)
    .where(eq(trackingLinksTable.communicationId, before.id));
  let utmParameters: Record<string, string> | undefined;
  let rebuiltTrackedUrl: string | undefined;
  if (body.data.utmParameters !== undefined) {
    if (containsDirectPii("https://tracking.invalid", body.data.utmParameters)) {
      res.status(400).json({ error: "UTM parameters must not contain direct personal information" }); return;
    }
    try {
      const governedUtm = await governanceProvider.generateTrackingParameters(body.data.utmParameters);
      utmParameters = { ...governedUtm, ...body.data.utmParameters };
    } catch (error) {
      req.log.warn({ err: error, communicationId: before.id }, "Governance tracking preflight failed");
      res.status(503).json({ error: "Governance tracking parameter generation failed; no changes were made" }); return;
    }
    if (containsDirectPii("https://tracking.invalid", utmParameters)) {
      res.status(400).json({ error: "Governed UTM parameters contain direct personal information" }); return;
    }
    const linkBaseUrl = existingLink?.baseUrl ?? body.data.destinationUrl ?? existingDestination?.baseUrl;
    if (linkBaseUrl) rebuiltTrackedUrl = buildTrackedUrl(linkBaseUrl, utmParameters);
  }
  const communicationPatch = {
    ...(body.data.shortTitle !== undefined ? { shortTitle: body.data.shortTitle } : {}),
    ...(body.data.lifecycleStatus !== undefined ? { lifecycleStatus: body.data.lifecycleStatus } : {}),
    ...(body.data.approvalStatus !== undefined ? { approvalStatus: body.data.approvalStatus } : {}),
    ...(body.data.pinned !== undefined ? { pinned: body.data.pinned } : {}),
    ...(body.data.communicationCode !== undefined ? { communicationCode: body.data.communicationCode } : {}),
    ...(body.data.dynamicTokens !== undefined ? { dynamicTokens: body.data.dynamicTokens } : {}),
    ...(body.data.owner !== undefined ? { owner: body.data.owner } : {}),
    ...(body.data.dependencies !== undefined ? { dependencies: body.data.dependencies } : {}),
    ...(body.data.qaChecklist !== undefined ? { qaChecklist: body.data.qaChecklist } : {}),
    version: before.version + 1, updatedAt: new Date(),
  };
  const contentFieldsChanged = [
    "subject", "preheader", "body", "header", "primaryCtaLabel", "secondaryCtaLabel",
    "secondaryCtaUrl", "fromName", "replyTo", "tokenFallbacks",
  ].some((field) => body.data[field as keyof typeof body.data] !== undefined);
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(communicationsTable).set(communicationPatch)
      .where(eq(communicationsTable.id, before.id)).returning();
    if (contentFieldsChanged) {
      if (currentContent) await tx.update(contentVersionsTable).set({ isCurrent: false, updatedAt: new Date() })
        .where(eq(contentVersionsTable.id, currentContent.id));
      await tx.insert(contentVersionsTable).values({
        communicationId: before.id, versionNumber: (currentContent?.versionNumber ?? 0) + 1,
        subject: body.data.subject ?? currentContent?.subject, preheader: body.data.preheader ?? currentContent?.preheader,
        body: body.data.body ?? currentContent?.body, header: body.data.header ?? currentContent?.header,
        primaryCta: body.data.primaryCtaLabel ?? currentContent?.primaryCta,
        secondaryCta: body.data.secondaryCtaLabel ?? currentContent?.secondaryCta,
        secondaryCtaUrl: body.data.secondaryCtaUrl ?? currentContent?.secondaryCtaUrl,
        senderName: body.data.fromName ?? currentContent?.senderName,
        replyToAddress: body.data.replyTo ?? currentContent?.replyToAddress,
        tokenFallbacks: body.data.tokenFallbacks ?? currentContent?.tokenFallbacks ?? {}, isCurrent: true,
      });
    }
    if (body.data.destinationUrl !== undefined || body.data.destinationType !== undefined) {
      if (existingDestination) await tx.update(destinationsTable).set({
      ...(body.data.destinationUrl !== undefined ? { baseUrl: body.data.destinationUrl } : {}),
      ...(body.data.destinationType !== undefined ? { destinationType: body.data.destinationType } : {}),
      updatedAt: new Date(),
      }).where(eq(destinationsTable.id, existingDestination.id));
      else await tx.insert(destinationsTable).values({
      activityId: before.activityId, internalTitle: `${before.internalTitle} | Destination`,
      destinationType: body.data.destinationType ?? "registration", baseUrl: body.data.destinationUrl,
      });
    }
    if (utmParameters && rebuiltTrackedUrl) {
      if (existingLink) await tx.update(trackingLinksTable).set({
        parameters: utmParameters,
        finalTrackedUrl: rebuiltTrackedUrl,
        codeGenerationTimestamp: new Date(),
        updatedAt: new Date(),
      }).where(eq(trackingLinksTable.id, existingLink.id));
      else if (existingDestination?.baseUrl) await tx.insert(trackingLinksTable).values({
          communicationId: before.id,
          destinationId: existingDestination.id,
          baseUrl: existingDestination.baseUrl,
          finalTrackedUrl: rebuiltTrackedUrl,
          parameters: utmParameters,
          validationResult: { valid: true, piiRejected: false },
          codeGenerationTimestamp: new Date(),
        });
      }
    await tx.insert(changeEventsTable).values({
      recordType: "communication", recordId: before.id, eventType: "updated",
      summary: "Communication content or status updated", actor, beforeValue: before, afterValue: updated,
    });
  });
  const [dto] = await communicationDtos([before.activityId]);
  const result = (await communicationDtos([before.activityId])).find((item) => item.id === before.id) ?? dto;
  res.json(result);
});

router.get("/communications/:communicationId/readiness", async (req, res): Promise<void> => {
  const params = GetCommunicationReadinessParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid communication id" }); return; }
  const [communication] = await db.select().from(communicationsTable).where(eq(communicationsTable.id, params.data.communicationId));
  if (!communication) { res.status(404).json({ error: "Communication not found" }); return; }
  const [content] = await db.select().from(contentVersionsTable).where(and(eq(contentVersionsTable.communicationId, communication.id), eq(contentVersionsTable.isCurrent, true)));
  const [destination] = await db.select().from(destinationsTable).where(eq(destinationsTable.activityId, communication.activityId));
  const checks = [
    { key: "governance", label: "Governed identity resolved", passed: communication.governanceStatus === "Authoritative", blocking: true },
    { key: "codes", label: "Campaign and activity codes assigned", passed: Boolean(communication.activityCode), blocking: true },
    { key: "title", label: "Internal title generated", passed: Boolean(communication.internalTitle), blocking: true },
    { key: "audience", label: "Audience branch defined", passed: Boolean(communication.audienceBranch), blocking: true },
    { key: "timing", label: "Timing is valid", passed: communication.warningCount === 0, blocking: true },
    { key: "destination", label: "Destination assigned", passed: Boolean(destination?.baseUrl), blocking: true },
    { key: "content", label: "Required content complete", passed: Boolean(content?.subject && content?.body), blocking: true },
    { key: "approval", label: "Required approvals complete", passed: communication.approvalStatus === "Approved", blocking: true },
  ];
  res.json({ ready: checks.every((check) => check.passed || !check.blocking), checks });
});

function trackingLinkDto(row: typeof trackingLinksTable.$inferSelect) {
  return {
    id: row.id,
    communicationId: row.communicationId,
    baseUrl: row.baseUrl,
    finalTrackedUrl: row.finalTrackedUrl ?? row.baseUrl,
    parameters: row.parameters,
    validationResult: row.validationResult,
  };
}

router.get("/activities/:activityId", async (req, res): Promise<void> => {
  const parsed = GetActivityParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid activity id" }); return; }
  const [activity] = await db.select().from(campaignActivitiesTable).where(eq(campaignActivitiesTable.id, parsed.data.activityId));
  if (!activity) { res.status(404).json({ error: "Activity not found" }); return; }
  res.json({ activity: activityDto(activity), communications: await communicationDtos([activity.id]) });
});

router.get("/communications/:communicationId", async (req, res): Promise<void> => {
  const parsed = GetCommunicationParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid communication id" }); return; }
  const [communication] = await db.select().from(communicationsTable).where(eq(communicationsTable.id, parsed.data.communicationId));
  if (!communication) { res.status(404).json({ error: "Communication not found" }); return; }
  const detail = (await communicationDtos([communication.activityId])).find((item) => item.id === communication.id);
  if (!detail) { res.status(404).json({ error: "Communication schedule not found" }); return; }
  const links = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.communicationId, communication.id));
  const history = await db.select().from(contentVersionsTable)
    .where(eq(contentVersionsTable.communicationId, communication.id))
    .orderBy(desc(contentVersionsTable.versionNumber));
  res.json({
    communication: detail,
    links: links.map(trackingLinkDto),
    contentHistory: history.map((content) => ({
      id: content.id,
      versionNumber: content.versionNumber,
      subject: content.subject,
      header: content.header,
      body: content.body,
      primaryCtaLabel: content.primaryCta,
      secondaryCtaLabel: content.secondaryCta,
      secondaryCtaUrl: content.secondaryCtaUrl,
      fromName: content.senderName,
      replyTo: content.replyToAddress,
      tokenFallbacks: content.tokenFallbacks,
      isCurrent: content.isCurrent,
      createdAt: content.createdAt.toISOString(),
    })),
  });
});

router.post("/communications/:communicationId/links", async (req, res): Promise<void> => {
  const params = RegisterTrackingLinkParams.safeParse(req.params);
  const body = RegisterTrackingLinkBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid tracking link" }); return; }
  const [communication] = await db.select().from(communicationsTable).where(eq(communicationsTable.id, params.data.communicationId));
  if (!communication) { res.status(404).json({ error: "Communication not found" }); return; }
  const inputParameters = body.data.parameters ?? {};
  if (containsDirectPii(body.data.baseUrl, inputParameters)) {
    res.status(400).json({ error: "Tracking links must not contain direct personal information" });
    return;
  }
  const governed = await governanceProvider.generateTrackingParameters({
    campaign_code: communication.activityCode ?? "",
    ...inputParameters,
  });
  const parameters = { ...governed, ...inputParameters };
  const url = new URL(body.data.baseUrl);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  const [link] = await db.insert(trackingLinksTable).values({
    communicationId: communication.id,
    baseUrl: body.data.baseUrl,
    finalTrackedUrl: url.toString(),
    parameters,
    validationResult: { valid: true, piiRejected: false },
    codeGenerationTimestamp: new Date(),
  }).returning();
  await db.insert(changeEventsTable).values({
    recordType: "tracking_link", recordId: link.id, eventType: "created",
    summary: "Governed tracking link registered after PII validation", actor, afterValue: link,
  });
  res.status(201).json(trackingLinkDto(link));
});

router.post("/activities/:activityId/registrations", async (req, res): Promise<void> => {
  const params = RegisterWebinarPersonParams.safeParse(req.params);
  const body = RegisterWebinarPersonBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid registration" }); return; }
  if (!isOpaqueExternalPersonReference(body.data.personReference)) {
    res.status(400).json({ error: "personReference must be an opaque external identifier, not contact data" }); return;
  }
  const [webinar] = await db.select().from(webinarEventsTable).where(eq(webinarEventsTable.activityId, params.data.activityId));
  if (!webinar) { res.status(404).json({ error: "Webinar not found" }); return; }
  await db.insert(registrationResultsTable).values({
    webinarEventId: webinar.id, personReference: body.data.personReference,
  }).onConflictDoUpdate({
    target: [registrationResultsTable.webinarEventId, registrationResultsTable.personReference],
    set: { recruitmentSuppressed: true, updatedAt: new Date() },
  });
  const recruitment = await db.select({ id: communicationsTable.id }).from(communicationsTable)
    .where(and(eq(communicationsTable.activityId, params.data.activityId), eq(communicationsTable.audienceBranch, "Recruitment")));
  const updatedAt = new Date();
  const suppressionStates = await Promise.all(recruitment.map(async (communication) => {
    const [state] = await db.insert(personCommunicationStatesTable).values({
      communicationId: communication.id, personReference: body.data.personReference,
      eligibilityStatus: "Suppressed", reason: "Registered for webinar", updatedAt,
    }).onConflictDoUpdate({
      target: [personCommunicationStatesTable.communicationId, personCommunicationStatesTable.personReference],
      set: { eligibilityStatus: "Suppressed", reason: "Registered for webinar", updatedAt },
    }).returning();
    return { communicationId: state.communicationId, eligibilityStatus: state.eligibilityStatus, reason: state.reason, updatedAt: state.updatedAt.toISOString() };
  }));
  await db.insert(changeEventsTable).values({
    recordType: "campaign_activity", recordId: params.data.activityId, eventType: "registration_received",
    summary: "Registration received; future recruitment eligibility suppressed", actor,
    afterValue: { suppressedCommunicationIds: recruitment.map((item) => item.id), suppressedCount: suppressionStates.length },
  });
  res.json({
    personReference: body.data.personReference,
    branch: "Registered",
    suppressedCommunicationIds: recruitment.map((item) => item.id),
    suppressionStates,
  });
});

router.post("/activities/:activityId/attendance", async (req, res): Promise<void> => {
  const params = RecordWebinarAttendanceParams.safeParse(req.params);
  const body = RecordWebinarAttendanceBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid attendance result" }); return; }
  if (!isOpaqueExternalPersonReference(body.data.personReference)) {
    res.status(400).json({ error: "personReference must be an opaque external identifier, not contact data" }); return;
  }
  const [webinar] = await db.select().from(webinarEventsTable).where(eq(webinarEventsTable.activityId, params.data.activityId));
  if (!webinar) { res.status(404).json({ error: "Webinar not found" }); return; }
  await db.insert(attendanceResultsTable).values({
    webinarEventId: webinar.id,
    personReference: body.data.personReference,
    attendanceStatus: body.data.attendanceStatus,
    attendedMinutes: body.data.attendedMinutes === undefined ? undefined : Math.floor(body.data.attendedMinutes),
    explicitHandraiser: body.data.explicitHandraiser ?? false,
  });
  const branch = body.data.attendanceStatus;
  const opposite = branch === "Attended" ? "No Show" : "Attended";
  const suppressed = await db.select({ id: communicationsTable.id }).from(communicationsTable)
    .where(and(eq(communicationsTable.activityId, params.data.activityId), eq(communicationsTable.audienceBranch, opposite)));
  const updatedAt = new Date();
  const suppressionStates = await Promise.all(suppressed.map(async (communication) => {
    const [state] = await db.insert(personCommunicationStatesTable).values({
      communicationId: communication.id, personReference: body.data.personReference,
      eligibilityStatus: "Suppressed", reason: `Attendance outcome: ${branch}`, updatedAt,
    }).onConflictDoUpdate({
      target: [personCommunicationStatesTable.communicationId, personCommunicationStatesTable.personReference],
      set: { eligibilityStatus: "Suppressed", reason: `Attendance outcome: ${branch}`, updatedAt },
    }).returning();
    return { communicationId: state.communicationId, eligibilityStatus: state.eligibilityStatus, reason: state.reason, updatedAt: state.updatedAt.toISOString() };
  }));
  await db.insert(changeEventsTable).values({
    recordType: "campaign_activity", recordId: params.data.activityId, eventType: "attendance_received",
    summary: `Attendance received; ${branch} follow-up branch selected`, actor,
    afterValue: { attendanceStatus: branch, suppressedCommunicationIds: suppressed.map((item) => item.id), suppressedCount: suppressionStates.length },
  });
  res.json({
    personReference: body.data.personReference,
    branch,
    suppressedCommunicationIds: suppressed.map((item) => item.id),
    suppressionStates,
  });
});

function normalizeCompanyName(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function companyAliasDto(row: typeof companyDisplayNamesTable.$inferSelect) {
  return {
    id: row.id,
    salesforceAccountId: row.salesforceAccountId,
    legalName: row.legalName,
    normalizedMatchingName: row.normalizedMatchingName,
    approvedDisplayName: row.approvedDisplayName,
    aliases: row.aliases,
    language: row.language,
    approvalStatus: row.approvalStatus,
  };
}

router.get("/company-aliases", async (_req, res): Promise<void> => {
  const rows = await db.select().from(companyDisplayNamesTable).orderBy(asc(companyDisplayNamesTable.legalName));
  res.json(rows.map(companyAliasDto));
});

router.post("/company-aliases", async (req, res): Promise<void> => {
  const body = CreateCompanyAliasBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid company alias" }); return; }
  const [row] = await db.insert(companyDisplayNamesTable).values({
    salesforceAccountId: body.data.salesforceAccountId,
    legalName: body.data.legalName,
    normalizedMatchingName: normalizeCompanyName(body.data.legalName),
    approvedDisplayName: body.data.approvedDisplayName,
    aliases: body.data.aliases ?? [],
    language: body.data.language ?? "en",
  }).returning();
  res.status(201).json(companyAliasDto(row));
});

router.get("/company-aliases/resolve", async (req, res): Promise<void> => {
  const query = ResolveCompanyAliasQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Company name is required" }); return; }
  const normalized = normalizeCompanyName(query.data.name);
  const rows = await db.select().from(companyDisplayNamesTable);
  const row = rows.find((candidate) =>
    candidate.normalizedMatchingName === normalized
    || candidate.aliases.some((alias) => normalizeCompanyName(alias) === normalized));
  res.json({
    matched: Boolean(row),
    query: query.data.name,
    displayName: row?.approvedDisplayName ?? row?.legalName ?? query.data.name,
    ...(row ? { company: companyAliasDto(row) } : {}),
  });
});

router.patch("/company-aliases/:companyAliasId", async (req, res): Promise<void> => {
  const params = UpdateCompanyAliasParams.safeParse(req.params);
  const body = UpdateCompanyAliasBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid company alias update" }); return; }
  const patch = {
    ...body.data,
    ...(body.data.legalName ? { normalizedMatchingName: normalizeCompanyName(body.data.legalName) } : {}),
    updatedAt: new Date(),
    updatedBy: actor,
  };
  const [row] = await db.update(companyDisplayNamesTable).set(patch)
    .where(eq(companyDisplayNamesTable.id, params.data.companyAliasId)).returning();
  if (!row) { res.status(404).json({ error: "Company alias not found" }); return; }
  res.json(companyAliasDto(row));
});

router.delete("/company-aliases/:companyAliasId", async (req, res): Promise<void> => {
  const params = DeleteCompanyAliasParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid company alias id" }); return; }
  const rows = await db.delete(companyDisplayNamesTable).where(eq(companyDisplayNamesTable.id, params.data.companyAliasId)).returning();
  if (rows.length === 0) { res.status(404).json({ error: "Company alias not found" }); return; }
  res.status(204).send();
});

router.get("/campaigns/:campaignId/workbook", async (req, res): Promise<void> => {
  const parsed = ExportImplementationWorkbookParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid campaign id" }); return; }
  const result = await workspace(parsed.data.campaignId);
  if (!result) { res.status(404).json({ error: "Campaign not found" }); return; }
  const communicationIds = result.communications.map((item) => item.id);
  const links = communicationIds.length === 0
    ? []
    : await db.select().from(trackingLinksTable).where(inArray(trackingLinksTable.communicationId, communicationIds));
  await db.insert(changeEventsTable).values({
    recordType: "campaign_plan", recordId: parsed.data.campaignId, eventType: "workbook_exported",
    summary: "Implementation workbook exported", actor,
  });
  res.json({
    generatedAt: new Date().toISOString(),
    ...result,
    links: links.map(trackingLinkDto),
  });
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignPlansTable).orderBy(desc(campaignPlansTable.updatedAt)).limit(6);
  const activities = await db.select().from(campaignActivitiesTable);
  const communications = await communicationDtos(activities.map((item) => item.id));
  res.json({
    activeCampaigns: campaigns.filter((item) => !["Completed", "Cancelled"].includes(item.lifecycleStatus)).length,
    upcomingActivities: activities.length,
    communicationsInReview: communications.filter((item) => item.approvalStatus === "In Review").length,
    blockingWarnings: communications.reduce((sum, item) => sum + item.warningCount, 0),
    campaigns: campaigns.map((item) => campaignDto(item, activities.filter((activity) => activity.campaignId === item.id).length, 0)),
    upcomingCommunications: communications.slice(0, 8),
  });
});

export default router;