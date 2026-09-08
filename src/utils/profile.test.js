import assert from "node:assert/strict";
import test from "node:test";
import { hasValidProteinTargets, normalizeProfileDraft, updateProfileDraft } from "./profile.js";

const automaticProfile = {
  name: "Alex",
  stage: "G2",
  treatment: "not-dialysis",
  weightKg: 70,
  proteinMinG: 56,
  proteinMaxG: 70,
  useGuidelineProteinRange: true,
};

test("a stored G5 automatic profile requires fresh manual protein targets", () => {
  assert.deepEqual(normalizeProfileDraft({ ...automaticProfile, stage: "G5" }), {
    ...automaticProfile,
    stage: "G5",
    useGuidelineProteinRange: false,
    proteinMinG: "",
    proteinMaxG: "",
  });
});

test("leaving guideline eligibility clears inherited automatic targets", () => {
  assert.deepEqual(updateProfileDraft(automaticProfile, "stage", "G5"), {
    ...automaticProfile,
    stage: "G5",
    useGuidelineProteinRange: false,
    proteinMinG: "",
    proteinMaxG: "",
  });
  assert.deepEqual(updateProfileDraft(automaticProfile, "treatment", "dialysis"), {
    ...automaticProfile,
    treatment: "dialysis",
    useGuidelineProteinRange: false,
    proteinMinG: "",
    proteinMaxG: "",
  });
});

test("manual targets survive stage and treatment changes", () => {
  const manual = { ...automaticProfile, useGuidelineProteinRange: false, proteinMinG: 45, proteinMaxG: 60 };
  assert.equal(updateProfileDraft(manual, "stage", "G5").proteinMinG, 45);
  assert.equal(updateProfileDraft(manual, "treatment", "dialysis").proteinMaxG, 60);
});

test("eligible automatic profiles recalculate when weight changes", () => {
  const result = updateProfileDraft(automaticProfile, "weightKg", "80");
  assert.equal(result.proteinMinG, 64);
  assert.equal(result.proteinMaxG, 80);
});

test("protein target validity rejects missing and reversed ranges", () => {
  assert.equal(hasValidProteinTargets({ proteinMinG: "", proteinMaxG: "" }), false);
  assert.equal(hasValidProteinTargets({ proteinMinG: 70, proteinMaxG: 60 }), false);
  assert.equal(hasValidProteinTargets({ ...automaticProfile, stage: "G5" }), false);
  assert.equal(hasValidProteinTargets({ proteinMinG: 55, proteinMaxG: 75 }), true);
});
