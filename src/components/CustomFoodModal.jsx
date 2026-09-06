import { Info, Package, Scale, X } from "lucide-react";
import { useState } from "react";
import { formatAmount } from "../utils/nutrition";

const emptyValues = { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0 };

export default function CustomFoodModal({ open, saveError, onClose, onAdd }) {
  const [mode, setMode] = useState("packaged");
  const [name, setName] = useState("");
  const [meal, setMeal] = useState("Snack");
  const [servings, setServings] = useState(1);
  const [margin, setMargin] = useState(25);
  const [values, setValues] = useState(emptyValues);

  if (!open) return null;

  const updateValue = (key, value) => setValues((current) => ({ ...current, [key]: Number(value) || 0 }));

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim() || !Number.isFinite(Number(servings)) || Number(servings) < 0.25 || Number(servings) > 20) return;
    const saved = onAdd({
      meal,
      servings: Number(servings),
      customFood: {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        ...values,
        method: mode,
        methodLabel: mode === "packaged" ? "Nutrition label" : `Estimate · user-set ±${margin}% range`,
        baseEstimate: values,
        uncertaintyMargin: mode === "unpackaged" ? Number(margin) : 0,
        estimateRangePercent: mode === "unpackaged" ? Number(margin) : 0,
      },
    });
    if (saved === false) return;
    setName("");
    setValues(emptyValues);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="custom-food-modal" role="dialog" aria-modal="true" aria-labelledby="outside-food-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-header"><div><h2 id="outside-food-title">Log food outside the cookbook</h2><p>Use the package label when it exists; otherwise record a transparent conservative estimate.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
        <div className="mode-switch"><button type="button" className={mode === "packaged" ? "selected" : ""} onClick={() => setMode("packaged")}><Package size={20} /><span><strong>Packaged food</strong><small>Copy the Nutrition Facts label</small></span></button><button type="button" className={mode === "unpackaged" ? "selected" : ""} onClick={() => setMode("unpackaged")}><Scale size={20} /><span><strong>Unpackaged food</strong><small>Estimate with a safety margin</small></span></button></div>
        <div className="form-grid">
          <label className="full-field"><span>Food name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === "packaged" ? "Example: Sea salt potato chips" : "Example: Restaurant noodle soup"} /></label>
          <label><span>Meal</span><select value={meal} onChange={(event) => setMeal(event.target.value)}>{["Breakfast", "Lunch", "Dinner", "Snack"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Servings eaten</span><input required type="number" min="0.25" max="20" step="0.25" value={servings} onChange={(event) => setServings(event.target.value)} /></label>
        </div>
        <div className="custom-nutrients"><h3>{mode === "packaged" ? "Per labeled serving" : "Best estimate for one serving"}</h3><div className="nutrient-inputs">{[["calories", "Calories", "kcal"], ["protein", "Protein", "g"], ["sodium", "Sodium", "mg"], ["potassium", "Potassium", "mg"], ["phosphorus", "Phosphorus", "mg"]].map(([key, label, unit]) => <label key={key}><span>{label}</span><div className="inline-unit"><input type="number" min="0" step="0.1" value={values[key]} onChange={(event) => updateValue(key, event.target.value)} /><span>{unit}</span></div></label>)}</div></div>
        {mode === "unpackaged" && <section className="uncertainty-box"><div><label htmlFor="margin"><strong>User-set estimate range</strong></label><p>Your original values remain the recorded estimate. This range is a planning assumption, not a measured error bound or clinical standard.</p></div><select id="margin" value={margin} onChange={(event) => setMargin(event.target.value)}><option value="10">±10%</option><option value="25">±25%</option><option value="40">±40%</option><option value="50">±50%</option></select><div className="adjusted-values"><span>Sodium per serving <strong>{formatAmount(values.sodium * (1 - Number(margin) / 100), 1)}–{formatAmount(values.sodium * (1 + Number(margin) / 100), 1)} mg</strong></span><span>Protein per serving <strong>{formatAmount(values.protein * (1 - Number(margin) / 100), 1)}–{formatAmount(values.protein * (1 + Number(margin) / 100), 1)} g</strong></span></div></section>}
        {mode === "packaged" && <p className="ocr-note"><Info size={17} /> Photo OCR is a next-phase feature. For this local MVP, values are entered manually so the patient can verify every number before saving.</p>}
        <footer className="drawer-actions">
          {saveError && <p className="storage-alert" role="alert">{saveError}</p>}
          <button className="primary-button" type="submit">Add to food history</button><button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        </footer>
      </form>
    </div>
  );
}
