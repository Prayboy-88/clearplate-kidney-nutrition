import { ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { proteinRangeForWeight } from "../utils/nutrition";

export default function ProfileDrawer({ open, profile, onClose, onSave }) {
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  if (!open) return null;

  const update = (key, value) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "weightKg" && next.useGuidelineProteinRange && next.treatment === "not-dialysis") {
        const range = proteinRangeForWeight(value);
        next.proteinMinG = range.min;
        next.proteinMaxG = range.max;
      }
      if (key === "useGuidelineProteinRange" && value && next.treatment === "not-dialysis") {
        const range = proteinRangeForWeight(next.weightKg);
        next.proteinMinG = range.min;
        next.proteinMaxG = range.max;
      }
      if (key === "treatment" && value === "dialysis") next.useGuidelineProteinRange = false;
      return next;
    });
  };

  const save = (event) => {
    event.preventDefault();
    onSave({
      ...draft,
      weightKg: Number(draft.weightKg),
      heightCm: Number(draft.heightCm),
      sodiumTargetMg: Number(draft.sodiumTargetMg),
      proteinMinG: Number(draft.proteinMinG),
      proteinMaxG: Number(draft.proteinMaxG),
    });
  };

  return (
    <div className="modal-backdrop profile-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="profile-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={save}>
        <header className="modal-header"><div><h2 id="profile-title">Your nutrition plan</h2><p>Use targets reviewed with your kidney care team.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close profile"><X /></button></header>

        <div className="form-section">
          <h3>Profile context</h3>
          <div className="form-grid">
            <label><span>Name</span><input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label><span>Clinician-recorded CKD stage</span><select value={draft.stage} onChange={(event) => update("stage", event.target.value)}>{["G1", "G2", "G3a", "G3b", "G4", "G5"].map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <label><span>Weight (kg)</span><input type="number" min="30" max="250" step="0.1" value={draft.weightKg} onChange={(event) => update("weightKg", event.target.value)} /></label>
            <label><span>Height (cm)</span><input type="number" min="120" max="230" value={draft.heightCm} onChange={(event) => update("heightCm", event.target.value)} /></label>
            <label className="full-field"><span>Treatment status</span><select value={draft.treatment} onChange={(event) => update("treatment", event.target.value)}><option value="not-dialysis">Not receiving dialysis</option><option value="dialysis">Receiving dialysis</option></select></label>
          </div>
          <p className="field-note">Race is intentionally not collected. This tracker does not diagnose or calculate eGFR. In ADPKD, enlarged kidney or liver weight can also make ordinary BMI less representative.</p>
        </div>

        <div className="form-section">
          <h3>Daily targets</h3>
          <label className="check-row"><input type="checkbox" checked={draft.useGuidelineProteinRange} disabled={draft.treatment === "dialysis"} onChange={(event) => update("useGuidelineProteinRange", event.target.checked)} /><span><strong>Use ADPKD starting protein range</strong><small>0.8–1.0 g/kg/day for adults with ADPKD and CKD G1–G4; review with a renal dietitian.</small></span></label>
          {draft.treatment === "dialysis" && <p className="clinical-alert">Dialysis can change protein needs. Enter only the targets supplied by your dialysis care team.</p>}
          <div className="form-grid targets-grid">
            <label><span>Sodium maximum (mg)</span><input type="number" min="500" max="6000" step="50" value={draft.sodiumTargetMg} onChange={(event) => update("sodiumTargetMg", event.target.value)} /></label>
            <label><span>Protein minimum (g)</span><input type="number" min="10" max="250" step="1" disabled={draft.useGuidelineProteinRange} value={draft.proteinMinG} onChange={(event) => update("proteinMinG", event.target.value)} /></label>
            <label><span>Protein maximum (g)</span><input type="number" min="10" max="250" step="1" disabled={draft.useGuidelineProteinRange} value={draft.proteinMaxG} onChange={(event) => update("proteinMaxG", event.target.value)} /></label>
          </div>
        </div>

        <div className="source-note">
          <strong>Clinical boundary</strong>
          <p>Defaults are starting points from KDIGO guidance, not a prescription. Potassium, phosphorus, fluids, calories and dialysis needs must be individualized from labs and clinical care.</p>
          <a href="https://kdigo.org/guidelines/autosomal-dominant-polycystic-kidney-disease-adpkd/" target="_blank" rel="noreferrer">Review KDIGO ADPKD guidance <ExternalLink size={15} /></a>
        </div>

        <footer className="drawer-actions"><button className="primary-button" type="submit">Save plan</button><button className="secondary-button" type="button" onClick={onClose}>Cancel</button></footer>
      </form>
    </div>
  );
}
