// UPI helpers. All money is handled in PAISE (integers) so splits never have rounding errors.

export const formatINR = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);

// "1,50,000" or "250.50" -> paise. Returns null when the text is not a valid amount.
export const toPaise = (text) => {
  const clean = String(text ?? "").replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
};

export const isValidUpiId = (id) =>
  /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/.test(String(id).trim());

// Rule: every part must stay UNDER the limit.
// So a total at or above the limit needs at least floor(total / limit) + 1 parts.
export const minParts = (total, limit) => (total >= limit ? Math.floor(total / limit) + 1 : 1);

// Equal split. Whole-rupee totals are split in whole rupees; leftover rupees go to the first parts.
export function splitEqual(total, count) {
  const unit = total % 100 === 0 ? 100 : 1;
  const units = total / unit;
  const base = Math.floor(units / count);
  const extra = units - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < extra ? 1 : 0)) * unit);
}

// Returns an error message, or null when the parts are fine.
export function validateParts(parts, total, limit) {
  if (parts.some((p) => p === null || p <= 0)) return "Enter a valid amount for every part.";
  if (parts.some((p) => p >= limit)) return `Each part must stay under ${formatINR(limit)}.`;
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum > total) return `Parts are ${formatINR(sum - total)} over the total.`;
  if (sum < total) return `${formatINR(total - sum)} still to assign.`;
  return null;
}

export function buildUpiLink({ pa, pn, paise, note }) {
  const query = [`pa=${encodeURIComponent(pa)}`];
  if (pn) query.push(`pn=${encodeURIComponent(pn)}`);
  if (paise) query.push(`am=${(paise / 100).toFixed(2)}`);
  query.push("cu=INR");
  if (note) query.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${query.join("&")}`;
}

export function parseUpiLink(text) {
  if (!/^upi:\/\/pay/i.test(text)) return null;
  const params = new URLSearchParams(text.split("?")[1] || "");
  return {
    pa: params.get("pa") || "",
    pn: params.get("pn") || "",
    am: params.get("am") ? Number(params.get("am")) : null,
    tn: params.get("tn") || "",
  };
}

// Most QR codes one payment may be split into.
export const MAX_PARTS = 50;

// "Max per QR" split: as many QRs of exactly `max` as fit, then one QR with the balance.
// Example: 1,50,000 with max 60,000 -> 60,000 + 60,000 + 30,000.
export function splitByMax(total, max) {
  const full = Math.floor(total / max);
  const rest = total - full * max;
  const parts = Array(full).fill(max);
  if (rest > 0) parts.push(rest);
  return parts;
}
