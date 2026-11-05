import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { FORMS } from "../drill/conjugate.js";
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
    assert.equal(conjugateFrench(meaning, false), affirmative, meaning);
    assert.equal(conjugateFrench(meaning, true), negative, meaning);
  }
});

test("text that is not an infinitive gives no translation", () => {
  assert.equal(conjugateFrench("téléphone portable", false), null);
  assert.equal(conjugateFrench("", false), null);
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
});

test("ある translates as il y a, whatever its definition says", () => {
  const aru = verb(["être (pour les objets), exister"], "ある", "godan-る");
  assert.equal(translate(aru, "polite-affirmative"), "il y a");
  assert.equal(translate(aru, "polite-negative"), "il n'y a pas");
});

test("a noun + する verb with no verb meaning has no translation", () => {
  const noun = verb(["sans する : téléphone portable"], "けいたいする", "suru-noun");
  assert.equal(translate(noun, "polite-affirmative"), null);
});

test("every form says whether it is negative", () => {
  for (const [id, form] of Object.entries(FORMS)) {
    assert.equal(typeof form.negative, "boolean", id);
  }
});

const data = new URL("../drill/verbs.json", import.meta.url);
test("every generated verb with a verb meaning gets a translation", { skip: !existsSync(data) && "verbs.json not generated" }, () => {
  const verbs = JSON.parse(readFileSync(data, "utf-8"));
  for (const v of verbs) {
    if (v.defs[0].startsWith("sans する : ")) continue;
    for (const formId of Object.keys(FORMS)) {
      const french = translate(v, formId);
      assert.match(french ?? "", /^(je |j'|il |cela )/, `${v.reading}: ${v.defs[0]}`);
    }
  }
});
