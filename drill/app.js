import { CHEATSHEET, conjugate, FORMS, GODAN_ROWS, GROUPS, groupOf, isCorrect, normalize, splitEnding } from "./conjugate.js";

const STORAGE_KEY = "doshi-drill-settings";
const DEFAULTS = {
  forms: Object.keys(FORMS),
  groups: Object.keys(GROUPS),
  length: 20,
  showReading: true,
  showMeaning: true,
  showGroup: true,
};
const CARD_DETAILS = {
  showReading: { text: "Kana reading", short: "Kana" },
  showMeaning: { text: "Translation", short: "Translation" },
  showGroup: { text: "Verb group", short: "Group" },
};
const LENGTHS = [10, 20, 40];
const CELLS_PER_ROW = 10;

const $ = (id) => document.getElementById(id);
const wanakana = window.wanakana; // optional: kana and kanji still work without it

let verbs = [];
let settings = loadSettings();
let round = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { ...DEFAULTS };
    const merged = { ...DEFAULTS, ...saved };
    merged.forms = merged.forms.filter((id) => FORMS[id]);
    merged.groups = merged.groups.filter((id) => GROUPS[id]);
    return merged.forms.length && merged.groups.length ? merged : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings then last for this visit only.
  }
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
    prompt: { label: form.label, ending: form.ending },
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
    },
    rule: result.rule,
    check: (given) => isCorrect(verb, formId, given),
  };
}

// Each verb appears once before any verb repeats, and a repeated verb gets a
// different form, so a round never asks the same card twice.
function buildCards() {
  const pool = shuffle(verbs.filter((v) => settings.groups.includes(groupOf(v))));
  const forms = shuffle(settings.forms);
  const total = Math.min(settings.length, pool.length * forms.length);
  const cards = [];
  for (let i = 0; i < total; i++) {
    const pass = Math.floor(i / pool.length);
    const exercise = makeExercise(pool[i % pool.length], forms[(i + pass) % forms.length]);
    cards.push({ ...exercise, slot: i, retry: false });
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
  $("form-ending").textContent = card.prompt.ending;
  $("retry-tag").hidden = !card.retry;

  const input = $("answer");
  input.readOnly = false;
  input.value = "";
  $("mark").toggleAttribute("hidden", true); // SVG elements have no .hidden property
  $("feedback").replaceChildren();
  $("primary").textContent = "Check";
  $("reveal").hidden = false;
  setHint();
  renderCells();
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
  hint.hidden = false;
  hint.textContent = message
    || (wanakana ? "Type in romaji, kana or kanji." : "Type in kana or kanji.");
  hint.classList.toggle("pen", Boolean(message));
}

function renderCells() {
  const input = $("answer");
  const chars = Array.from(input.value);
  const rows = Math.ceil((chars.length + 1) / CELLS_PER_ROW);
  const caret = round.answered || document.activeElement !== input
    ? -1
    : Array.from(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
  const cells = [];
  for (let i = 0; i < rows * CELLS_PER_ROW; i++) {
    const cell = document.createElement("span");
    cell.className = i === caret ? "cell caret" : "cell";
    cell.textContent = chars[i] ?? "";
    cells.push(cell);
  }
  $("cells").replaceChildren(...cells);
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
  const number = Math.min(firstPassDone + (round.answered ? 0 : 1), round.total);
  let text = `Card ${number} of ${round.total}`;
  if (round.current.retry && !round.answered) text = `${firstPassDone} of ${round.total} done`;
  if (waiting) text += `, ${waiting} to retry`;
  $("progress").textContent = text;
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

function drawMark(right) {
  const length = Array.from($("answer").value).length;
  if (!length) return;
  const sheet = document.querySelector(".sheet").getBoundingClientRect();
  const portion = Math.min(length, CELLS_PER_ROW) / CELLS_PER_ROW;
  const width = sheet.width * portion;
  const mark = $("mark");
  mark.style.width = `${portion * 100}%`;
  mark.setAttribute("viewBox", `0 0 ${width} ${sheet.height}`);
  mark.setAttribute("preserveAspectRatio", "none");
  const path = $("mark-path");
  path.setAttribute("d", penPath(right, width, sheet.height));
  mark.toggleAttribute("hidden", false);
  // Restart the stroke animation for this card.
  path.style.animation = "none";
  void path.getBoundingClientRect();
  path.style.animation = "";
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
  renderCells();
  if (!gaveUp) drawMark(right);
  renderFeedback(card, right, gaveUp);
  $("primary").textContent = round.queue.length ? "Next" : "See results";
  $("reveal").hidden = true;
  $("hint").hidden = true;
  renderProgress();
}

function renderFeedback(card, right, gaveUp) {
  const verdict = document.createElement("p");
  verdict.className = "verdict";
  verdict.textContent = right ? "Correct" : gaveUp ? "The answer is" : "Not quite. The answer is";

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
  rule.textContent = right ? card.rule : `${card.rule}. This card comes back later in the round.`;

  $("feedback").replaceChildren(verdict, correction, rule);
}

function showSummary() {
  const score = round.results.filter((result) => result === "right").length;
  $("drill").hidden = true;
  $("summary").hidden = false;
  $("summary-title").textContent = `${score} of ${round.total} right on the first try`;
  renderStrip($("summary-strip"), false);

  const count = round.mistakes.length;
  $("mistakes-title").textContent = count
    ? `${count === 1 ? "1 card" : `${count} cards`} to review`
    : "No mistakes this round.";

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
    wrote.textContent = given ? `You wrote ${given}` : "You chose Show answer";
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
}

function buildSettings() {
  for (const [id, form] of Object.entries(FORMS)) {
    buildChoice($("set-forms"), {
      type: "checkbox", name: "form", value: id,
      checked: settings.forms.includes(id), text: `${form.label} ${form.ending}`,
    });
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
  $("settings-toggle").textContent = open ? "Close settings" : "Settings";
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

// One column per dictionary ending, one row per base the forms use.
function buildGodanTable() {
  const table = makeElement("table", "cheat-shift");
  table.lang = "ja";
  const head = makeElement("tr");
  const firstHead = makeHeader("Ends in", "col");
  firstHead.lang = "en";
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
    const forms = Object.values(FORMS).filter((form) => form.base === base);
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

function buildGodanExample(verb) {
  const line = makeElement("p", "cheat-example");
  line.lang = "ja";
  line.append(makeElement("span", "", `${verb.kanji} →`));
  for (const formId of Object.keys(FORMS)) {
    const { stem, ending } = splitEnding(verb.kanji, conjugate(verb, formId).kanji);
    const form = makeElement("span", "", stem);
    form.append(makeElement("span", "cheat-ending", ending));
    line.append(form);
  }
  return line;
}

function buildIchidanFormula(verb) {
  const suffixes = Object.values(FORMS).map((form) => form.suffix);
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

function buildIrregularTable(verbs) {
  const table = makeElement("table", "cheat-table");
  table.lang = "ja";
  const head = makeElement("tr");
  head.append(makeHeader("", "col"));
  for (const form of Object.values(FORMS)) head.append(makeHeader(form.ending, "col"));
  const thead = makeElement("thead");
  thead.append(head);

  const tbody = makeElement("tbody");
  for (const verb of verbs) {
    const tr = makeElement("tr");
    tr.append(makeHeader(verb.kanji || verb.reading, "row"));
    for (const formId of Object.keys(FORMS)) {
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

function buildCheatsheet() {
  const { godan, ichidan, irregular } = CHEATSHEET;
  const note = (text) => makeElement("p", "cheat-note", text);
  const group = (title, ...content) => {
    const section = makeElement("section", "cheat-group");
    section.append(makeElement("h3", "", title), ...content);
    return section;
  };
  $("cheatsheet-groups").replaceChildren(
    group(GROUPS.godan, buildGodanTable(), buildGodanExample(godan), note("う becomes わ, not あ.")),
    group(GROUPS.ichidan, buildIchidanFormula(ichidan), note("帰る, 入る and 要る look ichidan but are godan.")),
    group(`${GROUPS.irregular} and ${GROUPS["suru-noun"]}`, buildIrregularTable(irregular)),
  );
}

// The card stays as it was underneath, typed answer included.
function toggleCheatsheet(open) {
  if (open) toggleSettings(false);
  $("cheatsheet").hidden = !open;
  $("cards").hidden = open;
  $("cheatsheet-toggle").setAttribute("aria-expanded", String(open));
  $("cheatsheet-toggle").textContent = open ? "Close cheatsheet" : "Cheatsheet";
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
  const redraw = () => setTimeout(renderCells);
  // WanaKana rewrites the value in its own listener, so redraw just after it.
  for (const type of ["input", "keyup", "click", "focus", "blur", "select", "compositionupdate", "compositionend"]) {
    input.addEventListener(type, redraw);
  }

  $("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (round.answered) return showNext();
    if (!normalize(toKana(input.value))) {
      return setHint("Type an answer first, or choose Show answer.");
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
    const hasVerbs = verbs.some((v) => groups.includes(groupOf(v)));
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
    $("status").textContent = "The verb list did not load. Run python scripts/build_verbs.py, then reload this page.";
    return;
  }
  $("status").hidden = true;
  if (wanakana) wanakana.bind($("answer"), { IMEMode: "toHiragana" });
  buildSettings();
  wireEvents();
  startRound();
}

main();
