const positive = (value, fallback) =>
  Number.isFinite(value) && value > 0 ? value : fallback;
const nonnegative = (value, fallback) =>
  Number.isFinite(value) && value >= 0 ? value : fallback;

function wrappedRows(text, width, measure) {
  if (!text.trim()) return [];
  const rows = [];
  const tokens = text.matchAll(/\S+\s*|\s+/g);
  let start = 0;
  let end = 0;
  let hasWord = false;
  for (const token of tokens) {
    const nextEnd = token.index + token[0].length;
    if (!token[0].trim()) {
      end = nextEnd;
      continue;
    }
    const candidate = text.slice(start, nextEnd).replace(/\s+/g, " ").trim();
    if (hasWord && measure(candidate) > width) {
      rows.push({ start, end: token.index });
      start = token.index;
    }
    end = nextEnd;
    hasWord = true;
  }
  if (end > start) rows.push({ start, end });
  return rows;
}

export function buildReadingPages(lines, options = {}) {
  const settings = options && typeof options === "object" ? options : {};
  const fontSize = positive(settings.fontSize, 21);
  const lineHeight = Math.min(2.3, Math.max(1.5, positive(settings.lineHeight, 1.9)));
  const rowHeight = fontSize * lineHeight;
  const width = positive(settings.width, 320);
  const height = Math.max(rowHeight, positive(settings.height, 480));
  const paragraphGap = nonnegative(settings.paragraphGap, 18);
  const firstPageInset = nonnegative(settings.firstPageInset, 72);
  const approximate = (text) => Array.from(text).length * fontSize * 0.52;
  const measure = (text) => {
    if (typeof settings.measureText !== "function") return approximate(text);
    const measured = settings.measureText(text);
    return Number.isFinite(measured) && measured >= 0 ? measured : approximate(text);
  };
  const pages = [];
  let fragments = [];
  let usedHeight = 0;
  const availableHeight = () =>
    Math.max(rowHeight, height - (pages.length === 0 ? firstPageInset : 0));
  const finishPage = () => {
    if (!fragments.length) return;
    pages.push({
      start: fragments[0].index,
      end: fragments[fragments.length - 1].index + 1,
      fragments,
    });
    fragments = [];
    usedHeight = 0;
  };

  for (const [index, source] of (Array.isArray(lines) ? lines : []).entries()) {
    const text = typeof source === "string" ? source : source?.[0];
    if (typeof text !== "string") continue;
    const rows = wrappedRows(text, width, measure);
    for (const [rowIndex, row] of rows.entries()) {
      let gap = rowIndex === 0 && fragments.length ? paragraphGap : 0;
      if (fragments.length && usedHeight + gap + rowHeight > availableHeight() + 0.001) {
        finishPage();
        gap = 0;
      }
      const previous = fragments[fragments.length - 1];
      if (previous?.index === index && previous.end === row.start) {
        previous.end = row.end;
        previous.text = text.slice(previous.start, row.end);
      } else {
        fragments.push({ index, start: row.start, end: row.end, text: text.slice(row.start, row.end) });
      }
      usedHeight += gap + rowHeight;
    }
  }
  finishPage();
  return pages;
}

export function findReadingPage(pages, index, offset = 0) {
  if (!Array.isArray(pages) || !pages.length) return 0;
  const targetIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const targetOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const entries = pages.flatMap((page, pageIndex) =>
    (page.fragments || []).map((fragment) => ({ pageIndex, ...fragment })),
  );
  const matching = entries.filter((fragment) => fragment.index === targetIndex);
  if (matching.length) {
    const containing = matching.find((fragment) =>
      targetOffset >= fragment.start && targetOffset < fragment.end,
    );
    if (containing) return containing.pageIndex;
    if (targetOffset < matching[0].start) return matching[0].pageIndex;
    return matching[matching.length - 1].pageIndex;
  }
  return entries.find((fragment) => fragment.index > targetIndex)?.pageIndex ?? pages.length - 1;
}
