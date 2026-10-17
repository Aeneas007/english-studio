import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  candidates,
  wordRoot,
  textChapters,
  load,
  mergeBackup,
  schedule,
  progress,
  defaults,
} from "../studio/core.mjs";
import { splitForTranslation } from "../studio/lexicon.mjs";
import { epubTextChapters } from "../studio/imports.mjs";
test("dictionary tries exact form before irregular and inflected roots", () => {
  assert.equal(candidates("Children")[0], "children");
  assert.ok(candidates("children").includes("child"));
  assert.ok(candidates("running").includes("run"));
  assert.ok(candidates("studies").includes("study"));
  assert.ok(candidates("Alice’s").includes("alice"));
});
test("common irregular verbs retain the selected spelling before their base form", () => {
  const forms = {
    spent: "spend", stole: "steal", stolen: "steal", kept: "keep",
    left: "leave", held: "hold", met: "meet", heard: "hear", lost: "lose",
    paid: "pay", sold: "sell", sent: "send", slept: "sleep", stood: "stand",
    understood: "understand", began: "begin", broken: "break", caught: "catch",
    chosen: "choose", drawn: "draw", drove: "drive", fallen: "fall",
    forgotten: "forget", grown: "grow", hidden: "hide", made: "make",
    meant: "mean", ridden: "ride", shaken: "shake", shown: "show",
    spoken: "speak", taught: "teach", thrown: "throw", worn: "wear",
  };
  for (const [form, root] of Object.entries(forms)) {
    const options = candidates(form);
    assert.equal(options[0], form, form);
    assert.equal(options[1], root, form);
    assert.equal(options.filter((option) => option === root).length, 1, form);
  }
});
test("base-form hints do not replace ambiguous exact meanings or invent roots", () => {
  assert.equal(wordRoot("“SPENT!”"), "spend");
  assert.equal(wordRoot("left"), "leave");
  assert.equal(wordRoot("saw"), "see");
  assert.equal(candidates("left")[0], "left");
  assert.equal(candidates("saw")[0], "saw");
  assert.equal(wordRoot("running"), "running");
  assert.equal(wordRoot("book"), "book");
  assert.equal(wordRoot("constructor"), "constructor");
  assert.ok(candidates("constructor").every((option) => typeof option === "string"));
});
test("textbook imports preserve Lesson boundaries and prose", () => {
  const c = textChapters(
    "Lesson 1\nHello there.\n\nLesson 2\nA new day begins.",
  );
  assert.equal(c.length, 2);
  assert.equal(c[1].title, "Lesson 2");
  assert.equal(c[1].lines[0][0], "A new day begins.");
});

test("Chinese lesson headings and a single numbered lesson retain their body", () => {
  const chapters = textChapters("第1课\nA quiet morning.\n\n第十二课：小河\nThe river is wide.");
  assert.deepEqual(chapters.map((chapter) => chapter.title), ["第1课", "第十二课：小河"]);
  assert.deepEqual(chapters.map((chapter) => chapter.lines[0][0]), ["A quiet morning.", "The river is wide."]);
  const single = textChapters("Lesson 7 A New Path\nWe walk home together.");
  assert.equal(single[0].title, "Lesson 7 A New Path");
  assert.equal(single[0].lines[0][0], "We walk home together.");
});

test("lesson parsing keeps introductory prose and does not split prose mentions", () => {
  const chapters = textChapters("Welcome to this short course.\n\nLesson 1\nI read Lesson 2 at home.\n\nLesson 2\nWe visit the park.");
  assert.deepEqual(chapters.map((chapter) => chapter.title), ["Introduction", "Lesson 1", "Lesson 2"]);
  assert.equal(chapters[0].lines[0][0], "Welcome to this short course.");
  assert.equal(chapters[1].lines[0][0], "I read Lesson 2 at home.");
});

test("one EPUB spine document can preserve multiple English or Chinese lessons", () => {
  const chapters = epubTextChapters("Lesson 1\nWe open the gate.\n\nLesson 2\nA friend brings a map.", "Book One", 8);
  assert.deepEqual(chapters.map((chapter) => chapter.title), ["Lesson 1", "Lesson 2"]);
  assert.equal(chapters[1].lines[0][0], "A friend brings a map.");
  const chinese = epubTextChapters("第1课\nWe open the gate.\n\n第2课\nA friend brings a map.");
  assert.deepEqual(chinese.map((chapter) => chapter.title), ["第1课", "第2课"]);
  const ordinary = epubTextChapters("The lantern is red. ".repeat(80), "The Lantern", 8);
  assert.equal(ordinary.length, 1);
  assert.equal(ordinary[0].title, "The Lantern");
  assert.equal(ordinary[0].lines.length, 80);
});
test("old reading data, word examples and preferences migrate without loss", () => {
  const entries = {
    "english-studio-reading-v2": JSON.stringify({
      records: { morning: { chapter: 2, sentence: 3 } },
      imports: [],
      notes: [{ book: "morning", text: "note" }],
      settings: { speed: 1.3, translation: true },
    }),
    "english-studio-v1": JSON.stringify({
      words: [{ w: "journey", meaning: "旅程", example: "A journey begins." }],
    }),
  };
  const state = load({ getItem: (k) => entries[k] });
  assert.equal(state.records.morning.chapter, 2);
  assert.equal(state.terms[0].example, "A journey begins.");
  assert.equal(state.settings.rate, 1.3);
  assert.equal(state.settings.translations, true);
});
test("invalid backup cannot mutate current records", () => {
  const state = defaults();
  const before = JSON.stringify(state);
  assert.throws(() =>
    mergeBackup(state, {
      format: "english-studio-v4",
      data: { imports: [{ id: "broken" }], terms: [] },
    }),
  );
  assert.equal(JSON.stringify(state), before);
});
test("backup merge does not duplicate saved words", () => {
  const state = defaults();
  state.terms = [{ w: "book", meaning: "书" }];
  const merged = mergeBackup(state, {
    format: "english-studio-v4",
    data: {
      imports: [],
      terms: [
        { w: "book", meaning: "另一个释义" },
        { w: "garden", meaning: "花园" },
      ],
    },
  });
  assert.equal(merged.terms.length, 2);
  assert.equal(merged.terms[0].meaning, "书");
  assert.equal(state.terms.length, 1);
});
test("backup roundtrip restores study data without doubling totals or enabling translation", () => {
  const state = defaults();
  state.daily = { "2026-10-16": { seconds: 30, reviews: 1 } };
  const data = defaults();
  data.daily = { "2026-10-16": { seconds: 60, reviews: 3 } };
  data.settings.size = 26;
  data.settings.online = true;
  data.translations = { "A quiet morning.": "安静的早晨。" };
  data.completedLessons = ["hello"];
  data.terms = [{ w: "hello", meaning: "你好" }];
  const merged = mergeBackup(state, { format: "english-studio-v4", data });
  const again = mergeBackup(merged, { format: "english-studio-v4", data });
  assert.equal(again.daily["2026-10-16"].seconds, 60);
  assert.equal(again.daily["2026-10-16"].reviews, 3);
  assert.equal(again.settings.size, 26);
  assert.equal(again.settings.online, false);
  assert.equal(again.translations["A quiet morning."], "安静的早晨。");
  assert.deepEqual(again.completedLessons, ["hello"]);
  assert.equal(again.terms[0].status, "learning");
  assert.ok(Number.isFinite(again.terms[0].due));
});
test("reading offsets and pending study IDs survive storage and backup roundtrips", () => {
  const data = defaults();
  data.records = {
    morning: {
      chapter: 1,
      sentence: 3,
      offset: 27,
      studyPending: ["term-bank", "term-spend"],
      updated: 200,
    },
    classic: { chapter: 0, sentence: 1, updated: 50 },
  };
  const fromStorage = (state) =>
    load({ getItem: (key) => key === "english-studio-v4" ? JSON.stringify(state) : null });
  const loaded = fromStorage(data);
  assert.deepEqual(loaded.records.morning, data.records.morning);
  assert.equal(loaded.records.classic.offset, undefined);
  assert.equal(loaded.records.classic.studyPending, undefined);

  const current = defaults();
  current.records.morning = {
    chapter: 0, sentence: 0, offset: 0, studyPending: [], updated: 100,
  };
  const backup = JSON.parse(JSON.stringify({ format: "english-studio-v4", data: loaded }));
  const restored = fromStorage(mergeBackup(current, backup));
  assert.deepEqual(restored.records.morning, data.records.morning);
  assert.deepEqual(restored.records.classic, data.records.classic);
  assert.equal(current.records.morning.offset, 0);
  assert.deepEqual(current.records.morning.studyPending, []);

  const older = structuredClone(backup);
  older.data.records.morning.offset = 5;
  older.data.records.morning.studyPending = [];
  older.data.records.morning.updated = 150;
  assert.deepEqual(mergeBackup(restored, older).records.morning, restored.records.morning);
});
test("review scheduling distinguishes recall difficulty", () => {
  const term = { w: "book", interval: 2, repetitions: 2 };
  assert.equal(schedule(term, "again", 1000).due, 601000);
  assert.equal(schedule(term, "good", 1000).interval, 5);
  assert.equal(schedule(term, "easy", 1000).status, "known");
  assert.equal(term.repetitions, 2);
});
test("reading progress counts actual sentences across chapters", () => {
  const book = { chapters: [{ lines: [1, 2] }, { lines: [3, 4, 5] }] };
  assert.equal(progress(book, 1, 1), 60);
  assert.equal(progress({ chapters: [] }, 0, 0), 0);
});
test("translation requests obey provider UTF-8 byte limit", () => {
  const parts = splitForTranslation("A quiet morning. ".repeat(100));
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => new TextEncoder().encode(p).length <= 500));
});
test("full KJV assets contain 66 books, 1189 chapters, 31102 verses", () => {
  const files = fs
    .readdirSync(new URL("../bible/", import.meta.url))
    .filter((f) => f.endsWith(".json"));
  let chapters = 0,
    verses = 0;
  for (const f of files) {
    const b = JSON.parse(
      fs.readFileSync(new URL("../bible/" + f, import.meta.url)),
    );
    chapters += b.chapters.length;
    verses += b.chapters.reduce((n, c) => n + c.lines.length, 0);
  }
  assert.equal(files.length, 66);
  assert.equal(chapters, 1189);
  assert.equal(verses, 31102);
});
test("large dictionary resolves words that old demo glossary could not", () => {
  const d = JSON.parse(
    fs.readFileSync(new URL("../lexicon/cu.json", import.meta.url)),
  );
  assert.ok(d.curiosity?.[1]);
  const a = JSON.parse(
    fs.readFileSync(new URL("../lexicon/ab.json", import.meta.url)),
  );
  assert.ok(a.abandon?.[1]);
});
