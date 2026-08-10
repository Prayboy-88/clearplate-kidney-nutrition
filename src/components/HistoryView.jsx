import { CalendarDays, Package, Scale } from "lucide-react";
import { useMemo } from "react";
import { formatAmount, mealTotals } from "../utils/nutrition";

export default function HistoryView({ entries, recipesById }) {
  const groups = useMemo(() => Object.entries(entries.reduce((byDate, entry) => {
    (byDate[entry.date] ??= []).push(entry);
    return byDate;
  }, {})).sort(([a], [b]) => b.localeCompare(a)), [entries]);

  return (
    <main className="history-page">
      <header className="page-heading"><div><h1>Food history</h1><p>Every recipe and outside food logged on this device, grouped by day.</p></div></header>
      {groups.length ? groups.map(([date, items]) => {
        const totals = mealTotals(items, recipesById);
        return <section className="history-day" key={date}><header><div><CalendarDays size={19} /><strong>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong></div><span>{items.length} item{items.length === 1 ? "" : "s"}</span></header><div className="history-items">{items.map((entry) => {
          const item = entry.source === "custom" ? entry.customFood : recipesById[entry.recipeId];
          return <div className="history-row" key={entry.id}><span className="history-source">{entry.source === "custom" ? (item.method === "unpackaged" ? <Scale size={18} /> : <Package size={18} />) : entry.meal.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{entry.meal} · {formatAmount(entry.servings, 1)} serving{entry.servings === 1 ? "" : "s"}{item.methodLabel ? ` · ${item.methodLabel}` : ""}</small></div><span>{formatAmount(item.sodium * entry.servings, 1)} mg sodium</span><span>{formatAmount(item.protein * entry.servings, 1)} g protein</span></div>;
        })}</div><footer><span>{formatAmount(totals.calories, 1)} kcal</span><span><strong>{formatAmount(totals.sodium, 1)} mg</strong> sodium</span><span><strong>{formatAmount(totals.protein, 1)} g</strong> protein</span></footer></section>;
      }) : <p className="empty-state">No foods have been logged yet.</p>}
      <p className="history-privacy">MVP privacy: this history is stored only in this browser’s local storage. It is not synced to a clinic or cloud account.</p>
    </main>
  );
}
