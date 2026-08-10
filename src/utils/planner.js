const excludedCategories = new Set(["Desserts", "Spices & Rubs", "sauce", "Other"]);

const sumPlan = (items) => items.reduce((total, item) => ({
  calories: total.calories + item.calories,
  protein: total.protein + item.protein,
  sodium: total.sodium + item.sodium,
  potassium: total.potassium + item.potassium,
  phosphorus: total.phosphorus + item.phosphorus,
}), { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0 });

/**
 * The production selection problem is mixed-integer when recipes are chosen as
 * discrete meals. This MVP intentionally uses an auditable exhaustive search
 * over three-recipe combinations instead of labeling a heuristic as a convex
 * optimum. A later solver can relax servings to continuous variables or use MILP.
 */
export function optimizeRecipePlan(recipes, goals) {
  const candidates = recipes
    .filter((recipe) => recipe.calories > 0 && !excludedCategories.has(recipe.category))
    .sort((a, b) => a.sodium - b.sodium || b.protein - a.protein)
    .slice(0, 55);
  let best = null;

  for (let first = 0; first < candidates.length - 2; first += 1) {
    for (let second = first + 1; second < candidates.length - 1; second += 1) {
      for (let third = second + 1; third < candidates.length; third += 1) {
        const items = [candidates[first], candidates[second], candidates[third]];
        const totals = sumPlan(items);
        const sodiumOver = Math.max(0, totals.sodium - goals.sodiumMax) / goals.sodiumMax;
        const proteinLow = Math.max(0, goals.proteinMin - totals.protein) / goals.proteinMin;
        const proteinHigh = Math.max(0, totals.protein - goals.proteinMax) / goals.proteinMax;
        const calorieDistance = Math.abs(totals.calories - goals.calorieTarget) / goals.calorieTarget;
        const uniqueCategories = new Set(items.map((item) => item.category)).size;
        const feasible = sodiumOver === 0 && proteinLow === 0 && proteinHigh === 0;
        const score = (feasible ? 100 : 0) - sodiumOver * 100 - proteinLow * 65 - proteinHigh * 80 - calorieDistance * 12 + uniqueCategories * 0.4;
        if (!best || score > best.score) best = { items, totals, feasible, score };
      }
    }
  }

  return best;
}
