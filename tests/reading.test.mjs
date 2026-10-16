import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  candidates,
  textChapters,
  load,
  mergeBackup,
  schedule,
  progress,
  defaults,
} from "../studio/core.mjs";
import { splitForTranslation } from "../studio/lexicon.mjs";
test("dictionary tries exact form before irregular and inflected roots", () => {
  assert.equal(candidates("Children")[0], "children");
  assert.ok(candidates("children").includes("child"));
  assert.ok(candidates("running").includes("run"));
  assert.ok(candidates("studies").includes("study"));
  assert.ok(candidates("Alice’s").includes("alice"));
});
test("textbook imports preserve Lesson boundaries and prose", () => {
  const c = textChapters(
    "Lesson 1\nHello there.\n\nLesson 2\nA new day begins.",
  );
  assert.equal(c.length, 2);
  assert.equal(c[1].title, "Lesson 2");
  assert.equal(c[1].lines[0][0], "A new day begins.");
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
