// Turns a verb's French meaning into the conjugated translation shown after an
// answer: "boire, avaler" gives "je bois" or "je ne bois pas". No DOM here, and
// nothing about the study data: the tables below are general French grammar.

import { FORMS, isAdjective, isAru } from "./conjugate.js";

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

const IRREGULAR_PARTICIPLES = {
  avoir: "eu",
  savoir: "su",
  pouvoir: "pu",
  vouloir: "voulu",
  devoir: "dû",
  asseoir: "assis",
  mourir: "mort",
  pleuvoir: "plu",
  naître: "né",
  vivre: "vécu",
  suivre: "suivi",
};

const PARTICIPLE_ENDINGS = [
  [/er$/, "é"],
  [/cevoir$/, "çu"],
  [/voir$/, "vu"],
  [/courir$/, "couru"],
  [/enir$/, "enu"],
  [/([vf])rir$/, "$1ert"],
  [/ir$/, "i"],
  [/aître$/, "u"], // connaître
  [/mettre$/, "mis"],
  [/ttre$/, "ttu"], // battre
  [/prendre$/, "pris"],
  [/([aeo]in)dre$/, "$1t"], // craindre
  [/dre$/, "du"], // attendre
  [/crire$/, "crit"],
  [/dire$/, "dit"],
  [/uire$/, "uit"], // conduire
  [/aire$/, "ait"], // faire
  [/oire$/, "u"], // boire, croire
  [/lire$/, "lu"],
  [/rire$/, "ri"],
];

// Verbs of movement and change of state. Pronominal verbs take être as well.
const TAKES_ETRE = new Set([
  "aller", "venir", "revenir", "devenir", "arriver", "partir", "repartir", "entrer", "rentrer",
  "sortir", "monter", "descendre", "tomber", "rester", "retourner", "naître", "mourir",
]);

// States read better in the imperfect: いた is "j'étais", not "j'ai été".
const IMPERFECT = { être: "étais", avoir: "avais" };

// With ている these read as the plain present: 知っている is "je connais".
const STATES = new Set([
  "être", "avoir", "connaître", "savoir", "comprendre", "croire", "penser", "porter",
  "voir", "entendre", "habiter", "vouloir", "aimer", "signifier", "pleuvoir", "neiger",
]);

// With ている these give the state that results, like the verbs in TAKES_ETRE:
// 結婚している is "je suis marié", not "je suis en train de me marier".
const REFLEXIVE_RESULTS = new Set(["marier", "asseoir", "lever", "allonger", "coucher", "réveiller"]);
const RESULT_PHRASES = { "mettre en colère": "je suis en colère" };

const POSSESSIVES = { son: "mon", sa: "ma", ses: "mes", soi: "moi" };
const INDEFINITE = new Set(["un", "une", "des"]);
const KEEPS_ARTICLE = new Set(["être", "devenir"]); // je ne suis pas un élève
const PREPOSITIONS = new Set(["à", "de", "dans", "sur", "avec", "en"]);

// "je" + "écris" gives "j'", while "je" + "bois" gives "je ".
function elide(word, next) {
  return /^[aàâeéèêiîïoôuûyh]/.test(next) ? `${word[0]}'` : `${word} `;
}

function applyEndings(infinitive, irregular, endings) {
  if (irregular[infinitive]) return irregular[infinitive];
  for (const [ending, replacement] of endings) {
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

const words = (tail) => (tail ? tail.split(/\s+/) : []);
const joined = (list) => (list.length ? ` ${list.join(" ")}` : "");
const presentOf = (infinitive) => OTHER_SUBJECT[infinitive]?.[1] ?? applyEndings(infinitive, IRREGULAR, ENDINGS);

function sentence({ reflexive, infinitive, tail }, negative, past) {
  const other = OTHER_SUBJECT[infinitive];
  const subject = other ? other[0] : "je";
  const present = presentOf(infinitive);
  if (!present) return null;

  let finite = present;
  let participle = "";
  if (past && IMPERFECT[infinitive]) {
    finite = IMPERFECT[infinitive];
  } else if (past) {
    participle = applyEndings(infinitive, IRREGULAR_PARTICIPLES, PARTICIPLE_ENDINGS);
    if (!participle) return null;
    finite = other ? "a" : reflexive || TAKES_ETRE.has(infinitive) ? "suis" : "ai";
  }

  const verb = reflexive ? elide("me", finite) + finite : finite;
  const rest = complement(words(tail), infinitive, negative);
  if (participle) rest.unshift(participle);
  const after = joined(rest);
  if (negative) return `${subject} ${elide("ne", verb)}${verb} pas${after}`;
  const start = subject === "je" ? elide("je", verb) : `${subject} `;
  return `${start}${verb}${after}`;
}

// ている is an action under way, unless the verb names a state or a change.
function progressiveSentence(parts) {
  const { reflexive, infinitive, tail } = parts;
  if (!presentOf(infinitive)) return null;
  if (STATES.has(infinitive)) return sentence(parts, false, false);
  const phrase = reflexive && RESULT_PHRASES[`${infinitive} ${tail}`];
  if (phrase) return phrase;

  const after = joined(complement(words(tail), infinitive, false));
  if (reflexive ? REFLEXIVE_RESULTS.has(infinitive) : TAKES_ETRE.has(infinitive)) {
    return `je suis ${applyEndings(infinitive, IRREGULAR_PARTICIPLES, PARTICIPLE_ENDINGS)}${after}`;
  }
  const verb = reflexive ? elide("me", infinitive) + infinitive : infinitive;
  return `je suis en train ${elide("de", verb)}${verb}${after}`;
}

// Returns null when the meaning doesn't start with a verb we can conjugate.
export function conjugateFrench(meaning, { negative = false, tense = "present", progressive = false } = {}) {
  const match = meaning.trim().match(/^(se\s+|s['’])?(\S+)\s*(.*)$/);
  if (!match) return null;
  const [, reflexive, infinitive, tail] = match;
  const parts = { reflexive, infinitive, tail };
  if (progressive) return progressiveSentence(parts);
  const result = sentence(parts, negative, tense === "past");
  return result && tense === "te" ? `${result} et…` : result; // て links to what follows
}

// The first synonym, without notes in brackets (which can contain commas).
export function firstMeaning(definition) {
  return definition.replace(/\s*\([^)]*\)/g, "").split(/[,;]/)[0].trim();
}

// "calme" reads as "c'est calme". Feelings and traits are written as verbs in
// scripts/adjective_meanings.json, so 嬉しい reads as "je suis content".
function adjectiveSentence(meaning, form) {
  if (/^(être|avoir|aimer|détester|vouloir)(\s|$)/.test(meaning)) return conjugateFrench(meaning, form);
  const be = form.tense === "past" ? "était" : "est";
  const start = form.negative ? `ce n'${be} pas` : `c'${be}`;
  return `${start} ${meaning}${form.tense === "te" ? " et…" : ""}`;
}

// Polite and plain forms read the same in French. A noun + する verb with no verb
// meaning starts with "sans する", which isn't a verb, so it gets no translation.
export function translate(verb, formId) {
  const form = FORMS[formId];
  if (isAdjective(verb)) return adjectiveSentence(firstMeaning(verb.defs[0]), form);
  if (isAru(verb)) {
    const have = form.tense === "past" ? "avait" : "a";
    const there = form.negative ? `il n'y ${have} pas` : `il y ${have}`;
    return form.tense === "te" ? `${there} et…` : there;
  }
  return conjugateFrench(firstMeaning(verb.defs[0]), form);
}
