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
import NutrientProgress from "./components/NutrientProgress";
import PlannerView from "./components/PlannerView";
import ProfileDrawer from "./components/ProfileDrawer";
import RecipeLibrary from "./components/RecipeLibrary";
import RecipeDetailView from "./components/RecipeDetailView";
import TodayMeals from "./components/TodayMeals";
import recipes from "./data/recipes.json";
import recipeDetails from "./data/recipeDetails.json";
import { defaultMeals, defaultProfile, recipeImages } from "./data/seed";
import { mealTimes, nextSortOrder, normalizeEntryOrder, reorderMealEntries } from "./utils/meals";
import { formatAmount, localDateKey, mealTotals } from "./utils/nutrition";

const appStorageKey = "clearplate-adpkd-mvp-v3";
const detailReturnLabels = {
  today: "today’s meals",
  planner: "plan",
  recipes: "recipes",
};

function loadInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(appStorageKey));
    if (saved?.profile && Array.isArray(saved.entries)) return { ...saved, entries: normalizeEntryOrder(saved.entries) };
  } catch {
    // Fall back to auditable demo data if local storage is unavailable or corrupt.
  }
  return { profile: defaultProfile, entries: normalizeEntryOrder(defaultMeals) };
}

export default function App() {
  const initial = useMemo(loadInitialState, []);
  const [activeTab, setActiveTab] = useState("today");
  const [profile, setProfile] = useState(initial.profile);
  const [entries, setEntries] = useState(initial.entries);
  const [mealDialog, setMealDialog] = useState({ open: false, recipeId: null, initialMeal: null });
  const [customDialog, setCustomDialog] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailView, setDetailView] = useState(null);
  const [plannerSession, setPlannerSession] = useState({
    selectedMeals: null,
    caloriesPerMeal: 450,
    activeObjective: "balanced",
  });
  const today = localDateKey();
  const recipesById = useMemo(() => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])), []);
  const todayEntries = entries.filter((entry) => entry.date === today);
  const totals = useMemo(() => mealTotals(todayEntries, recipesById), [recipesById, todayEntries]);

  const persist = (nextProfile, nextEntries) => {
    localStorage.setItem(appStorageKey, JSON.stringify({ profile: nextProfile, entries: nextEntries }));
  };

  const addRecipes = (items) => {
    const nextByMeal = new Map();
    const nextItems = items.map(({ recipeId, servings, meal }, index) => {
      const sortOrder = nextByMeal.get(meal) ?? nextSortOrder(entries, today, meal);
      nextByMeal.set(meal, sortOrder + 1);
      return {
        id: `recipe-${Date.now()}-${index}`,
        date: today,
        source: "recipe",
        recipeId,
        servings,
        meal,
        time: mealTimes[meal],
        sortOrder,
      };
    });
    const next = [...entries, ...nextItems];
    setEntries(next);
    persist(profile, next);
    setMealDialog({ open: false, recipeId: null, initialMeal: null });
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
      sortOrder: nextSortOrder(entries, today, meal),
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
    const mealNames = ["Breakfast", "Lunch", "Dinner", "Snack"];
    const nextByMeal = new Map();
    const nextItems = items.map((item, index) => {
      const meal = item.meal || mealNames[index % mealNames.length];
      const sortOrder = nextByMeal.get(meal) ?? nextSortOrder(entries, today, meal);
      nextByMeal.set(meal, sortOrder + 1);
      return {
        id: `plan-${Date.now()}-${index}`,
        date: today,
        source: "recipe",
        recipeId: item.recipeId || item.id,
        servings: item.servings || 1,
        meal,
        time: mealTimes[meal],
        sortOrder,
      };
    });
    const next = [...entries, ...nextItems];
    setEntries(next);
    persist(profile, next);
    setActiveTab("today");
  };

  const openRecipeDetails = (recipeOrEntry, returnTab = "today") => {
    const recipeId = recipeOrEntry.recipeId || recipeOrEntry.id;
    if (!recipeId) return;
    setDetailView({
      recipeId,
      servings: recipeOrEntry.servings || 1,
      returnTab,
    });
    setActiveTab("recipe-detail");
  };

  const openMealDialog = (recipeId = null, initialMeal = null) => {
    setMealDialog({ open: true, recipeId, initialMeal });
  };

  const reorderMealEntry = ({ entryId, targetMeal, targetEntryId = null, targetIndex = null }) => {
    const next = reorderMealEntries(entries, today, { entryId, targetMeal, targetEntryId, targetIndex });
    if (next === entries) return;
    setEntries(next);
    persist(profile, next);
  };

  const navigateTo = (tab) => {
    setActiveTab(tab);
    if (tab !== "recipe-detail") setDetailView(null);
  };

  const isTabActive = (tab) => activeTab === tab
    || (activeTab === "recipe-detail" && detailView?.returnTab === tab);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="logo-button" type="button" onClick={() => navigateTo("today")}><Logo /></button>
        <nav aria-label="Primary navigation">
          <button className={isTabActive("today") ? "active" : ""} type="button" onClick={() => navigateTo("today")}><CalendarDays /> Today</button>
          <button className={isTabActive("planner") ? "active" : ""} type="button" onClick={() => navigateTo("planner")}><Utensils /> Plan</button>
          <button className={isTabActive("recipes") ? "active" : ""} type="button" onClick={() => navigateTo("recipes")}><BookOpen /> Recipes</button>
          <button className={activeTab === "history" ? "active" : ""} type="button" onClick={() => navigateTo("history")}><History /> History</button>
          <button type="button" onClick={() => setProfileOpen(true)}><CircleUserRound /> Profile</button>
        </nav>
        <button className="avatar-button" type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile">{profile.name.slice(0, 1).toUpperCase()}</button>
      </header>

      {activeTab === "today" && <TodayView
        profile={profile}
        entries={todayEntries}
        recipesById={recipesById}
        totals={totals}
        onOpenMeal={openMealDialog}
        onOpenCustom={() => setCustomDialog(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenRecipe={(entry) => openRecipeDetails(entry, "today")}
        onRemove={removeEntry}
        onReorder={reorderMealEntry}
      />}
      {activeTab === "planner" && <PlannerView recipes={recipes} recipeDetails={recipeDetails} profile={profile} todayEntries={todayEntries} todayTotals={totals} plannerSession={plannerSession} onPlannerSessionChange={setPlannerSession} onAddPlan={addPlan} onOpenRecipe={(recipe) => openRecipeDetails(recipe, "planner")} />}
      {activeTab === "recipes" && <RecipeLibrary recipes={recipes} onChoose={(recipe) => openMealDialog(recipe.id)} onOpenRecipe={(recipe) => openRecipeDetails(recipe, "recipes")} />}
      {activeTab === "history" && <HistoryView entries={entries} recipesById={recipesById} />}
      {activeTab === "recipe-detail" && detailView && (
        <RecipeDetailView
          recipe={recipesById[detailView.recipeId]}
          details={recipeDetails[detailView.recipeId]}
          servings={detailView.servings}
          backLabel={detailReturnLabels[detailView.returnTab] || detailReturnLabels.today}
          onBack={() => navigateTo(detailView.returnTab || "today")}
        />
      )}

      <footer className="medical-footer"><Info size={20} strokeWidth={1.8} /><span>Other nutrient consideration (Ca, Phos, K) should be made individually based on medical conditions. Targets should be reviewed with your kidney care team. This app does not diagnose kidney disease.</span></footer>

      <AddMealModal open={mealDialog.open} recipes={recipes} initialRecipeId={mealDialog.recipeId} initialMeal={mealDialog.initialMeal} todayTotals={totals} profile={profile} onClose={() => setMealDialog({ open: false, recipeId: null, initialMeal: null })} onAdd={addRecipes} />
      <CustomFoodModal open={customDialog} onClose={() => setCustomDialog(false)} onAdd={addCustomFood} />
      <ProfileDrawer open={profileOpen} profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile} />
    </div>
  );
}

function TodayView({ profile, entries, recipesById, totals, onOpenMeal, onOpenCustom, onOpenProfile, onOpenRecipe, onRemove, onReorder }) {
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
        <TodayMeals entries={entries} recipesById={recipesById} onAddMeal={(meal) => onOpenMeal(null, meal)} onOpenRecipe={onOpenRecipe} onRemove={onRemove} onReorder={onReorder} />
      </section>

      <aside className="dashboard-rail">
        <section className="idea-list"><header><h2>Low-sodium ideas</h2><button type="button" onClick={() => onOpenMeal()}>View all</button></header>{ideas.map((recipe) => <button className="idea-row" type="button" key={recipe.id} onClick={() => onOpenMeal(recipe.id)}>{recipeImages[recipe.id] ? <img src={recipeImages[recipe.id]} alt="" loading="lazy" decoding="async" /> : <span className="recipe-placeholder">{recipe.name.slice(0, 1)}</span>}<span><strong>{recipe.name}</strong><small>{formatAmount(recipe.sodium, 1)} mg sodium · {formatAmount(recipe.protein, 1)} g protein</small></span><ChevronRight size={19} /></button>)}</section>
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
