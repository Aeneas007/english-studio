import test from "node:test";
import assert from "node:assert/strict";
import { ReadingPractice } from "../studio/reading-practice.mjs";

const terms = [
  { w: "river", meaning: "河流", due: 123, status: "learning" },
  { w: "garden", meaning: "花园", due: 456, status: "learning" },
];
const pair = (practice, left, right = left) => {
  practice.handle({ practicePair: left, side: "left" });
  practice.handle({ practicePair: right, side: "right" });
};
const finishPairs = (practice) => {
  for (const word of practice.session.words) pair(practice, word.id);
  practice.handle({ practiceNext: "" });
};
const finishChoices = (practice) => {
  while (practice.phase === "choice") {
    const question = practice.session.questions[practice.questionIndex];
    practice.handle({ practiceAnswer: question.id });
    practice.handle({ practiceNext: "" });
  }
};

test("practice requires at least two distinct words and leaves study data unchanged", () => {
  let renders = 0;
  const practice = new ReadingPractice({ render: () => renders++ });
  assert.equal(practice.start([terms[0]]), false);
  assert.equal(renders, 0);
  const before = structuredClone(terms);
  assert.equal(practice.start(terms), true);
  finishPairs(practice);
  finishChoices(practice);
  assert.deepEqual(terms, before);
});

test("wrong matching attempts retain a lost point after correction", () => {
  const results = [];
  let html = "";
  const practice = new ReadingPractice({ render: (value) => { html = value; }, onComplete: (result) => results.push(result) });
  practice.start(terms);
  pair(practice, "river", "garden");
  assert.match(html, /study-pair selected wrong/);
  assert.equal(practice.matched.size, 0);
  pair(practice, "river");
  pair(practice, "garden");
  practice.handle({ practiceNext: "" });
  finishChoices(practice);
  assert.equal(results.length, 1);
  assert.equal(results[0].correct, 3);
  assert.equal(results[0].total, 4);
});

test("progress waits for explicit matching and answer confirmation", () => {
  const practice = new ReadingPractice();
  practice.start(terms);
  practice.handle({ practiceNext: "" });
  assert.equal(practice.phase, "pairs");
  pair(practice, "river");
  practice.handle({ practiceNext: "" });
  assert.equal(practice.phase, "pairs");
  pair(practice, "garden");
  assert.equal(practice.phase, "pairs");
  practice.handle({ practiceNext: "" });
  assert.equal(practice.phase, "choice");
  practice.handle({ practiceNext: "" });
  assert.equal(practice.questionIndex, 0);
  const question = practice.session.questions[0];
  const wrong = question.options.find((option) => option.id !== question.id);
  practice.handle({ practiceAnswer: wrong.id });
  practice.handle({ practiceAnswer: question.id });
  assert.equal(practice.answer, wrong.id);
  assert.equal(practice.choiceCorrect, 0);
  assert.equal(practice.questionIndex, 0);
  practice.handle({ practiceNext: "" });
  assert.equal(practice.questionIndex, 1);
});

test("completion is emitted once before result render and restart creates a fresh attempt", () => {
  const events = [];
  const practice = new ReadingPractice({
    render: (html) => { if (html.includes("study-result")) events.push("render-result"); },
    onComplete: () => events.push("complete"),
  });
  practice.start(terms);
  finishPairs(practice);
  finishChoices(practice);
  assert.deepEqual(events, ["complete", "render-result"]);
  practice.handle({ practiceNext: "" });
  assert.deepEqual(events, ["complete", "render-result"]);
  practice.handle({ practiceRestart: "" });
  assert.equal(practice.phase, "pairs");
  assert.equal(practice.matched.size, 0);
  finishPairs(practice);
  finishChoices(practice);
  assert.deepEqual(events, ["complete", "render-result", "complete", "render-result"]);
});

test("pronunciation and exit callbacks accept only the active batch's valid words", () => {
  const pronunciations = [];
  let exits = 0;
  const practice = new ReadingPractice({ onPronounce: (word) => pronunciations.push(word), onExit: () => exits++ });
  practice.start(terms);
  assert.equal(practice.handle({ action: "other-action" }), false);
  assert.equal(practice.handle({ practicePronounce: "unknown" }), true);
  practice.handle({ practicePronounce: "river" });
  assert.deepEqual(pronunciations, ["river"]);
  practice.handle({ practiceExit: "" });
  assert.equal(exits, 1);
  assert.equal(practice.session, null);
  practice.handle({ practicePronounce: "garden" });
  assert.deepEqual(pronunciations, ["river"]);
});

test("user-entered meanings are escaped in pair, choice and result HTML", () => {
  let html = "";
  const practice = new ReadingPractice({ render: (value) => { html = value; } });
  practice.start([{ w: "river", meaning: '<img src=x onerror="test">' }, terms[1]]);
  assert.ok(!html.includes("<img"));
  assert.match(html, /&lt;img/);
  finishPairs(practice);
  assert.ok(!html.includes("<img"));
  finishChoices(practice);
  assert.ok(!html.includes("<img"));
  assert.match(html, /&lt;img/);
});
