import React, { useMemo, useState } from "react";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";
import { copyValue, describeItem } from "../utils/qrData";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "scanned", label: "Scanned" },
  { id: "created", label: "Created" },
  { id: "payments", label: "Payments" },
];

const matchesFilter = (item, filter) => {
  if (filter === "scanned") return item.action === "scanned";
  if (filter === "created") return item.action !== "scanned";
  if (filter === "payments") return describeItem(item).type === "upi";
  return true;
};

// Today / Yesterday / Earlier, based on calendar days.
const dayGroup = (ts) => {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(new Date(ts))) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
};

const formatLink = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const History = ({ history, onNavigate, onOpenSettings, onClear, onRemove }) => {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(copyValue(item));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  const handleClear = () => {
    if (window.confirm("Delete all history? Payment plans will be removed too.")) onClear();
  };

  // Filter + search, then group by day.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = history
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => {
        if (!q) return true;
        const d = describeItem(item);
        return `${d.title} ${d.payload}`.toLowerCase().includes(q);
      });
    const out = {};
    rows.forEach((item) => (out[dayGroup(item.timestamp)] ||= []).push(item));
    return ["Today", "Yesterday", "Earlier"].filter((g) => out[g]).map((g) => [g, out[g]]);
  }, [history, filter, query]);

  return (
    <div className="qr-page">
      <header className="app-header">
        <button className="iconbtn plain accent" aria-label="Back" onClick={() => onNavigate("home")}>
          <Icon name="arrow_back" />
        </button>
        <h1>History</h1>
        {history.length > 0 && <button className="btn btn-danger" onClick={handleClear}>Clear</button>}
      </header>

      <main className="mx-auto max-w-2xl px-5 lg:max-w-3xl lg:px-8">
        <label htmlFor="history-search" className="sr-only" style={{ position: "absolute", left: -9999 }}>Search history</label>
        <input id="history-search" className="input" placeholder="Search history" value={query} onChange={(e) => setQuery(e.target.value)} />

        <div className="flex gap-2 overflow-x-auto py-3" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Icon name="history" size={48} className="muted" />
            <h2 className="m-0 text-lg font-extrabold">{history.length === 0 ? "No activity yet" : "No matches"}</h2>
            <p className="muted m-0 text-sm">
              {history.length === 0 ? "Scan or create a QR code to see it here." : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <section key={label} className="mb-4">
              <h2 className="muted mb-2 mt-0 text-[13px] font-extrabold">{label}</h2>
              <div className="flex flex-col gap-2.5">
                {items.map((item) => {
                  const d = describeItem(item);
                  const unpaid = item.parts ? item.parts.some((p) => !p.paid) : false;
                  return (
                    <div key={item.id} className="card flex items-center gap-3 p-3">
                      <span className="tag">{d.tag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-extrabold">
                          {d.type === "url" ? (
                            <a href={formatLink(d.payload)} target="_blank" rel="noopener noreferrer" className="accent no-underline">{d.title}</a>
                          ) : (
                            d.title
                          )}
                        </div>
                        <div className="muted text-[13px]">
                          {d.verb}, {d.time}{d.extra ? `, ${d.extra}` : ""}
                        </div>
                      </div>

                      {unpaid && (
                        <button className="btn btn-primary" style={{ minHeight: 36, padding: "0 12px" }} onClick={() => onNavigate("create", { planId: item.id })}>
                          Continue
                        </button>
                      )}
                      <button className="iconbtn plain muted" aria-label={copiedId === item.id ? "Copied" : "Copy"} onClick={() => handleCopy(item)}>
                        <Icon name={copiedId === item.id ? "check" : "content_copy"} />
                      </button>
                      <button className="iconbtn plain muted" aria-label="Delete" onClick={() => onRemove(item.id)}>
                        <Icon name="delete" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <BottomNav active="history" onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
    </div>
  );
};

export default History;
