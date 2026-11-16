import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const THEMES = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

// Defined outside Settings so React keeps the same component between renders (inputs keep focus).
const Row = ({ title, hint, children }) => (
  <div className="flex items-center justify-between gap-3" style={{ minHeight: 52 }}>
    <div className="min-w-0">
      <div className="font-extrabold text-[15px]">{title}</div>
      <div className="muted text-[13px]">{hint}</div>
    </div>
    {children}
  </div>
);


// Bottom sheet (half screen) with all app settings.
const Settings = ({ open, onClose, themeMode, onThemeChange, settings, onSettingsChange, canInstall, onInstall }) => {
  const closeRef = useRef(null);
  const [limitText, setLimitText] = useState(String(settings.splitLimit));

  // Close with the Escape key, and move focus into the sheet when it opens.
  useEffect(() => {
    if (!open) return;
    setLimitText(String(settings.splitLimit));
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the limit when the field loses focus. Anything below ₹1,000 is rejected.
  const commitLimit = () => {
    const n = parseInt(limitText.replace(/\D/g, ""), 10);
    if (n >= 1000) onSettingsChange({ splitLimit: n });
    else setLimitText(String(settings.splitLimit));
  };

  return (
    <>
      <div className={`backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div
        className={`sheet ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        aria-hidden={!open}
      >
        <div className="mx-auto mb-1 h-1 w-10 rounded-full" style={{ background: "var(--border)" }} />
        <div className="flex items-center justify-between" style={{ height: 52 }}>
          <h2 className="m-0 text-xl font-extrabold">Settings</h2>
          <button ref={closeRef} className="iconbtn plain" aria-label="Close settings" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-[15px] font-extrabold">Theme</div>
            <div className="seg" role="group" aria-label="Theme">
              {THEMES.map((t) => (
                <button key={t.id} aria-pressed={themeMode === t.id} onClick={() => onThemeChange(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Row title="Split limit per QR" hint="UPI payments are split under this amount">
            <div className="relative">
              <span className="muted absolute left-3 top-1/2 -translate-y-1/2 font-bold">₹</span>
              <input
                className="input"
                style={{ width: 128, minHeight: 44, paddingLeft: 28, textAlign: "right", fontWeight: 800 }}
                inputMode="numeric"
                aria-label="Split limit in rupees"
                value={limitText}
                onChange={(e) => setLimitText(e.target.value)}
                onBlur={commitLimit}
              />
            </div>
          </Row>

          <Row title="Save to history" hint="Payment plans are always saved">
            <button
              className="switch"
              role="switch"
              aria-checked={settings.saveHistory}
              aria-label="Save to history"
              onClick={() => onSettingsChange({ saveHistory: !settings.saveHistory })}
            />
          </Row>

          <Row title="Beep and vibrate" hint="When a scan succeeds">
            <button
              className="switch"
              role="switch"
              aria-checked={settings.feedback}
              aria-label="Beep and vibrate"
              onClick={() => onSettingsChange({ feedback: !settings.feedback })}
            />
          </Row>

          {canInstall && (
            <Row title="Install app" hint="Works offline, opens like a normal app">
              <button className="btn btn-primary" onClick={onInstall}>Install</button>
            </Row>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
