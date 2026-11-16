import React from "react";
import Icon from "./Icon";
import { formatINR } from "../utils/upi";

// The "split this payment into several QR codes" card used inside Create.
// It is purely presentational: Create owns the state and passes it down.
//
// Before generating: user chooses Equal or Custom parts.
// After generating (plan exists): amounts are locked and each part shows Paid / Current / Pending.
const UpiSplitEditor = ({
  limit, mustSplit, splitOn, hasAmount, onToggleSplit,
  mode, onModeChange, maxText, onMaxChange,
  count, minCount, onCountChange,
  values, customText, onCustomChange, onAddPart, onRemovePart,
  plan, viewIdx, onSelect,
  error,
}) => {
  const locked = !!plan;
  const rows = locked ? plan.parts : values.map((amount) => ({ amount, paid: false }));
  const firstPending = rows.findIndex((r) => !r.paid);
  const splitting = mustSplit || splitOn || (locked && plan.parts.length > 1);

  return (
    <div className="flex flex-col gap-3">
      {mustSplit && !locked && (
        <div className="warn p-3.5">
          <div className="text-sm font-extrabold">Over your split limit</div>
          <div className="mt-1 text-[13px] leading-snug">
            Amounts of {formatINR(limit)} or more are split into smaller QR codes. Each part stays under {formatINR(limit)}.
          </div>
        </div>
      )}

      {!mustSplit && !locked && hasAmount && (
        <div className="card flex items-center justify-between gap-3 p-3.5">
          <div>
            <div className="text-[15px] font-extrabold">Split into parts</div>
            <div className="muted text-[13px]">Pay a large amount with smaller QR codes</div>
          </div>
          <button className="switch" role="switch" aria-checked={splitOn} aria-label="Split into parts" onClick={onToggleSplit} />
        </div>
      )}

      {splitting && (
        <div className="card flex flex-col gap-2 p-3">
          <div className="text-[15px] font-extrabold">
            {rows.length > 0 ? `Split into ${rows.length} QRs` : "Split into parts"}
          </div>
          <div className="seg" role="group" aria-label="Split mode">
            <button aria-pressed={mode === "equal"} disabled={locked} onClick={() => onModeChange("equal")}>Equal</button>
            <button aria-pressed={mode === "max"} disabled={locked} onClick={() => onModeChange("max")}>Max per QR</button>
            <button aria-pressed={mode === "custom"} disabled={locked} onClick={() => onModeChange("custom")}>Custom</button>
          </div>

          {mode === "equal" && !locked && (
            <div className="flex items-center justify-between">
              <button className="iconbtn" aria-label="Fewer parts" disabled={count <= minCount} onClick={() => onCountChange(count - 1)}>
                <Icon name="remove" />
              </button>
              <span className="text-[15px] font-extrabold">{count} parts</span>
              <button className="iconbtn" aria-label="More parts" disabled={count >= 20} onClick={() => onCountChange(count + 1)}>
                <Icon name="add" />
              </button>
            </div>
          )}

          {mode === "max" && !locked && (
            <div>
              <label className="label" htmlFor="max-per-qr">Max amount per QR (₹)</label>
              <input
                id="max-per-qr" className="input" inputMode="decimal" placeholder="e.g. 50000"
                value={maxText} onChange={(e) => onMaxChange(e.target.value)}
              />
              <p className="muted m-0 mt-1.5 text-xs">No QR goes above this. The last QR gets the balance.</p>
            </div>
          )}

          {rows.map((row, i) => {
            const isCurrent = locked && i === firstPending;
            const isViewing = locked && i === viewIdx;
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-2xl p-1"
                style={{ border: `1px solid ${isViewing ? "var(--accent)" : "var(--border)"}` }}
              >
                {locked ? (
                  <button
                    className="btn btn-soft"
                    style={{ width: 64, padding: 0, minHeight: 44 }}
                    aria-current={isViewing ? "true" : undefined}
                    aria-label={`Show QR for part ${i + 1}`}
                    onClick={() => onSelect(i)}
                  >
                    Part {i + 1}
                  </button>
                ) : (
                  <span className="w-16 pl-2 text-sm font-extrabold">Part {i + 1}</span>
                )}

                {mode === "custom" && !locked ? (
                  <input
                    className="input"
                    style={{ minHeight: 44, borderRadius: 10 }}
                    inputMode="decimal"
                    aria-label={`Part ${i + 1} amount in rupees`}
                    value={customText[i] ?? ""}
                    onChange={(e) => onCustomChange(i, e.target.value)}
                  />
                ) : (
                  <div className="flex-1 px-3 text-base font-bold">{formatINR(row.amount)}</div>
                )}

                {locked ? (
                  <span className={`badge ${row.paid ? "badge-ok" : isCurrent ? "badge-now" : ""}`}>
                    {row.paid ? "✓ Paid" : isCurrent ? "Current" : "Pending"}
                  </span>
                ) : mode === "custom" && rows.length > 2 ? (
                  <button className="iconbtn plain muted" aria-label={`Remove part ${i + 1}`} onClick={() => onRemovePart(i)}>
                    <Icon name="close" />
                  </button>
                ) : null}
              </div>
            );
          })}

          {mode === "custom" && !locked && (
            <button className="btn btn-soft" onClick={onAddPart}>
              <Icon name="add" /> Add part
            </button>
          )}

          {!locked && (
            <div className="flex justify-between text-[13px]" role="status">
              <span className="muted">Each part stays under {formatINR(limit)}</span>
              {error ? (
                <span className="font-extrabold" style={{ color: "var(--danger)" }}>{error}</span>
              ) : (
                <span className="font-extrabold" style={{ color: "var(--ok-text)" }}>Total matches ✓</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpiSplitEditor;
