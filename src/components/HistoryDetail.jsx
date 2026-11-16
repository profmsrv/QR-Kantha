import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { describeItem, makeQrDataUrl, parseVCard, parseWifi } from "../utils/qrData";
import { buildPartLink, formatINR, parseUpiLink } from "../utils/upi";

// One labelled value with a Copy button (and optional show/hide for secrets).
// Defined outside HistoryDetail so React doesn't recreate it on every render.
const CopyRow = ({ label, value, secret, copied, onCopy }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="min-w-0 flex-1">
        <div className="muted text-xs font-semibold">{label}</div>
        <div className="whitespace-pre-wrap break-words text-[15px] font-bold">
          {secret && !show ? "••••••••" : value || "Not set"}
        </div>
      </div>
      {secret && value && (
        <button className="iconbtn plain muted" aria-label={show ? `Hide ${label}` : `Show ${label}`} onClick={() => setShow(!show)}>
          <Icon name={show ? "visibility_off" : "visibility"} />
        </button>
      )}
      {value && (
        <button className="iconbtn plain muted" aria-label={`Copy ${label}`} onClick={() => onCopy(value, label)}>
          <Icon name={copied === label ? "check" : "content_copy"} />
        </button>
      )}
    </div>
  );
};

// Full details of one history entry: the QR code, every field, and the actions for it.
// On phones it is a bottom sheet, on desktop a centred dialog (see .detail in index.css).
const HistoryDetail = ({ item, onClose, onNavigate, onUpdateHistory, onRemove }) => {
  const d = describeItem(item);
  const plan = item.parts ? item : null; // UPI payment plans have parts
  const [partIdx, setPartIdx] = useState(() => (plan ? Math.max(0, plan.parts.findIndex((p) => !p.paid)) : 0));
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(null);
  const closeRef = useRef(null);

  // What the QR encodes: the selected part for plans, otherwise the saved content.
  const payload = plan ? buildPartLink(plan.upi, plan.parts, partIdx) : d.payload;

  useEffect(() => {
    let live = true;
    setQr(null);
    makeQrDataUrl(payload, "M").then((url) => live && setQr(url)).catch(() => {});
    return () => { live = false; };
  }, [payload]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = qr;
    a.download = `qr-${d.type}${plan ? `-part${partIdx + 1}` : ""}.png`;
    a.click();
  };

  const togglePaid = (i) =>
    onUpdateHistory(item.id, { parts: plan.parts.map((p, j) => (j === i ? { ...p, paid: !p.paid } : p)) });

  const when = new Date(item.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const part = plan?.parts[partIdx];
  const unpaid = plan ? plan.parts.some((p) => !p.paid) : false;
  const canOpen = d.type === "url" || d.type === "upi";

  // ---- the fields for each type ----
  let fields = null;
  if (d.type === "upi") {
    const u = item.upi || parseUpiLink(d.payload) || {};
    const amount = plan ? u.total : u.am ? Math.round(u.am * 100) : null;
    fields = (
      <>
        <CopyRow label="UPI ID" value={u.pa} copied={copied} onCopy={copy} />
        <CopyRow label="Payee name" value={u.pn} copied={copied} onCopy={copy} />
        <CopyRow label="Note" value={u.note || u.tn} copied={copied} onCopy={copy} />
        <CopyRow label="Total amount" value={amount ? formatINR(amount) : "Any amount"} copied={copied} onCopy={copy} />
      </>
    );
  } else if (d.type === "wifi") {
    const w = parseWifi(d.payload);
    fields = (
      <>
        <CopyRow label="Network name" value={w.ssid} copied={copied} onCopy={copy} />
        <CopyRow label="Security" value={w.security === "nopass" ? "Open network" : w.security} copied={copied} onCopy={copy} />
        <CopyRow label="Password" value={w.password} secret copied={copied} onCopy={copy} />
      </>
    );
  } else if (d.type === "contact") {
    const c = parseVCard(d.payload);
    fields = (
      <>
        <CopyRow label="Name" value={c.name} copied={copied} onCopy={copy} />
        <CopyRow label="Phone" value={c.phone} copied={copied} onCopy={copy} />
        <CopyRow label="Email" value={c.email} copied={copied} onCopy={copy} />
      </>
    );
  } else {
    fields = <CopyRow label={d.type === "url" ? "Link" : "Text"} value={d.payload} copied={copied} onCopy={copy} />;
  }

  return (
    <>
      <div className="backdrop open" onClick={onClose} />
      <div className="detail" role="dialog" aria-modal="true" aria-label="QR details">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full lg:hidden" style={{ background: "var(--border)" }} />

        <div className="flex items-center gap-3 pb-3">
          <span className="tag">{d.tag}</span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 line-clamp-2 break-all text-lg font-extrabold leading-tight">{d.title}</h2>
            <div className="muted text-[13px]">{d.verb}, {when}</div>
          </div>
          <button ref={closeRef} className="iconbtn plain" aria-label="Close details" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {/* QR code */}
        <div className="card p-4 text-center">
          {part && (
            <div className="mb-3">
              <div className="muted text-[13px] font-semibold">
                {plan.parts.length > 1 ? `Part ${partIdx + 1} of ${plan.parts.length}` : "Payment"}
              </div>
              <div className="text-2xl font-extrabold">{part.amount ? formatINR(part.amount) : "Any amount"}</div>
            </div>
          )}
          <div className="mx-auto flex items-center justify-center rounded-2xl p-3" style={{ background: "#fff", width: "min(260px, 100%)", aspectRatio: "1 / 1" }}>
            {qr ? <img src={qr} alt="QR code" className="h-full w-full object-contain" /> : <span className="text-xs" style={{ color: "#8b90a0" }}>Making QR...</span>}
          </div>
        </div>

        {/* payment parts */}
        {plan && (
          <div className="card mt-3 flex flex-col gap-2 p-3">
            <div className="text-[15px] font-extrabold">
              {plan.parts.filter((p) => p.paid).length} of {plan.parts.length} paid
            </div>
            {plan.parts.map((p, i) => (
              <button
                key={i}
                onClick={() => setPartIdx(i)}
                aria-current={i === partIdx ? "true" : undefined}
                className="flex items-center gap-2 rounded-2xl p-2 text-left"
                style={{ border: `1px solid ${i === partIdx ? "var(--accent)" : "var(--border)"}`, background: "transparent", color: "var(--text)", cursor: "pointer" }}
              >
                <span className="w-14 pl-1 text-sm font-extrabold">Part {i + 1}</span>
                <span className="flex-1 text-base font-bold">{p.amount ? formatINR(p.amount) : "Any amount"}</span>
                <span className={`badge ${p.paid ? "badge-ok" : ""}`}>{p.paid ? "✓ Paid" : "Pending"}</span>
              </button>
            ))}
            <button className={`btn ${part?.paid ? "btn-soft" : "btn-primary"}`} onClick={() => togglePaid(partIdx)}>
              <Icon name={part?.paid ? "undo" : "check_circle"} />
              {part?.paid ? "Undo paid" : "Mark as paid"}
            </button>
          </div>
        )}

        {/* data */}
        <div className="card mt-3 px-4 py-1">
          <div className="-mt-px">{fields}</div>
        </div>

        <details className="card mt-3 px-4 py-3">
          <summary className="cursor-pointer text-sm font-extrabold">Raw QR data</summary>
          <pre className="muted m-0 mt-2 whitespace-pre-wrap break-all text-xs">{payload}</pre>
        </details>

        {/* actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button className="btn btn-soft" disabled={!qr} onClick={download}><Icon name="download" /> Download QR</button>
          {canOpen ? (
            <button
              className="btn btn-soft"
              onClick={() => (d.type === "upi" ? (window.location.href = payload) : window.open(d.payload, "_blank", "noopener,noreferrer"))}
            >
              <Icon name="open_in_new" /> {d.type === "upi" ? "Open UPI app" : "Open link"}
            </button>
          ) : (
            <button className="btn btn-soft" onClick={() => copy(d.payload, "All")}>
              <Icon name={copied === "All" ? "check" : "content_copy"} /> Copy all
            </button>
          )}
          {unpaid && (
            <button className="btn btn-primary col-span-2" onClick={() => onNavigate("create", { planId: item.id })}>
              Continue in Create
            </button>
          )}
          <button className="btn btn-danger col-span-2" onClick={() => { onRemove(item.id); onClose(); }}>
            <Icon name="delete" /> Delete from history
          </button>
        </div>
      </div>
    </>
  );
};

export default HistoryDetail;
