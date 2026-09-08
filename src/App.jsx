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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { defaultProfile, recipeImages } from "./data/seed";
import { mealTimes, nextSortOrder, normalizeEntryOrder, reorderMealEntries } from "./utils/meals";
import { formatAmount, localDateKey, mealTotals, mealTotalBounds } from "./utils/nutrition";
import { daySignature, isDayComplete } from "./utils/recording";
import { saveSnapshot } from "./utils/storage";
import { normalizeProfileDraft } from "./utils/profile";

const appStorageKey = "clearplate-adpkd-mvp-v3";
const detailReturnLabels = {
  today: "today’s meals",
  planner: "plan",
  recipes: "recipes",
};

function loadInitialState(rawOverride) {
  let raw = null;
  try {
    raw = rawOverride === undefined ? localStorage.getItem(appStorageKey) : rawOverride;
    const saved = JSON.parse(raw);
    if (saved?.profile && Array.isArray(saved.entries)) return {
      ...saved, raw, profile: normalizeProfileDraft(saved.profile), entries: normalizeEntryOrder(saved.entries),
    };
  } catch {
    // Start without invented meals if no usable saved record is available.
  }
  return { profile: defaultProfile, entries: [], raw };
}

export default function App() {
  const initial = useMemo(loadInitialState, []);
  const savedRaw = useRef(initial.raw);
  const saving = useRef(false);
  const [activeTab, setActiveTab] = useState("today");
  const [profile, setProfile] = useState(initial.profile);
  const [entries, setEntries] = useState(initial.entries);
  const [dayRecords, setDayRecords] = useState(initial.dayRecords || {});
  const [mealDialog, setMealDialog] = useState({ open: false, recipeId: null, initialMeal: null });
  const [customDialog, setCustomDialog] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [detailView, setDetailView] = useState(null);
  const [plannerSession, setPlannerSession] = useState({
    selectedMeals: null,
    caloriesPerMeal: 450,
    activeObjective: "balanced",
  });
  const [today, setToday] = useState(localDateKey);
  useEffect(() => {
    const refresh = () => setToday(localDateKey());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const recipesById = useMemo(() => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])), []);
  const todayEntries = useMemo(() => entries.filter((entry) => entry.date === today), [entries, today]);
  const totals = useMemo(() => ({ ...mealTotals(todayEntries, recipesById), ...mealTotalBounds(todayEntries, recipesById) }), [recipesById, todayEntries]);
  const complete = isDayComplete(dayRecords, entries, today);

  const persist = async (nextProfile, nextEntries, nextDayRecords = dayRecords) => {
    if (saving.current) return false;
    saving.current = true;
    try {
      const result = await saveSnapshot(localStorage, navigator.locks, appStorageKey, savedRaw.current,
        { profile: nextProfile, entries: nextEntries, dayRecords: nextDayRecords });
      savedRaw.current = result.raw;
      if (result.status === "conflict") {
        const latest = loadInitialState(result.raw);
        setProfile(latest.profile);
        setEntries(latest.entries);
        setDayRecords(latest.dayRecords || {});
        setStorageError("Another tab changed your records. The latest saved records are now loaded; your input is still here. Review the changes, then save again to apply your input.");
        return false;
      }
      setStorageError("");
      return true;
    } catch {
      setStorageError(!navigator.locks?.request
        ? "This browser cannot safely coordinate saves between tabs. Open this app over HTTPS or localhost in a browser that supports Web Locks. Your previous records are unchanged."
        : "Changes could not be saved on this device. Your previous records are unchanged. Check browser storage and try again.");
      return false;
    } finally {
      saving.current = false;
    }
  };

  const toggleComplete = async () => {
    const next = { ...dayRecords, [today]: complete ? null : {
      completedAt: new Date().toISOString(), signature: daySignature(entries, today), profile: { ...profile },
    } };
    if (await persist(profile, entries, next)) setDayRecords(next);
  };

  const addRecipes = async (items) => {
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
    if (!await persist(profile, next)) return false;
    setEntries(next);
    setMealDialog({ open: false, recipeId: null, initialMeal: null });
    setActiveTab("today");
  };

  const addCustomFood = async ({ customFood, servings, meal }) => {
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
    if (!await persist(profile, next)) return false;
    setEntries(next);
    setActiveTab("today");
    return true;
  };

  const removeEntry = async (id) => {
    const next = entries.filter((entry) => entry.id !== id);
    if (!await persist(profile, next)) return false;
    setEntries(next);
  };

  const saveProfile = async (nextProfile) => {
    if (!await persist(nextProfile, entries)) return false;
    setProfile(nextProfile);
    setProfileOpen(false);
  };

  const addPlan = async (items) => {
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
    if (!await persist(profile, next)) return false;
    setEntries(next);
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

  const reorderMealEntry = async ({ entryId, targetMeal, targetEntryId = null, targetIndex = null }) => {
    const next = reorderMealEntries(entries, today, { entryId, targetMeal, targetEntryId, targetIndex });
    if (next === entries) return;
    if (!await persist(profile, next)) return false;
    setEntries(next);
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

      {storageError && !mealDialog.open && !customDialog && !profileOpen && <p className="storage-alert" role="alert">{storageError}</p>}
      {activeTab === "today" && <TodayView
        profile={profile}
        entries={todayEntries}
        recipesById={recipesById}
        totals={totals}
        complete={complete}
        onToggleComplete={toggleComplete}
        onOpenMeal={openMealDialog}
        onOpenCustom={() => setCustomDialog(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenRecipe={(entry) => openRecipeDetails(entry, "today")}
        onRemove={removeEntry}
        onReorder={reorderMealEntry}
      />}
      {activeTab === "planner" && <PlannerView recipes={recipes} recipeDetails={recipeDetails} profile={profile} todayEntries={todayEntries} todayTotals={totals} plannerSession={plannerSession} onPlannerSessionChange={setPlannerSession} onAddPlan={addPlan} onOpenRecipe={(recipe) => openRecipeDetails(recipe, "planner")} />}
      {activeTab === "recipes" && <RecipeLibrary recipes={recipes} onChoose={(recipe) => openMealDialog(recipe.id)} onOpenRecipe={(recipe) => openRecipeDetails(recipe, "recipes")} />}
      {activeTab === "history" && <HistoryView entries={entries} recipesById={recipesById} profile={profile} dayRecords={dayRecords} />}
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

      <AddMealModal open={mealDialog.open} recipes={recipes} initialRecipeId={mealDialog.recipeId} initialMeal={mealDialog.initialMeal} todayTotals={totals} profile={profile} saveError={storageError} onClose={() => setMealDialog({ open: false, recipeId: null, initialMeal: null })} onAdd={addRecipes} />
      <CustomFoodModal open={customDialog} saveError={storageError} onClose={() => setCustomDialog(false)} onAdd={addCustomFood} />
      <ProfileDrawer open={profileOpen} profile={profile} saveError={storageError} onClose={() => setProfileOpen(false)} onSave={saveProfile} />
    </div>
  );
}

function TodayView({ profile, entries, recipesById, totals, complete, onToggleComplete, onOpenMeal, onOpenCustom, onOpenProfile, onOpenRecipe, onRemove, onReorder }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const lowSodiumIds = ["roasted-garlic", "quinoa-with-black-beans-and-avocado"];
  const ideas = lowSodiumIds.map((id) => recipesById[id]).filter(Boolean);

  return (
    <main className="dashboard-layout">
      <section className="dashboard-main">
        <header className="dashboard-heading">
          <div><h1>{greeting}, {profile.name}</h1><p>Record what you ate. See how it compares with your saved targets.</p></div>
          <span><CalendarDays size={20} /> {displayDate}</span>
        </header>
        <div className="dashboard-actions">
          <button className="primary-button" type="button" onClick={() => onOpenMeal()}><Plus size={20} /> Add a meal</button>
          <button className="secondary-button" type="button" onClick={onOpenCustom}><PackagePlus size={20} /> Log outside food</button>
          <button className="secondary-button" type="button" onClick={onOpenProfile}><Settings2 size={20} /> Adjust targets</button>
        </div>
        <section className="daily-record-summary" aria-label="Daily recording summary">
          <div><span>Energy recorded</span><strong>{formatAmount(totals.calories)} <small>kcal</small></strong><small>{entries.length} food items · {totals.estimatedCount} estimated</small></div>
          <div><strong>{complete ? "Recording complete" : "Recording in progress"}</strong><p>{complete ? "You confirmed all food and drinks for today. This does not certify nutritional adequacy." : "Totals reflect logged foods only. Include drinks, sauces and snacks before confirming."}</p><button className="secondary-button" type="button" disabled={!entries.length} onClick={onToggleComplete}>{complete ? "Reopen today's record" : "I've logged everything today"}</button></div>
        </section>
        <div className="nutrient-stack">
          <NutrientProgress type="sodium" value={totals.sodium} target={profile.sodiumTargetMg} complete={complete} estimated={totals.estimatedCount > 0} />
          <NutrientProgress type="protein" value={totals.protein} range={{ min: profile.proteinMinG, max: profile.proteinMaxG }} complete={complete} estimated={totals.estimatedCount > 0} />
        </div>
        {totals.estimatedCount > 0 && <p className="estimate-note">User-set estimate ranges: sodium {formatAmount(totals.lower.sodium, 1)}–{formatAmount(totals.upper.sodium, 1)} mg; protein {formatAmount(totals.lower.protein, 1)}–{formatAmount(totals.upper.protein, 1)} g. These are planning assumptions, not measured confidence intervals. Original estimates are shown above; older added margins are not counted as food eaten.</p>}
        <TodayMeals entries={entries} recipesById={recipesById} onAddMeal={(meal) => onOpenMeal(null, meal)} onOpenRecipe={onOpenRecipe} onRemove={onRemove} onReorder={onReorder} />
      </section>

      <aside className="dashboard-rail">
        <section className="idea-list"><header><h2>Low-sodium ideas</h2><button type="button" onClick={() => onOpenMeal()}>View all</button></header>{ideas.map((recipe) => <button className="idea-row" type="button" key={recipe.id} onClick={() => onOpenMeal(recipe.id)}>{recipeImages[recipe.id] ? <img src={recipeImages[recipe.id]} alt="" loading="lazy" decoding="async" /> : <span className="recipe-placeholder">{recipe.name.slice(0, 1)}</span>}<span><strong>{recipe.name}</strong><small>{formatAmount(recipe.sodium, 1)} mg sodium · {formatAmount(recipe.protein, 1)} g protein</small></span><ChevronRight size={19} /></button>)}</section>
        <section className="plan-summary">
          <header><h2>Your saved targets</h2><button type="button" onClick={onOpenProfile}>Edit</button></header>
          <p className="field-note">{profile.useGuidelineProteinRange ? "Guideline starting values" : "User-entered values"} · care-team review is not verified.</p>
          <p className="plan-context">{profile.condition} · CKD {profile.stage} · {formatAmount(profile.weightKg, 1)} kg</p>
          <div className="plan-detail"><span className="plan-icon"><Target size={21} /></span><div><strong>Sodium maximum</strong><small>Daily upper limit</small></div><b>{formatAmount(profile.sodiumTargetMg)} mg/day</b></div>
          <div className="plan-detail protein-detail"><span className="plan-icon"><Scale size={21} /></span><div><strong>Protein range</strong><small>{profile.useGuidelineProteinRange ? "Weight-based starting point" : "Custom saved target"}</small></div><b>{formatAmount(profile.proteinMinG)}–{formatAmount(profile.proteinMaxG)} g/day</b></div>
          <div className="plan-detail"><span className="plan-icon"><CircleUserRound size={21} /></span><div><strong>Treatment status</strong><small>Changes target logic</small></div><b>{profile.treatment === "dialysis" ? "Dialysis" : "Not on dialysis"}</b></div>
          <a className="source-button" href="https://kdigo.org/guidelines/autosomal-dominant-polycystic-kidney-disease-adpkd/" target="_blank" rel="noreferrer">Review source guidance <ChevronRight size={18} /></a>
        </section>
      </aside>
    </main>
  );
}
