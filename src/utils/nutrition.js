export const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const isUnknown = (value) => value === null
  || value === undefined
  || (typeof value === "string" && value.trim() === "")
  || !Number.isFinite(Number(value));

export const formatAmount = (value, digits = 0) => isUnknown(value)
  ? "Unknown"
  : new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number(value));

export function parseNutrientValues(values = {}) {
  const result = {};
  for (const key of ["calories", "protein", "sodium"]) {
    if (isUnknown(values[key]) || Number(values[key]) < 0) return null;
    result[key] = Number(values[key]);
  }
  for (const key of ["potassium", "phosphorus"]) {
    if (values[key] === null || values[key] === undefined || String(values[key]).trim() === "") {
      result[key] = null;
    } else if (!Number.isFinite(Number(values[key])) || Number(values[key]) < 0) {
      return null;
    } else {
      result[key] = Number(values[key]);
    }
  }
  return result;
}

export const nutritionFor = (recipe, servings = 1) => {
  // Older records stored an inflated estimate alongside the original values.
  const values = recipe.method === "unpackaged" && recipe.baseEstimate ? recipe.baseEstimate : recipe;
  return Object.fromEntries(["calories", "protein", "sodium", "potassium", "phosphorus"]
    .map((key) => [key, isUnknown(values[key]) ? null : round(Number(values[key]) * servings, 1)]));
};

const addNutritionValue = (current, amount) => current === null || amount === null
  ? null
  : round(current + amount, 1);

export function mealTotalBounds(meals, recipesById) {
  const lower = { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0 };
  const upper = { ...lower };
  let estimatedCount = 0;
  for (const meal of meals) {
    const food = meal.source === "custom" ? meal.customFood : recipesById[meal.recipeId];
    if (!food) continue;
    const estimated = food.method === "unpackaged";
    const margin = estimated ? Math.min(100, Math.max(0, Number(food.estimateRangePercent ?? food.uncertaintyMargin) || 0)) / 100 : 0;
    if (estimated) estimatedCount += 1;
    const nutrition = nutritionFor(food, meal.servings);
    for (const key of Object.keys(lower)) {
      lower[key] = addNutritionValue(lower[key], nutrition[key] === null ? null : nutrition[key] * (1 - margin));
      upper[key] = addNutritionValue(upper[key], nutrition[key] === null ? null : nutrition[key] * (1 + margin));
    }
  }
  return { lower, upper, estimatedCount };
}

export const mealTotals = (meals, recipesById) =>
  meals.reduce(
    (totals, meal) => {
      const recipe = meal.source === "custom" ? meal.customFood : recipesById[meal.recipeId];
      if (!recipe) return totals;
      const amount = nutritionFor(recipe, meal.servings);
      return {
        calories: addNutritionValue(totals.calories, amount.calories),
        protein: addNutritionValue(totals.protein, amount.protein),
        sodium: addNutritionValue(totals.sodium, amount.sodium),
        potassium: addNutritionValue(totals.potassium, amount.potassium),
        phosphorus: addNutritionValue(totals.phosphorus, amount.phosphorus),
      };
    },
    { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0 },
  );

export const proteinRangeForWeight = (weightKg) => ({
  min: Math.round((Number(weightKg) || 0) * 0.8),
  max: Math.round(Number(weightKg) || 0),
});

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
