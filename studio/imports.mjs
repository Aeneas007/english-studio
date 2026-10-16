import { textChapters, validBook } from "./core.mjs";
function resolve(base, relative) {
  const a = base.split("/");
  a.pop();
  for (const s of relative.split("/")) {
    if (s === "..") a.pop();
    else if (s !== ".") a.push(s);
  }
  return a.join("/");
}
async function unzip(buffer) {
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65557) &&
    view.getUint32(end, true) !== 0x06054b50
  )
    end--;
  if (end < 0) throw Error("无法识别 EPUB 压缩包");
  const count = view.getUint16(end + 10, true),
    start = view.getUint32(end + 16, true);
  if (count > 5000) throw Error("EPUB 文件过于复杂");
  const entries = new Map();
  let p = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw Error("EPUB 目录损坏");
    const method = view.getUint16(p + 10, true),
      size = view.getUint32(p + 20, true),
      plain = view.getUint32(p + 24, true),
      nameSize = view.getUint16(p + 28, true),
      extra = view.getUint16(p + 30, true),
      comment = view.getUint16(p + 32, true),
      local = view.getUint32(p + 42, true),
      name = new TextDecoder().decode(
        bytes.subarray(p + 46, p + 46 + nameSize),
      );
    total += plain;
    if (total > 80000000 || plain > 10000000) throw Error("EPUB 解压后过大");
    entries.set(name, { method, size, plain, local });
    p += 46 + nameSize + extra + comment;
  }
  return async (name) => {
    const x = entries.get(name);
    if (!x) return null;
    const n = view.getUint16(x.local + 26, true),
      e = view.getUint16(x.local + 28, true),
      data = bytes.slice(x.local + 30 + n + e, x.local + 30 + n + e + x.size);
    if (x.method === 0) return new TextDecoder().decode(data);
    if (x.method !== 8) throw Error("EPUB 使用了不支持的压缩方法");
    const output = await new Response(
      new Blob([data])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw")),
    ).arrayBuffer();
    if (output.byteLength > x.plain + 10) throw Error("EPUB 解压大小不一致");
    return new TextDecoder().decode(output);
  };
}
function xml(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw Error("EPUB 目录格式有误");
  return doc;
}
export async function parseFile(file, title, course = 0) {
  if (file.size > 20000000) throw Error("文件超过 20MB，请先拆分");
  let chapters,
    bookTitle = title || file.name.replace(/\.[^.]+$/, "");
  if (/\.epub$/i.test(file.name)) {
    const read = await unzip(await file.arrayBuffer());
    const container = await read("META-INF/container.xml");
    if (!container) throw Error("EPUB 缺少目录");
    const opfPath = xml(container)
      .querySelector("rootfile")
      ?.getAttribute("full-path");
    const opf = xml(await read(opfPath));
    bookTitle =
      title ||
      opf.getElementsByTagNameNS("*", "title")[0]?.textContent ||
      bookTitle;
    const manifest = new Map(
      [...opf.querySelectorAll("manifest item")].map((n) => [
        n.id,
        n.getAttribute("href"),
      ]),
    );
    chapters = [];
    for (const item of opf.querySelectorAll("spine itemref")) {
      const href = manifest.get(item.getAttribute("idref"));
      if (!href) continue;
      const source = await read(
        resolve(opfPath, decodeURIComponent(href.split("#")[0])),
      );
      if (!source) continue;
      const doc = new DOMParser().parseFromString(source, "text/html");
      doc.querySelectorAll("script,style,nav,aside").forEach((n) => n.remove());
      const heading = doc.querySelector("h1,h2")?.textContent.trim();
      const text = [...doc.querySelectorAll("p")]
        .map((p) => p.textContent.trim())
        .filter(Boolean)
        .join("\n\n");
      if (text.length < 80) continue;
      const parsed = textChapters(text);
      if (parsed.length)
        chapters.push({
          title: heading || "Chapter " + (chapters.length + 1),
          zh: "第 " + (chapters.length + 1) + " 章",
          lines: parsed.flatMap((c) => c.lines),
        });
    }
    if (!chapters.length) throw Error("没有找到可读正文；加密 EPUB 暂不支持");
  } else if (/\.txt$/i.test(file.name)) {
    chapters = textChapters(await file.text());
  } else throw Error("请选择 TXT 或未加密 EPUB 文件");
  return makeBook(bookTitle, chapters, course);
}
export function makeBook(title, chapters, course = 0) {
  const book = {
    id: course ? "nce-" + course : "import-" + Date.now(),
    title: title.trim(),
    zh: title.trim(),
    author: "我的教材",
    genre: course ? "新概念教材" : "我的书籍",
    level: "自选",
    collection: "imports",
    color: ["#477e84", "#ab5e56", "#7276a5", "#947443"][
      course ? course - 1 : 0
    ],
    imported: true,
    course,
    chapters,
    description: "保存在当前浏览器的个人读物",
  };
  if (!validBook(book)) throw Error("文章没有有效正文或章节过多");
  return book;
}
