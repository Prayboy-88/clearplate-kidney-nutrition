import { round } from "../utils/nutrition.js";

export const nutrientKeys = ["calories", "protein", "sodium", "potassium", "phosphorus"];

export const emptyNutrition = () => Object.fromEntries(nutrientKeys.map((key) => [key, 0]));

export function addNutrition(left = {}, right = {}) {
  return Object.fromEntries(nutrientKeys.map((key) => [key, round((Number(left[key]) || 0) + (Number(right[key]) || 0), 1)]));
}

export function scaleNutrition(recipe, servings) {
  return Object.fromEntries(nutrientKeys.map((key) => [key, round(Number(recipe[key]) * servings, 1)]));
}

export function calculateRemainingBudget(loggedTotals, targets) {
  const sodiumMax = Number(targets.sodiumMax);
  const proteinMin = Number(targets.proteinMin);
  const proteinMax = Number(targets.proteinMax);
  const potassiumMax = targets.potassiumMax !== null && targets.potassiumMax !== undefined && Number.isFinite(Number(targets.potassiumMax))
    ? Number(targets.potassiumMax)
    : null;
  const phosphorusMax = targets.phosphorusMax !== null && targets.phosphorusMax !== undefined && Number.isFinite(Number(targets.phosphorusMax))
    ? Number(targets.phosphorusMax)
    : null;

  return {
    calories: Number.isFinite(Number(targets.calorieTarget))
      ? round(Number(targets.calorieTarget) - (Number(loggedTotals.calories) || 0), 1)
      : null,
    sodiumMax: round(sodiumMax - (Number(loggedTotals.upper?.sodium ?? loggedTotals.sodium) || 0), 1),
    proteinMin: round(Math.max(0, proteinMin - (Number(loggedTotals.lower?.protein ?? loggedTotals.protein) || 0)), 1),
    proteinMax: round(proteinMax - (Number(loggedTotals.upper?.protein ?? loggedTotals.protein) || 0), 1),
    potassiumMax: potassiumMax === null ? null : round(potassiumMax - (Number(loggedTotals.upper?.potassium ?? loggedTotals.potassium) || 0), 1),
    phosphorusMax: phosphorusMax === null ? null : round(phosphorusMax - (Number(loggedTotals.upper?.phosphorus ?? loggedTotals.phosphorus) || 0), 1),
  };
}

export function remainingAfterPlan(remainingBefore, planTotals) {
  return {
    calories: remainingBefore.calories === null ? null : round(remainingBefore.calories - planTotals.calories, 1),
    sodiumMax: round(remainingBefore.sodiumMax - planTotals.sodium, 1),
    proteinMin: round(Math.max(0, remainingBefore.proteinMin - planTotals.protein), 1),
    proteinMax: round(remainingBefore.proteinMax - planTotals.protein, 1),
    potassiumMax: remainingBefore.potassiumMax === null ? null : round(remainingBefore.potassiumMax - planTotals.potassium, 1),
    phosphorusMax: remainingBefore.phosphorusMax === null ? null : round(remainingBefore.phosphorusMax - planTotals.phosphorus, 1),
  };
}
