export interface ScheduleDefinition {
  title: string;
  branch: string;
  type: string;
  rule: string;
  offsetDays: number;
  offsetMinutes?: number;
  direction: "before" | "after" | "immediate";
  sendTime: string;
  businessDayStrategy: "previous" | "next" | "none";
}

export interface CalculatedSchedule extends ScheduleDefinition {
  originalDate: string;
  scheduledDate: string;
  adjustmentReason: string | null;
}

export const webinarSchedule: ScheduleDefinition[] = [
  { title: "Invitation 01", branch: "Recruitment", type: "Invitation", rule: "D-21", offsetDays: 21, direction: "before", sendTime: "10:00", businessDayStrategy: "previous" },
  { title: "Invitation 02", branch: "Recruitment", type: "Invitation", rule: "D-14", offsetDays: 14, direction: "before", sendTime: "10:00", businessDayStrategy: "previous" },
  { title: "Invitation 03", branch: "Recruitment", type: "Invitation", rule: "D-7", offsetDays: 7, direction: "before", sendTime: "10:00", businessDayStrategy: "previous" },
  { title: "Final invitation", branch: "Recruitment", type: "Invitation", rule: "D-1", offsetDays: 1, direction: "before", sendTime: "10:00", businessDayStrategy: "previous" },
  { title: "Registration confirmation", branch: "Registered", type: "Confirmation", rule: "Immediate", offsetDays: 0, direction: "immediate", sendTime: "Immediate", businessDayStrategy: "none" },
  { title: "24-hour reminder", branch: "Registered", type: "Reminder", rule: "24 hours before", offsetDays: 1, direction: "before", sendTime: "Event time", businessDayStrategy: "none" },
  { title: "30-minute reminder", branch: "Registered", type: "Reminder", rule: "30 minutes before", offsetDays: 0, offsetMinutes: 30, direction: "before", sendTime: "Event time - 00:30", businessDayStrategy: "none" },
  { title: "We're starting", branch: "Registered", type: "Start notification", rule: "At event start", offsetDays: 0, direction: "immediate", sendTime: "Event time", businessDayStrategy: "none" },
  { title: "Attendee thank you", branch: "Attended", type: "Follow-up", rule: "Next business day", offsetDays: 1, direction: "after", sendTime: "10:00", businessDayStrategy: "next" },
  { title: "Sorry we missed you", branch: "No Show", type: "Follow-up", rule: "Next business day", offsetDays: 1, direction: "after", sendTime: "10:00", businessDayStrategy: "next" },
  { title: "Recording reminder", branch: "No Show", type: "Follow-up", rule: "D+7", offsetDays: 7, direction: "after", sendTime: "10:00", businessDayStrategy: "next" },
];

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isNonBusinessDay(date: Date, holidays: Set<string>): boolean {
  return date.getUTCDay() === 0 || date.getUTCDay() === 6 || holidays.has(formatDate(date));
}

export function adjustBusinessDay(
  date: string,
  strategy: "previous" | "next" | "none",
  holidays: string[] = [],
): { date: string; reason: string | null } {
  if (strategy === "none") return { date, reason: null };
  let cursor = parseDate(date);
  const holidaySet = new Set(holidays);
  if (!isNonBusinessDay(cursor, holidaySet)) return { date, reason: null };
  const original = date;
  const direction = strategy === "previous" ? -1 : 1;
  while (isNonBusinessDay(cursor, holidaySet)) cursor = shiftDays(cursor, direction);
  return {
    date: formatDate(cursor),
    reason: `${original} adjusted to ${strategy} business day`,
  };
}

export function calculateSchedule(
  eventDate: string,
  definition: ScheduleDefinition,
  holidays: string[] = [],
): CalculatedSchedule {
  const signedDays = definition.direction === "before" ? -definition.offsetDays : definition.offsetDays;
  const originalDate = formatDate(shiftDays(parseDate(eventDate), signedDays));
  const adjusted = adjustBusinessDay(originalDate, definition.businessDayStrategy, holidays);
  return { ...definition, originalDate, scheduledDate: adjusted.date, adjustmentReason: adjusted.reason };
}

export interface WebinarScheduleOptions {
  includeStartNotification?: boolean;
  includeRecordingReminder?: boolean;
}

export function calculateWebinarSchedule(
  eventDate: string,
  holidays: string[] = [],
  options: WebinarScheduleOptions = {},
): CalculatedSchedule[] {
  const includeStart = options.includeStartNotification ?? false;
  const includeRecording = options.includeRecordingReminder ?? true;
  return webinarSchedule
    .filter((definition) => includeStart || definition.type !== "Start notification")
    .filter((definition) => includeRecording || definition.rule !== "D+7")
    .map((definition) => calculateSchedule(eventDate, definition, holidays));
}