import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  History,
  Info,
  PackagePlus,
  Plus,
  Scale,
  Settings2,
  Target,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import AddMealModal from "./components/AddMealModal";
import CustomFoodModal from "./components/CustomFoodModal";
import HistoryView from "./components/HistoryView";
import Logo from "./components/Logo";
import MealRow from "./components/MealRow";
import NutrientProgress from "./components/NutrientProgress";
import PlannerView from "./components/PlannerView";
import ProfileDrawer from "./components/ProfileDrawer";
import RecipeLibrary from "./components/RecipeLibrary";
import recipes from "./data/recipes.json";
import { defaultMeals, defaultProfile, recipeImages } from "./data/seed";
import { formatAmount, localDateKey, mealTotals } from "./utils/nutrition";

const appStorageKey = "clearplate-adpkd-mvp-v3";
const mealTimes = { Breakfast: "7:30 AM", Lunch: "12:30 PM", Dinner: "6:30 PM", Snack: "3:30 PM" };

function loadInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(appStorageKey));
    if (saved?.profile && Array.isArray(saved.entries)) return saved;
  } catch {
    // Fall back to auditable demo data if local storage is unavailable or corrupt.
  }
  return { profile: defaultProfile, entries: defaultMeals };
}

export default function App() {
  const initial = useMemo(loadInitialState, []);
  const [activeTab, setActiveTab] = useState("today");
  const [profile, setProfile] = useState(initial.profile);
  const [entries, setEntries] = useState(initial.entries);
  const [mealDialog, setMealDialog] = useState({ open: false, recipeId: null });
  const [customDialog, setCustomDialog] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const today = localDateKey();
  const recipesById = useMemo(() => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])), []);
  const todayEntries = entries.filter((entry) => entry.date === today);
  const totals = useMemo(() => mealTotals(todayEntries, recipesById), [recipesById, todayEntries]);

  const persist = (nextProfile, nextEntries) => {
    localStorage.setItem(appStorageKey, JSON.stringify({ profile: nextProfile, entries: nextEntries }));
  };

  const addRecipes = (items) => {
    const nextItems = items.map(({ recipeId, servings, meal }, index) => ({
      id: `recipe-${Date.now()}-${index}`,
      date: today,
      source: "recipe",
      recipeId,
      servings,
      meal,
      time: mealTimes[meal],
    }));
    const next = [...entries, ...nextItems];
    setEntries(next);
    persist(profile, next);
    setMealDialog({ open: false, recipeId: null });
    setActiveTab("today");
  };

  const addCustomFood = ({ customFood, servings, meal }) => {
    const next = [...entries, {
      id: `outside-${Date.now()}`,
      date: today,
      source: "custom",
      customFood,
      servings,
      meal,
      time: mealTimes[meal],
    }];
    setEntries(next);
    persist(profile, next);
    setActiveTab("today");
  };

  const removeEntry = (id) => {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    persist(profile, next);
  };

  const saveProfile = (nextProfile) => {
    setProfile(nextProfile);
    persist(nextProfile, entries);
    setProfileOpen(false);
  };

  const addPlan = (items) => {
    const mealNames = ["Breakfast", "Lunch", "Dinner"];
    const nextItems = items.map((recipe, index) => ({
      id: `plan-${Date.now()}-${index}`,
      date: today,
      source: "recipe",
      recipeId: recipe.id,
      servings: 1,
      meal: mealNames[index],
      time: mealTimes[mealNames[index]],
    }));
    const next = [...entries, ...nextItems];
    setEntries(next);
    persist(profile, next);
    setActiveTab("today");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="logo-button" type="button" onClick={() => setActiveTab("today")}><Logo /></button>
        <nav aria-label="Primary navigation">
          <button className={activeTab === "today" ? "active" : ""} type="button" onClick={() => setActiveTab("today")}><CalendarDays /> Today</button>
          <button className={activeTab === "planner" ? "active" : ""} type="button" onClick={() => setActiveTab("planner")}><Utensils /> Plan</button>
          <button className={activeTab === "recipes" ? "active" : ""} type="button" onClick={() => setActiveTab("recipes")}><BookOpen /> Recipes</button>
          <button className={activeTab === "history" ? "active" : ""} type="button" onClick={() => setActiveTab("history")}><History /> History</button>
          <button type="button" onClick={() => setProfileOpen(true)}><CircleUserRound /> Profile</button>
        </nav>
        <button className="avatar-button" type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile">{profile.name.slice(0, 1).toUpperCase()}</button>
      </header>

      {activeTab === "today" && <TodayView
        profile={profile}
        entries={todayEntries}
        recipesById={recipesById}
        totals={totals}
        onOpenMeal={(recipeId = null) => setMealDialog({ open: true, recipeId })}
        onOpenCustom={() => setCustomDialog(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onRemove={removeEntry}
      />}
      {activeTab === "planner" && <PlannerView recipes={recipes} profile={profile} onAddPlan={addPlan} />}
      {activeTab === "recipes" && <RecipeLibrary recipes={recipes} onChoose={(recipe) => setMealDialog({ open: true, recipeId: recipe.id })} />}
      {activeTab === "history" && <HistoryView entries={entries} recipesById={recipesById} />}

      <footer className="medical-footer"><Info size={20} strokeWidth={1.8} /><span>Other nutrient consideration (Ca, Phos, K) should be made individually based on medical conditions. Targets should be reviewed with your kidney care team. This app does not diagnose kidney disease.</span></footer>

      <AddMealModal open={mealDialog.open} recipes={recipes} initialRecipeId={mealDialog.recipeId} todayTotals={totals} profile={profile} onClose={() => setMealDialog({ open: false, recipeId: null })} onAdd={addRecipes} />
      <CustomFoodModal open={customDialog} onClose={() => setCustomDialog(false)} onAdd={addCustomFood} />
      <ProfileDrawer open={profileOpen} profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile} />
    </div>
  );
}

function TodayView({ profile, entries, recipesById, totals, onOpenMeal, onOpenCustom, onOpenProfile, onRemove }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const lowSodiumIds = ["roasted-garlic", "quinoa-with-black-beans-and-avocado"];
  const ideas = lowSodiumIds.map((id) => recipesById[id]).filter(Boolean);

  return (
    <main className="dashboard-layout">
      <section className="dashboard-main">
        <header className="dashboard-heading">
          <div><h1>{greeting}, {profile.name}</h1><p>Stay within today’s sodium and protein plan.</p></div>
          <span><CalendarDays size={20} /> {displayDate}</span>
        </header>
        <div className="dashboard-actions">
          <button className="primary-button" type="button" onClick={() => onOpenMeal()}><Plus size={20} /> Add a meal</button>
          <button className="secondary-button" type="button" onClick={onOpenCustom}><PackagePlus size={20} /> Log outside food</button>
          <button className="secondary-button" type="button" onClick={onOpenProfile}><Settings2 size={20} /> Adjust targets</button>
        </div>
        <div className="nutrient-stack">
          <NutrientProgress type="sodium" value={totals.sodium} target={profile.sodiumTargetMg} />
          <NutrientProgress type="protein" value={totals.protein} range={{ min: profile.proteinMinG, max: profile.proteinMaxG }} />
        </div>
        <section className="today-meals">
          <h2>Today’s meals</h2>
          <div className="meal-list">
            {entries.length ? entries.map((entry) => <MealRow key={entry.id} meal={entry} recipe={recipesById[entry.recipeId]} onRemove={onRemove} />) : <p className="empty-state">No foods logged today. Add a recipe or an outside food to start.</p>}
          </div>
          <button className="add-another" type="button" onClick={() => onOpenMeal()}><span><Plus size={20} /></span> Add another meal</button>
        </section>
      </section>

      <aside className="dashboard-rail">
        <section className="idea-list"><header><h2>Low-sodium ideas</h2><button type="button" onClick={() => onOpenMeal()}>View all</button></header>{ideas.map((recipe) => <button className="idea-row" type="button" key={recipe.id} onClick={() => onOpenMeal(recipe.id)}>{recipeImages[recipe.id] ? <img src={recipeImages[recipe.id]} alt="" /> : <span className="recipe-placeholder">{recipe.name.slice(0, 1)}</span>}<span><strong>{recipe.name}</strong><small>{formatAmount(recipe.sodium, 1)} mg sodium · {formatAmount(recipe.protein, 1)} g protein</small></span><ChevronRight size={19} /></button>)}</section>
        <section className="plan-summary">
          <header><h2>Your plan</h2><button type="button" onClick={onOpenProfile}>Edit</button></header>
          <p className="plan-context">{profile.condition} · CKD {profile.stage} · {formatAmount(profile.weightKg, 1)} kg</p>
          <div className="plan-detail"><span className="plan-icon"><Target size={21} /></span><div><strong>Sodium maximum</strong><small>Daily upper limit</small></div><b>{formatAmount(profile.sodiumTargetMg)} mg/day</b></div>
          <div className="plan-detail protein-detail"><span className="plan-icon"><Scale size={21} /></span><div><strong>Protein range</strong><small>{profile.useGuidelineProteinRange ? "Weight-based starting point" : "Custom care-team target"}</small></div><b>{formatAmount(profile.proteinMinG)}–{formatAmount(profile.proteinMaxG)} g/day</b></div>
          <div className="plan-detail"><span className="plan-icon"><CircleUserRound size={21} /></span><div><strong>Treatment status</strong><small>Changes target logic</small></div><b>{profile.treatment === "dialysis" ? "Dialysis" : "Not on dialysis"}</b></div>
          <a className="source-button" href="https://kdigo.org/guidelines/autosomal-dominant-polycystic-kidney-disease-adpkd/" target="_blank" rel="noreferrer">Review source guidance <ChevronRight size={18} /></a>
        </section>
      </aside>
    </main>
  );
}
