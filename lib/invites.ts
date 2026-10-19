// Builds each guest's invitation: one message per language, signed by the family on their side.

export type Lang = "gu" | "hi" | "en";
export const LANGS: Lang[] = ["gu", "hi", "en"];
export const LANG_LABEL: Record<Lang, string> = { gu: "ગુજરાતી", hi: "हिन्दी", en: "English" };
const LOCALE: Record<Lang, string> = { gu: "gu-IN", hi: "hi-IN", en: "en-IN" };

export const DEFAULT_TEXT: Record<Lang, string> = {
  gu: "પ્રિય {name},\n\n{date} ના રોજ {venue} ખાતે યોજાનાર {event} પ્રસંગે આપની ઉપસ્થિતિ અમારા માટે અત્યંત આનંદની વાત હશે.\n\n📍 {map}\n\nસ્નેહ સહિત,\n{from}",
  hi: "प्रिय {name},\n\n{date} को {venue} में आयोजित {event} में आपकी उपस्थिति हमारे लिए अत्यंत हर्ष का विषय होगी।\n\n📍 {map}\n\nस्नेह सहित,\n{from}",
  en: "Dear {name},\n\nWe would be delighted to have you with us for the {event} on {date} at {venue}.\n\n📍 {map}\n\nWith love,\n{from}",
};

// Common event names in each language. Anything not listed keeps the name as typed.
const EVENT_NAME: Record<string, Partial<Record<Lang, string>>> = {
  haldi: { gu: "હલ્દી", hi: "हल्दी" },
  mehendi: { gu: "મહેંદી", hi: "मेहंदी" },
  mehndi: { gu: "મહેંદી", hi: "मेहंदी" },
  sangeet: { gu: "સંગીત", hi: "संगीत" },
  mameru: { gu: "મામેરું", hi: "मामेरा" },
  "wedding day": { gu: "લગ્ન", hi: "विवाह" },
  wedding: { gu: "લગ્ન", hi: "विवाह" },
  reception: { gu: "રિસેપ્શન", hi: "रिसेप्शन" },
  engagement: { gu: "સગાઈ", hi: "सगाई" },
};

// Stand-ins when an event has no date or venue yet, worded to read naturally inside the sentence.
const TBA: Record<Lang, { date: string; venue: string }> = {
  gu: { date: "જલ્દી જાહેર થનાર તારીખ", venue: "જલ્દી જાહેર થનાર સ્થળ" },
  hi: { date: "शीघ्र घोषित होने वाली तिथि", venue: "शीघ्र घोषित होने वाले स्थान" },
  en: { date: "[date to be announced]", venue: "[venue to be announced]" },
};

const SEPARATOR = "\n\n――――――\n\n";

export function parseLangs(v: string | undefined): Lang[] {
  const picked = (v ?? "gu,hi").split(",").filter((l): l is Lang => LANGS.includes(l as Lang));
  return picked.length ? LANGS.filter((l) => picked.includes(l)) : ["gu", "hi"];
}

type Settings = Record<string, string | undefined>;

// "Shah family" for a bride-side guest, "Sharma family" for groom-side, both for guests of both sides.
// Each language falls back to the English name if no native-script name was typed.
export function familyFor(side: "bride" | "groom" | "both", lang: Lang, s: Settings): string {
  const name = (who: "bride" | "groom") => (lang === "en" ? s[`family_${who}`] : s[`family_${who}_${lang}`] || s[`family_${who}`]) ?? "";
  const bride = name("bride").trim();
  const groom = name("groom").trim();
  if (side === "bride") return bride || groom;
  if (side === "groom") return groom || bride;
  return [bride, groom].filter(Boolean).join(" & ");
}

// A "📍 {map}" line vanishes when the event has no map link, instead of leaving a lonely pin.
function fill(template: string, vars: Record<string, string>) {
  return template
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
    .replace(/^📍[ \t]*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

// Accepts what people paste from Google Maps (with or without https://). Returns "" to clear the link,
// null when it is not a web address. Only http(s) is allowed, so nothing odd can end up as a link.
export function cleanMapUrl(raw: string): string | null {
  let v = raw.trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

const MAPS_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.co)$/i;
export const looksLikeGoogleMaps = (url: string) => {
  try { return MAPS_HOSTS.test(new URL(url).hostname); } catch { return false; }
};

type Ev = { name: string; event_date: string | null; start_time: string | null; venue: string | null; map_url?: string | null; invite_text: string | null; invite_text_gu: string | null; invite_text_hi: string | null };

export function templateFor(ev: Pick<Ev, "invite_text" | "invite_text_gu" | "invite_text_hi">, lang: Lang): string {
  const saved = lang === "gu" ? ev.invite_text_gu : lang === "hi" ? ev.invite_text_hi : ev.invite_text;
  return saved ?? DEFAULT_TEXT[lang];
}

export function buildParts(opts: {
  guest: { name: string; side: "bride" | "groom" | "both" };
  event: Ev;
  texts?: Partial<Record<Lang, string>>; // unsaved edits, otherwise the event's saved text
  langs: Lang[];
  settings: Settings;
}): { lang: Lang; text: string }[] {
  const { guest, event, langs, settings } = opts;
  return langs.map((lang) => {
    const date = event.event_date
      ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" })
      : TBA[lang].date;
    const time = event.start_time
      ? new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString(LOCALE[lang], { hour: "numeric", minute: "2-digit" })
      : "";
    const text = fill(opts.texts?.[lang] ?? templateFor(event, lang), {
      name: guest.name,
      event: EVENT_NAME[event.name.trim().toLowerCase()]?.[lang] ?? event.name,
      date,
      time,
      venue: event.venue || TBA[lang].venue,
      map: event.map_url ?? "",
      from: familyFor(guest.side, lang, settings),
    });
    return { lang, text };
  });
}

export const joinParts = (parts: { text: string }[], media?: string | null) =>
  parts.map((p) => p.text).join(SEPARATOR) + (media ? `\n\n${media}` : "");
