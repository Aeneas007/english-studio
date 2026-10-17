import test from "node:test";
import assert from "node:assert/strict";
import { buildReadingPages, findReadingPage } from "../studio/reader-layout.mjs";

const settings = {
  width: 100,
  height: 60,
  fontSize: 10,
  lineHeight: 2,
  paragraphGap: 0,
  firstPageInset: 0,
  measureText: (text) => text.length * 10,
};

test("long source paragraphs split across pages without changing source indices or offsets", () => {
  const text = "A quiet river flows through the garden. A small boat waits near the old stone bridge. ";
  const lines = [[text, "译文", null, true]];
  const before = structuredClone(lines);
  const pages = buildReadingPages(lines, settings);
  assert.ok(pages.length > 2);
  const fragments = pages.flatMap((page) => page.fragments);
  assert.equal(fragments.map((fragment) => fragment.text).join(""), text);
  for (const [i, fragment] of fragments.entries()) {
    assert.equal(fragment.index, 0);
    assert.equal(fragment.text, text.slice(fragment.start, fragment.end));
    if (i) {
      assert.equal(fragment.start, fragments[i - 1].end);
      assert.match(text[fragment.start - 1], /\s/);
    }
  }
  assert.deepEqual(lines, before);
});

test("page ranges keep legacy original-line indices, including skipped empty rows", () => {
  const lines = [["One two."], [""], ["Three four."], null, ["Five six."]];
  const pages = buildReadingPages(lines, { ...settings, width: 120, height: 40 });
  assert.equal(pages[0].start, 0);
  assert.equal(pages[0].end, 3);
  assert.equal(pages[1].start, 4);
  assert.equal(pages[1].end, 5);
  assert.deepEqual(pages.flatMap((page) => page.fragments.map((fragment) => fragment.index)), [0, 2, 4]);
});

test("first-page chapter inset reduces its capacity without producing empty pages", () => {
  const lines = [["one two three four five six seven eight nine ten eleven twelve"]];
  const ordinary = buildReadingPages(lines, settings);
  const inset = buildReadingPages(lines, { ...settings, firstPageInset: 40 });
  assert.ok(inset[0].fragments[0].end < ordinary[0].fragments[0].end);
  assert.ok(inset.every((page) => page.fragments.length > 0));
  const hugeInset = buildReadingPages(lines, { ...settings, firstPageInset: 1000 });
  assert.ok(hugeInset[0].fragments[0].text.trim());
  assert.deepEqual(hugeInset.slice(1).map((page) => page.fragments.length), inset.slice(1).map((page) => page.fragments.length));
});

test("new paragraphs pay a gap while continuation fragments do not", () => {
  const twoLines = [["one two"], ["three four"]];
  assert.equal(buildReadingPages(twoLines, { ...settings, height: 40 }).length, 1);
  assert.equal(buildReadingPages(twoLines, { ...settings, height: 40, paragraphGap: 18 }).length, 2);
  const continuing = [["one two three four five six"]];
  assert.deepEqual(
    buildReadingPages(continuing, { ...settings, height: 40, paragraphGap: 200 }),
    buildReadingPages(continuing, { ...settings, height: 40, paragraphGap: 0 }),
  );
});

test("character anchors resolve after width and font changes and prefer the next shared boundary", () => {
  const text = "One morning a curious girl followed a rabbit across a sunny field and into the woods.";
  const lines = [["Chapter opening."], [text]];
  const original = buildReadingPages(lines, settings);
  const changed = buildReadingPages(lines, { ...settings, width: 160, fontSize: 15 });
  const anchor = original.flatMap((page) => page.fragments).find((fragment) => fragment.index === 1 && fragment.start > 0);
  assert.ok(anchor);
  const pageIndex = findReadingPage(changed, anchor.index, anchor.start);
  assert.ok(changed[pageIndex].fragments.some((fragment) =>
    fragment.index === anchor.index && fragment.start <= anchor.start && fragment.end > anchor.start,
  ));
  const shared = original.flatMap((page, pageIndex) => page.fragments.map((fragment) => ({ ...fragment, pageIndex })))
    .filter((fragment) => fragment.index === 1);
  assert.equal(findReadingPage(original, 1, shared[1].start), shared[1].pageIndex);
  assert.equal(findReadingPage(original, 1, shared[0].end - 1), shared[0].pageIndex);
  assert.equal(findReadingPage(original, 1, text.length), shared[shared.length - 1].pageIndex);
});

test("empty or invalid inputs never produce empty pages and unknown anchors clamp", () => {
  for (const lines of [undefined, null, {}, [], [[""]], [[" \t\n "]], [null, {}]]) {
    assert.deepEqual(buildReadingPages(lines, settings), []);
  }
  const pages = buildReadingPages([["one two three four five six seven eight nine ten"]], {
    width: NaN, height: -1, fontSize: 0, lineHeight: Infinity,
    paragraphGap: -1, firstPageInset: -1, measureText: () => NaN,
  });
  assert.ok(pages.length);
  assert.ok(pages.every((page) => page.fragments.length));
  assert.equal(findReadingPage([], 0), 0);
  assert.equal(findReadingPage(pages, -100, -10), 0);
  assert.equal(findReadingPage(pages, 1000), pages.length - 1);
  assert.equal(findReadingPage(pages, 0, 100000), pages.length - 1);
});

test("long individual words remain intact and exact whitespace survives pagination", () => {
  const text = "  extraordinarywordwithoutspaces  tiny\tword\n next  ";
  const pages = buildReadingPages([[text]], { ...settings, width: 20, height: 20 });
  const fragments = pages.flatMap((page) => page.fragments);
  assert.equal(fragments.map((fragment) => fragment.text).join(""), text);
  assert.ok(fragments.some((fragment) => fragment.text.includes("extraordinarywordwithoutspaces")));
  assert.equal(fragments.map((fragment) => fragment.text).join("").replace(/\s/g, ""), text.replace(/\s/g, ""));
});
