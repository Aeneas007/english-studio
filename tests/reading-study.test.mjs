import test from "node:test";
import assert from "node:assert/strict";
import { createReadingStudy, shortMeaning } from "../studio/reading-study.mjs";

const terms = [
  { w: "bank", meaning: "n. 银行, 堤, 岸\n[图]库" },
  { w: "window", meaning: "n. 窗户；窗口" },
  { w: "journey", meaning: "n. 旅程" },
  { w: "quiet", meaning: "adj. 安静的" },
  { w: "garden", meaning: "n. 花园" },
  { w: "river", meaning: "n. 河流" },
];

test("compact meanings remove usage tags and choose the first usable gloss", () => {
  assert.equal(shortMeaning(terms[0].meaning), "银行, 堤, 岸");
  assert.equal(shortMeaning("[医] n.；【正式】 vt. 提醒；使想起"), "提醒");
  assert.equal(shortMeaning("1. n. & v. 旅行\n旅游"), "旅行");
  assert.equal(shortMeaning("[计算机] adj. 只读的；不可写入的"), "只读的");
  assert.equal(shortMeaning("vbl. 微笑, 露出笑容"), "微笑, 露出笑容");
  assert.equal(shortMeaning("pl. 牙齿"), "牙齿");
  assert.equal(shortMeaning("pp. 已知的, 熟悉的"), "已知的, 熟悉的");
  assert.equal(shortMeaning(null), "");
  assert.equal(shortMeaning({ meaning: "词义" }), "");
});

test("compact meanings stay on one line and truncate Unicode safely", () => {
  assert.equal(shortMeaning("一段\t 很长的释义", 7), "一段 很长的…");
  assert.equal(shortMeaning("🌱abc", 3), "🌱a…");
  assert.equal(shortMeaning("花园", 0), "");
  assert.equal(shortMeaning("花园", 1), "…");
});

test("reading sessions select five valid unique words without mutating input", () => {
  const input = [
    null,
    { w: "", meaning: "空白" },
    { w: "123", meaning: "数字" },
    { w: "no-meaning", meaning: "[标签]" },
    { w: "BANK!", meaning: "n. 银行, 堤, 岸\n[图]库" },
    { w: "bank", meaning: "另一个词义" },
    ...terms.slice(1),
  ];
  const before = structuredClone(input);
  const study = createReadingStudy(input, () => 0.5);
  assert.deepEqual(study.words.map((word) => word.id), [
    "bank", "window", "journey", "quiet", "garden",
  ]);
  assert.deepEqual(input, before);
  assert.equal(study.totalQuestions, 5);
});

test("session cards and options do not retain mutable references to saved terms", () => {
  const saved = Object.freeze(terms.map((term) => Object.freeze({ ...term })));
  const study = createReadingStudy(saved, () => 0.5);
  study.words[0].meaning = "changed word label";
  study.pairs.right[0].meaning = "changed pair label";
  study.questions[0].options[0].meaning = "changed option label";
  assert.deepEqual(saved, terms);
  assert.equal(study.questions[0].meaning, "银行, 堤, 岸");
});

test("phrases and curly apostrophes use normalized saved-word identities", () => {
  const study = createReadingStudy([
    { w: " Look   up! ", meaning: "查找" },
    { w: "Alice’s", meaning: "爱丽丝的" },
    { w: "well-known", meaning: "著名的" },
    { w: "look up", meaning: "抬头看" },
    { w: "bad/word", meaning: "无效项" },
  ], () => 0);
  assert.deepEqual(study.words.map((word) => word.id), [
    "look up", "alice's", "well-known",
  ]);
});

test("identical visible labels cannot make a matching pair or choice ambiguous", () => {
  const study = createReadingStudy([
    { w: "quiet", meaning: "adj. 安静的；平静的" },
    { w: "silent", meaning: "[常用] adj. 安静的；沉默的" },
    ...terms.slice(0, 3),
    terms[4],
  ], () => 0.75);
  assert.equal(study.words.length, 5);
  assert.ok(!study.words.some((word) => word.id === "silent"));
  assert.equal(new Set(study.pairs.right.map((item) => item.meaning)).size, 5);
  for (const question of study.questions) {
    assert.equal(question.options.length, 4);
    assert.equal(question.options.filter((item) => item.id === question.id).length, 1);
    assert.equal(question.options.filter((item) => item.meaning === question.meaning).length, 1);
    assert.equal(new Set(question.options.map((item) => item.meaning)).size, 4);
  }
});

test("pair columns shuffle independently with injectable randomness", () => {
  let calls = 0;
  const random = () => (calls++ < 4 ? 0 : 0.99);
  const study = createReadingStudy(terms, random);
  assert.ok(calls > 8);
  assert.notDeepEqual(study.pairs.left.map((item) => item.id), study.pairs.right.map((item) => item.id));
  assert.deepEqual(
    [...study.pairs.left.map((item) => item.id)].sort(),
    [...study.pairs.right.map((item) => item.id)].sort(),
  );
  assert.deepEqual(createReadingStudy(terms, () => 0), createReadingStudy(terms, () => 0));
});

test("empty and single-word batches do not invent distractors or alter study state", () => {
  for (const input of [undefined, null, {}, [], [{ w: "book" }]]) {
    assert.deepEqual(createReadingStudy(input), {
      words: [], pairs: { left: [], right: [] }, questions: [], totalQuestions: 0,
    });
  }
  const term = { w: "bank", meaning: "银行", due: 123, status: "learning", repetitions: 2 };
  const study = createReadingStudy([term], () => 0);
  assert.equal(study.words.length, 1);
  assert.equal(study.questions.length, 0);
  assert.equal(term.due, 123);
  assert.equal(term.status, "learning");
  assert.equal(term.repetitions, 2);
  assert.deepEqual(createReadingStudy(terms.slice(0, 2), () => 0).questions.map((q) => q.options.length), [2, 2]);
});
