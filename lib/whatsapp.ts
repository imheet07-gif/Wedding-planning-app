// Helpers for WhatsApp click-to-chat links (wa.me), which open a chat with the message pre-filled.

// wa.me needs the number in international format with digits only. Indian-style 10-digit numbers get the default country code.
export function normalizePhone(raw: string | null, countryCode: string): string | null {
  if (!raw) return null;
  const hasPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!hasPlus) digits = digits.replace(/^0+/, "");
  if (!hasPlus && digits.length === 10) digits = countryCode + digits;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export const DEFAULT_INVITE =
  "Dear {name},\n\nWe would be delighted to have you with us for the {event} on {date} at {venue}.\n\nWith love";
