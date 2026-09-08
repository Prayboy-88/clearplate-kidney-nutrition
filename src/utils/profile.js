import { proteinRangeForWeight } from "./nutrition.js";

const guidelineStages = new Set(["G1", "G2", "G3a", "G3b", "G4"]);

export const isGuidelineProteinEligible = (profile) =>
  profile?.treatment === "not-dialysis" && guidelineStages.has(profile?.stage);

export const hasValidProteinTargets = (profile) =>
  !(profile?.useGuidelineProteinRange && !isGuidelineProteinEligible(profile))
  && Number.isFinite(Number(profile?.proteinMinG))
  && String(profile.proteinMinG).trim() !== ""
  && Number(profile.proteinMinG) > 0
  && Number.isFinite(Number(profile?.proteinMaxG))
  && String(profile.proteinMaxG).trim() !== ""
  && Number(profile.proteinMaxG) >= Number(profile.proteinMinG);

export function normalizeProfileDraft(profile) {
  const draft = { ...profile };
  if (draft.useGuidelineProteinRange && !isGuidelineProteinEligible(draft)) {
    draft.useGuidelineProteinRange = false;
    draft.proteinMinG = "";
    draft.proteinMaxG = "";
  }
  return draft;
}

export function updateProfileDraft(current, key, value) {
  const next = { ...current, [key]: value };
  if (current.useGuidelineProteinRange && !isGuidelineProteinEligible(next)) {
    next.useGuidelineProteinRange = false;
    next.proteinMinG = "";
    next.proteinMaxG = "";
    return next;
  }
  if (key === "useGuidelineProteinRange") {
    next.useGuidelineProteinRange = Boolean(value) && isGuidelineProteinEligible(next);
  }
  if (next.useGuidelineProteinRange && isGuidelineProteinEligible(next)
      && (key === "weightKg" || key === "useGuidelineProteinRange")) {
    const range = proteinRangeForWeight(next.weightKg);
    next.proteinMinG = range.min;
    next.proteinMaxG = range.max;
  }
  return next;
}
