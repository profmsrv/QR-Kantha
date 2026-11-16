// Everything about QR *content*: building payloads, parsing them back, and describing history rows.
import { formatINR, parseUpiLink } from "./upi";

export const isUrl = (text) => {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Wi-Fi: special characters must be escaped with a backslash.
const wifiEsc = (s = "") => s.replace(/([\\;,:"])/g, "\\$1");
export const buildWifi = ({ ssid, password, security }) =>
  security === "nopass"
    ? `WIFI:T:nopass;S:${wifiEsc(ssid)};;`
    : `WIFI:T:${security};S:${wifiEsc(ssid)};P:${wifiEsc(password)};;`;

export function parseWifi(payload) {
  const out = {};
  let cur = "";
  let key = null;
  let escaped = false;
  for (const ch of payload.replace(/^WIFI:/i, "")) {
    if (escaped) { cur += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (key === null && ch === ":") { key = cur; cur = ""; continue; }
    if (ch === ";") { if (key) out[key] = cur; key = null; cur = ""; continue; }
    cur += ch;
  }
  return { security: out.T || "", ssid: out.S || "", password: out.P || "" };
}

const vEsc = (s = "") => s.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
export const buildVCard = ({ name, phone, email }) =>
  ["BEGIN:VCARD", "VERSION:3.0", `FN:${vEsc(name)}`, `TEL:${vEsc(phone)}`, `EMAIL:${vEsc(email)}`, "END:VCARD"].join("\n");

export function parseVCard(payload) {
  const lines = payload.split(/\r?\n/);
  const field = (name) => {
    const line = lines.find((l) => l.toUpperCase().startsWith(name));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  return { name: field("FN"), phone: field("TEL"), email: field("EMAIL") };
}

export function detectType(data) {
  if (/^upi:\/\//i.test(data)) return "upi";
  if (/^WIFI:/i.test(data)) return "wifi";
  if (/^BEGIN:VCARD/i.test(data)) return "contact";
  if (isUrl(data)) return "url";
  return "text";
}

// qrcode is loaded only when needed, so the first screen stays light.
export async function makeQrDataUrl(payload, ecc = "M") {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: ecc,
    width: 480,
    margin: 2,
    color: { dark: "#12141c", light: "#ffffff" },
  });
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const TAGS = { url: "URL", upi: "UPI", wifi: "WiFi", contact: "Card", text: "Text" };

// One place that turns a history entry into what the screens show.
// Also understands OLD entries (they had `title` instead of `payload`, and type "scan").
export function describeItem(item) {
  const payload = item.payload ?? item.title ?? "";
  const type = TAGS[item.type] ? item.type : detectType(payload);
  let title = payload;
  let extra = "";

  if (type === "upi") {
    const u = item.upi || parseUpiLink(payload) || {};
    title = u.pa || payload;
    if (item.parts) {
      const paid = item.parts.filter((p) => p.paid).length;
      extra = item.parts.length === 1 && !item.parts[0].amount ? "Any amount" : `${paid} of ${item.parts.length} paid`;
    } else if (u.am) {
      extra = formatINR(Math.round(u.am * 100));
    }
  } else if (type === "wifi") {
    const w = parseWifi(payload);
    title = w.ssid || "Wi-Fi network";
    extra = w.security === "nopass" ? "Open network" : w.security;
  } else if (type === "contact") {
    const c = parseVCard(payload);
    title = c.name || c.phone || c.email || "Contact";
    extra = c.phone || c.email;
  }

  return {
    type,
    tag: TAGS[type],
    title,
    extra,
    payload,
    verb: item.action === "scanned" ? "Scanned" : "Created",
    time: timeAgo(item.timestamp),
  };
}

// What the Copy button should copy for each type.
export function copyValue(item) {
  const { type, payload } = describeItem(item);
  if (type === "upi") return (item.upi || parseUpiLink(payload) || {}).pa || payload;
  if (type === "wifi") return parseWifi(payload).password || payload;
  if (type === "contact") { const c = parseVCard(payload); return c.phone || c.email || payload; }
  return payload;
}
