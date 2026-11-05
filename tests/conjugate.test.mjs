import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { CHEATSHEET, conjugate, FORMS, groupOf, hasForm, isCorrect, splitEnding } from "../drill/conjugate.js";

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

// verb, plain past, plain past negative, polite past, polite past negative
const PAST_TABLE = [
  [verb("買う", "かう", "godan-う"), "かった", "かわなかった", "かいました", "かいませんでした"],
  [verb("書く", "かく", "godan-く"), "かいた", "かかなかった", "かきました", "かきませんでした"],
  [verb("泳ぐ", "およぐ", "godan-ぐ"), "およいだ", "およがなかった", "およぎました", "およぎませんでした"],
  [verb("話す", "はなす", "godan-す"), "はなした", "はなさなかった", "はなしました", "はなしませんでした"],
  [verb("待つ", "まつ", "godan-つ"), "まった", "またなかった", "まちました", "まちませんでした"],
  [verb("死ぬ", "しぬ", "godan-ぬ"), "しんだ", "しななかった", "しにました", "しにませんでした"],
  [verb("呼ぶ", "よぶ", "godan-ぶ"), "よんだ", "よばなかった", "よびました", "よびませんでした"],
  [verb("飲む", "のむ", "godan-む"), "のんだ", "のまなかった", "のみました", "のみませんでした"],
  [verb("帰る", "かえる", "godan-る"), "かえった", "かえらなかった", "かえりました", "かえりませんでした"],
  [verb("行く", "いく", "godan-く"), "いった", "いかなかった", "いきました", "いきませんでした"],
  [verb("持って行く", "もっていく", "godan-く"), "もっていった", "もっていかなかった", "もっていきました", "もっていきませんでした"],
  [verb("有る", "ある", "godan-る"), "あった", "なかった", "ありました", "ありませんでした"],
  [verb("食べる", "たべる", "ichidan"), "たべた", "たべなかった", "たべました", "たべませんでした"],
  [verb("見る", "みる", "ichidan"), "みた", "みなかった", "みました", "みませんでした"],
  [verb("来る", "くる", "kuru"), "きた", "こなかった", "きました", "きませんでした"],
  [verb("為る", "する", "suru"), "した", "しなかった", "しました", "しませんでした"],
  [verb("下さる", "くださる", "honorific"), "くださった", "くださらなかった", "くださいました", "くださいませんでした"],
  [verb("料理する", "りょうりする", "suru-noun"), "りょうりした", "りょうりしなかった", "りょうりしました", "りょうりしませんでした"],
];

test("past forms match the reference table", () => {
  for (const [v, past, pastNegative, politePast, politePastNegative] of PAST_TABLE) {
    assert.equal(conjugate(v, "plain-past").kana, past, v.kanji);
    assert.equal(conjugate(v, "plain-past-negative").kana, pastNegative, v.kanji);
    assert.equal(conjugate(v, "polite-past").kana, politePast, v.kanji);
    assert.equal(conjugate(v, "polite-past-negative").kana, politePastNegative, v.kanji);
  }
});

test("past forms keep the kanji", () => {
  const cases = [
    [verb("書く", "かく", "godan-く"), "plain-past", "書いた"],
    [verb("飲む", "のむ", "godan-む"), "plain-past", "飲んだ"],
    [verb("行く", "いく", "godan-く"), "plain-past", "行った"],
    [verb("来る", "くる", "kuru"), "plain-past", "来た"],
    [verb("来る", "くる", "kuru"), "plain-past-negative", "来なかった"],
    [verb("持ってくる", "もってくる", "kuru"), "plain-past", "持ってきた"],
    [verb("勉強する", "べんきょうする", "suru-noun"), "plain-past", "勉強した"],
    [verb("有る", "ある", "godan-る"), "plain-past", "有った"],
  ];
  for (const [v, formId, expected] of cases) {
    assert.equal(conjugate(v, formId).kanji, expected);
  }
});

test("only 行く takes the irregular past among く verbs", () => {
  assert.equal(conjugate(verb("歩く", "あるく", "godan-く"), "plain-past").kana, "あるいた");
  assert.equal(conjugate(verb("引く", "ひく", "godan-く"), "plain-past").kana, "ひいた");
});

test("the past is accepted in kana or kanji, and the old mistake is rejected", () => {
  const iku = verb("行く", "いく", "godan-く");
  assert.ok(isCorrect(iku, "plain-past", "いった"));
  assert.ok(isCorrect(iku, "plain-past", "行った"));
  assert.ok(!isCorrect(iku, "plain-past", "いいた"));
  assert.ok(!isCorrect(verb("飲む", "のむ", "godan-む"), "plain-past", "のみた"));
});

// verb, て form, ている form
const TE_TABLE = [
  [verb("買う", "かう", "godan-う"), "かって", "かっている"],
  [verb("書く", "かく", "godan-く"), "かいて", "かいている"],
  [verb("泳ぐ", "およぐ", "godan-ぐ"), "およいで", "およいでいる"],
  [verb("話す", "はなす", "godan-す"), "はなして", "はなしている"],
  [verb("待つ", "まつ", "godan-つ"), "まって", "まっている"],
  [verb("死ぬ", "しぬ", "godan-ぬ"), "しんで", "しんでいる"],
  [verb("呼ぶ", "よぶ", "godan-ぶ"), "よんで", "よんでいる"],
  [verb("飲む", "のむ", "godan-む"), "のんで", "のんでいる"],
  [verb("帰る", "かえる", "godan-る"), "かえって", "かえっている"],
  [verb("行く", "いく", "godan-く"), "いって", "いっている"],
  [verb("持って行く", "もっていく", "godan-く"), "もっていって", "もっていっている"],
  [verb("食べる", "たべる", "ichidan"), "たべて", "たべている"],
  [verb("見る", "みる", "ichidan"), "みて", "みている"],
  [verb("来る", "くる", "kuru"), "きて", "きている"],
  [verb("為る", "する", "suru"), "して", "している"],
  [verb("下さる", "くださる", "honorific"), "くださって", "くださっている"],
  [verb("料理する", "りょうりする", "suru-noun"), "りょうりして", "りょうりしている"],
];

test("て and ている forms match the reference table", () => {
  for (const [v, te, teiru] of TE_TABLE) {
    assert.equal(conjugate(v, "te").kana, te, v.kanji);
    assert.equal(conjugate(v, "te-iru").kana, teiru, v.kanji);
  }
});

test("て and ている forms keep the kanji", () => {
  const cases = [
    [verb("書く", "かく", "godan-く"), "te", "書いて"],
    [verb("飲む", "のむ", "godan-む"), "te-iru", "飲んでいる"],
    [verb("行く", "いく", "godan-く"), "te", "行って"],
    [verb("来る", "くる", "kuru"), "te", "来て"],
    [verb("来る", "くる", "kuru"), "te-iru", "来ている"],
    [verb("勉強する", "べんきょうする", "suru-noun"), "te-iru", "勉強している"],
    [verb("有る", "ある", "godan-る"), "te", "有って"],
  ];
  for (const [v, formId, expected] of cases) {
    assert.equal(conjugate(v, formId).kanji, expected);
  }
});

test("the voiced ending shows in the rule, and wrong て forms are rejected", () => {
  assert.match(conjugate(verb("飲む", "のむ", "godan-む"), "te").rule, /ん \+ で$/);
  assert.match(conjugate(verb("飲む", "のむ", "godan-む"), "te-iru").rule, /ん \+ でいる$/);
  assert.ok(!isCorrect(verb("飲む", "のむ", "godan-む"), "te", "のみて"));
  assert.ok(!isCorrect(verb("行く", "いく", "godan-く"), "te", "いいて"));
});

test("ある and いる have no ている card, but every other form stays", () => {
  const noTeiru = [verb("有る", "ある", "godan-る"), verb("居る", "いる", "ichidan"), verb("要る", "いる", "godan-る")];
  for (const v of noTeiru) {
    assert.equal(hasForm(v, "te-iru"), false, v.kanji);
    assert.equal(hasForm(v, "te"), true, v.kanji);
    assert.equal(hasForm(v, "polite-past"), true, v.kanji);
  }
  assert.equal(hasForm(verb("書く", "かく", "godan-く"), "te-iru"), true);
  assert.equal(hasForm(verb("参る", "まいる", "godan-る"), "te-iru"), true);
});

const taka = verb("高い", "たかい", "i-adj");
const shizuka = verb("静か", "しずか", "na-adj");

// form, 高い, 静か
const ADJECTIVE_TABLE = [
  ["plain-negative", "たかくない", "しずかじゃない"],
  ["polite-affirmative", "たかいです", "しずかです"],
  ["polite-negative", "たかくないです", "しずかじゃありません"],
  ["plain-past", "たかかった", "しずかだった"],
  ["plain-past-negative", "たかくなかった", "しずかじゃなかった"],
  ["polite-past", "たかかったです", "しずかでした"],
  ["polite-past-negative", "たかくなかったです", "しずかじゃありませんでした"],
  ["te", "たかくて", "しずかで"],
];

test("adjectives match the reference table", () => {
  for (const [formId, i, na] of ADJECTIVE_TABLE) {
    assert.equal(conjugate(taka, formId).kana, i, formId);
    assert.equal(conjugate(shizuka, formId).kana, na, formId);
  }
});

test("adjectives keep the kanji, and katakana ones have none", () => {
  assert.equal(conjugate(taka, "plain-past").kanji, "高かった");
  assert.equal(conjugate(shizuka, "te").kanji, "静かで");
  assert.equal(conjugate(verb("", "ハンサム", "na-adj"), "polite-affirmative").kana, "ハンサムです");
  assert.equal(conjugate(verb("", "ハンサム", "na-adj"), "polite-affirmative").kanji, null);
});

test("adjectives show their own ending, not the verb's", () => {
  assert.equal(conjugate(taka, "polite-past").ending, "〜かったです");
  assert.equal(conjugate(shizuka, "polite-past").ending, "〜でした");
  assert.equal(conjugate(verb("書く", "かく", "godan-く"), "polite-past").ending, undefined);
});

test("いい and its compounds change to よ, except in the polite present", () => {
  const cases = [
    [verb("", "いい", "i-adj"), "plain-past", "よかった", null],
    [verb("", "いい", "i-adj"), "te", "よくて", null],
    [verb("", "いい", "i-adj"), "polite-affirmative", "いいです", null],
    [verb("頭がいい", "あたまがいい", "i-adj"), "plain-negative", "あたまがよくない", "頭がよくない"],
    [verb("格好いい", "かっこいい", "i-adj"), "plain-past", "かっこよかった", "格好よかった"],
    [verb("仲が良い", "なかがいい", "i-adj"), "plain-negative", "なかがよくない", "仲が良くない"],
    [verb("仲が良い", "なかがいい", "i-adj"), "polite-affirmative", "なかがいいです", "仲が良いです"],
  ];
  for (const [v, formId, kana, kanji] of cases) {
    assert.equal(conjugate(v, formId).kana, kana);
    assert.equal(conjugate(v, formId).kanji, kanji);
  }
});

test("adjectives that merely end in いい stay regular", () => {
  assert.equal(conjugate(verb("可愛い", "かわいい", "i-adj"), "plain-negative").kana, "かわいくない");
  assert.equal(conjugate(verb("可愛い", "かわいい", "i-adj"), "plain-past").kanji, "可愛かった");
});

test("both ways of saying the negative are accepted", () => {
  const accepted = [
    [shizuka, "plain-negative", ["しずかじゃない", "しずかではない", "静かではない"]],
    [shizuka, "polite-negative", ["しずかじゃありません", "しずかではありません", "しずかじゃないです", "しずかではないです"]],
    [shizuka, "plain-past-negative", ["しずかじゃなかった", "しずかではなかった"]],
    [shizuka, "polite-past-negative", ["しずかじゃありませんでした", "しずかではありませんでした", "しずかじゃなかったです", "しずかではなかったです"]],
    [taka, "polite-negative", ["たかくないです", "たかくありません", "高くありません"]],
    [taka, "polite-past-negative", ["たかくなかったです", "たかくありませんでした"]],
  ];
  for (const [v, formId, answers] of accepted) {
    for (const answer of answers) assert.ok(isCorrect(v, formId, answer), answer);
  }
});

test("classic adjective mistakes are rejected", () => {
  assert.ok(!isCorrect(taka, "polite-past", "たかいでした"));
  assert.ok(!isCorrect(taka, "plain-negative", "たかいじゃない"));
  assert.ok(!isCorrect(shizuka, "plain-negative", "しずかくない"));
  assert.ok(!isCorrect(shizuka, "te", "しずかくて"));
  assert.ok(!isCorrect(verb("", "いい", "i-adj"), "plain-past", "いかった"));
});

test("adjectives have no ている, and 無い has no negative", () => {
  assert.equal(hasForm(taka, "te-iru"), false);
  assert.equal(hasForm(shizuka, "te-iru"), false);
  assert.equal(hasForm(taka, "te"), true);
  const nai = verb("無い", "ない", "i-adj");
  assert.equal(hasForm(nai, "plain-negative"), false);
  assert.equal(hasForm(nai, "polite-past-negative"), false);
  assert.equal(hasForm(nai, "plain-past"), true);
  assert.equal(conjugate(nai, "plain-past").kana, "なかった");
  assert.equal(hasForm(verb("詰らない", "つまらない", "i-adj"), "plain-negative"), true);
});

test("adjectives count as their own group", () => {
  assert.equal(groupOf(taka), "i-adj");
  assert.equal(groupOf(shizuka), "na-adj");
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

test("cheatsheet examples sit under their own group", () => {
  assert.equal(groupOf(CHEATSHEET.godan), "godan");
  assert.equal(groupOf(CHEATSHEET.ichidan), "ichidan");
  for (const v of CHEATSHEET.irregular) {
    assert.ok(["irregular", "suru-noun"].includes(groupOf(v)), v.reading);
  }
});

test("the godan example has a written form for every form", () => {
  for (const formId of Object.keys(FORMS)) {
    assert.ok(conjugate(CHEATSHEET.godan, formId).kanji, formId);
  }
});

test("cheatsheet marks only the part that changes", () => {
  const cases = [
    ["かう", "かわない", "か", "わない"],
    ["たべる", "たべます", "たべ", "ます"],
    ["みる", "みない", "み", "ない"],
    ["くる", "こない", "", "こない"],
    ["する", "します", "", "します"],
    ["ある", "ない", "", "ない"],
    ["くださる", "くださいます", "くださ", "います"],
    ["べんきょうする", "べんきょうしません", "べんきょう", "しません"],
  ];
  for (const [reading, kana, stem, ending] of cases) {
    assert.deepEqual(splitEnding(reading, kana), { stem, ending }, kana);
  }
});

const meanings = JSON.parse(readFileSync(new URL("../scripts/suru_meanings.json", import.meta.url), "utf-8"));

const adjectiveMeanings = JSON.parse(readFileSync(new URL("../scripts/adjective_meanings.json", import.meta.url), "utf-8"));

test("every adjective meaning in the table has text", () => {
  for (const [adjective, meaning] of Object.entries(adjectiveMeanings)) {
    assert.ok(meaning.trim(), adjective);
  }
});

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
    for (const formId of Object.keys(FORMS).filter((id) => hasForm(v, id))) {
      const { kana, rule } = conjugate(v, formId);
      assert.ok(kana && rule, `${v.reading} ${formId}`);
      assert.ok(!kana.includes("undefined"), `${v.reading} ${formId}: ${kana}`);
    }
  }
});
