import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCES = [
  { slug: "les-miserables", pg: 135, title: "Les Misérables", zh: "悲惨世界", author: "Victor Hugo", translator: "Isabel Florence Hapgood", level: "C1", color: "#5b566f", tags: ["文学经典", "社会人生"], keywords: ["雨果", "冉阿让", "Jean Valjean", "法国", "巴黎", "救赎"], description: "雨果的长篇史诗，跟随冉阿让走过苦难、善意与救赎。Hapgood 完整英译本，保留五卷、48书、365章、序言、书信附录和译注；历史议论与长句较多。C1 为阅读建议，非分级改写。", chapters: 368, sha256: "6cf3b9d6fc5e6f733737425267d3af296d7f99f9b9fd1d255a3ab7689a6346ab" },
  { slug: "aesop", pg: 21, title: "Three Hundred Aesop’s Fables", zh: "伊索寓言", author: "Aesop", translator: "George Fyler Townsend", level: "B2", color: "#887249", tags: ["童话寓言", "短篇故事"], keywords: ["伊索", "寓言", "动物", "狮子", "狐狸", "龟兔赛跑"], description: "Townsend 完整英译本。该版本实际收录313则寓言，另有译者序言、伊索生平和注释。故事短小，适合逐篇阅读；保留原版用词，非分级改写。", chapters: 316, sha256: "48f2d310226e175250988747ba4c81ff832a218b83c141b38c6dc047a25c1958" },
  { slug: "happy-prince", pg: 902, title: "The Happy Prince and Other Tales", zh: "快乐王子及其他故事", author: "Oscar Wilde", level: "B2", color: "#856b83", tags: ["童话寓言", "短篇故事"], keywords: ["王尔德", "快乐王子", "夜莺与玫瑰", "自私的巨人", "友谊", "善意"], description: "王尔德五篇完整童话：快乐王子、夜莺与玫瑰、自私的巨人、忠实的朋友、了不起的火箭。从爱与善意读到幽默与讽刺。B2 为阅读建议，非分级改写。", chapters: 5, sha256: "77ae1b3c7be77aea82b1f935e531e53f4df43db572cbc14af39d6cd0d5ba50da" },
  { slug: "christmas-carol", pg: 46, title: "A Christmas Carol", zh: "圣诞颂歌", author: "Charles Dickens", level: "B2", color: "#805856", tags: ["文学经典", "短篇故事"], keywords: ["狄更斯", "圣诞节", "Scrooge", "幽灵", "家庭", "改变"], description: "吝啬的斯克鲁奇在圣诞夜遇见过去、现在与未来。狄更斯完整英文中篇，保留作者序言和五个 Stave。B2 为阅读建议，非分级改写。", chapters: 6, sha256: "8c36b93723d454982df045ec0efdf2664e5a48e6b5e2f670e883575f75ad0cc8" },
  { slug: "oz", pg: 55, title: "The Wonderful Wizard of Oz", zh: "绿野仙踪", author: "L. Frank Baum", level: "B1", color: "#5d8068", tags: ["童话寓言", "冒险奇幻"], keywords: ["多萝西", "Dorothy", "稻草人", "铁皮人", "狮子", "奥兹", "回家"], description: "沿着黄砖路，与多萝西和伙伴们寻找勇气、智慧与回家的路。完整英文原著，含作者导言和24章。B1 为阅读建议，非分级改写。", chapters: 25, sha256: "969bffab7740d4d8a0bac332d78bd0152ad4a40a2efc52f06c74a9bb6120be75" },
  { slug: "willows", pg: 289, title: "The Wind in the Willows", zh: "柳林风声", author: "Kenneth Grahame", level: "B2", color: "#627b74", tags: ["童话寓言", "冒险奇幻"], keywords: ["格雷厄姆", "鼹鼠", "河鼠", "蟾蜍", "獾", "友谊", "河岸"], description: "鼹鼠、河鼠、獾和爱冒险的蟾蜍，在河岸与柳林间展开十二章故事。完整英文原著，描写细腻，习语丰富。B2 为阅读建议，非分级改写。", chapters: 12, sha256: "98f6b6cda20087857cefe9121b71d6166c1b92423bb7645fdba3c45ff0c141e8" },
  { slug: "sherlock", pg: 1661, title: "The Adventures of Sherlock Holmes", zh: "福尔摩斯冒险史", author: "Arthur Conan Doyle", level: "B2", color: "#516574", tags: ["悬疑推理", "短篇故事"], keywords: ["柯南道尔", "福尔摩斯", "华生", "Holmes", "Watson", "侦探", "贝克街"], description: "华生讲述福尔摩斯的十二桩经典案件，从波希米亚丑闻到铜山毛榉。完整英文短篇集，保留原作叙事与对话。B2 为阅读建议，非分级改写。", chapters: 12, sha256: "922e2a12ccb43a4c9544c260b2166c6ad2097aeb5957faeee113f173bb857cd0" },
  { slug: "pride-prejudice", pg: 1342, title: "Pride and Prejudice", zh: "傲慢与偏见", author: "Jane Austen", level: "C1", color: "#986e75", tags: ["文学经典", "爱情婚姻"], keywords: ["奥斯汀", "伊丽莎白", "达西", "Elizabeth", "Darcy", "婚姻", "英国"], description: "伊丽莎白与达西在第一印象、家庭与婚姻之间重新认识彼此。完整英文原著61章，另保留1894年版 George Saintsbury 序言。C1 为阅读建议，非分级改写。", chapters: 62, sha256: "3f6bb9d6f78e0293b56acd4714dd68cb7d6d1d293402031ce9d5a216bcaf9d75" },
  { slug: "around-world", pg: 103, title: "Around the World in Eighty Days", zh: "八十天环游地球", author: "Jules Verne", translator: "George Makepeace Towle", level: "B2", color: "#a0784d", tags: ["冒险奇幻", "旅行世界"], keywords: ["凡尔纳", "福格", "路路通", "Phileas Fogg", "Passepartout", "旅行", "时间"], description: "福格与路路通以八十天为限，穿越海洋与大陆。Towle 完整英译本，共37章，保留原作旅行见闻与悬念。B2 为阅读建议，非分级改写。", chapters: 37, sha256: "6f608ea2da50caf73245ad2996e4ee3c02ef1aa2152f7fcfe209df9aa39e7512" },
];

const flatten = (value) => value.replace(/\s+/g, " ").trim();
const canonical = (value) => flatten(value).toLowerCase();
const paragraphs = (text) => text.split(/\n[ \t]*\n+/).map((value) => value.trim()).filter(Boolean);
const wordCount = (text) => (text.match(/[A-Za-z]+/g) || []).length;

export function sourceParts(raw) {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const start = /^\*\*\* START OF .+?\*\*\*[^\n]*$/m.exec(text);
  const end = /^\*\*\* END OF .+?\*\*\*[^\n]*$/m.exec(text);
  if (!start || !end || end.index <= start.index) throw Error("Missing source boundaries");
  return {
    body: text.slice(start.index + start[0].length, end.index),
    notice: flatten(text.slice(text.indexOf("This eBook"), text.indexOf("Title:"))),
    license: text.slice(end.index).trim(),
  };
}

function removeIllustrations(text) {
  const markers = /\[(?:Illustration|Picture)(?=[:\]])/gi;
  let result = "", offset = 0, match;
  while ((match = markers.exec(text))) {
    result += text.slice(offset, match.index);
    let depth = 0, end = match.index;
    for (; end < text.length; end++) {
      if (text[end] === "[") depth++;
      if (text[end] === "]" && --depth === 0) break;
    }
    if (end === text.length) throw Error("Unclosed illustration marker");
    offset = end + 1;
    markers.lastIndex = offset;
  }
  return result + text.slice(offset);
}

function linesFrom(text) {
  return paragraphs(removeIllustrations(text))
    .filter((value) => !/^(?:\*\s*){3,}$/.test(value))
    .map((value) => [flatten(value), "", null, true]);
}

function chapter(title, body, extra = {}) {
  const lines = linesFrom(body);
  if (!lines.length) throw Error("Empty chapter: " + title);
  return { title: flatten(title), zh: "", lines, ...extra };
}

function expect(value, expected, message) {
  if (value !== expected) throw Error(`${message}: expected ${expected}, got ${value}`);
}

function fromMarker(body, expression) {
  const marker = expression.exec(body);
  if (!marker) throw Error("Missing narrative start: " + expression);
  return body.slice(marker.index);
}

function parseHeadings(body, expression, describe) {
  const headings = [...body.matchAll(expression)];
  return headings.map((match, index) => {
    const content = body.slice(match.index + match[0].length, headings[index + 1]?.index ?? body.length);
    return chapter(describe(match, index), content);
  });
}

function parseLesMiserables(body) {
  body = fromMarker(body, /^PREFACE$/m);
  let volume = "", volumeNumber = "", book = "", current = null;
  const chapters = [];
  const finish = () => {
    if (current) chapters.push(chapter(current.title, current.body.join("\n\n"), current.extra));
    current = null;
  };
  for (const block of paragraphs(body)) {
    let match;
    if (block === "PREFACE") current = { title: "Preface", body: [], extra: { section: "preface" } };
    else if (block === "LETTER TO M. DAELLI") {
      finish();
      current = { title: "Letter to M. Daelli", body: [], extra: { section: "appendix" } };
    } else if (block === "FOOTNOTES:") {
      finish();
      current = { title: "Translator's Notes", body: [], extra: { section: "notes" } };
    } else if ((match = /^VOLUME ([IVX]+)\n([\s\S]+)$/.exec(block))) {
      finish();
      volumeNumber = match[1];
      volume = `Volume ${match[1]} — ${flatten(match[2])}`;
      book = "";
    } else if ((match = /^BOOK ([A-Z]+)—([\s\S]+)$/.exec(block))) {
      finish();
      book = `Book ${match[1]} — ${flatten(match[2])}`;
    } else if ((match = /^CHAPTER ([IVXLCDM]+)(?:—([\s\S]+))?$/.exec(block))) {
      finish();
      if (!volume || !book) throw Error("Chapter without volume/book context");
      current = { title: `${volume} / ${book} / Chapter ${match[1]}${match[2] ? " — " + flatten(match[2]) : ""}`, body: [], extra: { volume: volumeNumber, book, section: "chapter" } };
    } else if (!current && volumeNumber === "IV" && !book && block === "THE IDYL IN THE RUE PLUMET AND THE EPIC IN THE RUE SAINT-DENIS") {
      volume += " — " + block;
    } else if (current) current.body.push(block);
    else if (removeIllustrations(block).trim()) throw Error("Unassigned novel text: " + block.slice(0, 100));
  }
  finish();
  expect(chapters.filter((item) => item.section === "chapter").length, 365, "Novel chapter count");
  for (const [volume, count] of [["I", 70], ["II", 76], ["III", 76], ["IV", 76], ["V", 67]])
    expect(chapters.filter((item) => item.volume === volume).length, count, "Volume " + volume);
  expect(new Set(chapters.filter((item) => item.book).map((item) => item.volume + "/" + item.book)).size, 48, "Book count");
  return chapters;
}

function parseAesop(body) {
  const start = /^PREFACE$/m.exec(body);
  if (!start) throw Error("Missing preface");
  const contents = body.slice(body.indexOf("\nCONTENTS\n"), start.index).split("\n").filter((line) => line.startsWith(" ")).map((line) => line.trim());
  const expected = contents.filter((title) => !["PREFACE", "LIFE OF AESOP", "AESOP’S FABLES", "FOOTNOTES", "INDEX"].includes(title));
  expect(expected.length, 313, "Fable table of contents");
  const titles = new Set(contents.map(canonical));
  const chapters = [], found = [];
  let current = null;
  const finish = () => {
    if (current) chapters.push(chapter(current.title, current.body.join("\n\n"), { section: current.section }));
    current = null;
  };
  for (const block of paragraphs(body.slice(start.index))) {
    if (titles.has(canonical(block))) {
      finish();
      if (block === "INDEX") break;
      if (block === "AESOP’S FABLES") continue;
      const section = block === "PREFACE" ? "preface" : block === "LIFE OF AESOP" ? "biography" : block === "FOOTNOTES" ? "notes" : "fable";
      if (section === "fable") found.push(block);
      current = { title: block, body: [], section };
    } else if (current) current.body.push(block);
    else throw Error("Unassigned fable text: " + block.slice(0, 100));
  }
  expect(JSON.stringify(found.map(canonical)), JSON.stringify(expected.map(canonical)), "Fable sequence");
  return chapters;
}

export function parseClassic(slug, body) {
  if (slug === "les-miserables") return parseLesMiserables(body);
  if (slug === "aesop") return parseAesop(body);
  if (slug === "happy-prince") {
    body = fromMarker(body, /^The Happy Prince\.$/m).replace(/\n\s*Printed by BALLANTYNE[\s\S]*$/, "");
    return parseHeadings(body, /^(The Happy Prince|The Nightingale and the Rose|The Selfish Giant|The Devoted Friend|The Remarkable Rocket)\.$/gm, (match) => match[1]);
  }
  if (slug === "christmas-carol") {
    const preface = /^PREFACE\n([\s\S]+?)\nCONTENTS\n/m.exec(body);
    if (!preface) throw Error("Missing author preface");
    const staves = parseHeadings(fromMarker(body, /^STAVE I:/m), /^STAVE ([IVX]+):[ \t]+(.+)$/gm, (match) => `Stave ${match[1]} — ${match[2]}`);
    return [chapter("Preface", preface[1], { section: "preface" }), ...staves];
  }
  if (slug === "oz") {
    body = fromMarker(body, /^Introduction$/m);
    const first = /^Chapter I$/m.exec(body);
    if (!first) throw Error("Missing first chapter");
    return [chapter("Introduction", body.slice("Introduction".length, first.index), { section: "preface" }), ...parseHeadings(body.slice(first.index), /^Chapter ([IVX]+)\n([^\n]+)$/gm, (match) => `Chapter ${match[1]} — ${match[2]}`)];
  }
  if (slug === "willows")
    return parseHeadings(fromMarker(body, /^I\.\nTHE RIVER BANK$/m), /^([IVX]+)\.\n([^\n]+)$/gm, (match) => `Chapter ${match[1]} — ${match[2]}`);
  if (slug === "sherlock")
    return parseHeadings(fromMarker(body, /^I\. A SCANDAL IN BOHEMIA$/m), /^([IVX]+)\. ([A-Z][^\n]+)$/gm, (match) => `${match[1]}. ${match[2]}`);
  if (slug === "pride-prejudice") {
    const prefaceStart = /^PREFACE\.$/m.exec(body)?.index;
    const listStart = body.indexOf("[Illustration: List of Illustrations.]");
    const first = /\[Illustration: ·PRIDE AND PREJUDICE·\s+Chapter I\.\]/m.exec(body);
    if (prefaceStart === undefined || listStart < prefaceStart || !first) throw Error("Missing illustrated edition boundaries");
    const preface = chapter("Preface — George Saintsbury", body.slice(prefaceStart + "PREFACE.".length, listStart), { section: "preface" });
    body = body.slice(first.index).replace(first[0], "CHAPTER I.");
    body = body.replace(/\n\s*CHISWICK PRESS:--CHARLES WHITTINGHAM AND CO\.[\s\S]*$/, "");
    body = removeIllustrations(body);
    return [preface, ...parseHeadings(body, /^CHAPTER ([IVXLCDM]+)\.?$/gim, (match) => `Chapter ${match[1]}`)];
  }
  if (slug === "around-world")
    return parseHeadings(fromMarker(body, /^CHAPTER I\.$/m), /^CHAPTER ([IVXLCDM]+)\.\n([^\n]+(?:\n[^\n]+)*)$/gm, (match) => `Chapter ${match[1]} — ${flatten(match[2])}`);
  throw Error("Unknown classic: " + slug);
}

export function buildBook(source, bytes) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  expect(hash, source.sha256, source.slug + " source checksum");
  const { body, notice, license } = sourceParts(bytes.toString("utf8"));
  const chapters = parseClassic(source.slug, body);
  expect(chapters.length, source.chapters, source.slug + " reading sections");
  let chapterNumber = 0;
  chapters.forEach((item) => { item.zh = item.section === "preface" ? "序言" : item.section === "biography" ? "伊索生平" : item.section === "notes" ? "注释" : item.section === "appendix" ? "附录" : "第 " + (++chapterNumber) + (item.section === "fable" ? " 则" : " 章"); });
  const book = {
    id: "classic-" + source.slug,
    title: source.title,
    zh: source.zh,
    author: source.author,
    ...(source.translator ? { translator: source.translator } : {}),
    level: source.level,
    genre: "经典原著",
    collection: "classics",
    color: source.color,
    symbol: "✦",
    tags: source.tags,
    keywords: source.keywords,
    description: source.description,
    remote: `content/${source.slug}.json?v=4.2.0`,
    wordCount: chapters.reduce((total, item) => total + item.lines.reduce((count, line) => count + wordCount(line[0]), 0), 0),
    chapters,
    source: `https://www.gutenberg.org/ebooks/${source.pg}`,
    sourceFile: `content/sources/${source.slug}.txt`,
    sourceNotice: notice,
    sourceLicense: license,
    sourceSha256: hash,
  };
  return book;
}

export async function buildAll({ download = false } = {}) {
  const books = [];
  await fs.mkdir(path.join(ROOT, "content/sources"), { recursive: true });
  for (const source of SOURCES) {
    const target = path.join(ROOT, "content/sources", source.slug + ".txt");
    if (download) {
      const response = await fetch(`https://www.gutenberg.org/cache/epub/${source.pg}/pg${source.pg}.txt`);
      if (!response.ok) throw Error(`Download failed: ${source.slug} (${response.status})`);
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(createHash("sha256").update(bytes).digest("hex"), source.sha256, source.slug + " updated source requires review");
      await fs.writeFile(target, bytes);
    }
    const book = buildBook(source, await fs.readFile(target));
    await fs.writeFile(path.join(ROOT, book.remote.split("?")[0]), JSON.stringify(book) + "\n");
    books.push(book);
  }
  const catalogPath = path.join(ROOT, "classics-catalog.js");
  const marker = "// Additional complete classics. Generated by scripts/build-classics.mjs.";
  const original = await fs.readFile(catalogPath, "utf8");
  const boundary = original.indexOf(marker);
  const prefix = boundary < 0 ? original : original.slice(0, boundary);
  const entries = books.map(({ chapters, sourceNotice, sourceLicense, sourceSha256, ...metadata }) => ({ ...metadata, chapters: chapters.map(({ title, zh }) => ({ title, zh, lines: [] })) }));
  await fs.writeFile(catalogPath, prefix + (prefix.endsWith("\n") ? "" : "\n") + marker + "\nwindow.READING_BOOKS.push(..." + JSON.stringify(entries) + ");\n");
  return books;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const books = await buildAll({ download: process.argv.includes("--download") });
  for (const book of books) console.log(`${book.id}: ${book.chapters.length} sections, ${book.wordCount.toLocaleString("en-US")} words`);
}
