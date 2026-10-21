const MAX_UNIT_LENGTH = 700;

function unsafeBoundary(text, offset) {
  const before = text.slice(Math.max(0, offset - 80), offset)
    .trimEnd().replace(/["'’”)\]]+$/g, "");
  const after = text.slice(offset).trimStart().replace(/^["'‘“(\[]+/, "");
  if (!after) return false;
  if (/\b(?:mr|mrs|ms|dr|prof|rev|fr)\.$/i.test(before) && /^[a-z]/i.test(after)) return true;
  if (/\b(?:e\.g|i\.e|vs)\.$/i.test(before)) return true;
  if (
    /(?:^|\s)[A-Z]\.$/.test(before) &&
    (
      /^[A-Z]\.(?:\s|$)/.test(after) ||
      /(?:^|\s)[A-Z]\.\s+[A-Z]\.$/.test(before) ||
      /^[A-Z]\.$/.test(before) ||
      /\b(?:mr|mrs|ms|dr|prof|rev|fr)\.\s+[A-Z]\.$/i.test(before)
    )
  ) return true;
  return /\.$/.test(before) && /^[a-z0-9]/.test(after);
}

function fallbackBoundaries(text) {
  const boundaries = [];
  const endings = /[.!?]+(?:["'’”)\]]+)?(?=\s|$)/g;
  for (const match of text.matchAll(endings)) {
    let end = match.index + match[0].length;
    while (end < text.length && /\s/.test(text[end])) end++;
    if (end < text.length && !unsafeBoundary(text, end)) boundaries.push(end);
  }
  return boundaries;
}

function sentenceBoundaries(text) {
  let candidates;
  try {
    if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") throw new Error();
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    candidates = [...segmenter.segment(text)].map((item) => item.index).slice(1);
  } catch {
    candidates = fallbackBoundaries(text);
  }
  const boundaries = [0];
  for (const offset of candidates) {
    if (
      offset > boundaries[boundaries.length - 1] &&
      text.slice(boundaries[boundaries.length - 1], offset).trim() &&
      text.slice(offset).trim() &&
      !unsafeBoundary(text, offset)
    ) boundaries.push(offset);
  }
  boundaries.push(text.length);
  return boundaries;
}

function chunkEnd(text, start, end) {
  if (end - start <= MAX_UNIT_LENGTH) return end;
  const limit = start + MAX_UNIT_LENGTH;
  let lastSpace = -1;
  for (let cut = limit; cut > start; cut--) {
    if (!/\s/.test(text[cut - 1]) || /\s/.test(text[cut])) continue;
    if (lastSpace === -1) lastSpace = cut;
    if (cut - start >= MAX_UNIT_LENGTH / 2 && /[,;:!?]$/.test(text.slice(start, cut).trimEnd())) return cut;
  }
  if (lastSpace > start) return lastSpace;
  // A word longer than the target stays intact, with its trailing whitespace.
  let cut = limit;
  let containsWord = Boolean(text.slice(start, limit).trim());
  while (cut < end) {
    if (!/\s/.test(text[cut - 1])) containsWord = true;
    if (containsWord && /\s/.test(text[cut - 1]) && !/\s/.test(text[cut])) break;
    cut++;
  }
  return cut;
}

export function buildSpeechUnits(lines) {
  const units = [];
  if (!Array.isArray(lines)) return units;
  for (const [index, line] of lines.entries()) {
    const text = Array.isArray(line) ? line[0] : null;
    if (typeof text !== "string" || !text.trim()) continue;
    const boundaries = sentenceBoundaries(text);
    for (let sentence = 0; sentence < boundaries.length - 1; sentence++) {
      let start = boundaries[sentence];
      const end = boundaries[sentence + 1];
      while (start < end) {
        const next = chunkEnd(text, start, end);
        const content = text.slice(start, next);
        const previous = units[units.length - 1];
        if (!content.trim() && previous?.index === index) {
          previous.end = next;
          previous.text += content;
        } else {
          units.push({ index, start, end: next, text: content });
        }
        start = next;
      }
    }
  }
  return units;
}

export function speechUnitAt(units, sourceIndex, offset = 0) {
  if (!Array.isArray(units) || !units.length) return 0;
  const index = typeof sourceIndex === "number" && !Number.isNaN(sourceIndex)
    ? Math.max(0, Math.floor(sourceIndex)) : 0;
  const position = typeof offset === "number" && !Number.isNaN(offset)
    ? Math.max(0, Math.floor(offset)) : 0;
  const found = units.findIndex((unit) =>
    unit.index > index || (unit.index === index && position < unit.end),
  );
  return found === -1 ? units.length - 1 : found;
}