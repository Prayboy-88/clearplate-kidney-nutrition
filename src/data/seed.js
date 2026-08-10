import { localDateKey } from "../utils/nutrition";
import recipes from "./recipes.json";

export const defaultProfile = {
  name: "Alex",
  condition: "Adult ADPKD",
  stage: "G2",
  weightKg: 70,
  heightCm: 175,
  treatment: "not-dialysis",
  sodiumTargetMg: 2000,
  proteinMinG: 56,
  proteinMaxG: 70,
  useGuidelineProteinRange: true,
  reviewedAt: "2026-07-29",
};

export const defaultMeals = [
  {
    id: "seed-breakfast",
    date: localDateKey(),
    source: "recipe",
    meal: "Breakfast",
    time: "7:30 AM",
    recipeId: "fresh-tzatziki",
    servings: 1,
  },
  {
    id: "seed-lunch",
    date: localDateKey(),
    source: "recipe",
    meal: "Lunch",
    time: "12:30 PM",
    recipeId: "chicken-and-spanish-rice",
    servings: 1,
  },
  {
    id: "seed-dinner",
    date: localDateKey(),
    source: "recipe",
    meal: "Dinner",
    time: "6:30 PM",
    recipeId: "grilled-salmon-with-papaya-mint-salsa",
    servings: 1,
  },
];

export const recipeImages = Object.fromEntries(
  recipes.map(({ id }) => [id, `/recipes/${id}.webp`]),
);
