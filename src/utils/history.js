import { hasValidProteinTargets } from "./profile.js";

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export function buildCalendarMonth(year, monthIndex) {
  const leadingDays = new Date(year, monthIndex, 1).getDay();
  const monthDays = daysInMonth(year, monthIndex);
  const cellCount = Math.ceil((leadingDays + monthDays) / 7) * 7;

  return Array.from({ length: cellCount }, (_, cellIndex) => {
    const day = cellIndex - leadingDays + 1;
    if (day < 1 || day > monthDays) return null;

    const date = new Date(year, monthIndex, day);
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return { day, dateKey, cellIndex };
  });
}

export function historyDayStatus(totals, itemCount, profile) {
  if (!itemCount) return "empty";
  if (!hasValidProteinTargets(profile)) return "review";

  const sodiumWithin = totals.sodium <= profile.sodiumTargetMg;
  const proteinWithin = totals.protein >= profile.proteinMinG
    && totals.protein <= profile.proteinMaxG;

  return sodiumWithin && proteinWithin ? "within" : "review";
}
