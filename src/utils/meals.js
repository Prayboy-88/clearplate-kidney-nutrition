export const mealSections = [
  { name: "Breakfast", time: "7:30 AM" },
  { name: "Lunch", time: "12:30 PM" },
  { name: "Dinner", time: "6:30 PM" },
  { name: "Snack", time: "3:30 PM" },
];

export const mealTimes = Object.fromEntries(mealSections.map(({ name, time }) => [name, time]));

export function normalizeEntryOrder(entries) {
  const nextByGroup = new Map();
  return entries.map((entry) => {
    const key = `${entry.date}|${entry.meal}`;
    const next = nextByGroup.get(key) ?? 0;
    const current = Number(entry.sortOrder);
    const sortOrder = Number.isFinite(current) ? current : next;
    nextByGroup.set(key, Math.max(next, sortOrder + 1));
    return entry.sortOrder === sortOrder ? entry : { ...entry, sortOrder };
  });
}

export function nextSortOrder(entries, date, meal) {
  return entries.reduce((next, entry) => {
    if (entry.date !== date || entry.meal !== meal) return next;
    const current = Number(entry.sortOrder);
    return Number.isFinite(current) ? Math.max(next, current + 1) : next + 1;
  }, 0);
}

export function sortMealEntries(entries) {
  return entries
    .map((entry, originalIndex) => ({ entry, originalIndex }))
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.entry.sortOrder)) ? Number(a.entry.sortOrder) : a.originalIndex;
      const bOrder = Number.isFinite(Number(b.entry.sortOrder)) ? Number(b.entry.sortOrder) : b.originalIndex;
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ entry }) => entry);
}

export function reorderMealEntries(entries, date, { entryId, targetMeal, targetEntryId = null, targetIndex = null }) {
  const activeEntry = entries.find((entry) => entry.id === entryId && entry.date === date);
  if (!activeEntry || !mealTimes[targetMeal] || targetEntryId === entryId) return entries;

  const groups = Object.fromEntries(mealSections.map(({ name }) => [
    name,
    sortMealEntries(entries.filter((entry) => entry.date === date && entry.meal === name && entry.id !== entryId)),
  ]));
  const targetEntries = groups[targetMeal];
  let insertAt = targetEntries.length;
  if (Number.isInteger(targetIndex)) insertAt = Math.min(targetEntries.length, Math.max(0, targetIndex));
  if (targetEntryId) {
    const foundIndex = targetEntries.findIndex((entry) => entry.id === targetEntryId);
    if (foundIndex >= 0) insertAt = foundIndex;
  }
  targetEntries.splice(insertAt, 0, { ...activeEntry, meal: targetMeal, time: mealTimes[targetMeal] });

  const updates = new Map();
  mealSections.forEach(({ name }) => groups[name].forEach((entry, sortOrder) => {
    updates.set(entry.id, { ...entry, sortOrder });
  }));
  return entries.map((entry) => updates.get(entry.id) || entry);
}
