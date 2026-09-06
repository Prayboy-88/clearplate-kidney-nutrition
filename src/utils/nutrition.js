export const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

export const formatAmount = (value, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

export const nutritionFor = (recipe, servings = 1) => {
  // Older records stored an inflated estimate alongside the original values.
  const values = recipe.method === "unpackaged" && recipe.baseEstimate ? recipe.baseEstimate : recipe;
  return Object.fromEntries(["calories", "protein", "sodium", "potassium", "phosphorus"]
    .map((key) => [key, round(values[key] * servings, 1)]));
};

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
      lower[key] = round(lower[key] + nutrition[key] * (1 - margin), 1);
      upper[key] = round(upper[key] + nutrition[key] * (1 + margin), 1);
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
        calories: round(totals.calories + amount.calories, 1),
        protein: round(totals.protein + amount.protein, 1),
        sodium: round(totals.sodium + amount.sodium, 1),
        potassium: round(totals.potassium + amount.potassium, 1),
        phosphorus: round(totals.phosphorus + amount.phosphorus, 1),
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
