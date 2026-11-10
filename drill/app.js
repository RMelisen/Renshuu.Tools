import { CHEATSHEET, conjugate, findDictionaryMistake, findMistake, FORMS, formsWithSpelling, GODAN_ROWS, GROUPS, groupOf, hasForm, isCorrect, isDictionaryForm, normalize, splitEnding } from "./conjugate.js";
import { translate } from "./french.js";

// index.html has no <html> tag of its own: publishing wraps it in a skeleton.
document.documentElement.lang = "fr";

const STORAGE_KEY = "doshi-drill-settings";
// The forms that existed before saved settings recorded which forms they had seen.
const FIRST_FORMS = ["plain-negative", "polite-affirmative", "polite-negative"];
const FIRST_GROUPS = ["godan", "ichidan", "irregular", "suru-noun"];
// What a card asks. The reverse kinds show a conjugated form, to train reading.
const KINDS = {
  conjugate: { text: "Conjuguer", example: "書く → 書かない" },
  dictionary: { text: "Retrouver le dictionnaire", example: "書かない → 書く" },
  "name-form": { text: "Nommer la forme", example: "書かない → Présent neutre négatif" },
};
const DEFAULTS = {
  kinds: Object.keys(KINDS),
  forms: Object.keys(FORMS),
  groups: Object.keys(GROUPS),
  length: 20,
  showReading: true,
  showMeaning: true,
  showGroup: true,
  showEnding: true,
  vibrate: true,
  palette: "violet",
  font: "pop",
};
const PALETTES = {
  violet: "Ruban violet",
  marin: "Uniforme marin",
  menthe: "Menthe et magenta",
  ciel: "Ciel étoilé",
  aurore: "Aurore",
  nineties: "Pastels années 90",
};
const FONTS = {
  pop: "Mochiy Pop",
  zen: "Zen Maru Gothic",
  kiwi: "Kiwi Maru",
  kosugi: "Kosugi Maru",
  rocknroll: "RocknRoll One",
};
const HIT_SOUNDS = {
  right: ["正解！", "やった！", "すごい！", "完璧！"],
  missed: ["残念", "あれ？", "おしい！", "もう一回"],
};
const CARD_DETAILS = {
  showReading: { text: "Lecture en kana", short: "Kana" },
  showMeaning: { text: "Traduction", short: "Traduction" },
  showGroup: { text: "Groupe du mot", short: "Groupe" },
  showEnding: { text: "Terminaison", short: "Terminaison" },
};
const LENGTHS = [10, 20, 40];
const TENSES = { present: "Présent", past: "Passé", te: "Forme en て" };
const formIdsOf = (tense) => Object.keys(FORMS).filter((id) => FORMS[id].tense === tense);

const $ = (id) => document.getElementById(id);
const wanakana = window.wanakana; // optional: kana and kanji still work without it

let verbs = [];
let settings = loadSettings();
let round = null;
applyLook();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { ...DEFAULTS };
    const merged = { ...DEFAULTS, ...saved };
    // A form or group added since the last visit starts switched on.
    const withNew = (chosen, all, seen) => [
      ...chosen.filter((id) => all[id]),
      ...Object.keys(all).filter((id) => !seen.includes(id)),
    ];
    merged.forms = withNew(merged.forms, FORMS, saved.seenForms ?? FIRST_FORMS);
    merged.groups = withNew(merged.groups, GROUPS, saved.seenGroups ?? FIRST_GROUPS);
    // Settings saved before reverse cards had only forward ones.
    merged.kinds = withNew(saved.kinds ?? ["conjugate"], KINDS, saved.seenKinds ?? ["conjugate"]);
    if (!PALETTES[merged.palette]) merged.palette = DEFAULTS.palette;
    if (!FONTS[merged.font]) merged.font = DEFAULTS.font;
    return merged.forms.length && merged.groups.length && merged.kinds.length ? merged : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...settings,
      seenForms: Object.keys(FORMS),
      seenGroups: Object.keys(GROUPS),
      seenKinds: Object.keys(KINDS),
    }));
  } catch {
    // Settings then last for this visit only.
  }
}

function applyLook() {
  document.documentElement.dataset.palette = settings.palette;
  document.documentElement.dataset.font = settings.font;
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// What one card asks. Every kind returns the same shape, so the card flow below
// doesn't change with it. A card with `choices` is answered with a button.
function makeExercise(verb, formId, kind = "conjugate") {
  if (kind === "dictionary") return makeDictionaryCard(verb, formId);
  if (kind === "name-form") return makeNameFormCard(verb, formId);
  const form = FORMS[formId];
  const result = conjugate(verb, formId);
  const kanaLead = verb.kanaFirst || !verb.kanji;
  const answerInKanji = !kanaLead && result.kanji;
  return {
    verbId: verb.id,
    formId,
    kind,
    cheatSection: cheatSectionId(verb, formId),
    prompt: { label: form.label, ending: result.ending ?? form.ending },
    cue: {
      main: kanaLead ? verb.reading : verb.kanji,
      sub: kanaLead ? verb.kanji : verb.reading,
      subIsReading: !kanaLead,
      defs: verb.defs.join(" ; "),
      group: GROUPS[groupOf(verb)],
    },
    answer: {
      main: answerInKanji ? result.kanji : result.kana,
      sub: answerInKanji ? result.kana : result.kanji || "",
      french: translate(verb, formId),
    },
    rule: result.rule,
    check: (given) => isCorrect(verb, formId, given),
    mistake: (given) => findMistake(verb, formId, given),
  };
}

// Reverse cards show the conjugated form where the forward card shows the word,
// written in kanji unless the word is usually written in kana.
function reverseCard(verb, formId, kind) {
  const result = conjugate(verb, formId);
  const kanaLead = verb.kanaFirst || !result.kanji;
  const shown = kanaLead ? result.kana : result.kanji;
  return {
    verbId: verb.id,
    formId,
    kind,
    shown,
    cheatSection: cheatSectionId(verb, formId),
    cue: {
      main: shown,
      sub: kanaLead ? result.kanji || "" : result.kana,
      subIsReading: !kanaLead,
      defs: verb.defs.join(" ; "),
      group: GROUPS[groupOf(verb)],
    },
    rule: result.rule,
    mistake: () => null,
  };
}

const dictionaryWriting = (verb) => (verb.kanaFirst || !verb.kanji
  ? { main: verb.reading, sub: verb.kanji }
  : { main: verb.kanji, sub: verb.reading });

// Every word whose form is written like the one shown: いった in kana could come
// from 行く or 言う, so either is right.
function lookalikes(verb, formId, shown) {
  return verbs.filter((v) => v === verb || formsWithSpelling(v, shown, [formId]).length);
}

function makeDictionaryCard(verb, formId) {
  const card = reverseCard(verb, formId, "dictionary");
  return {
    ...card,
    prompt: { label: "Forme du dictionnaire ?", ending: "" },
    answer: {
      ...dictionaryWriting(verb),
      french: translate(verb, formId),
      note: `${card.shown} : ${FORMS[formId].label.toLowerCase()}`,
    },
    check: (given) => isDictionaryForm(lookalikes(verb, formId, card.shown), given),
    mistake: (given) => findDictionaryMistake(verb, given),
  };
}

// The forms a word can be asked to name: those switched on in Settings that the
// word takes, plus the card's own form if Settings changed since.
function choicesFor(verb, formId) {
  return Object.keys(FORMS).filter((id) => (settings.forms.includes(id) || id === formId) && hasForm(verb, id));
}

function makeNameFormCard(verb, formId) {
  const card = reverseCard(verb, formId, "name-form");
  const choices = choicesFor(verb, formId);
  return {
    ...card,
    choices,
    prompt: { label: "Quelle est cette forme ?", ending: "" },
    answer: {
      main: FORMS[formId].label,
      sub: conjugate(verb, formId).ending ?? FORMS[formId].ending,
      lang: "fr",
      french: translate(verb, formId),
      note: `Forme du dictionnaire : ${dictionaryWriting(verb).main}`,
    },
    check: (given) => formsWithSpelling(verb, card.shown, choices).includes(given),
  };
}

// The cheatsheet part that explains a card: adjectives have their own, verbs sit
// under the card's tense. Irregular verbs and noun + する share a table.
function cheatSectionId(verb, formId) {
  const group = groupOf(verb);
  if (group === "i-adj" || group === "na-adj") return `cheat-${group}`;
  const kind = group === "godan" || group === "ichidan" ? group : "irregular";
  return `cheat-${FORMS[formId].tense}-${kind}`;
}

// A card is saved by what it asks, and rebuilt from the verb list on load.
const cardRef = ({ verbId, formId, kind, slot, retry }) => ({ verbId, formId, kind, slot, retry });

// Rounds saved before reverse cards had no kind: they were all forward cards.
function cardFromRef({ verbId, formId, kind = "conjugate", slot, retry }) {
  const verb = verbs.find((v) => v.id === verbId);
  if (!verb || !FORMS[formId] || !KINDS[kind] || !hasForm(verb, formId)) return null;
  return { ...makeExercise(verb, formId, kind), slot, retry: Boolean(retry) };
}

// Each verb appears once before any verb repeats, and a repeated verb gets a
// different form, so a round never asks the same card twice. A verb skips forms
// it doesn't have: ある has no ている. Kinds take turns, and naming the form
// needs at least two forms to choose from.
function buildCards() {
  const forms = shuffle(settings.forms);
  const formsOf = (verb) => forms.filter((id) => hasForm(verb, id));
  const kinds = shuffle(settings.kinds);
  const kindsOf = (verb) => kinds.filter((kind) => kind !== "name-form" || formsOf(verb).length > 1);
  const pool = shuffle(verbs.filter((v) => settings.groups.includes(groupOf(v)) && formsOf(v).length && kindsOf(v).length));
  const available = pool.reduce((sum, verb) => sum + formsOf(verb).length, 0);
  const total = Math.min(settings.length, available);
  const asked = new Set();
  const cards = [];
  for (let i = 0; cards.length < total; i++) {
    const verb = pool[i % pool.length];
    const pass = Math.floor(i / pool.length);
    const start = i + pass;
    const formId = forms
      .map((_, offset) => forms[(start + offset) % forms.length])
      .find((id) => hasForm(verb, id) && !asked.has(`${verb.id}/${id}`));
    if (!formId) continue;
    asked.add(`${verb.id}/${formId}`);
    const options = kindsOf(verb);
    const kind = options[cards.length % options.length];
    cards.push({ ...makeExercise(verb, formId, kind), slot: cards.length, retry: false });
  }
  return cards;
}

function startRound(queue = buildCards()) {
  round = { queue, total: queue.length, results: [], mistakes: [], current: null, answered: false };
  $("summary").hidden = true;
  $("drill").hidden = false;
  showNext();
}

// A new round with only the cards missed in the one just finished, each asked once
// more in a new order.
function reviewMistakes() {
  const cards = shuffle(round.mistakes.map(({ card }) => card));
  startRound(cards.map((card, slot) => cardFromRef({ ...card, slot, retry: false })));
}

// The round is saved after every card, so a reload or a phone closing the page picks
// up where it stopped. An unanswered card goes back to the front of the queue. An
// answered one is already counted, so the round resumes at the next card.
const ROUND_KEY = "doshi-drill-round";

function saveRound() {
  try {
    const waiting = round.answered ? round.queue : [round.current, ...round.queue];
    localStorage.setItem(ROUND_KEY, JSON.stringify({
      total: round.total,
      results: round.results,
      queue: waiting.map(cardRef),
      mistakes: round.mistakes.map(({ card, given }) => ({ ...cardRef(card), given })),
    }));
  } catch {
    // The round then lasts for this visit only.
  }
}

function forgetRound() {
  try {
    localStorage.removeItem(ROUND_KEY);
  } catch {
    // Nothing was saved.
  }
}

// Returns false when there is no saved round, or one that no longer fits the verb
// list, so a new round starts instead.
function resumeRound() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(ROUND_KEY));
  } catch {
    return false;
  }
  if (!saved?.queue?.length) return false;
  const queue = saved.queue.map(cardFromRef);
  const mistakes = (saved.mistakes ?? []).map(({ given, ...ref }) => ({ card: cardFromRef(ref), given }));
  if (queue.includes(null) || mistakes.some(({ card }) => !card)) return false;
  round = { queue, total: saved.total, results: saved.results ?? [], mistakes, current: null, answered: false };
  $("summary").hidden = true;
  $("drill").hidden = false;
  showNext();
  return true;
}

function showNext() {
  if (!round.queue.length) return showSummary();
  round.current = round.queue.shift();
  round.answered = false;

  const card = round.current;
  $("verb-main").textContent = card.cue.main;
  renderCue();
  $("form-label").textContent = card.prompt.label;
  $("retry-tag").hidden = !card.retry;

  const input = $("answer");
  const choosing = Boolean(card.choices);
  input.hidden = choosing;
  input.readOnly = false;
  input.value = "";
  input.classList.remove("struck");
  fitAnswer();
  renderChoices(card);
  delete $("drill").dataset.result;
  $("feedback").replaceChildren();
  $("primary").textContent = "Vérifier";
  $("primary").hidden = choosing;
  $("reveal").hidden = false;
  setHint();
  renderProgress();
  saveRound();
  if (!choosing) input.focus({ preventScroll: true });
}

// A card that names the form is answered by tapping one, so no keyboard opens.
function renderChoices(card) {
  $("choices").hidden = !card.choices;
  $("choices").replaceChildren(...(card.choices ?? []).map((formId) => {
    const button = makeElement("button", "choice", FORMS[formId].label);
    button.type = "button";
    button.value = formId;
    return button;
  }));
}

// After the answer, the right form is marked, and the one tapped if it was wrong.
function markChoices(card, given) {
  for (const button of $("choices").children) {
    const right = card.check(button.value);
    button.disabled = true;
    button.classList.toggle("right", right);
    button.classList.toggle("picked", button.value === given && !right);
  }
}

// A detail hidden in Settings comes back once the card is answered, so the guess
// can be checked. Concealing keeps its space, so the answer squares never jump.
// The meaning is the exception: it can run several lines, and leaving them out lifts
// the answer clear of a phone keyboard. It comes back above the answer once checked.
function renderCue() {
  if (!round?.current) return;
  const { sub, subIsReading, defs, group } = round.current.cue;
  const show = (id, text, wanted, { collapse = false } = {}) => {
    const concealed = !wanted && !round.answered;
    $(id).textContent = text;
    $(id).hidden = !text || (collapse && concealed);
    $(id).classList.toggle("concealed", concealed);
  };
  show("verb-sub", sub, !subIsReading || settings.showReading);
  show("verb-defs", defs, settings.showMeaning, { collapse: true });
  show("verb-group", group, settings.showGroup);
  show("form-ending", round.current.prompt.ending, settings.showEnding);
}

// The Settings checkboxes and the buttons on the card change the same settings.
function setDetail(key, on) {
  settings[key] = on;
  saveSettings();
  renderDetailControls();
  renderCue();
}

function renderDetailControls() {
  for (const key of Object.keys(CARD_DETAILS)) {
    $(`detail-${key}`).checked = settings[key];
    $(`quick-${key}`).setAttribute("aria-pressed", String(settings[key]));
  }
}

function setHint(message) {
  const hint = $("hint");
  hint.hidden = !message;
  hint.textContent = message ?? "";
}

function fitAnswer() {
  $("answer").style.setProperty("--chars", Math.max(Array.from($("answer").value).length, 1));
}

function renderStrip(target, withCurrent) {
  const squares = [];
  for (let i = 0; i < round.total; i++) {
    const square = document.createElement("i");
    if (round.results[i]) square.className = round.results[i];
    else if (withCurrent && round.current?.slot === i) square.className = "now";
    squares.push(square);
  }
  target.replaceChildren(...squares);
}

function renderProgress() {
  const firstPassDone = round.results.filter(Boolean).length;
  const waiting = round.queue.filter((card) => card.retry).length;
  const onRetry = round.current.retry && !round.answered;
  const number = onRetry ? firstPassDone : Math.min(firstPassDone + (round.answered ? 0 : 1), round.total);
  $("progress").textContent = `${number}/${round.total}`;
  let label = onRetry ? `${number} sur ${round.total} faites` : `Carte ${number} sur ${round.total}`;
  if (waiting) label += `, ${waiting} à refaire`;
  $("progress").setAttribute("aria-label", label);
  renderStrip($("strip"), true);
}

// Hand-drawn pen strokes, in fractions of the marked area.
function penPath(right, w, h) {
  const p = (x, y) => `${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`;
  if (right) {
    return `M ${p(0.14, 0.14)} C ${p(0.4, -0.08)}, ${p(0.86, -0.08)}, ${p(0.97, 0.26)}`
      + ` C ${p(1.05, 0.62)}, ${p(0.78, 1.08)}, ${p(0.44, 1.06)}`
      + ` C ${p(0.12, 1.04)}, ${p(-0.05, 0.68)}, ${p(0.03, 0.36)}`
      + ` C ${p(0.07, 0.2)}, ${p(0.2, 0.06)}, ${p(0.38, 0.03)}`;
  }
  return `M ${p(0.02, 0.8)} C ${p(0.3, 0.68)}, ${p(0.65, 0.42)}, ${p(0.98, 0.2)}`;
}

// The rays and stars behind a reaction, drawn once. CSS shows one group or the
// other, so the colours follow the theme and the fill stays out of this code.
function buildHitRays() {
  const [cx, cy, reach, count] = [200, 190, 720, 70];
  const point = (angle, radius) => `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  const wedges = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const spread = 0.018 + (i % 3) * 0.012;
    const inner = i % 2 ? 88 : 122;
    wedges.push(`<path class="${i % 2 ? "ray-b" : "ray-a"}" d="M${point(angle - spread, reach)} L${point(angle, inner)} L${point(angle + spread, reach)}Z"/>`);
  }
  const star = (x, y, r, className) => `<path class="${className}" d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z"/>`;
  const spots = [[52, 80, 21], [334, 58, 29], [362, 214, 16], [30, 254, 27], [200, 40, 13], [122, 160, 12], [294, 146, 15], [80, 360, 13], [350, 360, 19]];
  $("hit-rays").innerHTML = `<g class="burst">${wedges.join("")}${spots.map(([x, y, r]) => star(x, y, r * 1.5, "star")).join("")}</g>`
    + `<g class="fallen">${spots.map(([x, y, r]) => star(x, y + 80, r * 0.8, "fallen-star")).join("")}</g>`;
}

// The word lands on the answer, then settles beside the button that moves on. Their
// height depends on the card's text, so measure once the feedback is on the card.
// Clearing the result in showNext is what lets the animations run again next card.
function playHit(result) {
  const words = HIT_SOUNDS[result];
  $("hit-sound").textContent = words[Math.floor(Math.random() * words.length)];
  const middle = (element) => {
    const box = element.getBoundingClientRect();
    return box.top + box.height / 2;
  };
  const panel = $("drill");
  const panelTop = panel.getBoundingClientRect().top + panel.clientTop;
  panel.style.setProperty("--word-settle", `${middle($("primary")) - panelTop}px`);
  const answer = $("answer").hidden ? $("choices") : $("answer");
  panel.style.setProperty("--word-rise", `${middle(answer) - middle($("primary"))}px`);
  panel.dataset.result = result;
}

// A trailing "n" stays Latin while typing (it might become な), so convert the
// whole answer once more on submit: "shimase" + "n" becomes しません.
function toKana(raw) {
  return wanakana ? wanakana.toHiragana(raw) : raw;
}

// `choice` is the form tapped on a card that names the form.
function grade({ gaveUp, choice }) {
  const card = round.current;
  const input = $("answer");
  const choosing = Boolean(card.choices);
  const given = gaveUp ? "" : choosing ? choice : toKana(input.value);
  const right = !gaveUp && card.check(given);

  round.answered = true;
  input.value = choosing ? "" : given;
  input.readOnly = true;
  if (choosing) markChoices(card, given);

  if (!card.retry) {
    round.results[card.slot] = right ? "right" : "missed";
    if (!right) round.mistakes.push({ card, given });
  }
  if (!right) {
    card.retry = true;
    const gap = 3 + Math.floor(Math.random() * 3);
    round.queue.splice(Math.min(gap, round.queue.length), 0, card);
  }

  renderCue();
  fitAnswer();
  input.classList.toggle("struck", !right && !gaveUp);
  renderFeedback(card, right, gaveUp, given);
  $("primary").textContent = round.queue.length ? "Suivant" : "Voir les résultats";
  $("primary").hidden = false;
  $("reveal").hidden = true;
  $("hint").hidden = true;
  renderProgress();
  saveRound();
  // Enter then moves on, as it does after typing.
  if (choosing) $("primary").focus({ preventScroll: true });
  if (gaveUp) return;
  playHit(right ? "right" : "missed");
  if (!right && settings.vibrate) buzz();
}

// Android only: iPhones have no vibration for web pages. Returns false when the
// browser refuses. It can also accept and stay still, when the app showing the page
// lacks Android's vibration permission or the phone has vibration off.
function buzz() {
  try {
    return Boolean(navigator.vibrate?.([60, 40, 60]));
  } catch {
    return false;
  }
}

// A spelling with the part that differs from the typed answer marked, when the
// mistake points at that spelling.
function spelling(text, mistake) {
  if (mistake?.form !== text || !mistake.expected) return [text];
  return [mistake.before, makeElement("mark", "diff", mistake.expected), mistake.after];
}

// Says in a few words what went wrong: "Tu as écrit « き » au lieu de « い »."
function describeMistake({ wrote, expected }) {
  const line = makeElement("p", "mistake");
  const quote = (text) => {
    const span = makeElement("span", "", `« ${text} »`);
    span.lang = "ja";
    return span;
  };
  if (wrote && expected) line.append("Tu as écrit ", quote(wrote), " au lieu de ", quote(expected), ".");
  else if (expected) line.append("Il manquait ", quote(expected), ".");
  else line.append(quote(wrote), " en trop.");
  return line;
}

function renderFeedback(card, right, gaveUp, given) {
  const mistake = right || gaveUp ? null : card.mistake(given);
  const verdict = document.createElement("p");
  verdict.className = "verdict";
  verdict.textContent = right ? "Bonne réponse" : gaveUp ? "La réponse est" : "Pas tout à fait. La réponse est";

  const correction = document.createElement("p");
  correction.className = "correction";
  correction.lang = card.answer.lang ?? "ja";
  correction.append(...spelling(card.answer.main, mistake));
  if (card.answer.sub) {
    const small = document.createElement("small");
    small.lang = "ja";
    small.append(...spelling(card.answer.sub, mistake));
    correction.append(small);
  }

  const rule = document.createElement("p");
  rule.className = "rule";
  rule.textContent = right ? card.rule : `${card.rule}. Cette carte reviendra plus tard dans la manche.`;

  $("feedback").replaceChildren(verdict, correction);
  if (mistake) $("feedback").append(describeMistake(mistake));
  if (card.choices && !right && !gaveUp) {
    $("feedback").append(makeElement("p", "mistake", `Tu as choisi ${givenText(card, given)}.`));
  }
  if (card.answer.note) {
    $("feedback").append(makeElement("p", "note", card.answer.note));
  }
  if (card.answer.french) {
    const french = document.createElement("p");
    french.className = "french";
    french.textContent = card.answer.french;
    $("feedback").append(french);
  }
  $("feedback").append(rule);
  if (!right) {
    const link = makeElement("button", "quiet cheat-link", "Revoir la règle dans l'aide-mémoire");
    link.type = "button";
    link.dataset.section = card.cheatSection;
    $("feedback").append(link);
  }
}

// What the learner answered, in words: a tapped form is shown by its name.
const givenText = (card, given) => (card.choices ? FORMS[given]?.label.toLowerCase() ?? given : given);

function showSummary() {
  const score = round.results.filter((result) => result === "right").length;
  $("drill").hidden = true;
  $("summary").hidden = false;
  $("summary-title").textContent = `${score} sur ${round.total} justes du premier coup`;
  renderStrip($("summary-strip"), false);

  forgetRound();
  const count = round.mistakes.length;
  $("mistakes-title").textContent = count
    ? `${count === 1 ? "1 carte" : `${count} cartes`} à revoir`
    : "Aucune erreur dans cette manche.";
  $("review").hidden = !count;
  $("review").textContent = count === 1 ? "Revoir mon erreur" : `Revoir mes ${count} erreurs`;
  $("again").className = count ? "quiet" : "solid";

  $("mistakes").replaceChildren(...round.mistakes.map(({ card, given }) => {
    const row = document.createElement("li");
    const left = document.createElement("div");
    const asked = document.createElement("p");
    asked.className = "asked";
    asked.lang = "ja";
    asked.textContent = card.cue.main;
    const formName = document.createElement("p");
    formName.className = "form-name";
    formName.textContent = card.prompt.label;
    left.append(asked, formName);

    const right = document.createElement("div");
    const form = document.createElement("p");
    form.className = "right-form";
    form.lang = "ja";
    form.textContent = card.answer.main;
    const wrote = document.createElement("p");
    wrote.className = "wrote";
    if (!given) wrote.textContent = "Tu as choisi Voir la réponse";
    else if (card.choices) wrote.textContent = `Tu as choisi ${givenText(card, given)}`;
    else wrote.textContent = `Tu as écrit ${given}`;
    right.append(form, wrote);

    row.append(left, right);
    return row;
  }));
  $("summary-title").focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function buildChoice(container, { type, name, value, checked, text, count }) {
  const label = document.createElement("label");
  label.className = "check";
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.value = value;
  input.id = `${name}-${value}`;
  input.checked = checked;
  label.append(input, ` ${text}`);
  if (count !== undefined) {
    const span = document.createElement("span");
    span.className = "count";
    span.textContent = count;
    label.append(span);
  }
  container.append(label);
  return label;
}

function buildSettings() {
  for (const [id, { text, example }] of Object.entries(KINDS)) {
    const label = buildChoice($("set-kinds"), {
      type: "checkbox", name: "kind", value: id, checked: settings.kinds.includes(id), text,
    });
    const sample = makeElement("span", "count", example);
    sample.lang = "ja";
    label.append(sample);
  }
  for (const [tense, title] of Object.entries(TENSES)) {
    const section = makeElement("fieldset", "set-tense");
    section.append(makeElement("legend", "", title));
    for (const id of formIdsOf(tense)) {
      buildChoice(section, {
        type: "checkbox", name: "form", value: id,
        checked: settings.forms.includes(id), text: `${FORMS[id].short} ${FORMS[id].ending}`,
      });
    }
    $("set-forms").append(section);
  }
  for (const [id, label] of Object.entries(GROUPS)) {
    buildChoice($("set-groups"), {
      type: "checkbox", name: "group", value: id,
      checked: settings.groups.includes(id), text: label,
      count: verbs.filter((v) => groupOf(v) === id).length,
    });
  }
  for (const length of LENGTHS) {
    buildChoice($("set-length"), {
      type: "radio", name: "length", value: String(length),
      checked: settings.length === length, text: String(length),
    });
  }
  for (const [id, text] of Object.entries(PALETTES)) {
    const label = buildChoice($("set-palette"), {
      type: "radio", name: "palette", value: id, checked: settings.palette === id, text,
    });
    const swatch = makeElement("span", "swatch");
    swatch.dataset.palette = id;
    swatch.setAttribute("aria-hidden", "true");
    swatch.append(...Array.from({ length: 4 }, () => document.createElement("i")));
    label.append(swatch);
  }
  for (const [id, text] of Object.entries(FONTS)) {
    const label = buildChoice($("set-font"), {
      type: "radio", name: "font", value: id, checked: settings.font === id, text,
    });
    label.classList.add(`sample-${id}`);
  }
  for (const [key, { text, short }] of Object.entries(CARD_DETAILS)) {
    buildChoice($("set-details"), {
      type: "checkbox", name: "detail", value: key, checked: settings[key], text,
    });
    const button = document.createElement("button");
    button.type = "button";
    button.id = `quick-${key}`;
    button.dataset.detail = key;
    button.title = text;
    button.textContent = short;
    $("quick-details").append(button);
  }
  renderDetailControls();
}

function readChoices(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
}

function toggleSettings(open) {
  if (open) toggleCheatsheet(false);
  $("settings").hidden = !open;
  $("settings-toggle").setAttribute("aria-expanded", String(open));
  $("settings-toggle").textContent = open ? "Fermer les réglages" : "Réglages";
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

// A pen ring (right) or strike (wrong), drawn over one square.
function makePenMark(right) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "cheat-mark");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", penPath(right, 100, 100));
  svg.append(path);
  return svg;
}

function makeHeader(text, scope) {
  const th = makeElement("th", "", text);
  th.scope = scope;
  return th;
}

// One column per dictionary ending, one row per base this tense's forms use.
function buildGodanTable(tense) {
  const table = makeElement("table", "cheat-shift");
  table.lang = "ja";
  const head = makeElement("tr");
  const firstHead = makeHeader("Finit en", "col");
  firstHead.lang = "fr";
  head.append(firstHead);
  for (const end of Object.keys(GODAN_ROWS.a)) {
    const th = makeHeader("", "col");
    th.append(makeElement("span", "cell", end));
    head.append(th);
  }
  const thead = makeElement("thead");
  thead.append(head);

  const tbody = makeElement("tbody");
  for (const [base, row] of Object.entries(GODAN_ROWS)) {
    const forms = Object.values(FORMS).filter((form) => form.base === base && form.tense === tense);
    if (!forms.length) continue;
    const tr = makeElement("tr");
    const label = makeHeader("", "row");
    label.append(...forms.map((form) => makeElement("span", "", form.ending)));
    tr.append(label);
    for (const [end, sound] of Object.entries(row)) {
      const square = makeElement("span", "cell cheat-ending", sound);
      // The one sound that breaks the pattern: う becomes わ, not あ.
      if (end === "う" && base === "a") square.append(makePenMark(true));
      const td = makeElement("td");
      td.append(square);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  return table;
}

function buildGodanExample(verb, tense) {
  const line = makeElement("p", "cheat-example");
  line.lang = "ja";
  line.append(makeElement("span", "", `${verb.kanji} →`));
  for (const formId of formIdsOf(tense)) {
    const { stem, ending } = splitEnding(verb.kanji, conjugate(verb, formId).kanji);
    const form = makeElement("span", "", stem);
    form.append(makeElement("span", "cheat-ending", ending));
    line.append(form);
  }
  return line;
}

function buildIchidanFormula(verb, tense) {
  const suffixes = formIdsOf(tense).map((id) => FORMS[id].suffix);
  const line = makeElement("div", "cheat-formula");
  line.lang = "ja";
  line.setAttribute("role", "img");
  line.setAttribute("aria-label", `${verb.kanji}: る → ${suffixes.join(", ")}`);
  const word = makeElement("div", "cheat-word");
  const chars = Array.from(verb.kanji);
  chars.forEach((char, i) => {
    const square = makeElement("span", "cell", char);
    if (i === chars.length - 1) square.append(makePenMark(false));
    word.append(square);
  });
  const add = makeElement("div", "cheat-add");
  add.append(...suffixes.map((suffix) => makeElement("span", "cheat-ending", suffix)));
  line.append(word, makeElement("span", "", "+"), add);
  return line;
}

function buildIrregularTable(verbs, formIds) {
  const table = makeElement("table", "cheat-table");
  table.lang = "ja";
  const head = makeElement("tr");
  head.append(makeHeader("", "col"));
  for (const formId of formIds) head.append(makeHeader(FORMS[formId].ending, "col"));
  const thead = makeElement("thead");
  thead.append(head);

  const tbody = makeElement("tbody");
  for (const verb of verbs) {
    const tr = makeElement("tr");
    tr.append(makeHeader(verb.kanji || verb.reading, "row"));
    for (const formId of formIds) {
      if (!hasForm(verb, formId)) {
        tr.append(makeElement("td", "stem-mark", "—"));
        continue;
      }
      const { stem, ending } = splitEnding(verb.reading, conjugate(verb, formId).kana);
      const td = verb.endingsOnly ? makeElement("td") : makeElement("td", "", stem);
      if (verb.endingsOnly) td.append(makeElement("span", "stem-mark", "〜"));
      td.append(makeElement("span", "cheat-ending", ending));
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  return table;
}

// One row per form the adjective has, labelled by the form's full name.
function buildAdjectiveTable(adjective) {
  const table = makeElement("table", "cheat-table cheat-adjective");
  table.lang = "ja";
  const tbody = makeElement("tbody");
  for (const [formId, form] of Object.entries(FORMS)) {
    if (!hasForm(adjective, formId)) continue;
    const { stem, ending } = splitEnding(adjective.kanji, conjugate(adjective, formId).kanji);
    const label = makeHeader(form.label, "row");
    label.lang = "fr";
    const td = makeElement("td", "", stem);
    td.append(makeElement("span", "cheat-ending", ending));
    const tr = makeElement("tr");
    tr.append(label, td);
    tbody.append(tr);
  }
  table.append(tbody);
  return table;
}

function buildCheatsheet() {
  const { godan, ichidan, irregular, iAdjective, naAdjective } = CHEATSHEET;
  const note = (text) => makeElement("p", "cheat-note", text);
  // Four past columns would wrap on a phone, so neutral and polite get a table each.
  const pastForms = formIdsOf("past");
  const pastNeutral = pastForms.filter((id) => id.startsWith("plain"));
  const pastPolite = pastForms.filter((id) => !id.startsWith("plain"));
  // The id is what a missed card links to: see cheatSectionId.
  const group = (id, title, ...content) => {
    const section = makeElement("section", "cheat-group");
    section.id = id;
    const heading = makeElement("h4", "", title);
    heading.tabIndex = -1;
    section.append(heading, ...content);
    return section;
  };
  const section = (title, ...groups) => {
    const element = makeElement("section", "cheat-tense");
    element.append(makeElement("h3", "", title), ...groups);
    return element;
  };
  const shiftNote = "う devient わ, pas あ.";
  const irregularTitle = `${GROUPS.irregular} et ${GROUPS["suru-noun"]}`;
  $("cheatsheet-groups").replaceChildren(
    section(
      TENSES.present,
      group("cheat-present-godan", GROUPS.godan, buildGodanTable("present"), buildGodanExample(godan, "present"), note(shiftNote)),
      group(
        "cheat-present-ichidan",
        GROUPS.ichidan,
        buildIchidanFormula(ichidan, "present"),
        note("帰る, 入る et 要る ressemblent à des ichidan, mais sont des godan."),
      ),
      group("cheat-present-irregular", irregularTitle, buildIrregularTable(irregular, formIdsOf("present"))),
    ),
    section(
      TENSES.past,
      group(
        "cheat-past-godan",
        GROUPS.godan,
        buildGodanTable("past"),
        buildGodanExample(godan, "past"),
        note(shiftNote),
        note("Après ぐ, ぬ, ぶ et む, た devient だ. Exception : 行く donne 行った."),
      ),
      group("cheat-past-ichidan", GROUPS.ichidan, buildIchidanFormula(ichidan, "past")),
      group(
        "cheat-past-irregular",
        irregularTitle,
        buildIrregularTable(irregular, pastNeutral),
        buildIrregularTable(irregular, pastPolite),
      ),
    ),
    section(
      TENSES.te,
      group(
        "cheat-te-godan",
        GROUPS.godan,
        buildGodanTable("te"),
        buildGodanExample(godan, "te"),
        note("Mêmes changements qu'au passé : après ぐ, ぬ, ぶ et む, て devient で. Exception : 行く donne 行って."),
      ),
      group("cheat-te-ichidan", GROUPS.ichidan, buildIchidanFormula(ichidan, "te")),
      group(
        "cheat-te-irregular",
        irregularTitle,
        buildIrregularTable(irregular, formIdsOf("te")),
        note("ある et いる ne s'emploient pas à la forme 〜ている."),
      ),
    ),
    section(
      "Adjectifs",
      group(
        "cheat-i-adj",
        GROUPS["i-adj"],
        buildAdjectiveTable(iAdjective),
        note("いい devient よ, sauf dans いいです : よくない, よかった, よくて."),
        note("Au poli négatif, 〜くありません et 〜くありませんでした sont aussi justes."),
        note("Erreur classique : 高いでした. Le passé se met sur l'adjectif : 高かったです."),
      ),
      group(
        "cheat-na-adj",
        GROUPS["na-adj"],
        buildAdjectiveTable(naAdjective),
        note("では peut remplacer じゃ, et 〜じゃないです ou 〜じゃなかったです existent aussi au poli."),
      ),
    ),
  );
}

// The card stays as it was underneath, typed answer included.
function toggleCheatsheet(open) {
  if (open) toggleSettings(false);
  $("cheatsheet").hidden = !open;
  $("cards").hidden = open;
  $("cheatsheet-toggle").setAttribute("aria-expanded", String(open));
  $("cheatsheet-toggle").textContent = open ? "Fermer l'aide-mémoire" : "Aide-mémoire";
  if (!open) $("cheatsheet-back").hidden = true;
}

// Opened from a missed card, the cheatsheet starts at the part about that card,
// with a button pinned at the bottom to go back, since the header is scrolled away.
function showCheatsheet(open, sectionId) {
  toggleCheatsheet(open);
  const section = open && sectionId ? $(sectionId) : null;
  $("cheatsheet-back").hidden = !section;
  if (section) {
    section.scrollIntoView({ block: "start" });
    section.querySelector("h4").focus({ preventScroll: true });
    return;
  }
  window.scrollTo({ top: 0 });
  if (open) $("cheatsheet-title").focus({ preventScroll: true });
  else if (!$("drill").hidden) $("answer").focus({ preventScroll: true });
}

function wireCheatsheet() {
  $("cheatsheet-toggle").addEventListener("click", () => showCheatsheet($("cheatsheet").hidden));
  $("cheatsheet-back").addEventListener("click", () => showCheatsheet(false));
}

function wireEvents() {
  const input = $("answer");
  // WanaKana rewrites the value in its own listener, so measure just after it.
  input.addEventListener("input", () => setTimeout(fitAnswer));

  $("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (round.answered) return showNext();
    if (!normalize(toKana(input.value))) {
      return setHint("Écris d'abord une réponse, ou choisis Voir la réponse.");
    }
    grade({ gaveUp: false });
  });
  $("reveal").addEventListener("click", () => {
    grade({ gaveUp: true });
    if (!round.current.choices) input.focus({ preventScroll: true });
  });
  $("choices").addEventListener("click", (event) => {
    const choice = event.target.closest(".choice")?.value;
    if (choice && !round.answered) grade({ gaveUp: false, choice });
  });

  $("settings-toggle").addEventListener("click", () => toggleSettings($("settings").hidden));
  $("set-details").addEventListener("change", (event) => {
    setDetail(event.target.value, event.target.checked);
  });
  $("vibrate-on").checked = settings.vibrate;
  $("vibrate-on").addEventListener("change", (event) => {
    settings.vibrate = event.target.checked;
    saveSettings();
  });
  $("vibrate-test").addEventListener("click", () => {
    $("vibrate-result").textContent = buzz()
      ? "Ton téléphone devrait vibrer. S'il ne bouge pas, c'est l'appli qui affiche la page ou les réglages de vibration du téléphone qui la bloquent. Essaie d'ouvrir le lien dans Chrome."
      : "Ce navigateur refuse de vibrer sur cette page.";
  });
  for (const key of ["palette", "font"]) {
    $(`set-${key}`).addEventListener("change", (event) => {
      settings[key] = event.target.value;
      saveSettings();
      applyLook();
    });
  }
  // Clicking a button leaves the cursor in the answer, so typing carries on.
  $("quick-details").addEventListener("mousedown", (event) => event.preventDefault());
  $("quick-details").addEventListener("click", (event) => {
    const key = event.target.closest("button")?.dataset.detail;
    if (key) setDetail(key, !settings[key]);
  });
  $("settings").addEventListener("submit", (event) => {
    event.preventDefault();
    const kinds = readChoices("kind");
    const forms = readChoices("form");
    const groups = readChoices("group");
    // Naming the form needs two forms to choose from.
    const fits = (v) => {
      const count = forms.filter((id) => hasForm(v, id)).length;
      return count && kinds.some((kind) => kind !== "name-form" || count > 1);
    };
    const hasVerbs = verbs.some((v) => groups.includes(groupOf(v)) && fits(v));
    $("settings-error").hidden = hasVerbs;
    if (!hasVerbs) return;
    settings = { ...settings, kinds, forms, groups, length: Number(readChoices("length")[0]) };
    saveSettings();
    toggleSettings(false);
    startRound();
  });
  $("again").addEventListener("click", () => startRound());
  $("review").addEventListener("click", reviewMistakes);
  $("feedback").addEventListener("click", (event) => {
    const section = event.target.closest(".cheat-link")?.dataset.section;
    if (section) showCheatsheet(true, section);
  });
}

async function main() {
  // Before the verb list loads: the cheatsheet doesn't need it.
  buildCheatsheet();
  wireCheatsheet();
  try {
    const response = await fetch("verbs.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    verbs = await response.json();
  } catch {
    $("status").textContent = "La liste de mots n'a pas pu se charger. Lance python scripts/build_verbs.py, puis recharge la page.";
    return;
  }
  $("status").hidden = true;
  if (wanakana) wanakana.bind($("answer"), { IMEMode: "toHiragana" });
  buildHitRays();
  buildSettings();
  wireEvents();
  if (!resumeRound()) startRound();
}

main();
