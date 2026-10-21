import test from "node:test";
import assert from "node:assert/strict";
import { buildSpeechUnits, speechUnitAt } from "../studio/speech-units.mjs";

function assertSourcePreserved(lines, units) {
  for (const [index, line] of lines.entries()) {
    if (!Array.isArray(line) || typeof line[0] !== "string" || !line[0].trim()) continue;
    const matching = units.filter((unit) => unit.index === index);
    assert.equal(matching.map((unit) => unit.text).join(""), line[0]);
    assert.equal(matching[0].start, 0);
    assert.equal(matching[matching.length - 1].end, line[0].length);
    for (const [position, unit] of matching.entries()) {
      assert.equal(unit.text, line[0].slice(unit.start, unit.end));
      assert.ok(unit.text.trim());
      if (position) assert.equal(unit.start, matching[position - 1].end);
    }
  }
}

function withFallback(run) {
  const original = Intl.Segmenter;
  Intl.Segmenter = undefined;
  try { run(); } finally { Intl.Segmenter = original; }
}

test("sentence units retain punctuation, quotes and all sentence-spacing offsets", () => {
  const text = "  He said, “Wait here.”  Then he left!\tWas the gate open?\n  ";
  const lines = [[text, "译文"]];
  const before = structuredClone(lines);
  const units = buildSpeechUnits(lines);
  assert.equal(units.length, 3);
  assertSourcePreserved(lines, units);
  assert.deepEqual(lines, before);
  assert.equal(speechUnitAt(units, 0, text.indexOf("Then")), 1);
  assert.equal(speechUnitAt(units, 0, text.indexOf("Was")), 2);
  assert.equal(speechUnitAt(units, 0, units[0].end - 1), 0);
  assert.equal(speechUnitAt(units, 0, units[0].end), 1);
});

test("common titles, initials, decimal points and inline abbreviations do not become short utterances", () => {
  const lines = [["Dr. Rowan met Mr. Lee and J. R. Brown at 3.5 p.m. today. They left later."]];
  const units = buildSpeechUnits(lines);
  assert.equal(units.length, 2);
  assert.ok(units[0].text.includes("Dr. Rowan met Mr. Lee"));
  assert.ok(units[0].text.includes("J. R. Brown"));
  assert.ok(units[0].text.includes("3.5 p.m. today."));
  assertSourcePreserved(lines, units);
});

test("a cautious punctuation fallback preserves abbreviations, decimals and sentence whitespace", () => {
  withFallback(() => {
    const text = "Dr. Rowan met Mr. Lee at 3.5 p.m. today.  She brought a map, e.g. a street plan.\nNext stop!";
    const lines = [[text]];
    const units = buildSpeechUnits(lines);
    assert.equal(units.length, 3);
    assert.ok(units[0].text.includes("Mr. Lee at 3.5 p.m."));
    assert.ok(units[1].text.includes("e.g. a street plan."));
    assertSourcePreserved(lines, units);
    const acronym = buildSpeechUnits([["She lives in the U.S. They will visit."]]);
    assert.equal(acronym.length, 2);
  });
});

test("long original sentences split into safe word-boundary chunks with lossless anchors", () => {
  const text = "The team checked the old map and followed the quiet riverside path, ".repeat(45) + "until they reached the bridge.";
  const lines = [[text]];
  const units = buildSpeechUnits(lines);
  assert.ok(units.length > 3);
  assert.ok(units.every((unit) => unit.text.length <= 700));
  assertSourcePreserved(lines, units);
  for (const unit of units.slice(1)) {
    assert.match(text[unit.start - 1], /\s/);
    assert.equal(speechUnitAt(units, 0, unit.start), units.indexOf(unit));
  }
});

test("unusually long single words remain intact and Unicode source offsets remain valid", () => {
  const longWord = "a".repeat(950);
  const text = "🌱 A note for the team: " + longWord + " before the final words.";
  const lines = [[text]];
  const units = buildSpeechUnits(lines);
  assert.ok(units.some((unit) => unit.text.includes(longWord)));
  assertSourcePreserved(lines, units);
  assert.equal(speechUnitAt(units, 0, text.indexOf(longWord) + 800), units.findIndex((unit) => unit.text.includes(longWord)));
});

test("source line indices survive empty, whitespace-only and invalid rows", () => {
  const lines = [["First one. Second one."], [""], [" \t\n"], null, [42], ["Last source line."]];
  const units = buildSpeechUnits(lines);
  assert.deepEqual(units.map((unit) => unit.index), [0, 0, 5]);
  assertSourcePreserved(lines, units);
  assert.equal(speechUnitAt(units, 0, lines[0][0].length), 2);
  assert.equal(speechUnitAt(units, 2, 0), 2);
  assert.equal(speechUnitAt(units, 5, lines[5][0].length), 2);
  assert.equal(speechUnitAt(units, 0, 10000), 2);
});

test("anchors at exact boundaries advance and out-of-range anchors clamp consistently", () => {
  const units = buildSpeechUnits([["One sentence. Another sentence."], ["Final line."]]);
  assert.equal(speechUnitAt(units, 0, units[0].end), 1);
  assert.equal(speechUnitAt(units, 0, units[1].end), 2);
  assert.equal(speechUnitAt(units, -5, -50), 0);
  assert.equal(speechUnitAt(units, 999, 0), units.length - 1);
  assert.equal(speechUnitAt(units, Infinity, Infinity), units.length - 1);
  assert.equal(speechUnitAt(units, undefined, NaN), 0);
  for (const input of [undefined, null, {}, [], [[""]], [[" \n "]]]) {
    assert.deepEqual(buildSpeechUnits(input), []);
  }
  assert.equal(speechUnitAt([], 0, 0), 0);
});

test("sentence anchors stay identical across repeated calls and do not use page layout", () => {
  const lines = Object.freeze([
    Object.freeze(["A complete sentence crosses an imaginary page boundary without changing its speech unit. A second sentence follows.", "完整句子。"]),
    Object.freeze(["A separate source line remains separate.", "独立行。"]),
  ]);
  const first = buildSpeechUnits(lines);
  const second = buildSpeechUnits(lines);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.equal(first[0].text, lines[0][0].slice(0, lines[0][0].indexOf("A second")));
  assertSourcePreserved(lines, first);
});

test("a sentence ending in a letter is not mistaken for a person's initials", () => {
  const lines = [["They chose plan A. We checked the route.", "译文"]];
  for (const run of [() => buildSpeechUnits(lines), () => {
    let units;
    withFallback(() => { units = buildSpeechUnits(lines); });
    return units;
  }]) {
    const units = run();
    assert.equal(units.length, 2);
    assert.equal(units[0].text, "They chose plan A. ");
    assertSourcePreserved(lines, units);
  }
});

test("very long leading and trailing whitespace stays attached to spoken content", () => {
  const lines = [[" ".repeat(1000) + "A short sentence. Another one." + "\t".repeat(1000)]];
  const units = buildSpeechUnits(lines);
  assert.ok(units.every((unit) => unit.text.trim()));
  assertSourcePreserved(lines, units);
});