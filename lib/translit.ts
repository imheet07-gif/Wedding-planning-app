// Suggests Hindi and Gujarati spellings of English names. It is a best guess, not a translator: common surnames and
// first names come from a small dictionary, everything else is spelled out by sound. Always check before sending.
// Gujarati is written by shifting each Devanagari letter to the matching Gujarati one (they share a layout).

export type NameLang = "hi" | "gu";

const DICT: Record<string, string> = {
  family: "परिवार", parivar: "परिवार", pariwar: "परिवार",
  // surnames
  patel: "पटेल", shah: "शाह", mehta: "मेहता", sharma: "शर्मा", verma: "वर्मा", gupta: "गुप्ता", joshi: "जोशी", kapoor: "कपूर",
  singh: "सिंह", desai: "देसाई", parekh: "पारेख", modi: "मोदी", trivedi: "त्रिवेदी", pandya: "पंड्या", thakkar: "ठक्कर", bhatt: "भट्ट",
  dave: "दवे", vyas: "व्यास", jain: "जैन", agarwal: "अग्रवाल", agrawal: "अग्रवाल", mishra: "मिश्रा", tiwari: "तिवारी", yadav: "यादव",
  chauhan: "चौहान", amin: "अमीन", bhatia: "भाटिया", choksi: "चोकसी", doshi: "दोशी", gandhi: "गांधी", kothari: "कोठारी",
  lakhani: "लखानी", malhotra: "मल्होत्रा", panchal: "पांचाल", parmar: "परमार", rao: "राव", reddy: "रेड्डी", shukla: "शुक्ला",
  soni: "सोनी", vora: "वोरा", vakil: "वकील", zaveri: "झवेरी", thakor: "ठाकोर", solanki: "सोलंकी", chaudhary: "चौधरी",
  dalal: "दलाल", sheth: "शेठ", seth: "सेठ", kapadia: "कापडिया", rathod: "राठोड", gohil: "गोहिल", jadeja: "जडेजा", raval: "रावल",
  mistry: "मिस्त्री", nayak: "नायक", pathak: "पाठक", pandey: "पांडे", dubey: "दुबे", khanna: "खन्ना", kumar: "कुमार", bhavsar: "भावसार",
  // first names
  heet: "हीत", vidhi: "विधि", amit: "अमित", rahul: "राहुल", priya: "प्रिया", neha: "नेहा", riya: "रिया", raj: "राज", jay: "जय",
  dhruv: "ध्रुव", krish: "कृष", anil: "अनिल", sunil: "सुनील", mukesh: "मुकेश", suresh: "सुरेश", ramesh: "रमेश", rakesh: "राकेश",
  mahesh: "महेश", dinesh: "दिनेश", jignesh: "जिग्नेश", hitesh: "हितेश", nilesh: "नीलेश", kamlesh: "कमलेश", bhavesh: "भावेश",
  kiran: "किरण", pooja: "पूजा", puja: "पूजा", hetal: "हेतल", kinjal: "किंजल", nisha: "निशा", sneha: "स्नेहा", kajal: "काजल",
  jyoti: "ज्योति", meera: "मीरा", sita: "सीता", geeta: "गीता", ashok: "अशोक", vijay: "विजय", ajay: "अजय", sanjay: "संजय",
  deepak: "दीपक", mohan: "मोहन", hari: "हरि", ram: "राम", shyam: "श्याम", krishna: "कृष्ण", lalit: "ललित", nitin: "नितिन",
  anand: "आनंद", bhargav: "भार्गव", kotak: "कोटक", chirag: "चिराग", vishal: "विशाल",
  // how people are addressed
  mr: "श्री", mrs: "श्रीमती", dr: "डॉ.", shri: "श्री", smt: "श्रीमती",
  uncle: "अंकल", aunty: "आंटी", auntie: "आंटी", bhai: "भाई", ben: "बेन", bhabhi: "भाभी", dada: "दादा", dadi: "दादी", nana: "नाना",
  nani: "नानी", mama: "मामा", mami: "मामी", kaka: "काका", kaki: "काकी", masi: "मासी", fua: "फुआ", foi: "फोई", friends: "मित्र",
};

// Spellings that differ between the two languages.
const DICT_GU: Record<string, string> = { mehta: "महेता" };

const CONS: [string, string][] = [
  ["chh", "छ"], ["ksh", "क्ष"], ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"],
  ["k", "क"], ["g", "ग"], ["c", "क"], ["j", "ज"], ["t", "त"], ["d", "द"], ["n", "न"], ["p", "प"], ["b", "ब"], ["m", "म"], ["y", "य"],
  ["r", "र"], ["l", "ल"], ["v", "व"], ["w", "व"], ["s", "स"], ["h", "ह"], ["f", "फ"], ["z", "ज"], ["q", "क"], ["x", "क्स"],
];
// [Latin, matra after a consonant, independent letter]
const VOWELS: [string, string, string][] = [
  ["aa", "ा", "आ"], ["ai", "ै", "ऐ"], ["au", "ौ", "औ"], ["ee", "ी", "ई"], ["oo", "ू", "ऊ"], ["ou", "ौ", "औ"], ["ie", "ी", "ई"],
  ["a", "", "अ"], ["i", "ि", "इ"], ["u", "ु", "उ"], ["e", "े", "ए"], ["o", "ो", "ओ"],
];
const VIRAMA = "्";

function wordToDevanagari(w: string, lang: NameLang): string {
  const known = (lang === "gu" && DICT_GU[w]) || DICT[w];
  if (known) return known;
  let out = "";
  let afterConsonant = false;
  for (let i = 0; i < w.length; ) {
    const rest = w.slice(i);
    const v = VOWELS.find(([l]) => rest.startsWith(l));
    if (v) {
      const atEnd = i + v[0].length === w.length;
      if (!afterConsonant) out += v[2];
      else if (v[0] === "a") {
        // A closing "a" is long (Sharma), and so is one in the last syllable of a longer name (Chirag, Nirav).
        const tail = rest.slice(1);
        out += atEnd || rest === "ah" || (out.length > 2 && tail.length <= 3 && !/[aeiou]/.test(tail)) ? "ा" : "";
      }
      else if (atEnd && v[0] === "i") out += "ी";
      else out += v[1];
      afterConsonant = false;
      i += v[0].length;
      continue;
    }
    // n or m before another consonant is written as the dot above (आनंद), except in clusters like "nn" or "ny".
    if ((w[i] === "n" || w[i] === "m") && afterConsonant === false && out && /[^\s]/.test(out) && i > 0 && i + 1 < w.length && !/[aeiouyhnm]/.test(w[i + 1])) {
      out += "ं";
      i += 1;
      continue;
    }
    const c = CONS.find(([l]) => rest.startsWith(l));
    if (c) {
      if (afterConsonant) out += VIRAMA;
      out += c[1];
      afterConsonant = true;
      i += c[0].length;
      continue;
    }
    out += w[i]; // digits, dots and anything else stay as typed
    afterConsonant = false;
    i += 1;
  }
  return out;
}

const toGujarati = (s: string) => s.replace(/[ऀ-ॿ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x180));

export function transliterate(name: string, lang: NameLang): string {
  const deva = name
    .trim()
    .replace(/\s*&\s*|\s+and\s+/gi, " और ")
    .split(/(\s+)/)
    .map((tok) => (/^\s*$/.test(tok) || tok === "और" ? tok : tok.replace(/[A-Za-z]+/g, (m) => wordToDevanagari(m.toLowerCase(), lang))))
    .join("");
  if (lang === "hi") return deva;
  return toGujarati(deva).replace(/ઔર/g, "અને").replace(/ઔર/g, "અને");
}
