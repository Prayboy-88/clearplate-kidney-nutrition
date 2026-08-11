import { ArrowLeft, Check, FileQuestion, Info, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { recipeImages } from "../data/seed";
import { formatAmount, nutritionFor } from "../utils/nutrition";

const unicodeFractions = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

function parseQuantity(value) {
  const trimmed = value.trim();
  if (unicodeFractions[trimmed] !== undefined) return unicodeFractions[trimmed];
  const unicodeMixed = trimmed.match(/^(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞])$/);
  if (unicodeMixed) return Number(unicodeMixed[1]) + unicodeFractions[unicodeMixed[2]];
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function formatScaled(value) {
  if (value >= 10) return formatAmount(value, 1);
  if (value >= 1) return formatAmount(value, 2);
  return formatAmount(value, 2);
}

function scaleIngredient(ingredient, factor) {
  if (!ingredient || ingredient.endsWith(":") || factor === 1) return ingredient;
  const quantityPattern = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*[¼½¾⅓⅔⅛⅜⅝⅞]|\\d+\\/\\d+|[¼½¾⅓⅔⅛⅜⅝⅞]|\\d+(?:\\.\\d+)?)";
  const range = ingredient.match(new RegExp(`^(${quantityPattern})\\s+to\\s+(${quantityPattern})(.*)$`, "i"));
  if (range) {
    const low = parseQuantity(range[1]);
    const high = parseQuantity(range[2]);
    if (low !== null && high !== null) return `≈ ${formatScaled(low * factor)} to ${formatScaled(high * factor)}${range[3]}`;
  }
  const single = ingredient.match(new RegExp(`^(${quantityPattern})(.*)$`, "i"));
  if (!single) return ingredient;
  const quantity = parseQuantity(single[1]);
  return quantity === null ? ingredient : `≈ ${formatScaled(quantity * factor)}${single[2]}`;
}

export default function RecipeDetailView({ recipe, details, servings = 1, backLabel = "today’s meals", onBack }) {
  const [cookServings, setCookServings] = useState(servings);
  const [checkedIngredients, setCheckedIngredients] = useState([]);

  useEffect(() => {
    setCookServings(servings);
    setCheckedIngredients([]);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [recipe, servings]);

  const scaledIngredients = useMemo(() => {
    if (!details?.servings) return [];
    const factor = cookServings / details.servings;
    return details.ingredients.map((ingredient) => scaleIngredient(ingredient, factor));
  }, [cookServings, details]);

  if (!recipe) return null;

  const nutrients = nutritionFor(recipe, cookServings);
  const image = recipeImages[recipe.id];
  const scaleFactor = details ? cookServings / details.servings : 1;
  const toggleIngredient = (index) => {
    setCheckedIngredients((current) => current.includes(index)
      ? current.filter((item) => item !== index)
      : [...current, index]);
  };

  return (
    <main className="recipe-detail-page">
      <button className="recipe-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={19} /> Back to {backLabel}
      </button>

      <article className="recipe-detail-surface">
        <header className="recipe-detail-header">
          <div className="recipe-detail-hero">
            {image ? <img src={image} alt={`${recipe.name} prepared dish`} /> : <span className="recipe-placeholder">{recipe.name.slice(0, 1)}</span>}
            <div>
              <span>{recipe.category} · {details ? "Cooking instructions" : "Nutrition data only"}</span>
              <h1 id="recipe-detail-title">{recipe.name}</h1>
              <p>{details ? `${details.servingSize} per serving · source recipe makes ${details.servings} servings` : `${formatAmount(servings, 1)} serving${servings === 1 ? "" : "s"} · no preparation source linked`}</p>
            </div>
          </div>
        </header>

        <section className="recipe-detail-nutrition" aria-label={`Nutrition for ${formatAmount(cookServings, 1)} servings`}>
          <div><strong>{formatAmount(nutrients.calories, 1)}</strong><span>kcal</span></div>
          <div><strong>{formatAmount(nutrients.sodium, 1)} mg</strong><span>sodium</span></div>
          <div><strong>{formatAmount(nutrients.protein, 1)} g</strong><span>protein</span></div>
          <div><strong>{formatAmount(nutrients.potassium, 1)} mg</strong><span>potassium</span></div>
        </section>

        {details ? (
          <div className="recipe-detail-body">
            <section className="ingredient-panel">
              <header>
                <div><h2>Ingredients</h2><p>Scaled for approximately {formatAmount(cookServings, 1)} serving{cookServings === 1 ? "" : "s"}</p></div>
                <div className="stepper compact-stepper">
                  <button type="button" onClick={() => setCookServings((value) => Math.max(0.5, value - 0.5))} aria-label="Decrease cooking servings"><Minus size={17} /></button>
                  <strong>{formatAmount(cookServings, 1)}</strong>
                  <button type="button" onClick={() => setCookServings((value) => Math.min(100, value + 0.5))} aria-label="Increase cooking servings"><Plus size={17} /></button>
                </div>
              </header>
              <p className="scaling-note">Batch scale × {formatAmount(scaleFactor, 2)}. Amounts marked ≈ are estimates derived from the source recipe; original units are retained because gram weights are not consistently provided.</p>
              <div className="ingredient-checklist">
                {scaledIngredients.map((ingredient, index) => ingredient.endsWith(":") ? (
                  <h3 key={`${ingredient}-${index}`}>{ingredient}</h3>
                ) : (
                  <button className={checkedIngredients.includes(index) ? "checked" : ""} type="button" key={`${ingredient}-${index}`} onClick={() => toggleIngredient(index)}>
                    <span>{checkedIngredients.includes(index) && <Check size={14} strokeWidth={2.5} />}</span>
                    <b>{ingredient}</b>
                  </button>
                ))}
              </div>
            </section>

            <section className="cooking-panel">
              <header><h2>Cooking instructions</h2><p>Follow the source steps in order. Ingredient checkboxes stay available while you cook.</p></header>
              <ol className="cooking-steps">
                {details.steps.map((step, index) => <li key={`${step}-${index}`}><span>{index + 1}</span><p>{step}</p></li>)}
              </ol>
              {(details.notes || details.servingSuggestion) && (
                <div className="recipe-notes">
                  {details.notes && <div><strong>Notes</strong><p>{details.notes}</p></div>}
                  {details.servingSuggestion && <div><strong>Serving suggestion</strong><p>{details.servingSuggestion}</p></div>}
                </div>
              )}
              <div className="recipe-source-disclosure">
                <Info size={18} />
                <p><strong>Editorial draft:</strong> preparation details are paraphrased from {details.source.publisher}, <em>{details.source.title}</em>, printed page {details.source.printedPage}. Permission status is not cleared; clinical notes are informational and are not used as target-setting rules.</p>
              </div>
            </section>
          </div>
        ) : (
          <section className="recipe-detail-unavailable" aria-labelledby="preparation-unavailable-title">
            <span><FileQuestion size={30} /></span>
            <div>
              <p className="status-label">Source check complete</p>
              <h2 id="preparation-unavailable-title">Preparation details are not available</h2>
              <p>This recipe was manually added to the nutrition workbook and has no matching recipe or source page in the Cooking Well PDF. Its nutrition values remain available, but ingredients and cooking steps are intentionally not inferred.</p>
              <button className="secondary-button" type="button" onClick={onBack}><ArrowLeft size={18} /> Back to {backLabel}</button>
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
