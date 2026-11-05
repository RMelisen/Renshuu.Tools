import { CHEATSHEET, conjugate, FORMS, GODAN_ROWS, GROUPS, groupOf, hasForm, isCorrect, normalize, splitEnding } from "./conjugate.js";
import { translate } from "./french.js";

// index.html has no <html> tag of its own: publishing wraps it in a skeleton.
document.documentElement.lang = "fr";

const STORAGE_KEY = "doshi-drill-settings";
// The forms that existed before saved settings recorded which forms they had seen.
const FIRST_FORMS = ["plain-negative", "polite-affirmative", "polite-negative"];
const FIRST_GROUPS = ["godan", "ichidan", "irregular", "suru-noun"];
const DEFAULTS = {
  forms: Object.keys(FORMS),
  groups: Object.keys(GROUPS),
  length: 20,
  showReading: true,
  showMeaning: true,
  showGroup: true,
  showEnding: true,
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
    if (!PALETTES[merged.palette]) merged.palette = DEFAULTS.palette;
    if (!FONTS[merged.font]) merged.font = DEFAULTS.font;
    return merged.forms.length && merged.groups.length ? merged : { ...DEFAULTS };
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

// What one card asks. A reverse mode would be another function returning this
// same shape, with no change to the card flow below.
function makeExercise(verb, formId) {
  const form = FORMS[formId];
  const result = conjugate(verb, formId);
  const kanaLead = verb.kanaFirst || !verb.kanji;
  const answerInKanji = !kanaLead && result.kanji;
  return {
    formId,
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
  };
}

// Each verb appears once before any verb repeats, and a repeated verb gets a
// different form, so a round never asks the same card twice. A verb skips forms
// it doesn't have: ある has no ている.
function buildCards() {
  const forms = shuffle(settings.forms);
  const formsOf = (verb) => forms.filter((id) => hasForm(verb, id));
  const pool = shuffle(verbs.filter((v) => settings.groups.includes(groupOf(v)) && formsOf(v).length));
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
    cards.push({ ...makeExercise(verb, formId), slot: cards.length, retry: false });
  }
  return cards;
}

function startRound() {
  const queue = buildCards();
  round = { queue, total: queue.length, results: [], mistakes: [], current: null, answered: false };
  $("summary").hidden = true;
  $("drill").hidden = false;
  showNext();
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
  input.readOnly = false;
  input.value = "";
  input.classList.remove("struck");
  fitAnswer();
  delete $("drill").dataset.result;
  $("feedback").replaceChildren();
  $("primary").textContent = "Vérifier";
  $("reveal").hidden = false;
  setHint();
  renderProgress();
  input.focus({ preventScroll: true });
}

// A detail hidden in Settings comes back once the card is answered, so the guess
// can be checked. Concealing keeps its space, so the answer squares never jump.
function renderCue() {
  if (!round?.current) return;
  const { sub, subIsReading, defs, group } = round.current.cue;
  const show = (id, text, wanted) => {
    $(id).textContent = text;
    $(id).hidden = !text;
    $(id).classList.toggle("concealed", !wanted && !round.answered);
  };
  show("verb-sub", sub, !subIsReading || settings.showReading);
  show("verb-defs", defs, settings.showMeaning);
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
  panel.style.setProperty("--word-rise", `${middle($("answer")) - middle($("primary"))}px`);
  panel.dataset.result = result;
}

// A trailing "n" stays Latin while typing (it might become な), so convert the
// whole answer once more on submit: "shimase" + "n" becomes しません.
function toKana(raw) {
  return wanakana ? wanakana.toHiragana(raw) : raw;
}

function grade({ gaveUp }) {
  const card = round.current;
  const input = $("answer");
  const given = gaveUp ? "" : toKana(input.value);
  const right = !gaveUp && card.check(given);

  round.answered = true;
  input.value = given;
  input.readOnly = true;

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
  renderFeedback(card, right, gaveUp);
  $("primary").textContent = round.queue.length ? "Suivant" : "Voir les résultats";
  $("reveal").hidden = true;
  $("hint").hidden = true;
  renderProgress();
  if (!gaveUp) playHit(right ? "right" : "missed");
}

function renderFeedback(card, right, gaveUp) {
  const verdict = document.createElement("p");
  verdict.className = "verdict";
  verdict.textContent = right ? "Bonne réponse" : gaveUp ? "La réponse est" : "Pas tout à fait. La réponse est";

  const correction = document.createElement("p");
  correction.className = "correction";
  correction.lang = "ja";
  correction.textContent = card.answer.main;
  if (card.answer.sub) {
    const small = document.createElement("small");
    small.textContent = card.answer.sub;
    correction.append(small);
  }

  const rule = document.createElement("p");
  rule.className = "rule";
  rule.textContent = right ? card.rule : `${card.rule}. Cette carte reviendra plus tard dans la manche.`;

  $("feedback").replaceChildren(verdict, correction);
  if (card.answer.french) {
    const french = document.createElement("p");
    french.className = "french";
    french.textContent = card.answer.french;
    $("feedback").append(french);
  }
  $("feedback").append(rule);
}

function showSummary() {
  const score = round.results.filter((result) => result === "right").length;
  $("drill").hidden = true;
  $("summary").hidden = false;
  $("summary-title").textContent = `${score} sur ${round.total} justes du premier coup`;
  renderStrip($("summary-strip"), false);

  const count = round.mistakes.length;
  $("mistakes-title").textContent = count
    ? `${count === 1 ? "1 carte" : `${count} cartes`} à revoir`
    : "Aucune erreur dans cette manche.";

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
    wrote.textContent = given ? `Tu as écrit ${given}` : "Tu as choisi Voir la réponse";
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
  const group = (title, ...content) => {
    const section = makeElement("section", "cheat-group");
    section.append(makeElement("h4", "", title), ...content);
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
      group(GROUPS.godan, buildGodanTable("present"), buildGodanExample(godan, "present"), note(shiftNote)),
      group(
        GROUPS.ichidan,
        buildIchidanFormula(ichidan, "present"),
        note("帰る, 入る et 要る ressemblent à des ichidan, mais sont des godan."),
      ),
      group(irregularTitle, buildIrregularTable(irregular, formIdsOf("present"))),
    ),
    section(
      TENSES.past,
      group(
        GROUPS.godan,
        buildGodanTable("past"),
        buildGodanExample(godan, "past"),
        note(shiftNote),
        note("Après ぐ, ぬ, ぶ et む, た devient だ. Exception : 行く donne 行った."),
      ),
      group(GROUPS.ichidan, buildIchidanFormula(ichidan, "past")),
      group(
        irregularTitle,
        buildIrregularTable(irregular, pastNeutral),
        buildIrregularTable(irregular, pastPolite),
      ),
    ),
    section(
      TENSES.te,
      group(
        GROUPS.godan,
        buildGodanTable("te"),
        buildGodanExample(godan, "te"),
        note("Mêmes changements qu'au passé : après ぐ, ぬ, ぶ et む, て devient で. Exception : 行く donne 行って."),
      ),
      group(GROUPS.ichidan, buildIchidanFormula(ichidan, "te")),
      group(
        irregularTitle,
        buildIrregularTable(irregular, formIdsOf("te")),
        note("ある et いる ne s'emploient pas à la forme 〜ている."),
      ),
    ),
    section(
      "Adjectifs",
      group(
        GROUPS["i-adj"],
        buildAdjectiveTable(iAdjective),
        note("いい devient よ, sauf dans いいです : よくない, よかった, よくて."),
        note("Au poli négatif, 〜くありません et 〜くありませんでした sont aussi justes."),
        note("Erreur classique : 高いでした. Le passé se met sur l'adjectif : 高かったです."),
      ),
      group(
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
}

function wireCheatsheet() {
  $("cheatsheet-toggle").addEventListener("click", () => {
    const open = $("cheatsheet").hidden;
    toggleCheatsheet(open);
    window.scrollTo({ top: 0 });
    if (open) $("cheatsheet-title").focus({ preventScroll: true });
    else if (!$("drill").hidden) $("answer").focus({ preventScroll: true });
  });
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
    input.focus({ preventScroll: true });
  });

  $("settings-toggle").addEventListener("click", () => toggleSettings($("settings").hidden));
  $("set-details").addEventListener("change", (event) => {
    setDetail(event.target.value, event.target.checked);
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
    const forms = readChoices("form");
    const groups = readChoices("group");
    const hasVerbs = verbs.some((v) => groups.includes(groupOf(v)) && forms.some((id) => hasForm(v, id)));
    $("settings-error").hidden = Boolean(forms.length && hasVerbs);
    if (!forms.length || !hasVerbs) return;
    settings = { ...settings, forms, groups, length: Number(readChoices("length")[0]) };
    saveSettings();
    toggleSettings(false);
    startRound();
  });
  $("again").addEventListener("click", startRound);
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
  startRound();
}

main();
