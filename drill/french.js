// Turns a verb's French meaning into the conjugated translation shown after an
// answer: "boire, avaler" gives "je bois" or "je ne bois pas". No DOM here, and
// nothing about the study data: the tables below are general French grammar.

import { FORMS, isAru } from "./conjugate.js";

// Verbs that take a subject other than "je".
const OTHER_SUBJECT = {
  pleuvoir: ["il", "pleut"],
  neiger: ["il", "neige"],
  signifier: ["cela", "signifie"],
};

const IRREGULAR = {
  être: "suis",
  avoir: "ai",
  aller: "vais",
  savoir: "sais",
  pouvoir: "peux",
  vouloir: "veux",
  devoir: "dois",
  asseoir: "assois",
  mourir: "meurs",
};

// The first ending that matches decides. Order matters: -oir before -ir, and
// the stem changes of -er verbs before the plain -er rule.
const ENDINGS = [
  [/oyer$/, "oie"],
  [/uyer$/, "uie"],
  [/appeler$/, "appelle"],
  [/jeter$/, "jette"],
  [/é([^aeiouyéèê]+)er$/, "è$1e"], // espérer, répéter
  [/e([^aeiouyéèê])er$/, "è$1e"], // acheter, lever
  [/er$/, "e"],
  [/cevoir$/, "çois"],
  [/voir$/, "vois"],
  [/courir$/, "cours"],
  [/enir$/, "iens"], // venir, tenir
  [/([vf])rir$/, "$1re"], // ouvrir, offrir
  [/(par|sor|dor|sen|ser|men)[tmv]ir$/, "$1s"], // partir, dormir, servir
  [/ir$/, "is"],
  [/aître$/, "ais"],
  [/ttre$/, "ts"], // mettre
  [/([aeo]in)dre$/, "$1s"], // craindre
  [/dre$/, "ds"], // attendre, prendre
  [/ire$/, "is"], // écrire, boire, faire
  [/vivre$/, "vis"],
  [/suivre$/, "suis"],
];

const POSSESSIVES = { son: "mon", sa: "ma", ses: "mes", soi: "moi" };
const INDEFINITE = new Set(["un", "une", "des"]);
const KEEPS_ARTICLE = new Set(["être", "devenir"]); // je ne suis pas un élève
const PREPOSITIONS = new Set(["à", "de", "dans", "sur", "avec", "en"]);

// "je" + "écris" gives "j'", while "je" + "bois" gives "je ".
function elide(word, next) {
  return /^[aàâeéèêiîïoôuûyh]/.test(next) ? `${word[0]}'` : `${word} `;
}

function firstPerson(infinitive) {
  if (IRREGULAR[infinitive]) return IRREGULAR[infinitive];
  for (const [ending, replacement] of ENDINGS) {
    if (ending.test(infinitive)) return infinitive.replace(ending, replacement);
  }
  return null;
}

function complement(words, infinitive, negative) {
  const rest = words.map((word) => POSSESSIVES[word] ?? word);
  if (PREPOSITIONS.has(rest.at(-1))) rest.pop(); // "jouer à" reads as "je joue"
  if (negative && rest.length > 1 && INDEFINITE.has(rest[0]) && !KEEPS_ARTICLE.has(infinitive)) {
    const [, noun, ...others] = rest;
    return [elide("de", noun) + noun, ...others];
  }
  return rest;
}

// Returns null when the meaning doesn't start with a verb we can conjugate.
export function conjugateFrench(meaning, negative) {
  const match = meaning.trim().match(/^(se\s+|s['’])?(\S+)\s*(.*)$/);
  if (!match) return null;
  const [, reflexive, infinitive, tail] = match;
  const [subject, form] = OTHER_SUBJECT[infinitive] ?? ["je", firstPerson(infinitive)];
  if (!form) return null;

  const verb = reflexive ? elide("me", form) + form : form;
  const words = complement(tail ? tail.split(/\s+/) : [], infinitive, negative);
  const after = words.length ? ` ${words.join(" ")}` : "";
  if (negative) return `${subject} ${elide("ne", verb)}${verb} pas${after}`;
  const start = subject === "je" ? elide("je", verb) : `${subject} `;
  return `${start}${verb}${after}`;
}

// The first synonym, without notes in brackets (which can contain commas).
export function firstMeaning(definition) {
  return definition.replace(/\s*\([^)]*\)/g, "").split(/[,;]/)[0].trim();
}

// Polite and plain forms read the same in French. A noun + する verb with no verb
// meaning starts with "sans する", which isn't a verb, so it gets no translation.
export function translate(verb, formId) {
  const { negative } = FORMS[formId];
  if (isAru(verb)) return negative ? "il n'y a pas" : "il y a";
  return conjugateFrench(firstMeaning(verb.defs[0]), negative);
}
