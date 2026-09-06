import { Check, Minus, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { recipeImages } from "../data/seed";
import recipeDetails from "../data/recipeDetails.json";
import { mealSections } from "../utils/meals";
import { formatAmount, nutritionFor } from "../utils/nutrition";

const meals = mealSections.map(({ name }) => name);
const courseFilters = [
  { value: "all", label: "All courses" },
  { value: "appetizers", label: "Appetizers", categories: ["Appetizers"] },
  { value: "soups-salads", label: "Soups & Salads", categories: ["Soups & Salads"] },
  { value: "sides", label: "Sides", categories: ["Sides", "Grains"] },
  { value: "entrees", label: "Entrées", categories: ["Entrees"] },
  { value: "desserts", label: "Desserts", categories: ["Desserts"] },
  { value: "seasonings", label: "Seasonings", categories: ["Spices & Rubs"] },
  { value: "sauces", label: "Sauces", categories: ["sauce"] },
];

const emptyTotals = { sodium: 0, protein: 0 };

export default function AddMealModal({
  open,
  recipes,
  initialRecipeId,
  initialMeal,
  todayTotals = emptyTotals,
  profile,
  saveError,
  onClose,
  onAdd,
}) {
  const [search, setSearch] = useState("");
  const [meal, setMeal] = useState("Lunch");
  const [dietFilter, setDietFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (open) {
      setSelectedIds(initialRecipeId ? [initialRecipeId] : []);
      setSearch("");
      setDietFilter("all");
      setCourseFilter("all");
      setServings(1);
      setMeal(initialMeal || "Lunch");
    }
  }, [open, initialMeal, initialRecipeId]);

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    const course = courseFilters.find((option) => option.value === courseFilter);
    return recipes
      .filter((recipe) => !query || recipe.name.toLowerCase().includes(query))
      .filter((recipe) => !course?.categories || course.categories.includes(recipe.category))
      .filter((recipe) => dietFilter !== "low" || recipe.sodium <= 140)
      .filter((recipe) => dietFilter !== "protein" || recipe.protein >= 15)
      .sort((a, b) => {
        const aImage = recipeImages[a.id] ? 0 : 1;
        const bImage = recipeImages[b.id] ? 0 : 1;
        return aImage - bImage || a.sodium - b.sodium;
      });
  }, [courseFilter, dietFilter, recipes, search]);

  const selectedRecipes = useMemo(
    () => selectedIds.map((id) => recipes.find((recipe) => recipe.id === id)).filter(Boolean),
    [recipes, selectedIds],
  );

  const selectedNutrition = useMemo(
    () => selectedRecipes.reduce((totals, recipe) => {
      const nutrients = nutritionFor(recipe, servings);
      return {
        sodium: totals.sodium + nutrients.sodium,
        protein: totals.protein + nutrients.protein,
      };
    }, { ...emptyTotals }),
    [selectedRecipes, servings],
  );

  const sodiumTarget = profile?.sodiumTargetMg || 2000;
  const proteinMin = profile?.proteinMinG || 0;
  const proteinMax = profile?.proteinMaxG || 70;
  const combined = {
    sodium: (todayTotals.upper?.sodium ?? todayTotals.sodium) + selectedNutrition.sodium,
    protein: (todayTotals.upper?.protein ?? todayTotals.protein) + selectedNutrition.protein,
  };
  const sodiumOver = combined.sodium > sodiumTarget;
  const proteinOver = combined.protein > proteinMax;

  if (!open) return null;

  const toggleRecipe = (recipeId) => {
    setSelectedIds((current) => current.includes(recipeId)
      ? current.filter((id) => id !== recipeId)
      : [...current, recipeId]);
  };

  const handleAdd = () => {
    if (!selectedRecipes.length) return;
    onAdd(selectedRecipes.map((recipe) => ({ recipeId: recipe.id, servings, meal })));
  };

  const recipeFitLabel = (recipe, chosen) => {
    const nutrients = nutritionFor(recipe, servings);
    const projected = chosen ? combined : {
      sodium: combined.sodium + nutrients.sodium,
      protein: combined.protein + nutrients.protein,
    };
    const over = [];
    if (projected.sodium > sodiumTarget) over.push("sodium");
    if (projected.protein > proteinMax) over.push("protein");
    if (over.length) return { text: `${chosen ? "Selected · over" : "Would exceed"} ${over.join(" & ")}`, danger: true };
    return { text: chosen ? "Selected · within limits" : "Fits today’s remaining limits", danger: false };
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="meal-modal" role="dialog" aria-modal="true" aria-labelledby="add-meal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2 id="add-meal-title">Add a meal</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close add meal dialog"><X /></button>
        </header>

        <label className="search-field">
          <Search size={21} strokeWidth={1.8} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${recipes.length} recipes`} autoFocus />
        </label>

        <section className="selection-progress" aria-label="Selected recipes and today’s logged totals">
          <header>
            <div><strong>Selected recipes</strong><small>{selectedRecipes.length ? `${selectedRecipes.length} selected · ${formatAmount(servings, 1)} serving${servings === 1 ? "" : "s"} each` : "Select recipes to preview the combined total"}</small></div>
            {(sodiumOver || proteinOver) && <span className="selection-warning">Over target</span>}
          </header>
          <div className="selection-progress-grid">
            <CompactProgress
              label="Sodium"
              value={combined.sodium}
              unit="mg"
              max={sodiumTarget}
              displayMax={`${formatAmount(sodiumTarget)} mg max`}
              danger={sodiumOver}
              status={sodiumOver ? `${formatAmount(combined.sodium - sodiumTarget, 1)} mg over` : `${formatAmount(sodiumTarget - combined.sodium, 1)} mg remaining`}
            />
            <CompactProgress
              label="Protein"
              value={combined.protein}
              unit="g"
              max={proteinMax}
              displayMax={`${formatAmount(proteinMin)}–${formatAmount(proteinMax)} g`}
              marker={proteinMax ? (proteinMin / proteinMax) * 100 : 0}
              danger={proteinOver}
              warning={combined.protein < proteinMin}
              status={proteinOver ? `${formatAmount(combined.protein - proteinMax, 1)} g over` : todayTotals.estimatedCount > 0 ? "Includes estimates" : combined.protein < proteinMin ? `${formatAmount(proteinMin - combined.protein, 1)} g to minimum` : "Within range"}
            />
          </div>
        </section>

        <fieldset className="meal-choice">
          <legend>Meal</legend>
          <div>{meals.map((option) => <button className={meal === option ? "selected" : ""} type="button" key={option} onClick={() => setMeal(option)}>{option}</button>)}</div>
        </fieldset>

        <div className="filter-group">
          <span>Course</span>
          <div className="course-filter-row" aria-label="Recipe course filters">
            {courseFilters.map((option) => (
              <button type="button" key={option.value} className={courseFilter === option.value ? "selected" : ""} onClick={() => setCourseFilter(option.value)}>{option.label}</button>
            ))}
          </div>
        </div>

        <div className="filter-row" aria-label="Nutrition filters">
          <button type="button" className={dietFilter === "all" ? "selected" : ""} onClick={() => setDietFilter("all")}>All nutrition</button>
          <button type="button" className={dietFilter === "low" ? "selected" : ""} onClick={() => setDietFilter("low")}>Low sodium</button>
          <button type="button" className={dietFilter === "protein" ? "selected" : ""} onClick={() => setDietFilter("protein")}>Higher protein</button>
        </div>

        <div className="recipe-results" aria-live="polite">
          {results.length ? results.map((recipe) => {
            const image = recipeImages[recipe.id];
            const chosen = selectedIds.includes(recipe.id);
            const fit = recipeFitLabel(recipe, chosen);
            const details = recipeDetails[recipe.id];
            return (
              <button type="button" aria-pressed={chosen} className={`recipe-result ${chosen ? "selected" : ""}`} key={recipe.id} onClick={() => toggleRecipe(recipe.id)}>
                {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span className="recipe-placeholder">{recipe.name.slice(0, 1)}</span>}
                <span className="recipe-result-copy">
                  <strong>{recipe.name}</strong>
                  <small>1 serving: {recipeDetails[recipe.id]?.servingSize || "source portion not available"}</small>
                  <small>{formatAmount(recipe.calories, 1)} kcal · {formatAmount(recipe.protein, 1)} g protein · {formatAmount(recipe.sodium, 1)} mg sodium</small>
                  {details && <small className="recipe-quick-info"><b>Needs:</b> {details.quickIngredients.join(" · ")}</small>}
                  {details && <small className="recipe-quick-info method"><b>Method:</b> {details.quickMethod}</small>}
                  {!details && <small className="recipe-quick-info unavailable">Nutrition data only · preparation details not available yet</small>}
                  <small className={`recipe-fit ${fit.danger ? "danger" : ""}`}>{fit.text}</small>
                </span>
                <span className="check-mark">{chosen && <Check size={15} strokeWidth={2.4} />}</span>
              </button>
            );
          }) : <p className="empty-state">No recipes match those filters.</p>}
        </div>

        <footer className="meal-modal-footer">
          {todayTotals.estimatedCount > 0 && <p className="field-note">Upper-limit checks use the high end of your logged estimates. Protein adequacy is not confirmed here.</p>}
          {saveError && <p className="storage-alert" role="alert">{saveError}</p>}
          <div className="serving-row">
            <span>Servings for each selected recipe</span>
            <div className="stepper">
              <button type="button" onClick={() => setServings((value) => Math.max(0.5, value - 0.5))} aria-label="Decrease servings"><Minus size={18} /></button>
              <strong>{formatAmount(servings, 1)}</strong>
              <button type="button" onClick={() => setServings((value) => Math.min(10, value + 0.5))} aria-label="Increase servings"><Plus size={18} /></button>
            </div>
          </div>
          <div className={`contribution ${sodiumOver || proteinOver ? "danger" : ""}`}>
            {selectedRecipes.length ? <>{selectedRecipes.length} recipe{selectedRecipes.length === 1 ? "" : "s"} add <strong>{formatAmount(selectedNutrition.sodium, 1)} mg sodium</strong> and <strong>{formatAmount(selectedNutrition.protein, 1)} g protein</strong></> : "Choose one or more recipes"}
          </div>
          <div className="modal-actions"><button type="button" className="primary-button" disabled={!selectedRecipes.length} onClick={handleAdd}>Add {selectedRecipes.length || ""} {selectedRecipes.length === 1 ? "recipe" : "recipes"} to today</button><button type="button" className="secondary-button" onClick={onClose}>Cancel</button></div>
        </footer>
      </section>
    </div>
  );
}

function CompactProgress({ label, value, unit, max, displayMax, marker, danger, warning, status }) {
  const percent = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`compact-progress ${danger ? "danger" : warning ? "warning" : ""}`}>
      <div><strong>{label}</strong><span>{formatAmount(value, 1)} {unit} / {displayMax}</span></div>
      <div className="compact-progress-track">
        <span style={{ width: `${percent}%` }} />
        {marker !== undefined && <i style={{ left: `${Math.min(100, Math.max(0, marker))}%` }} />}
      </div>
      <small>{status}</small>
    </div>
  );
}
