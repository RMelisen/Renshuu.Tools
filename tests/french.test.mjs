import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { FORMS, hasForm } from "../drill/conjugate.js";
import { conjugateFrench, firstMeaning, translate } from "../drill/french.js";

// meaning, affirmative, negative
const TABLE = [
  // -er verbs, including the stem changes of the first person
  ["manger", "je mange", "je ne mange pas"],
  ["acheter", "j'achète", "je n'achète pas"],
  ["lever", "je lève", "je ne lève pas"],
  ["appeler", "j'appelle", "je n'appelle pas"],
  ["jeter", "je jette", "je ne jette pas"],
  ["espérer", "j'espère", "je n'espère pas"],
  ["envoyer", "j'envoie", "je n'envoie pas"],
  ["essuyer", "j'essuie", "je n'essuie pas"],
  ["étudier", "j'étudie", "je n'étudie pas"],
  ["habiter", "j'habite", "je n'habite pas"],
  ["entrer", "j'entre", "je n'entre pas"],
  // -ir verbs
  ["choisir", "je choisis", "je ne choisis pas"],
  ["venir", "je viens", "je ne viens pas"],
  ["devenir", "je deviens", "je ne deviens pas"],
  ["partir", "je pars", "je ne pars pas"],
  ["dormir", "je dors", "je ne dors pas"],
  ["ouvrir", "j'ouvre", "je n'ouvre pas"],
  ["mourir", "je meurs", "je ne meurs pas"],
  ["courir", "je cours", "je ne cours pas"],
  // -re verbs
  ["attendre", "j'attends", "je n'attends pas"],
  ["comprendre", "je comprends", "je ne comprends pas"],
  ["craindre", "je crains", "je ne crains pas"],
  ["mettre", "je mets", "je ne mets pas"],
  ["connaître", "je connais", "je ne connais pas"],
  ["écrire", "j'écris", "je n'écris pas"],
  ["lire", "je lis", "je ne lis pas"],
  ["dire", "je dis", "je ne dis pas"],
  ["rire", "je ris", "je ne ris pas"],
  ["boire", "je bois", "je ne bois pas"],
  ["croire", "je crois", "je ne crois pas"],
  ["faire", "je fais", "je ne fais pas"],
  ["vivre", "je vis", "je ne vis pas"],
  // -oir verbs and the most irregular ones
  ["voir", "je vois", "je ne vois pas"],
  ["savoir", "je sais", "je ne sais pas"],
  ["pouvoir", "je peux", "je ne peux pas"],
  ["vouloir", "je veux", "je ne veux pas"],
  ["devoir", "je dois", "je ne dois pas"],
  ["recevoir", "je reçois", "je ne reçois pas"],
  ["aller", "je vais", "je ne vais pas"],
  ["être", "je suis", "je ne suis pas"],
  ["avoir", "j'ai", "je n'ai pas"],
  // pronominal verbs
  ["se lever", "je me lève", "je ne me lève pas"],
  ["se marier", "je me marie", "je ne me marie pas"],
  ["s'allonger", "je m'allonge", "je ne m'allonge pas"],
  ["s'asseoir", "je m'assois", "je ne m'assois pas"],
  ["s’entraîner", "je m'entraîne", "je ne m'entraîne pas"],
  // expressions: "pas" follows the verb, and the rest stays
  ["être absent", "je suis absent", "je ne suis pas absent"],
  ["avoir faim", "j'ai faim", "je n'ai pas faim"],
  ["se mettre en colère", "je me mets en colère", "je ne me mets pas en colère"],
  ["prendre le repas", "je prends le repas", "je ne prends pas le repas"],
  // possessives follow the subject
  ["prendre son temps", "je prends mon temps", "je ne prends pas mon temps"],
  ["porter sur soi", "je porte sur moi", "je ne porte pas sur moi"],
  // un, une and des become de after a negated verb, but not after être
  ["poser une question", "je pose une question", "je ne pose pas de question"],
  ["donner un cours", "je donne un cours", "je ne donne pas de cours"],
  ["écrire une lettre", "j'écris une lettre", "je n'écris pas de lettre"],
  ["acheter des oranges", "j'achète des oranges", "je n'achète pas d'oranges"],
  ["être un élève", "je suis un élève", "je ne suis pas un élève"],
  // a preposition left with nothing after it is dropped
  ["jouer à", "je joue", "je ne joue pas"],
  ["arriver à", "j'arrive", "je n'arrive pas"],
  ["monter dans", "je monte", "je ne monte pas"],
  // verbs that don't take "je"
  ["pleuvoir", "il pleut", "il ne pleut pas"],
  ["neiger", "il neige", "il ne neige pas"],
  ["signifier", "cela signifie", "cela ne signifie pas"],
];

test("meanings conjugate in the first person, affirmative and negative", () => {
  for (const [meaning, affirmative, negative] of TABLE) {
    assert.equal(conjugateFrench(meaning, { negative: false }), affirmative, meaning);
    assert.equal(conjugateFrench(meaning, { negative: true }), negative, meaning);
  }
});

// meaning, past, past negative
const PAST_TABLE = [
  // avoir, with the participle of each verb family
  ["manger", "j'ai mangé", "je n'ai pas mangé"],
  ["acheter", "j'ai acheté", "je n'ai pas acheté"],
  ["étudier", "j'ai étudié", "je n'ai pas étudié"],
  ["choisir", "j'ai choisi", "je n'ai pas choisi"],
  ["dormir", "j'ai dormi", "je n'ai pas dormi"],
  ["attendre", "j'ai attendu", "je n'ai pas attendu"],
  ["vendre", "j'ai vendu", "je n'ai pas vendu"],
  ["boire", "j'ai bu", "je n'ai pas bu"],
  ["croire", "j'ai cru", "je n'ai pas cru"],
  ["écrire", "j'ai écrit", "je n'ai pas écrit"],
  ["dire", "j'ai dit", "je n'ai pas dit"],
  ["lire", "j'ai lu", "je n'ai pas lu"],
  ["rire", "j'ai ri", "je n'ai pas ri"],
  ["faire", "j'ai fait", "je n'ai pas fait"],
  ["voir", "j'ai vu", "je n'ai pas vu"],
  ["prendre", "j'ai pris", "je n'ai pas pris"],
  ["comprendre", "j'ai compris", "je n'ai pas compris"],
  ["mettre", "j'ai mis", "je n'ai pas mis"],
  ["connaître", "j'ai connu", "je n'ai pas connu"],
  ["ouvrir", "j'ai ouvert", "je n'ai pas ouvert"],
  ["courir", "j'ai couru", "je n'ai pas couru"],
  ["savoir", "j'ai su", "je n'ai pas su"],
  ["vivre", "j'ai vécu", "je n'ai pas vécu"],
  ["recevoir", "j'ai reçu", "je n'ai pas reçu"],
  // être, for the verbs of movement and change of state
  ["aller", "je suis allé", "je ne suis pas allé"],
  ["venir", "je suis venu", "je ne suis pas venu"],
  ["devenir", "je suis devenu", "je ne suis pas devenu"],
  ["partir", "je suis parti", "je ne suis pas parti"],
  ["sortir", "je suis sorti", "je ne suis pas sorti"],
  ["rentrer", "je suis rentré", "je ne suis pas rentré"],
  ["entrer", "je suis entré", "je ne suis pas entré"],
  ["arriver à", "je suis arrivé", "je ne suis pas arrivé"],
  ["monter dans", "je suis monté", "je ne suis pas monté"],
  ["mourir", "je suis mort", "je ne suis pas mort"],
  // pronominal verbs always take être
  ["se lever", "je me suis levé", "je ne me suis pas levé"],
  ["se marier", "je me suis marié", "je ne me suis pas marié"],
  ["s'asseoir", "je me suis assis", "je ne me suis pas assis"],
  ["s'entraîner", "je me suis entraîné", "je ne me suis pas entraîné"],
  ["se mettre en colère", "je me suis mis en colère", "je ne me suis pas mis en colère"],
  // states read better in the imperfect
  ["être", "j'étais", "je n'étais pas"],
  ["être absent", "j'étais absent", "je n'étais pas absent"],
  ["avoir faim", "j'avais faim", "je n'avais pas faim"],
  // expressions
  ["prendre son temps", "j'ai pris mon temps", "je n'ai pas pris mon temps"],
  ["poser une question", "j'ai posé une question", "je n'ai pas posé de question"],
  ["jouer à", "j'ai joué", "je n'ai pas joué"],
  // verbs that don't take "je"
  ["pleuvoir", "il a plu", "il n'a pas plu"],
  ["neiger", "il a neigé", "il n'a pas neigé"],
  ["signifier", "cela a signifié", "cela n'a pas signifié"],
];

test("past meanings conjugate in the passé composé", () => {
  for (const [meaning, affirmative, negative] of PAST_TABLE) {
    assert.equal(conjugateFrench(meaning, { tense: "past", negative: false }), affirmative, meaning);
    assert.equal(conjugateFrench(meaning, { tense: "past", negative: true }), negative, meaning);
  }
});

test("the て form reads as the start of a sentence", () => {
  const cases = [
    ["manger", "je mange et…"],
    ["écrire", "j'écris et…"],
    ["se lever", "je me lève et…"],
    ["poser une question", "je pose une question et…"],
    ["pleuvoir", "il pleut et…"],
  ];
  for (const [meaning, expected] of cases) {
    assert.equal(conjugateFrench(meaning, { tense: "te" }), expected, meaning);
  }
});

// meaning, ている translation
const TEIRU_TABLE = [
  // an action under way
  ["manger", "je suis en train de manger"],
  ["écrire", "je suis en train d'écrire"],
  ["se dépêcher", "je suis en train de me dépêcher"],
  ["s'entraîner", "je suis en train de m'entraîner"],
  ["poser une question", "je suis en train de poser une question"],
  ["prendre son temps", "je suis en train de prendre mon temps"],
  ["jouer à", "je suis en train de jouer"],
  // a state: French uses the plain present
  ["connaître", "je connais"],
  ["voir", "je vois"],
  ["entendre", "j'entends"],
  ["savoir", "je sais"],
  ["comprendre", "je comprends"],
  ["croire", "je crois"],
  ["penser", "je pense"],
  ["porter", "je porte"],
  ["porter sur soi", "je porte sur moi"],
  ["avoir faim", "j'ai faim"],
  ["être absent", "je suis absent"],
  ["pleuvoir", "il pleut"],
  ["signifier", "cela signifie"],
  // the result of a change: "je suis" and the participle
  ["se marier", "je suis marié"],
  ["s'asseoir", "je suis assis"],
  ["se lever", "je suis levé"],
  ["s'allonger", "je suis allongé"],
  ["mourir", "je suis mort"],
  ["aller", "je suis allé"],
  ["venir", "je suis venu"],
  ["partir", "je suis parti"],
  ["arriver à", "je suis arrivé"],
  ["devenir", "je suis devenu"],
  ["se mettre en colère", "je suis en colère"],
];

test("ている reads as an action under way, a state or a result", () => {
  for (const [meaning, expected] of TEIRU_TABLE) {
    assert.equal(conjugateFrench(meaning, { tense: "te", progressive: true }), expected, meaning);
  }
});

test("text that is not an infinitive gives no translation", () => {
  assert.equal(conjugateFrench("téléphone portable", { negative: false }), null);
  assert.equal(conjugateFrench("téléphone portable", { tense: "past" }), null);
  assert.equal(conjugateFrench("téléphone portable", { tense: "te" }), null);
  assert.equal(conjugateFrench("téléphone portable", { tense: "te", progressive: true }), null);
  assert.equal(conjugateFrench("", { negative: false }), null);
});

test("the first meaning is the first synonym, without its notes", () => {
  assert.equal(firstMeaning("boire, engloutir, avaler"), "boire");
  assert.equal(firstMeaning("prendre (un médicament), avaler"), "prendre");
  assert.equal(firstMeaning("porter (en japonais moderne, en dessous des épaules), enfiler"), "porter");
  assert.equal(firstMeaning("poser une question"), "poser une question");
  assert.equal(firstMeaning("tester ; évaluer"), "tester");
});

const verb = (defs, reading = "かく", cls = "godan-く") => ({ kanji: "", reading, class: cls, defs });

test("translate follows the form: polite and plain read the same", () => {
  const kaku = verb(["écrire, composer", "tracer"]);
  assert.equal(translate(kaku, "polite-affirmative"), "j'écris");
  assert.equal(translate(kaku, "polite-negative"), "je n'écris pas");
  assert.equal(translate(kaku, "plain-negative"), "je n'écris pas");
  assert.equal(translate(kaku, "plain-past"), "j'ai écrit");
  assert.equal(translate(kaku, "polite-past"), "j'ai écrit");
  assert.equal(translate(kaku, "plain-past-negative"), "je n'ai pas écrit");
  assert.equal(translate(kaku, "polite-past-negative"), "je n'ai pas écrit");
  assert.equal(translate(kaku, "te"), "j'écris et…");
  assert.equal(translate(kaku, "te-iru"), "je suis en train d'écrire");
});

test("ある translates as il y a, whatever its definition says", () => {
  const aru = verb(["être (pour les objets), exister"], "ある", "godan-る");
  assert.equal(translate(aru, "polite-affirmative"), "il y a");
  assert.equal(translate(aru, "polite-negative"), "il n'y a pas");
  assert.equal(translate(aru, "plain-past"), "il y avait");
  assert.equal(translate(aru, "polite-past-negative"), "il n'y avait pas");
  assert.equal(translate(aru, "te"), "il y a et…");
});

test("a noun + する verb with no verb meaning has no translation", () => {
  const noun = verb(["sans する : téléphone portable"], "けいたいする", "suru-noun");
  assert.equal(translate(noun, "polite-affirmative"), null);
});

const adjective = (defs, reading = "しずか", cls = "na-adj") => ({ kanji: "", reading, class: cls, defs });

test("adjectives read as c'est, in every form", () => {
  const calme = adjective(["calme, tranquille", "lent"]);
  assert.equal(translate(calme, "polite-affirmative"), "c'est calme");
  assert.equal(translate(calme, "polite-negative"), "ce n'est pas calme");
  assert.equal(translate(calme, "plain-negative"), "ce n'est pas calme");
  assert.equal(translate(calme, "plain-past"), "c'était calme");
  assert.equal(translate(calme, "polite-past-negative"), "ce n'était pas calme");
  assert.equal(translate(calme, "te"), "c'est calme et…");
});

test("adjectives whose meaning is a verb conjugate that verb", () => {
  const cases = [
    ["être content", "polite-affirmative", "je suis content"],
    ["être content", "plain-past", "j'étais content"],
    ["être content", "polite-negative", "je ne suis pas content"],
    ["avoir peur", "plain-past-negative", "je n'avais pas peur"],
    ["aimer ça", "polite-affirmative", "j'aime ça"],
    ["aimer ça", "plain-negative", "je n'aime pas ça"],
    ["détester ça", "plain-past", "j'ai détesté ça"],
    ["vouloir", "te", "je veux et…"],
  ];
  for (const [meaning, formId, expected] of cases) {
    assert.equal(translate(adjective([meaning], "うれしい", "i-adj"), formId), expected, meaning);
  }
});

test("notes in brackets don't reach an adjective's translation", () => {
  assert.equal(translate(adjective(["chaud (pour le temps, etc.)"], "あつい", "i-adj"), "plain-past"), "c'était chaud");
});

test("every form says whether it is negative and its tense, and has a name under its tense", () => {
  for (const [id, form] of Object.entries(FORMS)) {
    assert.equal(typeof form.negative, "boolean", id);
    assert.ok(["present", "past", "te"].includes(form.tense), id);
    assert.ok(form.short, id);
  }
});

const data = new URL("../drill/verbs.json", import.meta.url);
test("every generated verb with a verb meaning gets a translation", { skip: !existsSync(data) && "verbs.json not generated" }, () => {
  const verbs = JSON.parse(readFileSync(data, "utf-8"));
  for (const v of verbs) {
    if (v.defs[0].startsWith("sans する : ")) continue;
    for (const formId of Object.keys(FORMS).filter((id) => hasForm(v, id))) {
      const french = translate(v, formId);
      assert.match(french ?? "", /^(je |j'|il |cela |c'|ce )/, `${v.reading}: ${v.defs[0]}`);
    }
  }
});
