import test from "node:test";
import assert from "node:assert/strict";
import { tradeTracks, tradeBooks, tradeUnits } from "../studio/trade-data.mjs";
import { textbookUnits } from "../studio/textbook-data.mjs";
import { textbookTasks, TextbookPractice } from "../studio/textbook-practice.mjs";
import { renderTradeUnit } from "../studio/trade-ui.mjs";
import { defaults, KEY, load, mergeBackup, validBook } from "../studio/core.mjs";

const trackIds = ["hvac", "electrical", "plumbing", "building"];

test("Australian workplace courses expose four distinct tracks and twenty-four stable units", () => {
  assert.equal(tradeTracks.length, 4);
  assert.equal(tradeBooks.length, 4);
  assert.equal(tradeUnits.length, 24);
  assert.deepEqual(new Set(tradeTracks.map((track) => track.id)), new Set(trackIds));
  assert.equal(new Set(tradeBooks.map((book) => book.id)).size, 4);
  assert.equal(new Set(tradeUnits.map((unit) => unit.id)).size, 24);
  const allUnitIds = [...textbookUnits.map((unit) => unit.id), ...tradeUnits.map((unit) => unit.id)];
  assert.equal(new Set(allUnitIds).size, allUnitIds.length);
  for (const track of trackIds) {
    const book = tradeBooks.find((book) => book.track === track);
    assert.ok(book, track);
    assert.equal(book.id, `au-trade-${track}`);
    assert.equal(book.collection, "trades");
    assert.equal(book.chapters.length, 6);
    assert.ok(validBook(book), track);
    const units = tradeUnits.filter((unit) => unit.track === track).sort((a, b) => a.chapter - b.chapter);
    assert.equal(units.length, 6, track);
    assert.deepEqual(units.map((unit) => unit.chapter), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(units.map((unit) => unit.id), Array.from({ length: 6 }, (_, index) => `trade-${track}-${String(index + 1).padStart(2, "0")}`));
    assert.ok(units.every((unit) => unit.bookId === book.id), track);
  }
});

test("every workplace unit shares eight complete bilingual expressions with its reading chapter", () => {
  for (const unit of tradeUnits) {
    const book = tradeBooks.find((book) => book.id === unit.bookId);
    const chapter = book.chapters[unit.chapter];
    assert.equal(unit.items.length, 8, unit.id);
    assert.deepEqual(chapter.lines.map((line) => line.slice(0, 2)), unit.items, unit.id);
    assert.ok(unit.title.trim(), unit.id);
    assert.ok(unit.focus.trim(), unit.id);
    assert.ok(unit.tip.trim(), unit.id);
    assert.ok(unit.writing.trim(), unit.id);
    for (const [en, zh] of unit.items) {
      assert.match(en, /[a-z]/i, unit.id);
      assert.match(en.trim(), /[.!?]["’”']?$/, unit.id);
      assert.match(zh, /[\u3400-\u9fff]/, unit.id);
    }
  }
});

test("each unit includes four usable glossary entries and three unambiguous four-option questions", () => {
  for (const unit of tradeUnits) {
    assert.equal(unit.glossary.length, 4, unit.id);
    assert.equal(new Set(unit.glossary.map((entry) => entry.term.trim().toLowerCase())).size, 4, unit.id);
    for (const entry of unit.glossary) {
      assert.ok(typeof entry.term === "string" && entry.term.trim(), unit.id);
      assert.match(entry.meaning, /[\u3400-\u9fff]/, unit.id);
      assert.match(entry.note, /[\u3400-\u9fff]/, unit.id);
    }
    assert.equal(unit.questions.length, 3, unit.id);
    for (const question of unit.questions) {
      assert.ok(question.prompt.trim(), unit.id);
      assert.equal(question.options.length, 4, unit.id);
      assert.ok(question.options.every((option) => typeof option === "string" && option.trim()), unit.id);
      assert.equal(new Set(question.options).size, 4, unit.id);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, unit.id);
      assert.ok(question.explanation.length >= 10, unit.id);
      assert.match(question.explanation, /[\u3400-\u9fff]/, unit.id);
    }
  }
});

test("the shared practice engine produces 120 valid tasks without changing workplace sources", () => {
  const before = structuredClone(tradeUnits);
  let total = 0;
  for (const unit of tradeUnits) {
    const tasks = textbookTasks(unit, () => 0.5);
    assert.equal(tasks.length, 5, unit.id);
    assert.equal(tasks.filter((task) => task.kind === "grammar").length, 3, unit.id);
    assert.equal(tasks.filter((task) => task.kind === "listen").length, 2, unit.id);
    for (const task of tasks) {
      assert.equal(task.options.length, 4, unit.id);
      assert.equal(new Set(task.options).size, 4, unit.id);
      assert.ok(task.answer >= 0 && task.answer < task.options.length, unit.id);
      assert.ok(task.explanation.trim(), unit.id);
      if (task.kind === "listen") {
        const source = unit.items.find((item) => item[0] === task.text);
        assert.ok(source, unit.id);
        assert.equal(task.options[task.answer], source[1], unit.id);
      }
    }
    total += tasks.length;
  }
  assert.equal(total, 120);
  assert.deepEqual(tradeUnits, before);
});

test("workplace completion IDs and drafts merge with old study data and survive reload", () => {
  const original = defaults();
  original.completedLessons = ["hello", "work", ...textbookUnits.map((unit) => unit.id)];
  original.records["path-nce-1"] = { chapter: 2, sentence: 3, offset: 17, updated: 1000, drafts: { "nce-b1-u01": "My earlier textbook draft." } };
  original.records["classic-alice"] = { chapter: 4, sentence: 12, offset: 35, updated: 2000 };
  const incoming = defaults();
  incoming.completedLessons = tradeUnits.map((unit) => unit.id);
  for (const book of tradeBooks) {
    incoming.records[book.id] = {
      chapter: 2, sentence: 4, offset: 9, updated: 3000,
      drafts: Object.fromEntries(tradeUnits.filter((unit) => unit.bookId === book.id).map((unit) => [unit.id, `A message for ${unit.id}.\n第二行草稿 & details.`])),
    };
  }
  const before = structuredClone(original);
  const backup = JSON.parse(JSON.stringify({ format: "english-studio-v4", data: incoming }));
  const merged = mergeBackup(original, backup);
  const twice = mergeBackup(merged, backup);
  assert.deepEqual(original, before);
  assert.equal(twice.completedLessons.length, original.completedLessons.length + 24);
  for (const id of [...original.completedLessons, ...incoming.completedLessons]) assert.ok(twice.completedLessons.includes(id), id);
  assert.deepEqual(twice.records["path-nce-1"], original.records["path-nce-1"]);
  assert.deepEqual(twice.records["classic-alice"], original.records["classic-alice"]);
  for (const book of tradeBooks) assert.deepEqual(twice.records[book.id], incoming.records[book.id]);
  const persisted = JSON.stringify(twice);
  const reloaded = load({ getItem: (key) => key === KEY ? persisted : null });
  assert.deepEqual(reloaded.completedLessons, twice.completedLessons);
  assert.deepEqual(reloaded.records, twice.records);
});

test("workplace unit and practice views escape learning text and personal output", () => {
  const source = tradeUnits[0];
  const book = structuredClone(tradeBooks.find((book) => book.id === source.bookId));
  const track = tradeTracks.find((track) => track.id === source.track);
  const unit = structuredClone(source);
  unit.title = "现场 <位置> & 确认";
  unit.tip = '<img src=x onerror="run()">中文说明';
  unit.glossary[0] = { term: '<img src=x onerror="run()">', meaning: "物品 <名称>", note: "确认 & 复述" };
  const draft = '</textarea><script>run()</script>\n我的现场草稿 & note';
  const html = renderTradeUnit({ book, track, unit, draft });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.match(html, /现场 &lt;位置&gt; &amp; 确认/);
  assert.match(html, /物品 &lt;名称&gt;/);
  assert.match(html, /确认 &amp; 复述/);
  assert.match(html, /&lt;\/textarea&gt;&lt;script&gt;/);
  assert.match(html, /我的现场草稿 &amp; note/);

  unit.questions[0] = {
    prompt: '<img src=x onerror="run()"> Which message is clearer?',
    options: ["<script>run()</script>", "A plain message", "Another message", "The last message"],
    answer: 1,
    explanation: "选择清楚的消息。",
  };
  let practiceHTML = "";
  const practice = new TextbookPractice({
    render: (value) => { practiceHTML = value; },
    onComplete: () => {}, onExit: () => {}, onSpeak: () => {}, random: () => 0.5,
  });
  assert.equal(practice.start(unit), true);
  assert.ok(!practiceHTML.includes("<img"));
  assert.ok(!practiceHTML.includes("<script>"));
  assert.match(practiceHTML, /&lt;img/);
  assert.match(practiceHTML, /&lt;script&gt;/);
});
