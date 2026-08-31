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
  contentVersionsTable,
  destinationsTable,
  scheduledInstancesTable,
  scheduleRulesTable,
  webinarEventsTable,
} from "@workspace/db";
import {
  ConfirmRescheduleBody,
  ConfirmRescheduleParams,
  CreateCampaignBody,
  CreateWebinarBody,
  CreateWebinarParams,
  GetCampaignParams,
  GetCommunicationReadinessParams,
  PreviewRescheduleBody,
  PreviewRescheduleParams,
  UpdateCampaignBody,
  UpdateCampaignParams,
  UpdateCommunicationBody,
  UpdateCommunicationParams,
} from "@workspace/api-zod";
import { calculateWebinarSchedule } from "../lib/scheduling";
import { governanceProvider } from "../lib/governance";

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
    })
    .from(communicationsTable)
    .innerJoin(scheduleRulesTable, eq(scheduleRulesTable.communicationId, communicationsTable.id))
    .innerJoin(scheduledInstancesTable, eq(scheduledInstancesTable.communicationId, communicationsTable.id))
    .leftJoin(contentVersionsTable, and(eq(contentVersionsTable.communicationId, communicationsTable.id), eq(contentVersionsTable.isCurrent, true)))
    .leftJoin(destinationsTable, eq(destinationsTable.activityId, communicationsTable.activityId))
    .where(inArray(communicationsTable.activityId, activityIds))
    .orderBy(asc(scheduledInstancesTable.adjustedDate), asc(scheduledInstancesTable.sendTime));
  return rows.map(({ communication, rule, instance, content, destination }) => ({
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
  const startDate = dateOnly(parsed.data.startDate);
  const endDate = dateOnly(parsed.data.endDate);
  const internalTitle = await governanceProvider.generateInternalTitle([parsed.data.shortTitle, startDate, "Campaign"]);
  const [campaign] = await db.insert(campaignPlansTable).values({
    shortTitle: parsed.data.shortTitle,
    objective: parsed.data.objective,
    owner: parsed.data.owner,
    startDate,
    endDate,
    internalTitle,
    authoritativeSource: governanceProvider.source,
  }).returning();
  await db.insert(changeEventsTable).values({
    recordType: "campaign_plan", recordId: campaign.id, eventType: "created",
    summary: "Campaign plan created with pending governance assignment", actor,
    afterValue: campaign,
  });
  res.status(201).json(campaignDto(campaign));
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
  const [campaign] = await db.select().from(campaignPlansTable).where(eq(campaignPlansTable.id, params.data.campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  const eventDate = dateOnly(body.data.eventDate);
  const title = await governanceProvider.generateInternalTitle([body.data.product, eventDate, "Webinar", body.data.subject, body.data.segment]);
  const [activity] = await db.insert(campaignActivitiesTable).values({
    campaignId: campaign.id, activityType: "Webinar", internalTitle: title,
    shortTitle: body.data.subject, owner: campaign.owner, anchorDate: eventDate,
    anchorTime: body.data.startTime, timezone: body.data.timezone,
  }).returning();
  await db.insert(webinarEventsTable).values({
    activityId: activity.id, externalTitle: body.data.externalTitle, subject: body.data.subject,
    product: body.data.product, topic: body.data.topic, objective: body.data.objective,
    successMeasure: body.data.successMeasure, durationMinutes: body.data.durationMinutes, platform: body.data.platform,
  });
  const [audience] = await db.insert(audienceDefinitionsTable).values({
    activityId: activity.id, internalTitle: `${body.data.segment} | ${body.data.geography} | ${body.data.language}`,
    segment: body.data.segment, geography: body.data.geography, language: body.data.language,
  }).returning();
  for (const name of ["Recruitment", "Registered", "Attended", "No Show", "Did Not Register"]) {
    await db.insert(audienceBranchesTable).values({
      audienceDefinitionId: audience.id, key: name.toLowerCase().replaceAll(" ", "-"), name,
      suppressionRule: name === "Recruitment" ? { exitOn: "registration" } : {},
    });
  }
  const schedules = calculateWebinarSchedule(eventDate);
  for (const item of schedules) {
    const [communication] = await db.insert(communicationsTable).values({
      activityId: activity.id, audienceBranch: item.branch, communicationType: item.type,
      internalTitle: `${title} | ${item.title} ${item.rule}`, shortTitle: item.title, owner: campaign.owner,
    }).returning();
    const [rule] = await db.insert(scheduleRulesTable).values({
      communicationId: communication.id, relativeRule: item.rule, offsetDays: item.offsetDays,
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

async function reschedulePreview(activityId: string, eventDate: string) {
  const [activity] = await db.select().from(campaignActivitiesTable).where(eq(campaignActivitiesTable.id, activityId));
  if (!activity || !activity.anchorDate) return null;
  const current = await communicationDtos([activityId]);
  const proposed = calculateWebinarSchedule(eventDate);
  return {
    oldEventDate: activity.anchorDate,
    newEventDate: eventDate,
    items: current.map((item, index) => ({
      communicationId: item.id,
      title: item.shortTitle,
      oldDate: item.scheduledDate,
      proposedDate: proposed[index]?.scheduledDate ?? item.scheduledDate,
      action: item.sent ? "Retain sent" : item.pinned ? "Retain pinned" : "Move",
      warning: item.sent || item.pinned,
    })),
    warnings: current.filter((item) => item.sent || item.pinned).map((item) => `${item.shortTitle} will not move because it is ${item.sent ? "sent" : "pinned"}.`),
  };
}

router.post("/activities/:activityId/reschedule", async (req, res): Promise<void> => {
  const params = PreviewRescheduleParams.safeParse(req.params);
  const body = PreviewRescheduleBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid reschedule request" }); return; }
  const preview = await reschedulePreview(params.data.activityId, dateOnly(body.data.eventDate));
  if (!preview) { res.status(404).json({ error: "Activity not found" }); return; }
  res.json(preview);
});

router.post("/activities/:activityId/confirm-reschedule", async (req, res): Promise<void> => {
  const params = ConfirmRescheduleParams.safeParse(req.params);
  const body = ConfirmRescheduleBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid reschedule request" }); return; }
  const eventDate = dateOnly(body.data.eventDate);
  const preview = await reschedulePreview(params.data.activityId, eventDate);
  if (!preview) { res.status(404).json({ error: "Activity not found" }); return; }
  const [before] = await db.select().from(campaignActivitiesTable).where(eq(campaignActivitiesTable.id, params.data.activityId));
  await db.update(campaignActivitiesTable).set({ anchorDate: eventDate, version: before.version + 1, updatedAt: new Date() })
    .where(eq(campaignActivitiesTable.id, params.data.activityId));
  for (const item of preview.items.filter((candidate) => candidate.action === "Move")) {
    await db.update(scheduledInstancesTable).set({ adjustedDate: item.proposedDate, originalCalculatedDate: item.proposedDate, updatedAt: new Date() })
      .where(eq(scheduledInstancesTable.communicationId, item.communicationId));
  }
  await db.insert(changeEventsTable).values({
    recordType: "campaign_activity", recordId: before.id, eventType: "rescheduled",
    summary: `Webinar moved from ${preview.oldEventDate} to ${preview.newEventDate}`, actor,
    beforeValue: { eventDate: preview.oldEventDate, schedule: preview.items },
    afterValue: { eventDate: preview.newEventDate, schedule: preview.items },
  });
  res.json(await workspace(before.campaignId));
});

router.patch("/communications/:communicationId", async (req, res): Promise<void> => {
  const params = UpdateCommunicationParams.safeParse(req.params);
  const body = UpdateCommunicationBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid communication update" }); return; }
  const [before] = await db.select().from(communicationsTable).where(eq(communicationsTable.id, params.data.communicationId));
  if (!before) { res.status(404).json({ error: "Communication not found" }); return; }
  const communicationPatch = {
    ...(body.data.shortTitle !== undefined ? { shortTitle: body.data.shortTitle } : {}),
    ...(body.data.lifecycleStatus !== undefined ? { lifecycleStatus: body.data.lifecycleStatus } : {}),
    ...(body.data.approvalStatus !== undefined ? { approvalStatus: body.data.approvalStatus } : {}),
    ...(body.data.pinned !== undefined ? { pinned: body.data.pinned } : {}),
    version: before.version + 1, updatedAt: new Date(),
  };
  const [updated] = await db.update(communicationsTable).set(communicationPatch)
    .where(eq(communicationsTable.id, before.id)).returning();
  if (body.data.subject !== undefined || body.data.preheader !== undefined || body.data.body !== undefined) {
    await db.update(contentVersionsTable).set({
      ...(body.data.subject !== undefined ? { subject: body.data.subject } : {}),
      ...(body.data.preheader !== undefined ? { preheader: body.data.preheader } : {}),
      ...(body.data.body !== undefined ? { body: body.data.body } : {}),
      updatedAt: new Date(),
    }).where(and(eq(contentVersionsTable.communicationId, before.id), eq(contentVersionsTable.isCurrent, true)));
  }
  if (body.data.destinationUrl !== undefined) {
    const [destination] = await db.select().from(destinationsTable).where(eq(destinationsTable.activityId, before.activityId));
    if (destination) await db.update(destinationsTable).set({ baseUrl: body.data.destinationUrl, updatedAt: new Date() }).where(eq(destinationsTable.id, destination.id));
    else await db.insert(destinationsTable).values({ activityId: before.activityId, internalTitle: `${before.internalTitle} | Destination`, destinationType: "registration", baseUrl: body.data.destinationUrl });
  }
  await db.insert(changeEventsTable).values({
    recordType: "communication", recordId: before.id, eventType: "updated",
    summary: "Communication content or status updated", actor, beforeValue: before, afterValue: updated,
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