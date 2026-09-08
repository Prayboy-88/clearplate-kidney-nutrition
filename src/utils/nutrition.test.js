import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAmount,
  mealTotalBounds,
  mealTotals,
  nutritionFor,
  parseNutrientValues,
} from "./nutrition.js";

test("required custom nutrients reject blanks while explicit zero remains valid", () => {
  assert.equal(parseNutrientValues({ calories: "", protein: "0", sodium: "0", potassium: "", phosphorus: "" }), null);
  assert.equal(parseNutrientValues({ calories: "   ", protein: "0", sodium: "0", potassium: "", phosphorus: "" }), null);
  assert.deepEqual(parseNutrientValues({ calories: "0", protein: "0", sodium: "0", potassium: "", phosphorus: "" }), {
    calories: 0,
    protein: 0,
    sodium: 0,
    potassium: null,
    phosphorus: null,
  });
});

test("custom nutrient parsing rejects negative and nonnumeric values", () => {
  assert.equal(parseNutrientValues({ calories: "1", protein: "-1", sodium: "2" }), null);
  assert.equal(parseNutrientValues({ calories: "1", protein: "2", sodium: "invalid" }), null);
  assert.equal(parseNutrientValues({ calories: "1", protein: "2", sodium: "3", potassium: "invalid" }), null);
});

test("optional unknown nutrients stay unknown when scaled, totaled, and formatted", () => {
  const customFood = {
    calories: 120,
    protein: 5,
    sodium: 75,
    potassium: null,
    phosphorus: null,
  };
  assert.deepEqual(nutritionFor(customFood, 2), {
    calories: 240,
    protein: 10,
    sodium: 150,
    potassium: null,
    phosphorus: null,
  });
  assert.equal(formatAmount(null), "Unknown");
  assert.equal(formatAmount(0), "0");

  const entries = [{ source: "custom", servings: 2, customFood }];
  assert.deepEqual(mealTotals(entries, {}), {
    calories: 240,
    protein: 10,
    sodium: 150,
    potassium: null,
    phosphorus: null,
  });
  assert.deepEqual(mealTotalBounds(entries, {}), {
    lower: { calories: 240, protein: 10, sodium: 150, potassium: null, phosphorus: null },
    upper: { calories: 240, protein: 10, sodium: 150, potassium: null, phosphorus: null },
    estimatedCount: 0,
  });
});

test("one unknown nutrient makes a mixed meal total unknown", () => {
  const entries = [
    { source: "custom", servings: 1, customFood: { calories: 10, protein: 1, sodium: 2, potassium: 5, phosphorus: 6 } },
    { source: "custom", servings: 1, customFood: { calories: 20, protein: 2, sodium: 3, potassium: null, phosphorus: 7 } },
  ];
  assert.equal(mealTotals(entries, {}).potassium, null);
  assert.equal(mealTotals(entries, {}).phosphorus, 13);
});
