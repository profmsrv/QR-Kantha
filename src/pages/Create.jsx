import React, { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";
import UpiSplitEditor from "../components/UpiSplitEditor";
import { buildVCard, buildWifi, isUrl, makeQrDataUrl } from "../utils/qrData";
import {
  MAX_PARTS, buildUpiLink, formatINR, isValidUpiId, minParts, splitByMax, splitEqual, toPaise, validateParts,
} from "../utils/upi";

const TYPES = [
  { id: "text", label: "Text" },
  { id: "url", label: "URL" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "contact", label: "Contact" },
  { id: "upi", label: "UPI" },
];
const ECC_LEVELS = ["L", "M", "Q", "H"];
const TIPS = {
  text: "Keep text under 500 characters so the code stays easy to scan when printed small.",
  url: "Short links make simpler QR codes that scan faster in low light.",
  wifi: "Choose WPA for the best compatibility and security.",
  contact: "Fill in every field so the contact imports cleanly into any contacts app.",
  upi: "Any UPI app can scan these codes. After paying each part, tap Mark as paid so you know where you stopped.",
};

const Field = ({ id, label, children }) => (
  <div>
    <label className="label" htmlFor={id}>{label}</label>
    {children}
  </div>
);

/*
  Create screen. Flow:
  1. Pick a type (Text / URL / Wi-Fi / Contact / UPI) and fill the form.
  2. Generate -> QR image appears in the preview card.
  UPI has an extra step: a "plan" (one or more parts) is saved to history, and the user marks
  each part as paid after paying it. The plan lives in history so it survives a reload.
*/
const Create = ({
  history, settings, initialType = "text", resumePlanId = null,
  onNavigate, onOpenSettings, addToHistory, onUpdateHistory, onRemoveHistory,
}) => {
  const resumed = resumePlanId ? history.find((h) => h.id === resumePlanId) : null;

  // ---- form state ----
  const [type, setType] = useState(resumed ? "upi" : initialType);
  const [text, setText] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" });
  const [showPass, setShowPass] = useState(false);
  const [upi, setUpi] = useState(
    resumed
      ? { id: resumed.upi.pa, name: resumed.upi.pn || "", total: resumed.upi.total ? String(resumed.upi.total / 100) : "", note: resumed.upi.note || "" }
      : { id: "", name: "", total: "", note: "" }
  );

  // ---- UPI split state ----
  const [splitOn, setSplitOn] = useState(false); // user chose to split (only matters under the limit)
  const [mode, setMode] = useState("equal");     // "equal" | "max" | "custom"
  const [maxText, setMaxText] = useState("");    // "max per QR" amount typed by the user
  const [count, setCount] = useState(2);
  const [customText, setCustomText] = useState([]); // what the user typed in custom mode
  const [planId, setPlanId] = useState(resumed ? resumed.id : null);
  const [viewIdx, setViewIdx] = useState(resumed ? Math.max(0, resumed.parts.findIndex((p) => !p.paid)) : 0);

  // ---- output state ----
  const [ecc, setEcc] = useState("M");
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);

  // ---- derived values (money is in paise) ----
  const limit = Math.round((settings.splitLimit || 100000) * 100);
  const total = toPaise(upi.total);
  const mustSplit = total !== null && total >= limit;
  const splitting = (mustSplit || splitOn) && !!total; // splitting needs an amount
  const minCount = total ? minParts(total, limit) : 2;
  const effCount = Math.max(count, mustSplit ? minCount : 2);
  const equalValues = splitting && total ? splitEqual(total, effCount) : [];
  const maxPaise = toPaise(maxText);
  const maxPartsCount = maxPaise && total ? Math.ceil(total / maxPaise) : 0;
  const maxValues = maxPaise && total && maxPaise < total && maxPartsCount <= MAX_PARTS ? splitByMax(total, maxPaise) : [];
  const values = !splitting
    ? (total ? [total] : [])
    : mode === "equal" ? equalValues
    : mode === "max" ? maxValues
    : customText.map(toPaise);

  let splitError = null;
  if (splitting && total) {
    if (mode === "max" && !maxPaise) splitError = "Enter the max amount per QR.";
    else if (mode === "max" && maxPaise >= total) splitError = "Max must be less than the total to split.";
    else if (mode === "max" && maxPartsCount > MAX_PARTS) splitError = `That makes ${maxPartsCount} QRs. Use a higher max (up to ${MAX_PARTS} QRs).`;
    else splitError = validateParts(values, total, limit);
  }

  const plan = planId ? history.find((h) => h.id === planId) : null;
  const allPaid = plan ? plan.parts.every((p) => p.paid) : false;

  // ---- UPI split handlers ----
  const changeMode = (next) => {
    const current = values.length ? values : equalValues;
    // Custom starts from whatever split the user was just looking at.
    if (next === "custom") setCustomText(current.map((v) => (v ? String(v / 100) : "")));
    // Max starts just under the limit so the first try already follows the rule.
    if (next === "max" && !maxText) setMaxText(String(Math.max(1, Math.floor(limit / 100) - 1)));
    setMode(next);
  };
  const changeCustom = (i, value) => setCustomText((list) => list.map((t, j) => (j === i ? value : t)));
  const addPart = () => {
    const assigned = values.reduce((sum, v) => sum + (v || 0), 0);
    const rest = total ? total - assigned : 0;
    setCustomText((list) => [...list, rest > 0 ? String(rest / 100) : ""]);
  };
  const removePart = (i) => setCustomText((list) => list.filter((_, j) => j !== i));

  const resetOutput = () => { setQr(null); setError(null); setPlanId(null); setViewIdx(0); };
  const switchType = (id) => { setType(id); setText(""); resetOutput(); };

  // ---- generate ----
  const generateUpi = () => {
    if (!isValidUpiId(upi.id)) return setError("Enter a valid UPI ID, like name@bank.");
    // Amount is optional: with no amount the QR opens the UPI app and the payer types the amount there.
    const hasAmount = upi.total.trim() !== "";
    if (hasAmount && (!total || total <= 0)) return setError("Enter a valid amount, or leave it empty.");
    if (hasAmount && splitError) return setError(splitError);

    const pa = upi.id.trim();
    const pn = upi.name.trim();
    const id = addToHistory(
      {
        type: "upi",
        action: "created",
        payload: buildUpiLink({ pa, pn }),
        upi: { pa, pn, note: upi.note.trim(), total: hasAmount ? total : null },
        parts: hasAmount ? values.map((amount) => ({ amount, paid: false })) : [{ amount: null, paid: false }],
      },
      { force: true } // payment plans are saved even if "Save to history" is off
    );
    setPlanId(id);
    setViewIdx(0);
  };

  const generate = async () => {
    setError(null);
    if (type === "upi") return generateUpi();

    let payload;
    if (type === "url") {
      let link = text.trim();
      if (link && !/^[a-z][a-z0-9+.-]*:/i.test(link)) link = `https://${link}`;
      if (!isUrl(link)) return setError("Enter a valid link, like https://example.com.");
      payload = link;
    } else if (type === "text") {
      payload = text.trim();
      if (!payload) return setError("Type something to put in the QR code.");
    } else if (type === "wifi") {
      if (!wifi.ssid.trim()) return setError("Enter the Wi-Fi network name.");
      payload = buildWifi(wifi);
    } else {
      if (!contact.name.trim() && !contact.phone.trim()) return setError("Add a name or a phone number.");
      payload = buildVCard(contact);
    }

    setBusy(true);
    try {
      setQr(await makeQrDataUrl(payload, ecc));
      addToHistory({ type, payload, action: "created", ecc });
    } catch {
      setError("Couldn't generate the QR code. Try shorter content.");
    } finally {
      setBusy(false);
    }
  };

  // Draw the QR for the part being viewed (UPI plan).
  useEffect(() => {
    if (!plan) return;
    const part = plan.parts[viewIdx];
    if (!part) return;
    let live = true;
    const n = plan.parts.length;
    const note = n > 1 ? `${plan.upi.note || "Payment"} (${viewIdx + 1}/${n})` : plan.upi.note;
    const link = buildUpiLink({ pa: plan.upi.pa, pn: plan.upi.pn, paise: part.amount, note });
    makeQrDataUrl(link, ecc).then((url) => live && setQr(url)).catch(() => live && setError("Couldn't generate the QR code."));
    return () => { live = false; };
  }, [plan?.id, viewIdx, ecc]); // eslint-disable-line react-hooks/exhaustive-deps

  // On phones the preview is below the form, so bring it into view once.
  useEffect(() => {
    if (qr && window.innerWidth < 1024) previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [!!qr, planId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-open the split options for a QR that was already generated (only while nothing is paid yet).
  const canResplit = !!plan && plan.parts.every((p) => !p.paid) && plan.upi.total >= 200;
  const reSplit = () => {
    setSplitOn(true);
    setMode("equal");
    setCount(Math.max(2, plan.parts.length));
    onRemoveHistory(plan.id); // the old unpaid plan is replaced by the new one
    resetOutput();
  };

  // ---- mark paid ----
  const togglePaid = (i) => {
    const parts = plan.parts.map((p, j) => (j === i ? { ...p, paid: !p.paid } : p));
    onUpdateHistory(plan.id, { parts });
    if (!plan.parts[i].paid) {
      const next = parts.findIndex((p) => !p.paid);
      if (next !== -1) setViewIdx(next); // jump to the next unpaid part
    }
  };

  // ---- download / share / paste ----
  const fileName = `qr-${type}${plan ? `-part${viewIdx + 1}` : ""}-${Date.now()}.png`;
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = qr;
    a.download = fileName;
    a.click();
  };
  const handleShare = async () => {
    if (!navigator.share) return setError("Sharing isn't supported on this device. Use Download instead.");
    try {
      const blob = await (await fetch(qr)).blob();
      await navigator.share({ files: [new File([blob], fileName, { type: "image/png" })], title: "QR code" });
    } catch { /* user cancelled */ }
  };
  const handlePaste = async () => {
    try { setText(await navigator.clipboard.readText()); }
    catch { setError("Clipboard access was blocked. Paste with a long-press instead."); }
  };

  const currentPart = plan?.parts[viewIdx];
  const upiField = (key) => (e) => setUpi((u) => ({ ...u, [key]: e.target.value }));

  return (
    <div className="qr-page">
      <header className="app-header">
        <button className="iconbtn plain accent" aria-label="Back" onClick={() => onNavigate("home")}><Icon name="arrow_back" /></button>
        <h1>Create QR</h1>
        <button className="iconbtn" aria-label="Settings" onClick={onOpenSettings}><Icon name="settings" /></button>
      </header>

      <main className="mx-auto max-w-4xl px-5 lg:max-w-5xl lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-3" role="group" aria-label="QR type">
          {TYPES.map((t) => (
            <button key={t.id} className="chip" aria-pressed={type === t.id} onClick={() => switchType(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* ---------- form column ---------- */}
          <div className="flex flex-col gap-3">
            {type === "text" && (
              <Field id="qr-text" label="Text">
                <textarea id="qr-text" className="input" placeholder="Type or paste anything" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="mt-2 flex justify-between">
                  <span className="muted text-xs">{text.length} characters</span>
                  <button className="btn btn-soft" style={{ minHeight: 36 }} onClick={handlePaste}><Icon name="content_paste" size={18} /> Paste</button>
                </div>
              </Field>
            )}

            {type === "url" && (
              <Field id="qr-url" label="Link">
                <div className="flex gap-2">
                  <input id="qr-url" className="input" inputMode="url" placeholder="example.com" value={text} onChange={(e) => setText(e.target.value)} />
                  <button className="iconbtn" aria-label="Paste" onClick={handlePaste}><Icon name="content_paste" /></button>
                </div>
              </Field>
            )}

            {type === "wifi" && (
              <>
                <Field id="wifi-ssid" label="Network name">
                  <input id="wifi-ssid" className="input" autoComplete="off" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
                </Field>
                <Field id="wifi-pass" label="Password">
                  <div className="flex gap-2">
                    <input
                      id="wifi-pass" className="input" autoComplete="off" disabled={wifi.security === "nopass"}
                      type={showPass ? "text" : "password"} value={wifi.password}
                      onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                    />
                    <button className="iconbtn" aria-label={showPass ? "Hide password" : "Show password"} onClick={() => setShowPass(!showPass)}>
                      <Icon name={showPass ? "visibility_off" : "visibility"} />
                    </button>
                  </div>
                </Field>
                <div>
                  <span className="label">Security</span>
                  <div className="seg" role="group" aria-label="Security">
                    {[["WPA", "WPA"], ["WEP", "WEP"], ["nopass", "None"]].map(([id, label]) => (
                      <button key={id} aria-pressed={wifi.security === id} onClick={() => setWifi({ ...wifi, security: id })}>{label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {type === "contact" && (
              <>
                <Field id="c-name" label="Name"><input id="c-name" className="input" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></Field>
                <Field id="c-phone" label="Phone"><input id="c-phone" className="input" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></Field>
                <Field id="c-email" label="Email"><input id="c-email" className="input" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></Field>
              </>
            )}

            {type === "upi" && (
              <>
                <div className="grid grid-cols-5 gap-2.5">
                  <div className="col-span-3">
                    <Field id="upi-id" label="UPI ID">
                      <input id="upi-id" className="input" autoComplete="off" placeholder="name@bank" disabled={!!plan} value={upi.id} onChange={upiField("id")} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field id="upi-total" label="Amount (₹)">
                      <input id="upi-total" className="input" inputMode="decimal" placeholder="Optional" disabled={!!plan} value={upi.total} onChange={upiField("total")} />
                    </Field>
                  </div>
                </div>
                <Field id="upi-name" label="Payee name (optional)">
                  <input id="upi-name" className="input" disabled={!!plan} value={upi.name} onChange={upiField("name")} />
                </Field>
                <Field id="upi-note" label="Note (optional)">
                  <input id="upi-note" className="input" disabled={!!plan} value={upi.note} onChange={upiField("note")} />
                </Field>

                {!upi.total.trim() && !plan && (
                  <p className="muted m-0 text-xs">
                    No amount? The QR still works. The payer enters the amount in their UPI app.
                  </p>
                )}

                <UpiSplitEditor
                  limit={limit} mustSplit={mustSplit} splitOn={splitOn && !!total} hasAmount={!!total}
                  onToggleSplit={() => { setSplitOn(!splitOn); setError(null); }}
                  mode={mode} onModeChange={changeMode}
                  maxText={maxText} onMaxChange={setMaxText}
                  count={effCount} minCount={mustSplit ? minCount : 2} onCountChange={setCount}
                  values={values} customText={customText} onCustomChange={changeCustom}
                  onAddPart={addPart} onRemovePart={removePart}
                  plan={plan} viewIdx={viewIdx} onSelect={setViewIdx}
                  error={splitError}
                />
              </>
            )}

            {error && <p role="alert" className="m-0 text-[13px] font-bold" style={{ color: "var(--danger)" }}>{error}</p>}

            {plan ? (
              <button className="btn btn-soft" onClick={() => { resetOutput(); }}>Start a new payment</button>
            ) : (
              <button className="btn btn-primary" style={{ minHeight: 52, fontSize: 16 }} disabled={busy} onClick={generate}>
                <Icon name="qr_code_2" /> {busy ? "Generating..." : "Generate QR"}
              </button>
            )}
          </div>

          {/* ---------- preview column ---------- */}
          <div ref={previewRef} className="flex flex-col gap-3 lg:sticky lg:top-20" style={{ scrollMarginTop: 72 }}>
            <div className="card p-4">
              {plan && (
                <div className="mb-3">
                  <div className="muted text-[13px] font-semibold">
                    {plan.parts.length > 1 ? `Part ${viewIdx + 1} of ${plan.parts.length}` : "Payment"}
                  </div>
                  <div className="text-2xl font-extrabold">
                    {currentPart?.amount ? formatINR(currentPart.amount) : "Any amount"}
                  </div>
                  {currentPart && !currentPart.amount && (
                    <div className="muted text-xs">The payer types the amount in their UPI app</div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center rounded-2xl p-4" style={{ background: "#fff", aspectRatio: "1 / 1" }}>
                {qr ? (
                  <img src={qr} alt="Generated QR code" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2" style={{ color: "#8b90a0" }}>
                    <Icon name="qr_code_2" size={72} />
                    <span className="text-xs font-semibold">Your QR code will appear here</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="muted text-xs font-bold">Error correction</span>
                <div className="seg" style={{ width: 200 }} role="group" aria-label="Error correction level">
                  {ECC_LEVELS.map((l) => (
                    <button key={l} aria-pressed={ecc === l} style={{ minHeight: 36 }} onClick={() => setEcc(l)}>{l}</button>
                  ))}
                </div>
              </div>

              {plan && currentPart && (
                <button
                  className={`btn mt-3 w-full ${currentPart.paid ? "btn-soft" : "btn-primary"}`}
                  style={{ minHeight: 48 }}
                  onClick={() => togglePaid(viewIdx)}
                >
                  <Icon name={currentPart.paid ? "undo" : "check_circle"} />
                  {currentPart.paid ? "Undo paid" : "Mark as paid"}
                </button>
              )}
              {plan && !currentPart?.paid && <p className="muted mb-0 mt-1.5 text-center text-xs">Tap after the payment is done</p>}

              {canResplit && (
                <button className="btn btn-soft mt-3 w-full" onClick={reSplit}>
                  <Icon name="call_split" />
                  {plan.parts.length === 1 ? "Split into parts" : "Change split"}
                </button>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button className="btn btn-soft" disabled={!qr} onClick={handleDownload}><Icon name="download" /> Download</button>
                <button className="btn btn-soft" disabled={!qr} onClick={handleShare}><Icon name="share" /> Share</button>
              </div>
            </div>

            {allPaid && (
              <div className="card p-4" role="status" style={{ borderColor: "var(--ok-text)" }}>
                <div className="font-extrabold" style={{ color: "var(--ok-text)" }}>All parts paid</div>
                <div className="muted text-[13px]">{plan.upi.total ? formatINR(plan.upi.total) : "Payment"} sent to {plan.upi.pa}.</div>
              </div>
            )}

            <div className="warn flex items-start gap-3 p-4">
              <Icon name="lightbulb" />
              <p className="m-0 text-[13px] leading-snug">{TIPS[type]}</p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav active="create" onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
    </div>
  );
};

export default Create;
