import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { SOURCES } from "../scripts/build-classics.mjs";

const root = new URL("../", import.meta.url);
const readBook = async (slug) => JSON.parse(await fs.readFile(new URL(`content/${slug}.json`, root), "utf8"));

test("the library retains its existing classics and adds nine complete titles with matching directories", async () => {
  const context = { window: { READING_BOOKS: [] } };
  vm.runInNewContext(await fs.readFile(new URL("classics-catalog.js", root), "utf8"), context);
  const catalog = JSON.parse(JSON.stringify(context.window.READING_BOOKS));
  assert.equal(catalog.length, 12);
  assert.equal(new Set(catalog.map((book) => book.id)).size, 12);
  assert.deepEqual(catalog.slice(0, 3).map((book) => [book.id, book.chapters.length]), [["classic-alice", 12], ["classic-treasure", 34], ["classic-garden", 27]]);
  for (const source of SOURCES) {
    const book = await readBook(source.slug), entry = catalog.find((b) => b.id === book.id);
    assert.equal(book.chapters.length, source.chapters, source.slug);
    assert.deepEqual(entry.chapters.map((chapter) => chapter.title), book.chapters.map((chapter) => chapter.title));
    assert.ok(book.chapters.every((chapter) => chapter.lines.length > 0));
    assert.ok(book.chapters.every((chapter) => chapter.lines.every((line) => typeof line[0] === "string" && line[0].trim())));
  }
});

test("Les Miserables retains five volumes and 365 chapters with separate preface and notes", async () => {
  const book = await readBook("les-miserables"), narrative = book.chapters.filter((c) => c.section === "chapter");
  assert.equal(narrative.length, 365);
  assert.deepEqual(["I", "II", "III", "IV", "V"].map((volume) => narrative.filter((c) => c.volume === volume).length), [70, 76, 76, 76, 67]);
  assert.equal(new Set(narrative.map((c) => c.volume + "/" + c.book)).size, 48);
  assert.equal(book.chapters[0].section, "preface");
  assert.match(narrative[0].lines[0][0], /^In 1815, M\. Charles/);
  assert.match(narrative.at(-1).title, /GRASS COVERS AND THE RAIN EFFACES/);
  assert.equal(narrative.at(-1).lines.length, 5);
  assert.match(narrative.at(-1).lines.at(-1)[0], /^Il dort\./);
  assert.equal(book.chapters.filter((c) => c.section === "appendix").length, 1);
  assert.equal(book.chapters.at(-1).section, "notes");
  assert.match(book.chapters.at(-1).lines.at(-1)[0], /^70 \(return\)/);
  assert.ok(narrative.every((c) => !c.lines.some((line) => /^FOOTNOTES:$/.test(line[0]))));
});

test("source hashes, full licenses and rendered word totals remain traceable for every new title", async () => {
  for (const source of SOURCES) {
    const raw = await fs.readFile(new URL(`content/sources/${source.slug}.txt`, root));
    assert.equal(createHash("sha256").update(raw).digest("hex"), source.sha256, source.slug);
    const book = await readBook(source.slug);
    assert.equal(book.sourceSha256, source.sha256);
    assert.match(book.sourceLicense, /PROJECT GUTENBERG/i);
    assert.match(book.sourceLicense, /LICENSE/i);
    assert.equal(book.source, `https://www.gutenberg.org/ebooks/${source.pg}`);
    const words = book.chapters.reduce((sum, c) => sum + c.lines.reduce((n, line) => n + (line[0].match(/[A-Za-z]+/g) || []).length, 0), 0);
    assert.equal(book.wordCount, words);
    assert.ok(words > 15000, source.slug);
    assert.ok(book.chapters.every((c) => !c.lines.some((line) => /END OF THE PROJECT GUTENBERG|START: FULL LICENSE/.test(line[0]))));
  }
});

test("the Aesop edition exposes each of its 313 fables once and excludes its index", async () => {
  const book = await readBook("aesop"), fables = book.chapters.filter((c) => c.section === "fable");
  assert.equal(fables.length, 313);
  assert.equal(new Set(fables.map((c) => JSON.stringify(c.lines))).size, 313);
  assert.ok(!book.chapters.some((c) => c.title === "INDEX"));
  assert.equal(book.chapters.at(-1).section, "notes");
});
