// The comparison must happen inside the same origin-wide lock as the write.
// A plain getItem/setItem pair can race across browser tabs.
export async function saveSnapshot(storage, locks, key, expectedRaw, next) {
  if (!locks?.request) throw new Error("Cross-tab locking is unavailable in this browser.");
  return locks.request(`${key}:save`, () => {
    const currentRaw = storage.getItem(key);
    if (currentRaw !== expectedRaw) return { status: "conflict", raw: currentRaw };
    const raw = JSON.stringify(next);
    storage.setItem(key, raw);
    return { status: "saved", raw };
  });
}
