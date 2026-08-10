import { Apple, Coffee, MoonStar, Package, Sun, Trash2 } from "lucide-react";
import { recipeImages } from "../data/seed";
import { formatAmount, nutritionFor } from "../utils/nutrition";

const mealIcons = {
  Breakfast: Coffee,
  Lunch: Sun,
  Dinner: MoonStar,
  Snack: Apple,
};

export default function MealRow({ meal, recipe, onRemove }) {
  const Icon = mealIcons[meal.meal] ?? Coffee;
  const item = meal.source === "custom" ? meal.customFood : recipe;
  const nutrients = nutritionFor(item, meal.servings);
  const image = recipeImages[item.id];

  return (
    <article className="meal-row">
      <div className="meal-time">
        <span className="timeline-icon"><Icon size={21} strokeWidth={1.7} /></span>
        <div><strong>{meal.meal}</strong><small>{meal.time}</small></div>
      </div>
      <div className="meal-recipe">
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="recipe-placeholder" aria-hidden="true">{meal.source === "custom" ? <Package size={20} /> : item.name.slice(0, 1)}</div>
        )}
        <div>
          <strong>{item.name}</strong>
          <small>{formatAmount(meal.servings, 1)} serving{meal.servings === 1 ? "" : "s"}{meal.source === "custom" ? ` · ${item.methodLabel}` : ""}</small>
        </div>
      </div>
      <div className="meal-nutrient"><strong>{formatAmount(nutrients.sodium, 1)} mg</strong><small>sodium</small></div>
      <div className="meal-nutrient"><strong>{formatAmount(nutrients.protein, 1)} g</strong><small>protein</small></div>
      <div className="meal-mobile-nutrients">
        {formatAmount(nutrients.sodium, 1)} mg sodium · {formatAmount(nutrients.protein, 1)} g protein
      </div>
      <button className="icon-button meal-menu" type="button" onClick={() => onRemove(meal.id)} aria-label={`Remove ${item.name}`}>
        <Trash2 size={19} strokeWidth={1.8} />
      </button>
    </article>
  );
}
