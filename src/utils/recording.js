export function daySignature(entries, date) {
  // Any edit to a confirmed day's records requires a fresh confirmation.
  return JSON.stringify(entries.filter((entry) => entry.date === date));
}

export function isDayComplete(records, entries, date) {
  return Boolean(records[date]?.completedAt && entries.some((entry) => entry.date === date)
    && records[date].signature === daySignature(entries, date));
}
