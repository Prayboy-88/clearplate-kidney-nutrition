import { Check, CircleAlert, Drumstick } from "lucide-react";
import { formatAmount } from "../utils/nutrition";

export default function NutrientProgress({ type, value, target, range, complete = false, estimated = false }) {
  const isSodium = type === "sodium";
  const maximum = isSodium ? target : range.max;
  const ratio = maximum > 0 ? Math.max(0, Math.min((value / maximum) * 100, 100)) : 0;
  let status = isSodium ? "Below saved limit" : "Within saved range";
  let tone = "good";

  if (isSodium) {
    if (value > target) {
      status = "Over target";
      tone = "danger";
    } else if (value > target * 0.8) {
      status = "Near limit";
      tone = "warning";
    }
  } else if (value > range.max) {
    status = "Over range";
    tone = "danger";
  } else if (value < range.min) {
    status = "Below range";
    tone = "warning";
  }

  if (!complete && tone !== "danger") {
    status = "Recording in progress";
    tone = "neutral";
  }
  if (estimated) {
    status = "Includes estimates";
    tone = "neutral";
  }

  const Icon = isSodium ? SaltShaker : Drumstick;
  const StatusIcon = tone === "good" ? Check : CircleAlert;
  const unit = isSodium ? "mg" : "g";

  return (
    <section className={`nutrient-band ${tone}`} aria-label={`${type} progress`}>
      <div className="nutrient-icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.8} />
      </div>
      <div className="nutrient-main">
        <div className="nutrient-heading">
          <strong>{isSodium ? "Sodium" : "Protein"}</strong>
          <span className="nutrient-current">
            {formatAmount(value, 1)}
            <small>
              {isSodium
                ? ` / ${formatAmount(target)} ${unit}`
                : ` / ${formatAmount(range.min)}–${formatAmount(range.max)} ${unit}`}
            </small>
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={isSodium ? "Recorded sodium relative to upper limit" : "Recorded protein relative to target range"}
          aria-valuenow={Math.min(maximum, Math.max(0, Math.round(value)))}
          aria-valuetext={`${formatAmount(value, 1)} ${unit} recorded; ${status}`}
          aria-valuemin="0"
          aria-valuemax={maximum}
        >
          <span style={{ width: `${ratio}%` }} />
          {!isSodium && (
            <i className="range-marker" style={{ left: `${(range.min / range.max) * 100}%` }} />
          )}
        </div>
        <div className="progress-labels">
          <span>0 {unit}</span>
          <span>{isSodium ? `${formatAmount(target / 2)} ${unit}` : `${formatAmount(range.min)} ${unit} min`}</span>
          <span>{formatAmount(maximum)} {unit}{isSodium ? " upper limit" : ""}</span>
        </div>
      </div>
      <div className="nutrient-status">
        <StatusIcon size={22} strokeWidth={1.8} aria-hidden="true" />
        <span>{status}</span>
      </div>
    </section>
  );
}

function SaltShaker({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.2 8.2h7.6l1.5 11.2a1.4 1.4 0 0 1-1.4 1.6H8.1a1.4 1.4 0 0 1-1.4-1.6L8.2 8.2Z" />
      <path d="M8.5 8.2V5.4c0-1.3 1.1-2.4 2.4-2.4h2.2c1.3 0 2.4 1.1 2.4 2.4v2.8M8.6 6h6.8M10.2 4.7h.01M12 4.7h.01M13.8 4.7h.01" />
    </svg>
  );
}
