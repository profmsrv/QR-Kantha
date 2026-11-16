import React, { useCallback, useState } from "react";
import useLocalStorage from "./hooks/useLocalStorage";
import useTheme from "./hooks/useTheme";
import usePwaInstall from "./hooks/usePwaInstall";
import { detectType } from "./utils/qrData";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Create from "./pages/Create";
import History from "./pages/History";
import Settings from "./components/Settings";
import DesktopNotice from "./components/DesktopNotice";

/*
  FILE MAP (read in this order)
  src/QR_READER.jsx            this file: owns all shared state, shows one page at a time
  src/pages/                   Home, Scan, Create, History
  src/components/              BottomNav (also the desktop sidebar), Settings sheet, DesktopNotice,
                               UpiSplitEditor (split-payment card used by Create), Icon
  src/hooks/                   useTheme, useLocalStorage, usePwaInstall
  src/utils/                   qrData.js, upi.js  (pure helper functions, no React)
  src/index.css                Tailwind + all colour tokens (light/dark) + shared classes
  vite.config.js               build config and PWA (manifest + offline service worker)

  HISTORY ENTRY SHAPE
  { id, timestamp, action: "scanned" | "created", type: "url"|"text"|"wifi"|"contact"|"upi", payload,
    // UPI payment plans also have:
    upi: { pa, pn, note, total }, parts: [{ amount, paid }]   // money in paise
  }
*/

const DEFAULT_SETTINGS = {
  splitLimit: 100000, // rupees; UPI parts must stay under this
  saveHistory: true,
  feedback: false,    // beep + vibrate on scan
};

const MAX_HISTORY = 50;

const QR_READER = () => {
  const theme = useTheme();
  const pwa = usePwaInstall();
  // Deep links used by the PWA shortcuts: /?page=scan, /?page=create&type=upi
  const query = new URLSearchParams(window.location.search);
  const [page, setPage] = useState(["scan", "create", "history"].includes(query.get("page")) ? query.get("page") : "home");
  const [params, setParams] = useState(query.get("type") === "upi" ? { type: "upi" } : {});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useLocalStorage("qr_history", []);
  const [storedSettings, setStoredSettings] = useLocalStorage("qr_settings", DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  // navigate("create", { type: "upi" }) or navigate("create", { planId })
  const navigate = useCallback((next, nextParams = {}) => {
    setPage(next);
    setParams(nextParams);
    window.scrollTo(0, 0);
  }, []);

  // Returns the new entry id (or null when history saving is off and the entry isn't forced).
  const addToHistory = useCallback(
    (entry, { force = false } = {}) => {
      if (!settings.saveHistory && !force) return null;
      const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      setHistory((prev) => [{ id, timestamp: Date.now(), ...entry }, ...prev.slice(0, MAX_HISTORY - 1)]);
      return id;
    },
    [settings.saveHistory, setHistory]
  );

  const updateHistory = useCallback(
    (id, patch) => setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    [setHistory]
  );
  const removeHistory = useCallback((id) => setHistory((prev) => prev.filter((item) => item.id !== id)), [setHistory]);
  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  const handleScanResult = useCallback(
    (data) => addToHistory({ type: detectType(data), payload: data, action: "scanned" }),
    [addToHistory]
  );

  const updateSettings = (patch) => setStoredSettings({ ...settings, ...patch });

  return (
    <>
      {page === "home" && <Home history={history} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} />}
      {page === "scan" && <Scan settings={settings} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} onScanResult={handleScanResult} />}
      {page === "create" && (
        <Create
          // key makes React start fresh when we jump in from Home or History
          key={params.planId || params.type || "create"}
          history={history}
          settings={settings}
          initialType={params.type}
          resumePlanId={params.planId}
          onNavigate={navigate}
          onOpenSettings={() => setSettingsOpen(true)}
          addToHistory={addToHistory}
          onUpdateHistory={updateHistory}
          onRemoveHistory={removeHistory}
        />
      )}
      {page === "history" && (
        <History history={history} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} onClear={clearHistory} onRemove={removeHistory} onUpdateHistory={updateHistory} />
      )}

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeMode={theme.mode}
        onThemeChange={theme.setMode}
        settings={settings}
        onSettingsChange={updateSettings}
        canInstall={pwa.canInstall}
        onInstall={pwa.install}
      />
      <DesktopNotice />
    </>
  );
};

export default QR_READER;
