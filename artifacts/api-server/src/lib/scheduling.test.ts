import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustBusinessDay,
  calculateSchedule,
  calculateWebinarSchedule,
} from "./scheduling.ts";

test("pre-event Saturday rolls back to Friday", () => {
  assert.deepEqual(adjustBusinessDay("2026-10-10", "previous"), {
    date: "2026-10-09",
    reason: "2026-10-10 adjusted to previous business day",
  });
});

test("pre-event holiday rolls back to previous business day", () => {
  assert.equal(
    adjustBusinessDay("2026-09-07", "previous", ["2026-09-07"]).date,
    "2026-09-04",
  );
});

test("post-event weekend moves forward", () => {
  assert.equal(adjustBusinessDay("2026-10-24", "next").date, "2026-10-26");
});

test("date-only schedule is stable across daylight-saving boundaries", () => {
  const item = calculateSchedule("2026-11-08", {
    title: "Invitation",
    branch: "Recruitment",
    type: "Invitation",
    rule: "D-7",
    offsetDays: 7,
    direction: "before",
    sendTime: "10:00",
    businessDayStrategy: "previous",
  });
  assert.equal(item.originalDate, "2026-11-01");
  assert.equal(item.scheduledDate, "2026-10-30");
});

test("webinar template creates all MVP branch communications", () => {
  const schedule = calculateWebinarSchedule("2026-10-22");
  assert.equal(schedule.length, 10);
  assert.ok(schedule.some((item) => item.branch === "Registered"));
  assert.ok(schedule.some((item) => item.branch === "Attended"));
  assert.ok(schedule.some((item) => item.branch === "No Show"));
});