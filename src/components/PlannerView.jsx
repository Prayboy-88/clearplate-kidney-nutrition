import { CheckCircle2, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { recipeImages } from "../data/seed";
import { formatAmount } from "../utils/nutrition";
import { optimizeRecipePlan } from "../utils/planner";

const planMealLabels = ["Breakfast / first meal", "Lunch / second meal", "Dinner / third meal"];

export default function PlannerView({ recipes, profile, onAddPlan, onOpenRecipe }) {
  const [calorieTarget, setCalorieTarget] = useState(1800);
  const [nonce, setNonce] = useState(0);
  const result = useMemo(() => optimizeRecipePlan(recipes, {
    calorieTarget: Number(calorieTarget),
    sodiumMax: profile.sodiumTargetMg,
    proteinMin: profile.proteinMinG,
    proteinMax: profile.proteinMaxG,
  }), [calorieTarget, nonce, profile, recipes]);

  return (
    <main className="planner-page">
      <header className="page-heading"><div><h1>Build a day</h1><p>Find a three-recipe combination that respects the sodium and protein plan you saved.</p></div><button className="secondary-button" type="button" onClick={() => setNonce((value) => value + 1)}><RefreshCw size={18} /> Recalculate</button></header>
      <section className="planner-controls">
        <div><label htmlFor="calorie-target">Approximate calorie target</label><div className="inline-unit"><input id="calorie-target" type="number" min="900" max="4000" step="50" value={calorieTarget} onChange={(event) => setCalorieTarget(event.target.value)} /><span>kcal</span></div></div>
        <div className="constraint-summary"><span>Sodium ≤ <strong>{formatAmount(profile.sodiumTargetMg)} mg</strong></span><span>Protein <strong>{formatAmount(profile.proteinMinG)}–{formatAmount(profile.proteinMaxG)} g</strong></span><span>3 distinct recipes</span></div>
      </section>
      {result && <>
        <section className={`plan-status ${result.feasible ? "feasible" : "closest"}`}><CheckCircle2 size={22} /><div><strong>{result.feasible ? "Constraint-compatible combination" : "Closest available combination"}</strong><p>{result.feasible ? "This combination stays inside the saved sodium and protein bounds." : "No exact three-recipe match was found in the current candidate pool. Review the gaps before using it."}</p></div></section>
        <div className="plan-list">{result.items.map((recipe, index) => <button className="plan-row plan-row-button" type="button" key={recipe.id} onClick={() => onOpenRecipe(recipe)} aria-label={`View ${recipe.name} recipe`}>{recipeImages[recipe.id] ? <img src={recipeImages[recipe.id]} alt="" loading="lazy" decoding="async" /> : <span className="plan-index">{index + 1}</span>}<div><small>{planMealLabels[index]}</small><strong>{recipe.name}</strong><span>{formatAmount(recipe.calories, 1)} kcal · {formatAmount(recipe.protein, 1)} g protein · {formatAmount(recipe.sodium, 1)} mg sodium</span><span className="plan-row-link">View recipe</span></div><ChevronRight className="plan-row-arrow" size={20} /></button>)}</div>
        <section className="plan-totals"><div><span>Calories</span><strong>{formatAmount(result.totals.calories, 1)} kcal</strong></div><div><span>Protein</span><strong>{formatAmount(result.totals.protein, 1)} g</strong></div><div><span>Sodium</span><strong>{formatAmount(result.totals.sodium, 1)} mg</strong></div><button className="primary-button" type="button" onClick={() => onAddPlan(result.items)}>Add plan to today</button></section>
      </>}
      <section className="optimization-note"><Sparkles size={20} /><div><strong>Why this is not labeled “convex optimal” yet</strong><p>Continuous serving sizes can be expressed as a linear/convex program. Requiring a recipe to be selected or not selected makes the production version a mixed-integer problem. This MVP uses an auditable exhaustive search over a bounded recipe pool; the next backend version can use an LP/MILP solver with preferences, allergies, potassium, phosphorus, cost and variety constraints.</p></div></section>
    </main>
  );
}
