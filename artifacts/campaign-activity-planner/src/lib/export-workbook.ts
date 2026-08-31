import ExcelJS from "exceljs";
import type { ImplementationWorkbook } from "@workspace/api-client-react";

type CellValue = string | number | boolean | null | undefined;

function rowsFromObjects(records: Record<string, CellValue>[]) {
  const headers = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  return { headers, rows: records.map((record) => headers.map((header) => record[header] ?? "")) };
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  records: Record<string, CellValue>[],
) {
  const sheet = workbook.addWorksheet(name);
  const normalized = records.length > 0 ? records : [{ Status: "No records" }];
  const { headers, rows } = rowsFromObjects(normalized);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(headers.length, 26))}1` };
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2156D9" } };
    cell.alignment = { vertical: "middle" };
  });
  sheet.columns.forEach((column) => {
    let width = 14;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      width = Math.min(48, Math.max(width, String(cell.value ?? "").length + 2));
    });
    column.width = width;
  });
}

export async function downloadImplementationWorkbook(data: ImplementationWorkbook) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Campaign Activity Planner";
  workbook.created = new Date(data.generatedAt);
  workbook.subject = data.campaign.internalTitle;

  addSheet(workbook, "Campaign Summary", [{
    "Campaign ID": data.campaign.id,
    "Internal Title": data.campaign.internalTitle,
    "Display Title": data.campaign.shortTitle,
    Objective: data.campaign.objective,
    Product: data.campaign.product,
    Geography: data.campaign.geography,
    "Business Unit": data.campaign.businessUnit,
    Owner: data.campaign.owner,
    "Start Date": data.campaign.startDate,
    "End Date": data.campaign.endDate,
    "Governance Status": data.campaign.governanceStatus,
    "Campaign Code": data.campaign.campaignCode,
  }]);

  addSheet(workbook, "Calendar Schedule", data.communications.map((item) => ({
    Activity: item.activityId,
    Communication: item.shortTitle,
    Date: item.scheduledDate,
    Time: item.sendTime,
    Timezone: item.timezone,
    Track: item.audienceBranch,
    Status: item.lifecycleStatus,
    "Adjustment Reason": item.adjustmentReason,
    Pinned: item.pinned,
    Sent: item.sent,
    Warnings: item.warningCount,
  })));

  addSheet(workbook, "Email Deliverables", data.communications.map((item) => ({
    "Internal Title": item.internalTitle,
    "Calendar Title": item.shortTitle,
    Type: item.communicationType,
    Channel: item.channel,
    Subject: item.subject,
    Preheader: item.preheader,
    Body: item.body,
    Audience: item.audienceBranch,
    "Approval Status": item.approvalStatus,
  })));

  addSheet(workbook, "Landing Pages and CTAs", data.links.map((link) => ({
    "Communication ID": link.communicationId,
    "Base URL": link.baseUrl,
    "Tracked URL": link.finalTrackedUrl,
    "UTM Parameters": JSON.stringify(link.parameters),
    Validation: JSON.stringify(link.validationResult),
  })));

  addSheet(workbook, "Salesforce Fields & Tokens", data.communications.map((item) => ({
    Communication: item.shortTitle,
    "Event Date Token": item.scheduledDate,
    Timezone: item.timezone,
    "Fallback Policy": "Omit personalization when confidence is insufficient",
  })));

  addSheet(workbook, "Audience and Suppression Logic", data.communications.map((item) => ({
    Communication: item.shortTitle,
    Track: item.audienceBranch,
    "Relative Rule": item.relativeRule,
    "Registration Suppression": item.audienceBranch === "Recruitment",
  })));

  addSheet(workbook, "Company Display Names", [{
    Precedence: "Marketing display name → approved alias → safe fallback → omit",
    Status: "Managed in Governance Control",
  }]);

  addSheet(workbook, "Governance Codes and UTM", [
    {
      "Record Type": "Campaign",
      "Record ID": data.campaign.id,
      Code: data.campaign.campaignCode,
      Status: data.campaign.governanceStatus,
    },
    ...data.activities.map((item) => ({
      "Record Type": "Activity",
      "Record ID": item.id,
      Code: item.activityCode,
      Status: item.governanceStatus,
    })),
    ...data.links.map((item) => ({
      "Record Type": "Tracked Link",
      "Record ID": item.id,
      Code: item.finalTrackedUrl,
      Status: JSON.stringify(item.validationResult),
    })),
  ]);

  addSheet(workbook, "Approvals and QA", data.communications.map((item) => ({
    Communication: item.shortTitle,
    "Approval Status": item.approvalStatus,
    "Lifecycle Status": item.lifecycleStatus,
    "Blocking Warnings": item.warningCount,
  })));

  addSheet(workbook, "Change History", data.changeEvents.map((event) => ({
    Time: event.createdAt,
    Event: event.eventType,
    Summary: event.summary,
    Actor: event.actor,
  })));

  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${data.campaign.shortTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "campaign"}-implementation-workbook.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}