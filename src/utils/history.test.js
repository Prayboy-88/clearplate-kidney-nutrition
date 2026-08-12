import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarMonth, historyDayStatus } from "./history.js";

const profile = {
  sodiumTargetMg: 2000,
  proteinMinG: 56,
  proteinMaxG: 70,
};

test("historyDayStatus distinguishes empty, within, and review days", () => {
  assert.equal(historyDayStatus({ sodium: 0, protein: 0 }, 0, profile), "empty");
  assert.equal(historyDayStatus({ sodium: 1720, protein: 63 }, 3, profile), "within");
  assert.equal(historyDayStatus({ sodium: 2100, protein: 63 }, 3, profile), "review");
  assert.equal(historyDayStatus({ sodium: 1200, protein: 45 }, 3, profile), "review");
  assert.equal(historyDayStatus({ sodium: 1200, protein: 75 }, 3, profile), "review");
});

test("buildCalendarMonth returns a Sunday-first grid with stable date keys", () => {
  const cells = buildCalendarMonth(2026, 7);
  assert.equal(cells.length, 42);
  assert.equal(cells[0], null);
  assert.deepEqual(cells[6], { day: 1, dateKey: "2026-08-01", cellIndex: 6 });
  assert.deepEqual(cells[36], { day: 31, dateKey: "2026-08-31", cellIndex: 36 });
  assert.equal(cells[37], null);
});
