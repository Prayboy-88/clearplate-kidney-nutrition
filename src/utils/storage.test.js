import test from "node:test";
import assert from "node:assert/strict";
import { saveSnapshot } from "./storage.js";

function fixture(initial = null) {
  let raw = initial;
  let queue = Promise.resolve();
  return {
    storage: { getItem: () => raw, setItem: (_, value) => { raw = value; } },
    locks: { request: (_, action) => {
      const result = queue.then(action);
      queue = result.catch(() => {});
      return result;
    } },
  };
}

test("a stale profile save cannot remove a meal saved by another tab", async () => {
  const original = JSON.stringify({ entries: [] });
  const { storage, locks } = fixture(original);
  const added = { entries: [{ id: "lunch" }] };
  await saveSnapshot(storage, locks, "app", original, added);
  const stale = await saveSnapshot(storage, locks, "app", original, { entries: [], profile: { name: "New" } });
  assert.equal(stale.status, "conflict");
  assert.deepEqual(JSON.parse(storage.getItem("app")), added);
  assert.equal(stale.raw, JSON.stringify(added));
});

test("simultaneous writers cannot both overwrite the same baseline", async () => {
  const { storage, locks } = fixture();
  const results = await Promise.all([
    saveSnapshot(storage, locks, "app", null, { entries: ["a"] }),
    saveSnapshot(storage, locks, "app", null, { entries: ["b"] }),
  ]);
  assert.deepEqual(results.map((r) => r.status), ["saved", "conflict"]);
  assert.deepEqual(JSON.parse(storage.getItem("app")), { entries: ["a"] });
});

test("explicit retry from latest baseline preserves newer entries", async () => {
  const { storage, locks } = fixture(JSON.stringify({ entries: ["lunch"] }));
  const latest = storage.getItem("app");
  const next = { ...JSON.parse(latest), profile: { name: "Changed" } };
  const result = await saveSnapshot(storage, locks, "app", latest, next);
  assert.equal(result.status, "saved");
  assert.equal(result.raw, storage.getItem("app"));
  assert.deepEqual(JSON.parse(result.raw), next);
});

test("write failure leaves the previous snapshot unchanged", async () => {
  const { storage, locks } = fixture("previous");
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  await assert.rejects(saveSnapshot(storage, locks, "app", "previous", {}), /QuotaExceededError/);
  assert.equal(storage.getItem("app"), "previous");
});

test("unavailable cross-tab locking fails closed instead of racing", async () => {
  const { storage } = fixture("previous");
  await assert.rejects(saveSnapshot(storage, undefined, "app", "previous", {}), /locking/);
  assert.equal(storage.getItem("app"), "previous");
});
