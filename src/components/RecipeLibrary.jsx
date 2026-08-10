import { ArrowUpRight, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { recipeImages } from "../data/seed";
import { formatAmount } from "../utils/nutrition";

export default function RecipeLibrary({ recipes, onChoose }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const categories = useMemo(() => ["All categories", ...new Set(recipes.map((recipe) => recipe.category))], [recipes]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) => (category === "All categories" || recipe.category === category) && (!query || recipe.name.toLowerCase().includes(query)));
  }, [category, recipes, search]);

  return (
    <main className="library-page">
      <header className="page-heading"><div><h1>Recipe library</h1><p>{recipes.length} recipes imported from the PKD workbook, with nutrition per serving.</p></div></header>
      <div className="library-toolbar">
        <label className="search-field"><Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recipes" /></label>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <span>{filtered.length} results</span>
      </div>
      <div className="recipe-table-wrap">
        <table className="recipe-table">
          <thead><tr><th>Recipe</th><th>Category</th><th>Calories</th><th>Protein</th><th>Sodium</th><th>Potassium</th><th><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{filtered.map((recipe) => {
            const image = recipeImages[recipe.id];
            return <tr key={recipe.id}><td><div className="table-recipe">{image ? <img src={image} alt="" /> : <span className="recipe-placeholder">{recipe.name.slice(0, 1)}</span>}<strong>{recipe.name}</strong></div></td><td>{recipe.category}</td><td>{formatAmount(recipe.calories, 1)} kcal</td><td>{formatAmount(recipe.protein, 1)} g</td><td><strong>{formatAmount(recipe.sodium, 1)} mg</strong></td><td>{formatAmount(recipe.potassium, 1)} mg</td><td><button type="button" className="table-add" onClick={() => onChoose(recipe)} aria-label={`Add ${recipe.name}`}><Plus size={17} /> Add</button></td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="library-note">Nutrition values are reproduced from <strong>AA_PKD Direct Study.xlsx</strong>. Verify serving definitions before clinical use.</p>
    </main>
  );
}
