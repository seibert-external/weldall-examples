import assert from "node:assert/strict";
import { test } from "node:test";
import { addMonths, demoNow, shiftAll } from "../src/shared/dates.js";

test("everything moves by whole days; tokens become German dates; notice months keep month-ends", () => {
  const value = { end: "2026-12-31", at: "2026-10-27T15:10:00+01:00", text: "bis [[2026-10-31]]" };
  assert.deepEqual(shiftAll(value, 61), { end: "2027-03-02", at: "2026-12-27T14:10:00Z", text: "bis 31.12.2026" });
  assert.equal(addMonths("2026-11-30", 3), "2027-02-28");
  assert.equal(addMonths("2026-02-28", 1), "2026-03-31");
});

test("the demo clock stands at the anchor's time of day", () => {
  assert.equal(demoNow(new Date("2027-02-10T22:45:00Z")).toISOString(), "2027-02-10T10:30:00.000Z");
  assert.equal(demoNow(new Date("2026-01-01T00:00:00Z")).toISOString(), "2026-10-28T10:30:00.000Z");
});
