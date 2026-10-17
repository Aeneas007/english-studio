import test from "node:test";
import assert from "node:assert/strict";
import { textbookBooks, textbookUnits } from "../studio/textbook-data.mjs";
import { defaults, KEY, load, mergeBackup, validBook } from "../studio/core.mjs";
import { renderTextbookUnit } from "../studio/textbook-ui.mjs";

test("four original companion volumes have eight stable, distinct units each", () => {
  assert.equal(textbookBooks.length, 4);
  assert.equal(textbookUnits.length, 32);
  assert.equal(new Set(textbookBooks.map((book) => book.id)).size, 4);
  assert.equal(new Set(textbookUnits.map((unit) => unit.id)).size, 32);
  for (const [index, book] of textbookBooks.entries()) {
    assert.equal(book.id, `path-nce-${index + 1}`);
    assert.equal(book.course, index + 1);
    assert.equal(book.chapters.length, 8);
    assert.equal(book.collection, "textbook");
    assert.ok(validBook(book));
    assert.match(book.description, /原创/);
    assert.match(book.description, /不是原版/);
    assert.match(book.description, /建议难度/);
    const units = textbookUnits.filter((unit) => unit.book === book.course);
    assert.equal(units.length, 8);
    assert.deepEqual(units.map((unit) => unit.chapter), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(units.map((unit) => unit.id), Array.from({ length: 8 }, (_, chapter) => `nce-b${index + 1}-u${String(chapter + 1).padStart(2, "0")}`));
  }
  assert.deepEqual(textbookBooks.map((book) => book.level), ["A1", "A2", "B1", "B2"]);
});

test("each original unit has a coherent six-sentence bilingual source shared by reading and practice", () => {
  const openings = new Set();
  for (const unit of textbookUnits) {
    const book = textbookBooks.find((book) => book.course === unit.book);
    const chapter = book.chapters[unit.chapter];
    assert.equal(unit.items.length, 6, unit.id);
    assert.deepEqual(chapter.lines.map((line) => line.slice(0, 2)), unit.items, unit.id);
    assert.equal(chapter.title, unit.englishTitle);
    assert.ok(unit.focus.length >= 5, unit.id);
    assert.ok(unit.tip.length >= 25, unit.id);
    assert.ok(unit.writing.length >= 10, unit.id);
    for (const [en, zh] of unit.items) {
      assert.match(en, /[a-z]/i, unit.id);
      assert.match(en, /[.!?]["’”']?$/, unit.id);
      assert.match(zh, /[\u3400-\u9fff]/, unit.id);
    }
    openings.add(unit.items[0][0]);
  }
  assert.equal(openings.size, 32);
});

test("all ninety-six original questions have four unique choices and specific Chinese feedback", () => {
  assert.equal(textbookUnits.reduce((sum, unit) => sum + unit.questions.length, 0), 96);
  for (const unit of textbookUnits) {
    assert.equal(unit.questions.length, 3, unit.id);
    for (const question of unit.questions) {
      assert.ok(question.prompt.trim(), unit.id);
      assert.equal(question.options.length, 4, unit.id);
      assert.equal(new Set(question.options).size, 4, unit.id);
      assert.ok(question.options.every((option) => typeof option === "string" && option.trim()), unit.id);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, unit.id);
      assert.ok(question.explanation.length >= 15, unit.id);
      assert.match(question.explanation, /[\u3400-\u9fff]/, unit.id);
    }
  }
});

test("all unit completion IDs and output drafts survive storage and v4 backup merging", () => {
  const state = defaults();
  state.completedLessons = ["hello", ...textbookUnits.map((unit) => unit.id)];
  for (const book of textbookBooks) {
    state.records[book.id] = {
      chapter: 3, sentence: 2, offset: 17, updated: 1234,
      drafts: Object.fromEntries(textbookUnits.filter((unit) => unit.book === book.course).map((unit) => [unit.id, `My draft for ${unit.id}.\n第二行保留。`])),
    };
  }
  const serialized = JSON.stringify(state);
  const loaded = load({ getItem: (key) => key === KEY ? serialized : null });
  assert.deepEqual(loaded.completedLessons, state.completedLessons);
  assert.deepEqual(loaded.records, state.records);
  const current = defaults();
  current.completedLessons = ["work"];
  const backup = JSON.parse(JSON.stringify({ format: "english-studio-v4", data: state }));
  const merged = mergeBackup(current, backup);
  const twice = mergeBackup(merged, backup);
  assert.deepEqual(new Set(merged.completedLessons), new Set(["work", ...state.completedLessons]));
  assert.equal(twice.completedLessons.length, 34);
  assert.deepEqual(twice.records, state.records);
  assert.equal(current.records["path-nce-1"], undefined);
});

test("companion content cannot replace the reserved IDs of personal imported textbooks", () => {
  assert.ok(textbookBooks.every((book) => !/^nce-[1-4]$/.test(book.id)));
  const state = defaults();
  state.imports = [{ id: "nce-1", title: "个人教材", zh: "个人教材", chapters: [{ title: "Lesson 1", lines: [["My own text.", "自己的正文。"]] }] }];
  const restored = mergeBackup(defaults(), JSON.parse(JSON.stringify({ format: "english-studio-v4", data: state })));
  assert.equal(restored.imports[0].id, "nce-1");
  assert.equal(restored.imports[0].chapters[0].lines[0][0], "My own text.");
});

test("Chinese learning text and personal writing are escaped by the unit renderer", () => {
  const book = textbookBooks[0];
  const unit = { ...textbookUnits[0], title: "阅读 <初阶> & 自测", tip: '<img src=x onerror="run()">中文讲解', writing: "使用 < 和 > 比较表达。" };
  const draft = '</textarea><script>run()</script>\n我的英文 & 草稿';
  const html = renderTextbookUnit({ book, unit, draft });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.match(html, /阅读 &lt;初阶&gt; &amp; 自测/);
  assert.match(html, /&lt;\/textarea&gt;&lt;script&gt;/);
  assert.match(html, /我的英文 &amp; 草稿/);
});
