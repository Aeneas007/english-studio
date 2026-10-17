export const KEY = "english-studio-v4";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const normalize = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^[^a-z]+|[^a-z]+$/g, "")
    .trim();
const irregularForms = Object.freeze({
  went: "go",
  gone: "go",
  was: "be",
  were: "be",
  been: "be",
  am: "be",
  is: "be",
  are: "be",
  had: "have",
  has: "have",
  did: "do",
  done: "do",
  does: "do",
  children: "child",
  men: "man",
  women: "woman",
  mice: "mouse",
  feet: "foot",
  teeth: "tooth",
  better: "good",
  best: "good",
  worse: "bad",
  worst: "bad",
  bought: "buy",
  brought: "bring",
  thought: "think",
  said: "say",
  told: "tell",
  saw: "see",
  seen: "see",
  took: "take",
  taken: "take",
  wrote: "write",
  written: "write",
  gave: "give",
  given: "give",
  felt: "feel",
  found: "find",
  knew: "know",
  known: "know",
  ran: "run",
  sat: "sit",
  ate: "eat",
  eaten: "eat",
  arose: "arise",
  arisen: "arise",
  awoke: "awake",
  awoken: "awake",
  became: "become",
  began: "begin",
  begun: "begin",
  bent: "bend",
  bound: "bind",
  bit: "bite",
  bitten: "bite",
  bled: "bleed",
  blew: "blow",
  blown: "blow",
  broke: "break",
  broken: "break",
  built: "build",
  burnt: "burn",
  caught: "catch",
  chose: "choose",
  chosen: "choose",
  clung: "cling",
  came: "come",
  crept: "creep",
  dealt: "deal",
  dug: "dig",
  drew: "draw",
  drawn: "draw",
  dreamt: "dream",
  drank: "drink",
  drunk: "drink",
  drove: "drive",
  driven: "drive",
  fell: "fall",
  fallen: "fall",
  fed: "feed",
  fought: "fight",
  fled: "flee",
  flew: "fly",
  flown: "fly",
  forbade: "forbid",
  forbidden: "forbid",
  forgot: "forget",
  forgotten: "forget",
  forgave: "forgive",
  forgiven: "forgive",
  froze: "freeze",
  frozen: "freeze",
  got: "get",
  gotten: "get",
  grew: "grow",
  grown: "grow",
  hung: "hang",
  heard: "hear",
  hid: "hide",
  hidden: "hide",
  held: "hold",
  kept: "keep",
  knelt: "kneel",
  laid: "lay",
  led: "lead",
  leant: "lean",
  leapt: "leap",
  learnt: "learn",
  left: "leave",
  lent: "lend",
  lit: "light",
  lost: "lose",
  made: "make",
  meant: "mean",
  met: "meet",
  mistook: "mistake",
  mistaken: "mistake",
  overcame: "overcome",
  paid: "pay",
  rode: "ride",
  ridden: "ride",
  rang: "ring",
  rung: "ring",
  rose: "rise",
  risen: "rise",
  sank: "sink",
  sunk: "sink",
  sent: "send",
  shook: "shake",
  shaken: "shake",
  shone: "shine",
  shot: "shoot",
  shown: "show",
  shrank: "shrink",
  shrunk: "shrink",
  sang: "sing",
  sung: "sing",
  slept: "sleep",
  slid: "slide",
  smelt: "smell",
  sold: "sell",
  sought: "seek",
  spoke: "speak",
  spoken: "speak",
  spent: "spend",
  spilt: "spill",
  spun: "spin",
  spat: "spit",
  spoilt: "spoil",
  sprang: "spring",
  sprung: "spring",
  stood: "stand",
  stole: "steal",
  stolen: "steal",
  stuck: "stick",
  stung: "sting",
  struck: "strike",
  swore: "swear",
  sworn: "swear",
  swept: "sweep",
  swam: "swim",
  swum: "swim",
  swung: "swing",
  taught: "teach",
  tore: "tear",
  torn: "tear",
  threw: "throw",
  thrown: "throw",
  understood: "understand",
  upheld: "uphold",
  woke: "wake",
  woken: "wake",
  wore: "wear",
  worn: "wear",
  wept: "weep",
  won: "win",
  wound: "wind",
  withdrew: "withdraw",
  withdrawn: "withdraw",
  withstood: "withstand",
  wrung: "wring",
  geese: "goose",
  oxen: "ox",
  lice: "louse",
});
export function wordRoot(word) {
  const w = normalize(word);
  return Object.hasOwn(irregularForms, w) ? irregularForms[w] : w;
}
export function candidates(word) {
  const w = normalize(word),
    out = [w],
    root = wordRoot(w);
  if (root !== w) out.push(root);
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  if (w.endsWith("ies")) out.push(w.slice(0, -3) + "y");
  if (w.endsWith("ied")) out.push(w.slice(0, -3) + "y");
  for (const suffix of ["ing", "ed", "es", "s"])
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      out.push(stem, stem + "e");
      if (/(.)\1$/.test(stem)) out.push(stem.slice(0, -1));
    }
  return [...new Set(out)].filter(Boolean);
}
export const splitSentences = (text) => {
  const clean = String(text).replace(/\r/g, "").trim();
  const lines = [];
  for (const p of clean.split(/\n\s*\n/)) {
    const flat = p.replace(/\s+/g, " ").trim();
    if (!flat) continue;
    const sentences = flat.match(/[^.!?]+(?:[.!?]+[”"']?|$)/g) || [flat];
    sentences.forEach((s, i) => {
      if (s.trim()) lines.push([s.trim(), "", null, i === 0]);
    });
  }
  return lines;
};
export function textChapters(text) {
  const parts = text
    .replace(/\r/g, "")
    .split(
      /(?=^\s*(?:Lesson\s+\d+|Chapter\s+[\dIVXLC]+|第[一二三四五六七八九十百\d]+课)\b)/gim,
    )
    .filter((s) => s.trim());
  if (parts.length > 1)
    return parts
      .map((s, i) => {
        const p = s.trim().split("\n");
        const title = p.shift().trim();
        return {
          title,
          zh: "第 " + (i + 1) + " 课",
          lines: splitSentences(p.join("\n")),
        };
      })
      .filter((c) => c.lines.length);
  const lines = splitSentences(text),
    chapters = [];
  for (let i = 0; i < lines.length; i += 35)
    chapters.push({
      title: "Chapter " + (chapters.length + 1),
      zh: "第 " + (chapters.length + 1) + " 章",
      lines: lines.slice(i, i + 35),
    });
  return chapters;
}
export function validBook(b) {
  return (
    !!b &&
    typeof b.id === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(b.id) &&
    typeof b.title === "string" &&
    b.title.length <= 250 &&
    Array.isArray(b.chapters) &&
    b.chapters.length > 0 &&
    b.chapters.length <= 2000 &&
    b.chapters.every(
      (c) =>
        typeof c.title === "string" &&
        Array.isArray(c.lines) &&
        c.lines.length > 0 &&
        c.lines.every(
          (l) =>
            Array.isArray(l) &&
            typeof l[0] === "string" &&
            l[0].length <= 20000 &&
            typeof l[1] === "string",
        ),
    )
  );
}
export function defaults() {
  return {
    version: 4,
    records: {},
    imports: [],
    terms: [],
    notes: [],
    bookmarks: [],
    translations: {},
    daily: {},
    settings: {
      size: 21,
      line: 1.9,
      theme: "paper",
      rate: 0.85,
      voice: "",
      translations: false,
      online: false,
      autoNext: false,
      known: true,
    },
    current: "morning",
  };
}
export function load(storage = localStorage) {
  let data;
  try {
    data = JSON.parse(storage.getItem(KEY));
  } catch {}
  const d = defaults();
  if (data?.version === 4)
    return { ...d, ...data, settings: { ...d.settings, ...data.settings } };
  try {
    const old = JSON.parse(storage.getItem("english-studio-reading-v2")) || {};
    const learning = JSON.parse(storage.getItem("english-studio-v1")) || {};
    return {
      ...d,
      ...old,
      version: 4,
      terms: (learning.words || [])
        .filter((x) => typeof x.w === "string")
        .map((x) => ({
          ...x,
          status: "learning",
          due: Number(x.due) || Date.now(),
          interval: Number(x.interval) || 0,
          repetitions: 0,
          example: x.example || "",
          source: x.source || "",
          added: Date.now(),
        })),
      settings: {
        ...d.settings,
        ...old.settings,
        rate: old.settings?.speed || 0.85,
        translations: old.settings?.translation || false,
      },
    };
  } catch {
    return d;
  }
}
export function mergeBackup(current, backup) {
  const legacy = backup?.format === "english-studio-reading-v2";
  const data =
    backup?.format === "english-studio-v4"
      ? backup.data
      : legacy
        ? { ...backup.reading, terms: backup.learning?.words || [] }
        : null;
  if (
    !data ||
    !Array.isArray(data.imports) ||
    !data.imports.every(validBook) ||
    !Array.isArray(data.terms) ||
    !data.terms.every(
      (t) => t && typeof t.w === "string" && typeof t.meaning === "string",
    )
  )
    throw Error("这不是有效的 English Studio 备份");
  for (const key of ["notes", "bookmarks", "trash", "completedLessons"])
    if (data[key] !== undefined && !Array.isArray(data[key]))
      throw Error("备份列表格式无效");
  if (data.trash && !data.trash.every(validBook))
    throw Error("备份中的回收书籍无效");
  const next = structuredClone(current);
  for (const b of data.imports)
    if (!next.imports.some((x) => x.id === b.id)) next.imports.push(b);
  for (const t of data.terms)
    if (!next.terms.some((x) => x.w === t.w))
      next.terms.push({
        status: "learning",
        due: Date.now(),
        interval: 0,
        repetitions: 0,
        ...t,
      });
  for (const key of ["notes", "bookmarks"])
    for (const n of data[key] || [])
      if (
        n &&
        typeof n.book === "string" &&
        Number.isInteger(n.chapter) &&
        n.chapter >= 0 &&
        Number.isInteger(n.sentence) &&
        n.sentence >= 0 &&
        (key !== "notes" || typeof n.text === "string") &&
        !next[key].some(
          (x) =>
            x.book === n.book &&
            x.chapter === n.chapter &&
            x.sentence === n.sentence,
        )
      )
        next[key].push(n);
  for (const [id, rec] of Object.entries(data.records || {}))
    if (
      /^[a-zA-Z0-9_-]{1,100}$/.test(id) &&
      rec &&
      Number.isInteger(rec.chapter) &&
      rec.chapter >= 0 &&
      Number.isInteger(rec.sentence) &&
      rec.sentence >= 0 &&
      (!next.records[id] ||
        (rec.updated || 0) >= (next.records[id].updated || 0))
    )
      next.records[id] = rec;
  for (const [date, values] of Object.entries(data.daily || {}))
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      values &&
      typeof values === "object"
    ) {
      const day = next.daily[date] || (next.daily[date] = {});
      for (const key of ["seconds", "words", "reviews", "lessons"])
        if (Number.isFinite(values[key]) && values[key] >= 0)
          day[key] = Math.max(day[key] || 0, values[key]);
    }
  for (const [text, value] of Object.entries(data.translations || {}))
    if (
      !["__proto__", "constructor", "prototype"].includes(text) &&
      typeof value === "string"
    )
      next.translations[text] = value;
  const settings = data.settings || {};
  for (const [key, min, max] of [
    ["size", 14, 36],
    ["line", 1.3, 2.6],
    ["rate", 0.5, 2],
  ]) {
    const value = legacy && key === "rate" ? settings.speed : settings[key];
    if (Number.isFinite(value) && value >= min && value <= max)
      next.settings[key] = value;
  }
  if (["paper", "white", "dark"].includes(settings.theme))
    next.settings.theme = settings.theme;
  if (typeof settings.voice === "string") next.settings.voice = settings.voice;
  for (const key of ["translations", "autoNext", "known"]) {
    const value =
      legacy && key === "translations" ? settings.translation : settings[key];
    if (typeof value === "boolean") next.settings[key] = value;
  }
  // Restoring a file does not enable sending reading text to an external service.
  next.completedLessons = [
    ...new Set([
      ...(next.completedLessons || []),
      ...(data.completedLessons || []).filter((x) => typeof x === "string"),
    ]),
  ];
  next.trash = next.trash || [];
  for (const b of data.trash || [])
    if (
      !next.imports.some((x) => x.id === b.id) &&
      !next.trash.some((x) => x.id === b.id)
    )
      next.trash.push(b);
  if (
    typeof data.current === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(data.current)
  )
    next.current = data.current;
  return next;
}
export function schedule(term, grade, now = Date.now()) {
  const t = { ...term };
  t.repetitions = (t.repetitions || 0) + 1;
  if (grade === "again") {
    t.interval = 0;
    t.due = now + 600000;
    t.status = "learning";
  } else {
    const previous = Number(t.interval) || 0;
    t.interval =
      grade === "easy"
        ? Math.max(4, Math.round(previous * 3.5))
        : Math.max(1, Math.round(previous * 2.3));
    t.interval = Math.min(120, t.interval);
    t.due = now + t.interval * 86400000;
    t.status = grade === "easy" && t.repetitions >= 3 ? "known" : "learning";
  }
  return t;
}
export function progress(book, chapter, sentence) {
  const total = book.chapters.reduce((n, c) => n + c.lines.length, 0);
  if (!total) return 0;
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        ((book.chapters
          .slice(0, chapter)
          .reduce((n, c) => n + c.lines.length, 0) +
          sentence) /
          total) *
          100,
      ),
    ),
  );
}
