import test from "node:test";
import assert from "node:assert/strict";
import { textbookTasks, TextbookPractice } from "../studio/textbook-practice.mjs";

function fixture() {
  return { id: "nce-b1-u01", book: 1, title: "A new place", items: [
    ["I am a student.", "我是一名学生。"], ["This is our school.", "这是我们的学校。"],
    ["We are friends.", "我们是朋友。"], ["The room is bright.", "房间很明亮。"],
    ["The teacher is kind.", "老师很和善。"], ["Our lesson starts now.", "我们的课现在开始。"],
  ], questions: [0, 1, 2].map((i) => ({ prompt: `Question ${i}`, options: ["am", "is", "are", "be"], answer: i, explanation: `Explanation ${i}` })) };
}
function setup() {
  const renders = [], completed = [], exited = [], spoken = [];
  const controller = new TextbookPractice({ render: (html) => renders.push(html), onComplete: (...args) => completed.push(args), onExit: (unit) => exited.push(unit.id), onSpeak: (text) => spoken.push(text), random: () => 0.4 });
  return { controller, renders, completed, exited, spoken };
}
test("textbook tasks copy three grammar tasks and create two unambiguous listening tasks", () => {
  const unit = fixture(), before = structuredClone(unit), tasks = textbookTasks(unit, () => 0.3);
  assert.equal(tasks.length, 5);
  assert.deepEqual(tasks.map((q) => q.kind), ["grammar", "grammar", "grammar", "listen", "listen"]);
  for (const task of tasks.slice(3)) {
    assert.equal(new Set(task.options).size, 4);
    assert.equal(task.options[task.answer], unit.items.find((row) => row[0] === task.text)[1]);
  }
  tasks[0].options[0] = "changed";
  assert.deepEqual(unit, before);
});
test("invalid questions and ambiguous listening meanings do not invent exercises", () => {
  assert.deepEqual(textbookTasks({ questions: [{ prompt: "x", options: ["a", "a"], answer: 0, explanation: "x" }], items: [["one", "同义"], ["two", "同义"]] }), []);
  assert.equal(setup().controller.start({ id: "empty" }), false);
});
test("each answer is scored once and progress requires explicit confirmation", () => {
  const { controller, completed } = setup();
  controller.start(fixture());
  controller.handle({ textbookNext: "" });
  assert.equal(controller.index, 0);
  controller.handle({ textbookAnswer: "2" });
  controller.handle({ textbookAnswer: "0" });
  assert.equal(controller.answers[0], 2);
  assert.equal(controller.index, 0);
  controller.handle({ textbookNext: "" });
  while (controller.index < controller.tasks.length) {
    controller.handle({ textbookAnswer: String(controller.tasks[controller.index].answer) });
    controller.handle({ textbookNext: "" });
  }
  controller.handle({ textbookNext: "" });
  assert.equal(completed.length, 1);
  assert.deepEqual(completed[0][1], { correct: 4, total: 5 });
});
test("listening pronunciation is bound to the active task and exit resets the session", () => {
  const { controller, spoken, exited } = setup();
  controller.start(fixture());
  controller.handle({ textbookSpeak: "untrusted text" });
  assert.deepEqual(spoken, []);
  for (let i = 0; i < 3; i++) {
    controller.handle({ textbookAnswer: String(i) });
    controller.handle({ textbookNext: "" });
  }
  controller.handle({ textbookSpeak: "untrusted text" });
  assert.deepEqual(spoken, [fixture().items[0][0]]);
  controller.handle({ textbookExit: "" });
  assert.deepEqual(exited, ["nce-b1-u01"]);
  assert.equal(controller.handle({ textbookAnswer: "0" }), false);
});
test("restart creates a new attempt and displayed user text is escaped", () => {
  const { controller, renders } = setup(), unit = fixture();
  unit.title = "<img src=x>";
  unit.questions[0].prompt = "<script>bad</script>";
  unit.questions[0].options[0] = "<b>am</b>";
  controller.start(unit);
  controller.handle({ textbookAnswer: "0" });
  controller.start(unit);
  assert.deepEqual(controller.answers, []);
  assert.equal(controller.index, 0);
  assert.match(renders.at(-1), /&lt;script&gt;/);
  assert.doesNotMatch(renders.at(-1), /<script>|<img src/);
});
