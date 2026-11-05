import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { conjugate, FORMS, groupOf, isCorrect } from "../drill/conjugate.js";

const verb = (kanji, reading, cls) => ({ kanji, reading, class: cls });

// verb, plain negative, polite affirmative, polite negative
const TABLE = [
  [verb("買う", "かう", "godan-う"), "かわない", "かいます", "かいません"],
  [verb("書く", "かく", "godan-く"), "かかない", "かきます", "かきません"],
  [verb("泳ぐ", "およぐ", "godan-ぐ"), "およがない", "およぎます", "およぎません"],
  [verb("話す", "はなす", "godan-す"), "はなさない", "はなします", "はなしません"],
  [verb("待つ", "まつ", "godan-つ"), "またない", "まちます", "まちません"],
  [verb("死ぬ", "しぬ", "godan-ぬ"), "しなない", "しにます", "しにません"],
  [verb("呼ぶ", "よぶ", "godan-ぶ"), "よばない", "よびます", "よびません"],
  [verb("飲む", "のむ", "godan-む"), "のまない", "のみます", "のみません"],
  [verb("帰る", "かえる", "godan-る"), "かえらない", "かえります", "かえりません"],
  [verb("入る", "はいる", "godan-る"), "はいらない", "はいります", "はいりません"],
  [verb("要る", "いる", "godan-る"), "いらない", "いります", "いりません"],
  [verb("有る", "ある", "godan-る"), "ない", "あります", "ありません"],
  [verb("食べる", "たべる", "ichidan"), "たべない", "たべます", "たべません"],
  [verb("居る", "いる", "ichidan"), "いない", "います", "いません"],
  [verb("見る", "みる", "ichidan"), "みない", "みます", "みません"],
  [verb("来る", "くる", "kuru"), "こない", "きます", "きません"],
  [verb("為る", "する", "suru"), "しない", "します", "しません"],
  [verb("勉強する", "べんきょうする", "suru"), "べんきょうしない", "べんきょうします", "べんきょうしません"],
  [verb("下さる", "くださる", "honorific"), "くださらない", "くださいます", "くださいません"],
  [verb("料理する", "りょうりする", "suru-noun"), "りょうりしない", "りょうりします", "りょうりしません"],
];

test("kana forms match the reference table", () => {
  for (const [v, negative, polite, politeNegative] of TABLE) {
    assert.equal(conjugate(v, "plain-negative").kana, negative, v.kanji);
    assert.equal(conjugate(v, "polite-affirmative").kana, polite, v.kanji);
    assert.equal(conjugate(v, "polite-negative").kana, politeNegative, v.kanji);
  }
});

test("kanji forms keep the kanji and swap the ending", () => {
  const cases = [
    [verb("買う", "かう", "godan-う"), "plain-negative", "買わない"],
    [verb("食べる", "たべる", "ichidan"), "polite-negative", "食べません"],
    [verb("来る", "くる", "kuru"), "plain-negative", "来ない"],
    [verb("来る", "くる", "kuru"), "polite-affirmative", "来ます"],
    [verb("持ってくる", "もってくる", "kuru"), "plain-negative", "持ってこない"],
    [verb("やって来る", "やってくる", "kuru"), "polite-affirmative", "やって来ます"],
    [verb("勉強する", "べんきょうする", "suru"), "polite-affirmative", "勉強します"],
    [verb("下さる", "くださる", "honorific"), "plain-negative", "下さらない"],
    [verb("お腹が空く", "おなかがすく", "godan-く"), "polite-negative", "お腹が空きません"],
    [verb("有る", "ある", "godan-る"), "polite-affirmative", "有ります"],
  ];
  for (const [v, formId, expected] of cases) {
    assert.equal(conjugate(v, formId).kanji, expected);
  }
});

test("forms with no kanji spelling report null", () => {
  assert.equal(conjugate(verb("為る", "する", "suru"), "polite-affirmative").kanji, null);
  assert.equal(conjugate(verb("有る", "ある", "godan-る"), "plain-negative").kanji, null);
  assert.equal(conjugate(verb("", "いらっしゃる", "honorific"), "polite-affirmative").kanji, null);
  assert.equal(conjugate(verb("", "コピーする", "suru"), "polite-affirmative").kanji, null);
});

test("look-alike verbs follow their label, not their ending", () => {
  assert.notEqual(
    conjugate(verb("居る", "いる", "ichidan"), "plain-negative").kana,
    conjugate(verb("要る", "いる", "godan-る"), "plain-negative").kana,
  );
});

test("行く is regular in the present", () => {
  const iku = verb("行く", "いく", "godan-く");
  assert.equal(conjugate(iku, "plain-negative").kana, "いかない");
  assert.equal(conjugate(iku, "polite-affirmative").kana, "いきます");
});

test("answers are accepted in kana or kanji", () => {
  const taberu = verb("食べる", "たべる", "ichidan");
  assert.ok(isCorrect(taberu, "polite-affirmative", "たべます"));
  assert.ok(isCorrect(taberu, "polite-affirmative", "食べます"));
  assert.ok(isCorrect(taberu, "polite-affirmative", " 食べます。"));
  assert.ok(!isCorrect(taberu, "polite-affirmative", "たべません"));
  assert.ok(!isCorrect(taberu, "polite-affirmative", ""));
});

test("katakana verbs accept hiragana typed from romaji", () => {
  assert.ok(isCorrect(verb("", "コピーする", "suru"), "polite-affirmative", "こぴーします"));
});

test("wrong conjugations of tricky verbs are rejected", () => {
  assert.ok(!isCorrect(verb("有る", "ある", "godan-る"), "plain-negative", "あらない"));
  assert.ok(!isCorrect(verb("買う", "かう", "godan-う"), "plain-negative", "かあない"));
  assert.ok(!isCorrect(verb("帰る", "かえる", "godan-る"), "plain-negative", "かえない"));
  assert.ok(!isCorrect(verb("来る", "くる", "kuru"), "plain-negative", "きない"));
});

test("ある counts as irregular for filtering", () => {
  assert.equal(groupOf(verb("有る", "ある", "godan-る")), "irregular");
  assert.equal(groupOf(verb("帰る", "かえる", "godan-る")), "godan");
});

const meanings = JSON.parse(readFileSync(new URL("../scripts/suru_meanings.json", import.meta.url), "utf-8"));

test("every noun + する meaning in the table has text", () => {
  for (const [noun, meaning] of Object.entries(meanings)) {
    assert.ok(meaning.trim(), noun);
  }
});

const data = new URL("../drill/verbs.json", import.meta.url);
test("noun + する verbs show the verb's meaning, or say it describes the word alone", { skip: !existsSync(data) && "verbs.json not generated" }, () => {
  const verbs = JSON.parse(readFileSync(data, "utf-8")).filter((v) => v.class === "suru-noun");
  assert.ok(verbs.length > 0);
  for (const v of verbs) {
    const noun = (v.kanji || v.reading).replace(/する$/, "");
    if (meanings[noun]) assert.deepEqual(v.defs, [meanings[noun]], noun);
    else assert.ok(v.defs[0].startsWith("sans する : "), noun);
  }
});

test("every generated verb yields all forms", { skip: !existsSync(data) && "verbs.json not generated" }, () => {
  const verbs = JSON.parse(readFileSync(data, "utf-8"));
  assert.ok(verbs.length > 0);
  const spellings = verbs.map((v) => `${v.kanji}/${v.reading}`);
  assert.equal(new Set(spellings).size, spellings.length, "duplicate verbs");
  for (const v of verbs) {
    assert.ok(v.defs.length > 0, `${v.reading} has no definition`);
    for (const formId of Object.keys(FORMS)) {
      const { kana, rule } = conjugate(v, formId);
      assert.ok(kana && rule, `${v.reading} ${formId}`);
      assert.ok(!kana.includes("undefined"), `${v.reading} ${formId}: ${kana}`);
    }
  }
});
