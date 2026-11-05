// Conjugation rules. No DOM here, so tests can run this file directly.
//
// To add a form: add one entry to FORMS, then add rows to the test table.
// A form names which verb base it attaches to ("a" or "i") and its suffix.

export const FORMS = {
  "plain-negative": { label: "Plain negative", ending: "〜ない", base: "a", suffix: "ない" },
  "polite-affirmative": { label: "Polite", ending: "〜ます", base: "i", suffix: "ます" },
  "polite-negative": { label: "Polite negative", ending: "〜ません", base: "i", suffix: "ません" },
};

export const GROUPS = {
  godan: "Godan",
  ichidan: "Ichidan",
  irregular: "Irregular",
  "suru-noun": "Noun + する",
};

export const GODAN_ROWS = {
  a: { う: "わ", く: "か", ぐ: "が", す: "さ", つ: "た", ぬ: "な", ぶ: "ば", む: "ま", る: "ら" },
  i: { う: "い", く: "き", ぐ: "ぎ", す: "し", つ: "ち", ぬ: "に", ぶ: "び", む: "み", る: "り" },
};
const KURU_BASE = { a: "こ", i: "き" };
const SURU_BASE = { a: "し", i: "し" };
const HONORIFIC_BASE = { a: "ら", i: "い" };

const isAru = (verb) => verb.class === "godan-る" && verb.reading === "ある";
const dropLast = (text, count = 1) => text.slice(0, text.length - count);

export function groupOf(verb) {
  if (verb.class === "suru-noun") return "suru-noun";
  if (verb.class === "ichidan") return "ichidan";
  if (verb.class.startsWith("godan-") && !isAru(verb)) return "godan";
  return "irregular";
}

// Each builder returns the kana form, the kanji form (null if there is none),
// and a one-line rule. Verb types come from the data, never from the ending:
// 帰る and 入る look ichidan but are godan.
function godan(verb, form) {
  const end = verb.reading.at(-1);
  const change = GODAN_ROWS[form.base][end] + form.suffix;
  return {
    kana: dropLast(verb.reading) + change,
    kanji: verb.kanji ? dropLast(verb.kanji) + change : null,
    rule: `Godan ${end}: ${end} → ${GODAN_ROWS[form.base][end]} + ${form.suffix}`,
  };
}

function ichidan(verb, form) {
  return {
    kana: dropLast(verb.reading) + form.suffix,
    kanji: verb.kanji ? dropLast(verb.kanji) + form.suffix : null,
    rule: `Ichidan: drop る, add ${form.suffix}`,
  };
}

function honorific(verb, form) {
  const change = HONORIFIC_BASE[form.base] + form.suffix;
  return {
    kana: dropLast(verb.reading) + change,
    kanji: verb.kanji ? dropLast(verb.kanji) + change : null,
    rule: `Honorific る verb: る → ${HONORIFIC_BASE[form.base]} + ${form.suffix}`,
  };
}

function suru(verb, form) {
  const change = SURU_BASE[form.base] + form.suffix;
  return {
    kana: dropLast(verb.reading, 2) + change,
    // 為る has no written kanji form in practice, so it stays kana only.
    kanji: verb.kanji.endsWith("する") ? dropLast(verb.kanji, 2) + change : null,
    rule: `する is irregular: する → ${SURU_BASE[form.base]} + ${form.suffix}`,
  };
}

function kuru(verb, form) {
  const change = KURU_BASE[form.base] + form.suffix;
  let kanji = null;
  if (verb.kanji.endsWith("来る")) kanji = dropLast(verb.kanji) + form.suffix;
  else if (verb.kanji.endsWith("くる")) kanji = dropLast(verb.kanji, 2) + change;
  return {
    kana: dropLast(verb.reading, 2) + change,
    kanji,
    rule: `くる is irregular: くる → ${KURU_BASE[form.base]} + ${form.suffix}`,
  };
}

function aru(verb, form) {
  if (form.base === "a") {
    return {
      kana: form.suffix,
      kanji: null,
      rule: `ある is irregular: its negative is simply ${form.suffix}`,
    };
  }
  return godan(verb, form);
}

export function conjugate(verb, formId) {
  const form = FORMS[formId];
  if (!form) throw new Error(`Unknown form: ${formId}`);
  if (isAru(verb)) return aru(verb, form);
  if (verb.class.startsWith("godan-")) return godan(verb, form);
  if (verb.class === "ichidan") return ichidan(verb, form);
  if (verb.class === "honorific") return honorific(verb, form);
  if (verb.class === "kuru") return kuru(verb, form);
  if (verb.class === "suru" || verb.class === "suru-noun") return suru(verb, form);
  throw new Error(`Unknown verb class: ${verb.class}`);
}

// Example verbs for the cheatsheet. Its tables are built from FORMS, GODAN_ROWS and
// conjugate(), so they can't disagree with the drill, and a new form adds itself.
// endingsOnly rows show 〜 plus what changes, to keep long verbs on one line.
export const CHEATSHEET = {
  godan: { kanji: "書く", reading: "かく", class: "godan-く" },
  ichidan: { kanji: "食べる", reading: "たべる", class: "ichidan" },
  irregular: [
    { kanji: "", reading: "する", class: "suru" },
    { kanji: "来る", reading: "くる", class: "kuru" },
    { kanji: "", reading: "ある", class: "godan-る" },
    { kanji: "下さる", reading: "くださる", class: "honorific", endingsOnly: true },
    { kanji: "勉強する", reading: "べんきょうする", class: "suru-noun", endingsOnly: true },
  ],
};

// Splits a conjugated form into the part it shares with the dictionary form and
// the part that replaced the rest: かう and かわない give か and わない.
export function splitEnding(reading, kana) {
  let shared = 0;
  while (shared < kana.length && kana[shared] === reading[shared]) shared++;
  return { stem: kana.slice(0, shared), ending: kana.slice(shared) };
}

// Strips spacing and final punctuation, and folds katakana to hiragana so that
// こぴーします matches コピーします.
export function normalize(text) {
  return text
    .replace(/[\s　]/g, "")
    .replace(/[。.]+$/, "")
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function isCorrect(verb, formId, answer) {
  const given = normalize(answer);
  if (!given) return false;
  const { kana, kanji } = conjugate(verb, formId);
  return given === normalize(kana) || (kanji !== null && given === normalize(kanji));
}
