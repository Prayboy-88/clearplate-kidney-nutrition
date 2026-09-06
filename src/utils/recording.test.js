import test from "node:test";
import assert from "node:assert/strict";
import { nutritionFor, mealTotalBounds } from "./nutrition.js";
import { daySignature, isDayComplete } from "./recording.js";
import { calculateRemainingBudget } from "../optimization/remaining.js";

test("legacy outside-food margins do not inflate recorded point estimates", () => {
  const food = { method: "unpackaged", protein: 50, sodium: 125, baseEstimate: { protein: 40, sodium: 100, calories: 300 } };
  assert.equal(nutritionFor(food).protein, 40);
  assert.equal(nutritionFor(food, 2).sodium, 200);
});

test("planning uses lower intake for protein adequacy and upper intake for ceilings", () => {
  const result = calculateRemainingBudget({ protein: 40, sodium: 100, lower: { protein: 30 }, upper: { protein: 50, sodium: 125 } }, { sodiumMax: 2000, proteinMin: 50, proteinMax: 70 });
  assert.equal(result.proteinMin, 20);
  assert.equal(result.proteinMax, 20);
  assert.equal(result.sodiumMax, 1875);
});

test("estimate ranges scale with servings and do not change labeled foods", () => {
  const entries = [
    { source: "custom", servings: 2, customFood: { method: "unpackaged", protein: 40, sodium: 100, calories: 300, estimateRangePercent: 25 } },
    { source: "recipe", recipeId: "r", servings: 1 },
  ];
  const bounds = mealTotalBounds(entries, { r: { protein: 10, sodium: 20, calories: 100 } });
  assert.equal(bounds.lower.protein, 70);
  assert.equal(bounds.upper.protein, 110);
  assert.equal(bounds.lower.sodium, 170);
  assert.equal(bounds.upper.sodium, 270);
  assert.equal(bounds.estimatedCount, 1);
});

test("day confirmation survives reload but invalidates after a meal edit", () => {
  const date = "2026-09-06";
  const entries = [{ id: "1", date, servings: 1 }];
  const records = { [date]: { completedAt: "2026-09-06T20:00:00Z", signature: daySignature(entries, date) } };
  assert.equal(isDayComplete(JSON.parse(JSON.stringify(records)), entries, date), true);
  assert.equal(isDayComplete(records, [{ ...entries[0], servings: 2 }], date), false);
  assert.equal(isDayComplete(records, [], date), false);
  assert.equal(isDayComplete(records, [...entries, { id: "other", date: "2026-09-05" }], date), true);
});
