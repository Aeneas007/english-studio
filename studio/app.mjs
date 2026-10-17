import {
  KEY,
  esc,
  normalize,
  load,
  mergeBackup,
  schedule,
  progress,
  textChapters,
  wordRoot,
} from "./core.mjs";
import { lookup, dictionaryInfo, translate } from "./lexicon.mjs";
import { ReaderSpeech } from "./speech.mjs";
import { parseFile, makeBook } from "./imports.mjs";
import { lessons } from "./courses.mjs";
import { ReaderPopover } from "./reader-popover.mjs";
import { createReadingStudy, shortMeaning } from "./reading-study.mjs";
import { buildReadingPages, findReadingPage } from "./reader-layout.mjs";
import { ReadingPractice } from "./reading-practice.mjs";
import { textbookBooks, textbookUnits } from "./textbook-data.mjs";
import { renderTextbookHub, renderTextbookVolume, renderTextbookUnit } from "./textbook-ui.mjs";
import { TextbookPractice } from "./textbook-practice.mjs";
import { tradeBooks, tradeTracks, tradeUnits } from "./trade-data.mjs";
import { renderTradeHub, renderTradeTrack, renderTradeUnit } from "./trade-ui.mjs";

const learningUnits = [...textbookUnits, ...tradeUnits];

const $ = (s) => document.querySelector(s),
  root = $("#studio"),
  modal = $("#sheet");
let state = load(),
  route = "",
  search = "",
  category = "all",
  level = "全部",
  sort = "推荐",
  book = null,
  ch = 0,
  part = 0,
  parts = [],
  activeSentence = 0,
  activeOffset = 0,
  listening = false,
  lookupResume = null,
  selectedLookup = null,
  readingStudy = null,
  popoverAbort = null,
  speechUnits = [],
  openBookToken = 0,
  ignoreReaderScrollUntil = 0,
  pendingReaderReflow = false,
  phraseStart = null,
  phraseMode = false,
  sheetToken = 0,
  review = null,
  reviewIndex = 0,
  reviewMode = "choice",
  reviewFlipped = false,
  lesson = null,
  step = 0,
  answerLocked = false,
  translationAbort = null,
  sleepUntil = 0;
const readerPopover = new ReaderPopover(() => {
  popoverAbort?.abort();
  popoverAbort = null;
  document.querySelectorAll(".selected-word").forEach((node) => node.classList.remove("selected-word"));
  resumeReading();
});
function holdReading() {
  if (!lookupResume) lookupResume = speaker.suspendForLookup();
}
function resumeReading() {
  queueMicrotask(() => {
    if (modal.open || readerPopover.element.open || !lookupResume) return;
    const handle = lookupResume;
    lookupResume = null;
    speaker.resumeAfterLookup(handle);
  });
}
const loaded = new Map(),
  cachedBooks = new Set(),
  cacheNames = new Set(),
  today = () => new Date().toLocaleDateString("en-CA");
const catalog = () => [...window.READING_BOOKS, ...textbookBooks, ...tradeBooks, ...state.imports];
function learningBook(unit) {
  return unit?.track ? tradeBooks.find((item) => item.id === unit.bookId) : textbookBooks.find((item) => item.course === unit?.book);
}
const record = (id) =>
  state.records[id] ||
  (state.records[id] = {
    chapter: 0,
    sentence: 0,
    favorite: false,
    finished: false,
    percent: 0,
    updated: 0,
  });
const words = (b) =>
  b.wordCount ||
  b.chapters.reduce(
    (n, c) =>
      n +
      c.lines.reduce((a, l) => a + (l[0].match(/[A-Za-z]+/g) || []).length, 0),
    0,
  );
const color = (b) => (/^#[0-9a-f]{6}$/i.test(b.color) ? b.color : "#60766f");
const icon = (name) =>
  ({ books: "▤", courses: "▦", words: "◇", profile: "◴" })[name];
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    toast("本机存储空间不足，请先导出备份");
    return false;
  }
}
function day() {
  return (
    state.daily[today()] ||
    (state.daily[today()] = { seconds: 0, words: 0, reviews: 0, lessons: 0 })
  );
}
function nav(target) {
  openBookToken++;
  speaker.stop();
  lookupResume = null;
  readerPopover.close(false);
  closeSheet();
  location.hash = target;
  if (route === target) render();
}
function download(name, data, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function closeSheet() {
  sheetToken++;
  translationAbort?.abort();
  translationAbort = null;
  if (modal.open) modal.close();
  if (pendingReaderReflow && book && route.startsWith("read/")) {
    const heldUnits = speechUnits;
    buildParts();
    if (speaker.mode === "paused") speechUnits = heldUnits;
    part = findReadingPage(parts, activeSentence, activeOffset);
    renderReader();
  }
  document
    .querySelectorAll(".selected-word")
    .forEach((n) => n.classList.remove("selected-word"));
  resumeReading();
}
function sheet(title, html, kind = "") {
  readerPopover.close(false);
  holdReading();
  sheetToken++;
  modal.className = kind;
  modal.innerHTML = `<div class="sheet-handle"></div><header class="sheet-head"><h2>${title}</h2><button data-action="close" class="round" aria-label="关闭">×</button></header><div class="sheet-content">${html}</div>`;
  if (!modal.open) modal.showModal();
  return sheetToken;
}
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeSheet();
});
modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeSheet();
});
function shell(content, view) {
  document.body.classList.remove("immersive");
  document.body.dataset.theme = "light";
  root.innerHTML = `<aside class="sidebar"><a class="brand" href="#books"><i>e.</i><span>English Studio<small>READ. LISTEN. REMEMBER.</small></span></a><nav>${[
    ["books", "阅读"],
    ["courses", "课程"],
    ["words", "单词"],
    ["profile", "我的学习"],
  ]
    .map(
      ([id, label]) =>
        `<a href="#${id}" class="${view === id ? "active" : ""}"><b>${icon(id)}</b><span>${label}</span></a>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-note">每天读一点<br><strong>让英语成为习惯。</strong><small>本地保存 · 无需账号</small></div></aside><div class="workspace"><header class="mobile-head"><a class="brand" href="#books"><i>e.</i><span>English Studio</span></a><button class="round" data-action="settings" aria-label="设置">⚙</button></header><main class="workspace-main">${content}</main></div><nav class="mobile-nav">${[
    ["books", "阅读"],
    ["courses", "课程"],
    ["words", "单词"],
    ["profile", "我的"],
  ]
    .map(
      ([id, label]) =>
        `<a href="#${id}" class="${view === id ? "active" : ""}"><b>${icon(id)}</b><span>${label}</span></a>`,
    )
    .join("")}</nav>`;
}
const badge = (label, cls = "") =>
  `<span class="badge ${cls}">${esc(label)}</span>`;
function cover(b, compact = false) {
  return `<div class="cover-art ${compact ? "compact" : ""}" style="--book:${color(b)}"><span class="cover-imprint">ENGLISH STUDIO<br>READING COLLECTION</span><div class="cover-orbit"></div><b>${esc(b.symbol || "✦")}</b><strong>${esc(b.title)}</strong><span class="cover-foot">${esc(b.author || (b.collection === "bible" ? "KING JAMES VERSION" : "ORIGINAL STORY"))}</span></div>`;
}
function bookCard(b) {
  const r = record(b.id);
  return `<article class="library-book"><button class="cover-button" data-open="${esc(b.id)}" aria-label="阅读 ${esc(b.title)}">${cover(b)}</button><div class="book-card-title"><button data-detail="${esc(b.id)}">${esc(b.zh)}</button><button class="heart ${r.favorite ? "filled" : ""}" data-favorite="${esc(b.id)}" aria-label="${r.favorite ? "取消收藏" : "收藏"} ${esc(b.title)}">${r.favorite ? "♥" : "♡"}</button></div><p>${esc(b.level)} · ${b.chapters.length} ${b.collection === "textbook" ? "单元" : b.sourceFile ? "篇章" : "章"} ${b.imported ? "· 我的书籍" : b.collection === "classics" ? "· 完整原著" : ""}</p>${r.updated ? `<div class="tiny-progress"><i style="width:${r.finished ? 100 : r.percent}%"></i></div><small>${r.finished ? "已读完 ✓" : "读至 " + r.percent + "%"}</small>` : ""}</article>`;
}
function library() {
  let found = catalog().filter((b) => {
    const r = record(b.id);
    return (
      ((category === "all" && b.collection !== "bible") ||
        (category === "classics" && b.collection === "classics") ||
        (category === "trades" && b.collection === "trades") ||
        (category === "shorts" && (["classic-aesop", "classic-happy-prince", "classic-christmas-carol"].includes(b.id) || (!b.collection && !b.imported))) ||
        (category === "bible" && b.collection === "bible") ||
        (category === "favorites" && r.favorite) ||
        (category === "continue" && r.updated && !r.finished) ||
        (category === "imports" && b.imported) ||
        (category === "finished" && r.finished)) &&
      (!search ||
        [b.title, b.zh, b.description, b.author, ...(Array.isArray(b.tags) ? b.tags : []), ...(Array.isArray(b.keywords) ? b.keywords : [])]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (level === "全部" || b.level === level)
    );
  });
  if (sort === "最近阅读")
    found.sort(
      (a, b) => (record(b.id).updated || 0) - (record(a.id).updated || 0),
    );
  if (sort === "篇幅短优先") found.sort((a, b) => words(a) - words(b));
  const last = catalog()
    .filter((b) => record(b.id).updated && !record(b.id).finished)
    .sort((a, b) => record(b.id).updated - record(a.id).updated)[0];
  const featured =
    last || catalog().find((b) => b.id === "classic-alice") || catalog()[0];
  shell(
    `<div class="page-heading"><div><p class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h1>在故事里，遇见英语。</h1><p class="subtle">读懂一个词，听懂一句话，把每次好奇变成进步。</p></div><button class="button soft" data-action="import">＋ 导入书籍</button></div><section class="library-hero"><div class="hero-copy">${badge(last ? "继续你的故事" : "本周精选 · 完整英文原著")}<h2>${esc(featured.zh || featured.title)}</h2><p>${last ? "上次读到 " + (last.sourceFile ? last.chapters[record(last.id).chapter]?.zh || "正文" : "第 " + (record(last.id).chapter + 1) + " 章") + " · " + record(last.id).percent + "%" : esc(featured.zh) + " · 点词查义，逐句听读，从容进入英文世界。"}</p><button class="button dark" data-open="${esc(featured.id)}">${last ? "继续阅读" : "开始阅读"} <span>↗</span></button></div><div class="hero-book">${cover(featured, true)}</div><div class="hero-line"></div></section><div class="quick-paths"><button data-action="nce"><span class="path-icon orange">Aa</span><div><b>新概念 1–4</b><small>32 课原创配套 · 支持教材导入</small></div><span>›</span></button><button data-category="bible"><span class="path-icon green">✝</span><div><b>KJV 圣经</b><small>66 卷 · 逐节阅读</small></div><span>›</span></button><button data-action="lookup"><span class="path-icon purple">A中</span><div><b>英汉词典</b><small id="dictionary-count">完整词库 · 按需加载</small></div><span>›</span></button></div><div class="catalog-tools"><label class="searchbox"><span>⌕</span><input id="library-search" type="search" aria-label="搜索书名或作者" placeholder="搜索书名、作者、关键词" value="${esc(search)}"></label><select id="library-level" aria-label="按级别筛选">${["全部", "A1", "A2", "B1", "B2", "C1", "KJV", "自选"].map((x) => `<option ${x === level ? "selected" : ""}>${x}</option>`).join("")}</select><select id="library-sort" aria-label="书架排序">${["推荐", "最近阅读", "篇幅短优先"].map((x) => `<option ${x === sort ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="catalog-tabs">${[
      ["all", "发现"],
      ["classics", "经典原著"],
      ["shorts", "短篇与寓言"],
      ["trades", "职业英语"],
      ["favorites", "我的收藏"],
      ["continue", "继续阅读"],
      ["imports", "本地书籍"],
      ["finished", "已读完"],
      ["bible", "圣经"],
    ]
      .map(
        ([id, label]) =>
          `<button data-category="${id}" class="${category === id ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</div><div class="catalog-caption"><h3>${category === "bible" ? "KJV · 旧约与新约" : category === "classics" ? "可以一直读下去的好书" : "你的下一本好书"}</h3><span>${found.length} 本${category === "classics" ? " · 原著级别为学习建议" : ""}</span></div><div class="book-grid-v4">${found.map(bookCard).join("")}</div>${!found.length ? '<div class="empty-state"><b>还没找到这本书</b><p>试试其他关键词，或者导入你自己的读物。</p><button class="button soft" data-action="clear-filters">重置筛选</button></div>' : ""}<p class="page-footnote">个人读物与学习记录保存在当前浏览器。首次打开正文需联网，缓存后可离线阅读。<button data-action="sources">内容与来源</button></p>`,
    "books",
  );
  dictionaryInfo()
    .then((d) => {
      const el = $("#dictionary-count");
      if (el)
        el.textContent = (d.count / 10000).toFixed(1) + " 万词条 · 英汉释义";
    })
    .catch(() => {});
}
async function openBook(id, { chapter, sentence, offset } = {}) {
  const request = ++openBookToken;
  clearTimeout(scrollTimer);
  speaker.stop();
  lookupResume = null;
  readerPopover.close(false);
  closeSheet();
  const b = catalog().find((b) => b.id === id);
  if (!b) return toast("没有找到这本书");
  if (b.remote && !b.imported && !loaded.has(id)) {
    toast("正在打开 " + b.zh + "…");
    try {
      const response = await fetch(b.remote);
      if (!response.ok) throw Error();
      const data = await response.json();
      if (
        data.id !== id ||
        !Array.isArray(data.chapters) ||
        !data.chapters.length ||
        !data.chapters.every((c) => Array.isArray(c.lines) && c.lines.length)
      )
        throw Error();
      loaded.set(id, { ...b, chapters: data.chapters });
    } catch {
      if (request !== openBookToken) return;
      return toast("这本书尚未缓存，请联网后再试");
    }
  }
  if (request !== openBookToken) return;
  speaker.stop();
  speechUnits = [];
  lookupResume = null;
  readerPopover.close(false);
  if (book?.id !== id) listening = false;
  book = loaded.get(id) || b;
  const r = record(id);
  ch = Math.min(
    Math.max(0, chapter ?? r.chapter ?? 0),
    book.chapters.length - 1,
  );
  activeSentence = Math.min(
    Math.max(0, sentence ?? r.sentence ?? 0),
    book.chapters[ch].lines.length - 1,
  );
  activeOffset = Math.max(0, Math.min(offset ?? (sentence === undefined && ch === r.chapter ? r.offset || 0 : 0), book.chapters[ch].lines[activeSentence][0].length));
  state.current = id;
  buildParts();
  part = findReadingPage(parts, activeSentence, activeOffset);
  location.hash = "read/" + id + "/" + ch;
  route = location.hash.slice(1);
  renderReader();
  savePosition(activeSentence, activeOffset);
  if (activeSentence > parts[part].start) {
    const targetSentence = activeSentence;
    requestAnimationFrame(() => {
      const target = $("#sentence-" + targetSentence);
      target?.scrollIntoView({ block: "center" });
      target?.classList.add("returned-sentence");
      setTimeout(() => target?.classList.remove("returned-sentence"), 2500);
    });
  }
}
function readerHeading() {
  const chapter = book.chapters[ch];
  const hierarchy = chapter.title.split(" / ");
  return {
    title: hierarchy.at(-1),
    context: hierarchy.length > 1 ? hierarchy.slice(0, -1).join(" / ") : "",
    label: book.collection === "trades" ? `场景 ${ch + 1}` : book.collection === "textbook" ? `第 ${ch + 1} 单元` : book.collection === "classics" && book.sourceFile ? chapter.zh : `第 ${ch + 1} 章`,
    eyebrow: book.collection === "trades" ? "AUSTRALIAN WORKPLACE ENGLISH" : book.collection === "bible" ? "KING JAMES VERSION" : book.collection === "textbook" ? "ORIGINAL COMPANION" : "ENGLISH READING",
  };
}
function buildParts() {
  pendingReaderReflow = false;
  speechUnits = [];
  const mobile = window.innerWidth <= 640;
  const paperWidth = Math.min(760, document.documentElement.clientWidth || window.innerWidth);
  const canvas = document.createElement("canvas").getContext("2d");
  const heading = readerHeading();
  const titleFont = mobile ? Math.max(23, Math.min(27, window.innerWidth * 0.064)) : Math.max(23, Math.min(29, window.innerWidth * 0.048));
  const titleWidth = Math.max(100, paperWidth - (mobile ? 40 : 90));
  let headingLines = 1, headingLine = "";
  if (canvas) {
    canvas.font = `${titleFont}px Georgia, serif`;
    for (const word of heading.title.split(/\s+/)) {
      if (headingLine && canvas.measureText(headingLine + " " + word).width > titleWidth) {
        headingLines++;
        headingLine = word;
      } else headingLine += (headingLine ? " " : "") + word;
    }
  }
  if (canvas) canvas.font = `${state.settings.size}px Georgia, "Times New Roman", serif`;
  parts = buildReadingPages(book.chapters[ch].lines, {
    width: Math.max(100, paperWidth - (mobile ? 40 : 90) - (listening ? 82 : 45)),
    height: Math.max(150, window.innerHeight - (mobile ? 284 : 300) - (listening ? 126 : 0)),
    fontSize: state.settings.size,
    lineHeight: state.settings.line,
    paragraphGap: mobile ? 22 : 25,
    firstPageInset: Math.max(115, headingLines * titleFont * 1.25 + 40 + (heading.context ? 36 : 0)),
    measureText: canvas ? (text) => canvas.measureText(text).width : undefined,
  });
  if (!parts.length) parts = [{ start: 0, end: 1, fragments: [{ index: 0, start: 0, end: 0, text: "" }] }];
}
function tokenHTML(text, i, offset = 0) {
  const re = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[’'][A-Za-z]+)*/g;
  let p = 0,
    out = "",
    m,
    n = 0;
  while ((m = re.exec(text))) {
    out += esc(text.slice(p, m.index));
    const t = state.terms.find((t) => t.w === normalize(m[0]));
    out += `<span class="reader-token ${t && state.settings.known ? "saved-token term-" + t.status : ""}" role="button" tabindex="0" data-word="${esc(m[0])}" data-i="${i}" data-token="${n++}" data-start="${m.index + offset}">${esc(m[0])}</span>`;
    p = re.lastIndex;
  }
  return out + esc(text.slice(p));
}
function renderReader() {
  if (!book) return;
  ignoreReaderScrollUntil = Date.now() + 500;
  activeSentence = Math.min(
    Math.max(0, activeSentence),
    book.chapters[ch].lines.length - 1,
  );
  document.body.classList.add("immersive");
  document.body.dataset.theme = state.settings.theme;
  const pending = readingPending();
  const heading = readerHeading();
  root.innerHTML = `<div class="reader-shell ${listening ? "listening" : ""}"><header class="reading-top"><button class="round" data-action="back-books" aria-label="${book.track ? "返回工种课程" : book.course ? "返回本册课程" : "返回书架"}">‹</button><div class="reader-title"><strong>${esc(book.title)}</strong><small>${esc(heading.title)}</small></div><div class="reader-tools"><button class="round" data-action="listen-mode" aria-label="${listening ? "退出听读" : "开启听读"}" aria-pressed="${listening}">${listening ? "■" : "♫"}</button><button class="reading-study-button ${pending.length >= 5 ? "ready" : ""}" data-action="reading-practice" aria-label="本书 ${pending.length} 个待练习词"><span>◇</span><span class="reader-count">${pending.length}</span></button><button class="round" data-action="contents" aria-label="章节目录">☷</button><button class="round" data-action="reader-settings" aria-label="阅读设置">Aa</button></div></header><div class="reading-position"><input class="reader-seek" id="reader-seek" type="range" min="0" max="${parts.length - 1}" value="${part}" aria-label="本章阅读页码"><span class="reader-page-label">${esc(heading.label)} · ${part + 1}/${parts.length}</span></div><main class="reader-paper" style="--font:${state.settings.size}px;--leading:${state.settings.line}">${part === 0 ? `<div class="reader-chapter-head"><p class="eyebrow">${esc(heading.eyebrow)}</p><h1>${esc(heading.title)}</h1>${heading.context ? `<p class="reader-chapter-context">${esc(heading.context)}</p>` : ""}</div>` : ""}<div class="reader-mode-strip"><button data-action="phrase-mode" class="${phraseMode ? "selected" : ""}">${phraseMode ? "请依次点选短语首词、末词" : "选短语"}</button><button data-action="translation-toggle">${state.settings.translations ? "隐藏译文" : "双语阅读"}</button><button data-action="marks">书签 / 笔记</button>${textbookReaderTools()}</div><div id="reading-text">${sentenceHTML()}</div></main><footer class="reader-footer"><button data-action="prev-page" ${ch === 0 && part === 0 ? "disabled" : ""}>‹ 上一页</button><span>${part + 1} / ${parts.length}<small> · ${Math.min(100, record(book.id).percent || 0)}%</small></span><button data-action="next-page">${ch === book.chapters.length - 1 && part === parts.length - 1 ? "读完 ✓" : "下一页 ›"}</button></footer><section class="audio-dock" aria-label="听读控制"><div class="audio-progress"><span id="audio-caption">${esc(book.chapters[ch].title)}</span><button data-action="sleep">${sleepUntil ? "定时关闭中" : "睡眠定时"}</button></div><div class="audio-controls"><button class="round" data-action="audio-prev" aria-label="上一句">│‹</button><button class="play-button" id="reader-play" data-action="play" aria-label="${speaker.mode === "playing" ? "暂停朗读" : "开始朗读"}">${speaker.mode === "playing" ? "Ⅱ" : "▶"}</button><button class="round" data-action="audio-next" aria-label="下一句">›│</button><button class="audio-small" data-action="reader-settings">${state.settings.rate}×</button><button class="audio-small" data-action="stop-audio">停止</button></div><small>设备语音 · <span id="offline-label">${navigator.onLine ? "已联网" : "离线模式"}</span></small></section></div>`;
  document.documentElement.scrollTop = 0;
}
function textbookReaderTools() {
  if (book?.collection === "trades") {
    const unit = tradeUnits.find((item) => item.track === book.track && item.chapter === ch);
    if (unit) return `<button data-trade-unit="${esc(unit.id)}">本课表达 / 练习</button>`;
  }
  if (book?.collection === "textbook") {
    const unit = textbookUnits.find((item) => item.book === book.course && item.chapter === ch);
    if (unit) return `<button data-textbook-unit="${esc(unit.id)}">本课讲解 / 练习</button>`;
  }
  if (book?.course) return `<button data-textbook-volume="${Number(book.course)}">返回本册课程</button>`;
  return "";
}
function visibleFragment(i) {
  return parts[part].fragments.find((fragment) => fragment.index === i);
}
function sentenceHTML() {
  const range = parts[part],
    lines = book.chapters[ch].lines;
  let out = "";
  for (const fragment of range.fragments) {
    const i = fragment.index;
    const l = lines[i],
      translated = (fragment.start === 0 && fragment.end === l[0].length ? l[1] : "") || state.translations[fragment.text],
      mark = state.bookmarks.some(
        (m) => m.book === book.id && m.chapter === ch && m.sentence === i,
      );
    out += `<section class="reading-sentence ${mark ? "marked" : ""}" id="sentence-${i}" data-sentence="${i}" data-offset="${fragment.start}">${listening ? `<button class="sentence-play" data-start-sentence="${i}" data-offset="${fragment.start}" aria-label="从这一句听">▶</button>` : ""}<div class="sentence-english">${book.collection === "bible" ? `<sup>${l[2] || i + 1}</sup>` : ""}${tokenHTML(fragment.text, i, fragment.start)}</div><button class="sentence-translate" data-sentence-translate="${i}" aria-label="翻译这一句" aria-expanded="false">译</button>${state.settings.translations ? `<div class="parallel-translation" id="translation-${i}">${translated ? esc(translated) : `<button data-sentence-translate="${i}">点击翻译这句</button>`}</div>` : ""}</section>`;
  }
  return out;
}
function savePosition(i, offset = 0) {
  if (!book) return;
  activeSentence = i;
  activeOffset = Math.max(0, Number(offset) || 0);
  const r = record(book.id);
  Object.assign(r, {
    chapter: ch,
    sentence: i,
    offset: activeOffset,
    percent: progress(book, ch, i + activeOffset / Math.max(1, book.chapters[ch].lines[i][0].length)),
    updated: Date.now(),
  });
  state.current = book.id;
  save();
  const bar = $(".reading-track i");
  if (bar) bar.style.width = r.percent + "%";
}
function turnPage(delta) {
  clearTimeout(scrollTimer);
  speechUnits = [];
  readerPopover.close(false);
  lookupResume = null;
  speaker.stop();
  phraseStart = null;
  if (delta > 0) {
    if (part < parts.length - 1) part++;
    else if (ch < book.chapters.length - 1) {
      ch++;
      buildParts();
      part = 0;
    } else return completeBook();
  } else if (part > 0) part--;
  else if (ch > 0) {
    ch--;
    buildParts();
    part = parts.length - 1;
  }
  savePosition(parts[part].start, parts[part].fragments[0].start);
  history.replaceState(null, "", "#read/" + book.id + "/" + ch);
  route = location.hash.slice(1);
  renderReader();
}
function completeBook() {
  record(book.id).finished = true;
  record(book.id).percent = 100;
  save();
  sheet(
    "又读完了一本。",
    `<div class="completion-mark">✓</div><h3>${esc(book.title)}</h3><p class="subtle">${book.chapters.length} 章 · ${words(book).toLocaleString()} 个英文词<br>每一次读完，都是下一次开始。</p><button class="button primary wide" data-action="back-books">回到书架</button>`,
  );
}
const speaker = new ReaderSpeech(updateSpeech);
function updateSpeech(s) {
  const play = $("#reader-play");
  if (play) {
    play.textContent = s.mode === "playing" ? "Ⅱ" : "▶";
    play.setAttribute(
      "aria-label",
      s.mode === "playing" ? "暂停朗读" : "开始朗读",
    );
  }
  if (!book || !route.startsWith("read/")) return;
  const unit = speechUnits[s.index];
  const sourceIndex = unit?.index ?? s.index;
  const sourceOffset = (unit?.start || 0) + Math.max(0, s.word);
  const statusCaption = $("#audio-caption");
  if (statusCaption && s.mode !== "playing")
    statusCaption.textContent =
      s.mode === "paused"
        ? "朗读已暂停"
        : s.mode === "stopped"
          ? book.chapters[ch].title
          : "朗读暂时不可用";
  if (s.mode === "error") {
    toast("设备朗读失败，请在设置中选择英语声音");
    return;
  }
  if (s.mode !== "playing") return;
  if (sleepUntil && Date.now() > sleepUntil) {
    speaker.stop();
    sleepUntil = 0;
    toast("定时朗读已结束");
    return;
  }
  const target = findReadingPage(parts, sourceIndex, sourceOffset);
  if (target >= 0 && target !== part) {
    part = target;
    renderReader();
  }
  document
    .querySelectorAll(".reading-sentence.speaking,.reader-token.speaking-word")
    .forEach((n) => n.classList.remove("speaking", "speaking-word"));
  const sentence = $("#sentence-" + sourceIndex);
  if (sentence) {
    sentence.classList.add("speaking");
    if (s.word >= 0) {
      const tokens = [...sentence.querySelectorAll(".reader-token")];
      const t = tokens.find(
        (n, i) =>
          Number(n.dataset.start) <= sourceOffset &&
          (!tokens[i + 1] || Number(tokens[i + 1].dataset.start) > sourceOffset),
      );
      t?.classList.add("speaking-word");
    }
    if (activeSentence !== sourceIndex || activeOffset !== sourceOffset) {
      savePosition(sourceIndex, sourceOffset);
    }
    if (s.word < 0) {
      sentence.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  const caption = $("#audio-caption");
  if (caption)
    caption.textContent = `正在听读 · ${s.index + 1} / ${speechUnits.length}`;
}
function collectSpeechUnits() {
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "sentence" }) : null;
  return parts.flatMap((page) => page.fragments.flatMap((fragment) => {
    if (!segmenter) return [fragment];
    return [...segmenter.segment(fragment.text)].filter((item) => item.segment.trim()).map((item) => ({ index: fragment.index, start: fragment.start + item.index, end: fragment.start + item.index + item.segment.length, text: item.segment }));
  }));
}
function speechUnitAt(i, offset) {
  const index = speechUnits.findIndex((unit) => unit.index > i || (unit.index === i && offset < unit.end));
  return index >= 0 ? index : Math.max(0, speechUnits.length - 1);
}
function stepSpeech(delta) {
  if (!speechUnits.length) speechUnits = collectSpeechUnits();
  const index = speechUnitAt(activeSentence, activeOffset);
  const unit = speechUnits[Math.max(0, Math.min(speechUnits.length - 1, index + delta))];
  if (unit) playFrom(unit.index, unit.start);
}
function playFrom(i, offset = 0) {
  try {
    if (!listening) {
      listening = true;
      buildParts();
      part = findReadingPage(parts, i, offset);
      renderReader();
    }
    speechUnits = collectSpeechUnits();
    const start = speechUnitAt(i, offset);
    speaker.play(speechUnits.map((unit) => [unit.text]), start, state.settings, () => {
      if (state.settings.autoNext && ch < book.chapters.length - 1) {
        ch++;
        buildParts();
        part = 0;
        savePosition(0);
        history.replaceState(null, "", "#read/" + book.id + "/" + ch);
        route = location.hash.slice(1);
        renderReader();
        playFrom(0);
      } else toast("本章朗读完成");
    });
  } catch (e) {
    toast(e.message);
  }
}
function readingPending() {
  if (!book) return [];
  const pending = record(book.id).studyPending;
  const ids = Array.isArray(pending) ? [...new Set(pending.filter((id) => typeof id === "string"))] : [];
  return ids.map((id) => state.terms.find((term) => term.w === id)).filter((term) => term?.meaning);
}
function queueReadingWord(term) {
  const r = record(book.id);
  r.studyPending = [...new Set([...readingPending().map((item) => item.w), term.w])];
  r.updated = Date.now();
  save();
  const button = $('[data-action="reading-practice"]');
  if (button) {
    const count = readingPending().length;
    button.querySelector(".reader-count").textContent = count;
    button.classList.toggle("ready", count >= 5);
    button.setAttribute("aria-label", `本书 ${count} 个待练习词`);
  }
}
const practice = new ReadingPractice({
  render: (html) => sheet("把刚遇见的词记下来", html, "reading-study-sheet"),
  onPronounce: (word) => speaker.preview(word, state.settings),
  onExit: () => { readingStudy = null; closeSheet(); },
  onComplete: ({ words: studied, correct, total }) => {
    if (!book) return;
    const ids = new Set(studied.map((word) => word.id));
    const r = record(book.id);
    r.studyPending = readingPending().map((term) => term.w).filter((id) => !ids.has(id));
    r.studySessions = (Number(r.studySessions) || 0) + 1;
    r.lastStudy = { correct, total, at: Date.now() };
    r.updated = Date.now();
    save();
    renderReader();
  },
});
function startReadingPractice() {
  const terms = readingPending();
  if (createReadingStudy(terms).words.length < 2) {
    return sheet("把阅读里的词连起来", `<p>在正文点词后，点“加入本组”。凑满 5 个就能做一组配对和词义练习；已有 2 个不同词义时也可以提前开始。</p><p class="subtle">本书已收集 ${terms.length} 个待练习词。单词同时保留在单词本中，按原来的计划复习。</p><button class="button primary wide" data-action="close">继续阅读</button>`);
  }
  holdReading();
  readingStudy = { book: book.id, chapter: ch, sentence: activeSentence, offset: activeOffset };
  practice.start(terms);
}
function clearReaderSelection() {
  document.querySelectorAll(".selected-word").forEach((node) => node.classList.remove("selected-word"));
}
async function wordPopover(term, index, anchor, offset = 0) {
  holdReading();
  popoverAbort?.abort();
  clearReaderSelection();
  anchor.classList.add("selected-word");
  savePosition(index, offset);
  const token = readerPopover.show(anchor, `<div class="popover-header"><strong class="popover-term">${esc(term)}</strong><button class="popover-close" data-action="popover-close" aria-label="关闭词卡">×</button></div><p class="popover-status">正在查词…</p>`, "word-popover", term + "的词义");
  const existing = state.terms.find((entry) => entry.w === normalize(term));
  let result;
  try { result = await lookup(term); } catch {}
  if (token !== readerPopover.version || !readerPopover.element.open) return;
  const meaning = existing?.meaning || result?.meaning || window.READING_GLOSSARY?.[normalize(term)] || "";
  selectedLookup = { kind: "word", term, index, offset, result, meaning };
  const rootForm = wordRoot(term);
  const rootEntry = rootForm !== normalize(term) ? [result, ...(result?.alternatives || [])].find((entry) => entry?.base === rootForm) : null;
  const pending = readingPending().some((entry) => entry.w === normalize(term));
  readerPopover.element.innerHTML = `<div class="popover-header"><strong class="popover-term">${esc(term)}</strong><button class="popover-close" data-action="popover-close" aria-label="关闭词卡">×</button></div><p class="popover-phonetic">${result?.phonetic ? "/" + esc(result.phonetic) + "/" : ""}${rootEntry ? ` <span>原形 ${esc(rootForm)}</span>` : result?.base && result.base !== normalize(term) ? ` <span>原形 ${esc(result.base)}</span>` : ""}</p><p class="popover-meaning">${esc(shortMeaning(meaning, 85) || "本站词库暂未查到释义")}</p>${rootEntry && rootEntry.meaning !== meaning ? `<p class="popover-status">${esc(rootForm)} · ${esc(shortMeaning(rootEntry.meaning, 45))}</p>` : ""}<div class="popover-actions"><button class="button soft" data-pronounce="${esc(term)}" aria-label="朗读 ${esc(term)}">▶ 发音</button><button class="button primary" data-action="popover-save" ${!meaning || pending ? "disabled" : ""}>${pending ? "已加入本组 ✓" : existing ? "加入本组练习" : "＋ 加入本组"}</button></div><button class="popover-more" data-action="word-more">完整词义 · 编辑 · 原句 ›</button><small class="popover-status">${existing ? "已收藏在单词本" : "加入后会同时保存到单词本"}</small>`;
  readerPopover.position();
}
function savePopoverWord() {
  if (selectedLookup?.kind !== "word" || !selectedLookup.meaning || !book) return;
  const { term, index, offset, meaning, result } = selectedLookup;
  let saved = state.terms.find((entry) => entry.w === normalize(term));
  if (!saved) {
    saved = { w: normalize(term), meaning, phonetic: result?.phonetic || "", example: book.chapters[ch].lines[index][0], source: book.title, book: book.id, chapter: ch, sentence: index, offset, status: "learning", due: Date.now(), interval: 0, repetitions: 0, added: Date.now() };
    state.terms.push(saved);
    day().words++;
  }
  queueReadingWord(saved);
  readerPopover.close();
  refreshText();
  toast(readingPending().length >= 5 ? "已凑齐一组，点顶部 ◇ 开始练习" : "已加入本组，也保存在单词本 ✓");
}
function sentencePopover(index, anchor) {
  const fragment = visibleFragment(index);
  if (!fragment) return;
  holdReading();
  popoverAbort?.abort();
  const line = book.chapters[ch].lines[index];
  const text = fragment.text.trim();
  const provided = fragment.start === 0 && fragment.end === line[0].length ? line[1] : "";
  const translated = provided || state.translations[text];
  selectedLookup = { kind: "sentence", index, offset: fragment.start, text };
  anchor.setAttribute("aria-expanded", "true");
  readerPopover.show(anchor, `<div class="popover-header"><strong>这句的意思</strong><button class="popover-close" data-action="popover-close" aria-label="关闭译文">×</button></div><div class="popover-translation" id="popover-translation">${translated ? esc(translated) : state.settings.online ? "正在翻译…" : `<p>这句话还没有本地译文。</p><label class="checkbox"><input id="popover-online-consent" type="checkbox">允许把点选的文字发给 MyMemory 翻译</label><button class="button primary wide" data-action="popover-enable-translate">开启并翻译这一句</button><p class="micro">只发送你点选的文字，译文保存在本机。</p>`}</div><div class="popover-actions"><button class="button soft" data-start-sentence="${index}" data-offset="${fragment.start}">▶ 从这里听</button><button class="popover-more" data-sentence-sheet="${index}">书签 / 笔记 ›</button></div>${translated ? `<small class="popover-status">${provided ? "配套中文译文" : "缓存的机器译文 · 请结合语境"}</small>` : ""}`, "sentence-popover translation-popover", "句子译文");
  if (!translated && state.settings.online) translatePopover();
}
async function translatePopover() {
  if (selectedLookup?.kind !== "sentence" || !state.settings.online) return;
  const { text, index } = selectedLookup;
  const version = readerPopover.version;
  const box = $("#popover-translation");
  if (!box) return;
  box.textContent = "正在翻译…";
  popoverAbort?.abort();
  const controller = new AbortController();
  popoverAbort = controller;
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const result = await translate(text, controller.signal);
    if (version !== readerPopover.version || controller.signal.aborted) return;
    const decoded = new DOMParser().parseFromString(result, "text/html").body.textContent;
    state.translations[text] = decoded;
    const keys = Object.keys(state.translations);
    if (keys.length > 2000) delete state.translations[keys[0]];
    save();
    box.innerHTML = `${esc(decoded)}<small class="translation-label">MyMemory 机器翻译 · 请结合语境</small>`;
    const inline = $("#translation-" + index);
    if (inline) inline.textContent = decoded;
  } catch (error) {
    if (version !== readerPopover.version) return;
    box.innerHTML = `<p>${esc(error.name === "AbortError" ? "翻译超时，请再试一次" : error.message)}</p><button class="button soft" data-action="popover-retry-translate">重试</button>`;
  } finally {
    clearTimeout(timer);
    if (popoverAbort === controller) popoverAbort = null;
    readerPopover.position();
  }
}
function detail(id) {
  const b = catalog().find((x) => x.id === id);
  if (!b) return;
  const r = record(id);
  sheet(
    esc(b.zh),
    `<div class="book-detail-layout">${cover(b, true)}<div><h3>${esc(b.title)}</h3><p>${esc(b.author || "English Studio")}${b.translator ? " · 英译：" + esc(b.translator) : ""}</p>${badge(b.level)}<p class="subtle">${b.chapters.length} ${b.collection === "textbook" ? "单元" : b.sourceFile ? "篇章" : "章"} · ${words(b).toLocaleString()} 词<br>约 ${Math.max(1, Math.ceil(words(b) / 120))} 分钟 · 阅读时长估算</p></div></div><p class="detail-description">${esc(b.description || "从点词开始，进入你的下一段英文旅程。")}</p><div class="button-row"><button class="button primary" data-open="${esc(id)}">${r.updated ? "继续阅读" : "开始阅读"} →</button><button class="button soft" data-listen-book="${esc(id)}">♫ 听读</button><button class="button soft" data-favorite="${esc(id)}">${r.favorite ? "已收藏 ♥" : "收藏 ♡"}</button></div><button class="button soft wide" data-cache-book="${esc(id)}">↓ 下载正文与本书词汇，供离线阅读</button><p class="micro">${b.source ? `<a href="${esc(b.source)}" target="_blank" rel="noopener">查看原文来源 ↗</a>${b.sourceFile ? ` · <a href="${esc(b.sourceFile)}" target="_blank" rel="noopener">原始文本与许可</a>` : ""}` : "原创故事或本地导入内容"} · 朗读使用设备语音</p>`,
  );
}
async function termSheet(
  term,
  index = activeSentence,
  { phrase = false } = {},
) {
  if (book?.chapters[ch]?.lines[index]) activeSentence = index;
  const context = book?.chapters[ch]?.lines[index]?.[0] || "",
    existing = state.terms.find((t) => t.w === normalize(term));
  const token = sheet(
    esc(term),
    `<div id="term-result"><p class="subtle">正在查词…</p></div><div class="context-box"><span>原文语境</span><p>${esc(context)}</p>${context.length > 180 ? '<button class="context-toggle" data-action="expand-context">展开原文</button>' : ""}</div><div class="lookup-actions"><button class="button soft" data-pronounce="${esc(term)}">▶ 发音</button><button class="button soft" data-action="edit-meaning">编辑词义</button></div><label class="meaning-editor hidden" id="meaning-editor">我的释义<textarea id="term-meaning" rows="3">${esc(existing?.meaning || "")}</textarea></label><button class="button primary wide" data-save-term="${esc(normalize(term))}" data-index="${index}">${existing ? "更新单词卡" : "＋ 加入单词本"}</button><button class="button soft wide" data-online-term="${esc(term)}">${phrase ? "在线翻译短语" : "查询在线翻译"}</button><p class="micro">词典：ECDICT · 原文与收藏保存在当前浏览器</p>`,
    "word-sheet",
  );
  let result;
  try {
    result = await lookup(term);
  } catch {}
  if (token !== sheetToken) return;
  const fallback = window.READING_GLOSSARY?.[normalize(term)];
  const meaning = existing?.meaning || result?.meaning || fallback || "";
  $("#term-result").innerHTML = result
    ? `<div class="pronunciation">/${esc(result.phonetic || "—")}/ ${result.base !== normalize(term) ? badge("原形 " + result.base) : ""}</div><div class="dictionary-meaning">${esc(meaning).replace(/\n/g, "<br>")}</div>${result.alternatives?.length ? `<details><summary>原形与其他词形</summary>${result.alternatives.map((a) => `<h3>${esc(a.base)}</h3><p>${esc(a.meaning).replace(/\n/g, "<br>")}</p>`).join("")}</details>` : ""}${result.definition ? `<details><summary>英文释义</summary><p>${esc(result.definition).replace(/\n/g, "<br>")}</p></details>` : ""}`
    : `<p class="dictionary-meaning">${esc(meaning || "本地词典未收录这个表达")}</p><p class="subtle">可查询在线翻译，或编辑自己的释义。</p>`;
  $("#term-meaning").value = meaning;
  modal.dataset.termContext = context;
  modal.dataset.termSource = book?.title || "词典查询";
  modal.dataset.termPhonetic = result?.phonetic || "";
  modal.dataset.termOffset = String(activeOffset);
  if (!meaning) $("#meaning-editor").classList.remove("hidden");
}
function sentenceSheet(i) {
  activeSentence = i;
  const l = book.chapters[ch].lines[i],
    translated = l[1] || state.translations[l[0]],
    note = state.notes.find(
      (n) => n.book === book.id && n.chapter === ch && n.sentence === i,
    ),
    marked = state.bookmarks.some(
      (n) => n.book === book.id && n.chapter === ch && n.sentence === i,
    );
  sheet(
    "读懂这一句",
    `<p class="sentence-quote">${esc(l[0])}</p><div class="translation-result" id="sentence-translation-result">${esc(translated || "还没有这句话的译文。")}</div><div class="button-row"><button class="button primary" data-translate="${i}">${translated ? "重新翻译" : "翻译整句"}</button><button class="button soft" data-start-sentence="${i}">▶ 从这里听</button><button class="button soft" data-bookmark="${i}">${marked ? "取消书签" : "◇ 添加书签"}</button></div><label class="field-label">我的笔记<textarea id="note-text" rows="3" placeholder="写下理解、语法或自己的例句…">${esc(note?.text || "")}</textarea></label><button class="button soft wide" data-save-note="${i}">保存笔记</button><p class="micro">已收藏的原文例句可在单词页反复练习。</p>`,
  );
}
async function translationFor(text, target) {
  if (!state.settings.online) {
    sheet(
      "开启在线翻译？",
      `<p>只会把你点选的单词、短语或句子发送给 <strong>MyMemory</strong>，不会上传整本书。</p><p class="subtle">免费服务可能限额或翻译不准确；结果会缓存到本机。私密文章请保持关闭。</p><label class="checkbox"><input id="online-enable" type="checkbox">允许发送选中文本到 MyMemory</label><button class="button primary wide" data-enable-translate="${esc(text)}">开启并翻译这段文字</button><p class="micro"><a href="https://mymemory.translated.net/" target="_blank" rel="noopener">服务说明 ↗</a></p>`,
    );
    return;
  }
  if (state.translations[text]) {
    showTranslation(state.translations[text], target);
    return;
  }
  const token = sheetToken;
  target = target || "#sentence-translation-result";
  const box = $(target);
  if (box) box.innerHTML = '<span class="subtle">正在翻译…</span>';
  translationAbort?.abort();
  translationAbort = new AbortController();
  const timeout = setTimeout(() => translationAbort?.abort(), 18000);
  try {
    const result = await translate(text, translationAbort.signal);
    if (token !== sheetToken) return;
    const decoded = new DOMParser().parseFromString(result, "text/html").body
      .textContent;
    state.translations[text] = decoded;
    const keys = Object.keys(state.translations);
    if (keys.length > 2000) delete state.translations[keys[0]];
    save();
    showTranslation(decoded, target);
  } catch (e) {
    if (token === sheetToken) {
      const el = $(target);
      if (el)
        el.textContent =
          e.name === "AbortError" ? "请求超时，请稍后再试" : e.message;
      else toast(e.message);
    }
  } finally {
    clearTimeout(timeout);
  }
}
function showTranslation(result, target) {
  const el = $(target || "#sentence-translation-result");
  if (el)
    el.innerHTML = `${esc(result)}<small class="translation-label">MyMemory 机器翻译 · 请结合语境判断</small>`;
  const editor = $("#term-meaning");
  if (editor && !editor.value) {
    editor.value = result;
    $("#meaning-editor")?.classList.remove("hidden");
  }
  if (book && state.settings.translations) {
    const l = book.chapters[ch].lines[activeSentence],
      inline = $("#translation-" + activeSentence);
    if (inline && state.translations[l[0]])
      inline.textContent = state.translations[l[0]];
  }
}
function settings(reader = false) {
  const voices =
    "speechSynthesis" in window
      ? speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang))
      : [];
  sheet(
    reader ? "让阅读更舒服" : "应用设置",
    `<div class="settings-section"><label>字号 <span id="font-label">${state.settings.size}px</span><input id="font-size" type="range" min="16" max="32" value="${state.settings.size}"></label><label>行距<select id="line-height">${[1.5, 1.7, 1.9, 2.1, 2.3].map((x) => `<option ${state.settings.line === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><div class="theme-swatches">${[
      ["paper", "米白"],
      ["white", "纯白"],
      ["dark", "夜间"],
    ]
      .map(
        ([id, label]) =>
          `<button data-theme="${id}" class="${id} ${state.settings.theme === id ? "chosen" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</div></div><div class="settings-section"><label>朗读速度<select id="speech-rate">${[0.65, 0.8, 0.85, 1, 1.15, 1.3, 1.5].map((n) => `<option value="${n}" ${n === state.settings.rate ? "selected" : ""}>${n}×</option>`).join("")}</select></label><label>英语声音<select id="speech-voice"><option value="">系统默认</option>${voices.map((v) => `<option value="${esc(v.name)}" ${v.name === state.settings.voice ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label><label class="checkbox"><input id="auto-next" type="checkbox" ${state.settings.autoNext ? "checked" : ""}>本章结束后自动播放下一章</label><label class="checkbox"><input id="show-terms" type="checkbox" ${state.settings.known ? "checked" : ""}>在正文标记收藏词</label></div><div class="settings-section"><label class="checkbox"><input id="online-setting" type="checkbox" ${state.settings.online ? "checked" : ""}>开启在线翻译（选中文本发往 MyMemory）</label><p class="micro">查词使用本站词库；实时翻译为独立的可选服务。关闭后可继续使用本地词典与已缓存译文。</p></div><button class="button primary wide" data-action="apply-settings">完成</button>`,
  );
}
function contents() {
  sheet(
    "章节目录",
    `<div class="contents-search"><input id="chapter-search" type="search" placeholder="搜索章节" aria-label="搜索章节"></div><div class="chapter-list">${book.chapters.map((c, i) => `<button data-jump-chapter="${i}" class="${ch === i ? "current" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><div><b>${esc(c.title)}</b><small>${esc(c.zh || "")}</small></div><i>${ch === i ? "●" : "›"}</i></button>`).join("")}</div>`,
  );
}
function marks() {
  const marks = state.bookmarks.filter((n) => n.book === book.id),
    notes = state.notes.filter((n) => n.book === book.id);
  const rows = (items, isNote) =>
    items
      .filter((n) => book.chapters[n.chapter]?.lines[n.sentence])
      .map(
        (n) =>
          `<button class="mark-item" data-jump-mark="${n.chapter}:${n.sentence}:${n.offset || 0}"><small>第 ${n.chapter + 1} 章</small><p>${esc(isNote ? n.text : book.chapters[n.chapter].lines[n.sentence][0])}</p></button>`,
      )
      .join("");
  sheet(
    "书签与笔记",
    `<h3>书签 · ${marks.length}</h3>${rows(marks, false) || '<p class="subtle">点击句子旁“译”，再打开书签 / 笔记。</p>'}<h3>笔记 · ${notes.length}</h3>${rows(notes, true) || '<p class="subtle">还没有笔记。</p>'}`,
  );
}
function importSheet(course = 0) {
  sheet(
    course ? "导入新概念第 " + course + " 册" : "导入你的书",
    `<p class="subtle">支持 TXT / 未加密 EPUB。全部在浏览器内解析，不上传文件。PDF 请先转换为 TXT。</p><label class="field-label">书名<input id="import-name" value="${course ? "新概念英语 第" + course + "册" : ""}" placeholder="输入书名"></label><label class="upload-zone">＋ 选择 TXT / EPUB 文件<input id="import-file-v4" type="file" accept=".txt,.epub" data-course="${course}"></label><div class="or-divider">或者粘贴英文</div><textarea id="import-paste" rows="7" placeholder="支持 Lesson 1 / Chapter 1 标题自动分课"></textarea><button class="button primary wide" data-import-paste="${course}">加入我的书架</button><p class="micro">单文件最多 20MB。新概念入口不包含原版课文或音频，请导入你有权使用的教材。</p>`,
  );
}
function commitImport(b) {
  const before = structuredClone(state),
    old = state.imports.findIndex((x) => x.id === b.id);
  if (old >= 0) state.imports[old] = b;
  else state.imports.push(b);
  if (!save()) {
    state = before;
    return;
  }
  closeSheet();
  if (b.course) {
    nav("textbooks/" + b.course);
    toast("已导入 " + b.title + " · " + b.chapters.length + " 课");
    return;
  }
  category = "imports";
  search = "";
  level = "全部";
  nav("books");
  toast("已导入 " + b.title);
}
function nce() {
  nav("textbooks");
}
function textbooksPage(volume) {
  const completed = state.completedLessons || [];
  const textbook = textbookBooks.find((item) => item.course === Number(volume));
  const html = textbook
    ? renderTextbookVolume({ book: textbook, units: textbookUnits.filter((unit) => unit.book === textbook.course), imported: state.imports.find((item) => item.id === "nce-" + textbook.course), completed })
    : renderTextbookHub({ books: textbookBooks, units: textbookUnits, imports: state.imports, completed });
  shell(html, "courses");
}
function textbookUnitPage(id) {
  const unit = textbookUnits.find((item) => item.id === id);
  if (!unit) return textbooksPage();
  const textbook = textbookBooks.find((item) => item.course === unit.book);
  shell(renderTextbookUnit({ book: textbook, unit, done: state.completedLessons?.includes(id) || false, draft: record(textbook.id).drafts?.[id] || "" }), "courses");
}
function tradesPage(trackId) {
  const track = tradeTracks.find((item) => item.id === trackId);
  const completed = state.completedLessons || [];
  shell(track ? renderTradeTrack({ track, units: tradeUnits.filter((unit) => unit.track === track.id), completed }) : renderTradeHub({ tracks: tradeTracks, units: tradeUnits, completed }), "courses");
}
function tradeUnitPage(id) {
  const unit = tradeUnits.find((item) => item.id === id);
  if (!unit) return tradesPage();
  shell(renderTradeUnit({ track: tradeTracks.find((item) => item.id === unit.track), unit, done: state.completedLessons?.includes(id) || false, draft: record(unit.bookId).drafts?.[id] || "" }), "courses");
}
function saveTradeTerm(term) {
  const unit = tradeUnits.find((item) => route === "trade/" + item.id);
  const entry = unit?.glossary.find((item) => item.term === term);
  if (!entry) return;
  const w = normalize(entry.term);
  if (state.terms.some((item) => item.w === w)) return toast("这个表达已经在你的单词本中");
  const index = Math.max(0, unit.items.findIndex((item) => item[0].toLowerCase().includes(entry.term.toLowerCase())));
  const track = tradeTracks.find((item) => item.id === unit.track);
  state.terms.push({ w, meaning: entry.meaning, example: unit.items[index][0], source: track.title + " · " + unit.title,
    book: unit.bookId, chapter: unit.chapter, sentence: index,
    offset: Math.max(0, unit.items[index][0].toLowerCase().indexOf(entry.term.toLowerCase())),
    status: "learning", due: Date.now(), interval: 0, repetitions: 0, added: Date.now() });
  day().words++;
  if (save()) toast("已加入单词本 ✓");
}
const textbookPractice = new TextbookPractice({
  render: (html) => shell(html, "courses"),
  onSpeak: (text) => {
    try { speaker.preview(text, state.settings); }
    catch { toast("当前设备不支持朗读，请使用支持英语语音的浏览器"); }
  },
  onExit: (unit) => nav((unit.track ? "trade/" : "textbook/") + unit.id),
  onComplete: (unit) => {
    state.completedLessons ||= [];
    if (!state.completedLessons.includes(unit.id)) {
      state.completedLessons.push(unit.id);
      day().lessons++;
      save();
    }
  },
});
function wordsPage() {
  const due = state.terms.filter(
      (t) => t.status !== "known" && t.due <= Date.now(),
    ),
    known = state.terms.filter((t) => t.status === "known");
  shell(
    `<div class="page-heading"><div><p class="eyebrow">MAKE WORDS PART OF YOUR WORLD</p><h1>从遇见，到记住。</h1><p class="subtle">每一个词，都来自你读过的故事。</p></div><button class="button soft" data-action="lookup">＋ 查词添加</button></div><div class="vocab-summary"><div><b>${state.terms.length}</b><small>收藏表达</small></div><div><b>${due.length}</b><small>今日待复习</small></div><div><b>${known.length}</b><small>已经掌握</small></div></div><div class="review-banner"><div><h2>用几分钟，让记忆更牢。</h2><p>释义选择、听音辨词、拼写回忆，结合原文语境。</p></div><button class="button dark" data-action="review-start" ${due.length ? "" : "disabled"}>开始复习 · ${due.length} →</button></div><div class="vocab-tools"><input id="term-filter" type="search" placeholder="搜索单词、释义或来源" aria-label="搜索单词"><button class="button soft" data-action="export-words">导出 CSV</button></div><div class="vocab-list">${
      [...state.terms]
        .reverse()
        .map(
          (t) =>
            `<article class="vocab-item" data-search="${esc([t.w, t.meaning, t.source].join(" ").toLowerCase())}"><button class="vocab-word" data-vocab-detail="${esc(t.w)}"><strong>${esc(t.w)}</strong><span>${esc(t.meaning.split("\n")[0])}</span><small>${esc(t.source || "我的收藏")} · ${t.status === "known" ? "已掌握" : t.due <= Date.now() ? "待复习" : new Date(t.due).toLocaleDateString() + " 复习"}</small></button><button class="round" data-pronounce="${esc(t.w)}" aria-label="朗读 ${esc(t.w)}">▷</button></article>`,
        )
        .join("") ||
      '<div class="empty-state"><b>你的单词本，等一个新发现。</b><p>阅读时点击一个词，再点「加入单词本」。</p><button class="button primary" data-action="back-books">去读一本书 →</button></div>'
    }</div>`,
    "words",
  );
}
function startReview() {
  review = state.terms
    .filter((t) => t.status !== "known" && t.due <= Date.now())
    .slice(0, 20);
  reviewIndex = 0;
  reviewFlipped = false;
  reviewMode = "choice";
  if (!review.length) return toast("当前没有到期单词");
  renderReview();
}
function renderReview() {
  if (reviewIndex >= review.length) {
    shell(
      `<div class="review-complete"><div class="completion-mark">✓</div><h1>今天，又记牢了一点。</h1><p class="subtle">复习记录和下次复习时间已保存。</p><button class="button primary" data-action="words">返回单词本</button></div>`,
      "words",
    );
    return;
  }
  const t = review[reviewIndex],
    mode = ["choice", "listen", "spell"][reviewIndex % 3];
  reviewMode = mode;
  reviewFlipped = false;
  const options = [
    t,
    ...state.terms
      .filter((x) => x.w !== t.w)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3),
  ];
  while (options.length < 4) {
    const fallback = [
      { w: "window", meaning: "窗户" },
      { w: "journey", meaning: "旅程" },
      { w: "quiet", meaning: "安静的" },
      { w: "garden", meaning: "花园" },
    ].find((x) => !options.some((y) => y.w === x.w) && x.meaning !== t.meaning);
    if (!fallback) break;
    options.push(fallback);
  }
  options.sort(() => Math.random() - 0.5);
  shell(
    `<div class="review-session"><button class="link-button" data-action="words">← 退出复习</button><div class="session-progress"><i style="width:${(reviewIndex / review.length) * 100}%"></i></div><p class="eyebrow">${reviewIndex + 1} / ${review.length} · ${mode === "choice" ? "选出正确释义" : mode === "listen" ? "听音辨词" : "拼写回忆"}</p><div class="review-prompt">${mode === "listen" ? `<button class="listen-bubble" data-pronounce="${esc(t.w)}" aria-label="听单词">▶</button><h2>你听到了哪个词？</h2>` : mode === "spell" ? `<h2>${esc(t.meaning.split("\n")[0])}</h2><button class="button soft" data-pronounce="${esc(t.w)}">听发音</button>` : `<h1>${esc(t.w)}</h1><button class="button soft" data-pronounce="${esc(t.w)}">▶ 听发音</button>`}</div>${mode === "spell" ? '<div class="spelling-answer"><input id="spelling" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入英文" aria-label="拼写单词"><button class="button primary" data-action="check-spelling">检查</button></div>' : `<div class="review-options">${options.map((o) => `<button data-review-answer="${esc(o.w)}">${esc(mode === "listen" ? o.w : o.meaning.split("\n")[0])}</button>`).join("")}</div>`}<div id="review-feedback"></div><div id="review-grades" class="hidden"><details class="review-context"><summary>查看原句 · ${esc(t.source || "我的收藏")}</summary><p>${esc(t.example || "这个词来自你的收藏。")}</p></details><div class="button-row review-grade-actions"><button class="button soft" data-review-grade="again">再学一次 · 10分钟</button><button class="button primary" data-review-grade="good">记住了</button><button class="button soft" data-review-grade="easy">很熟悉</button></div></div></div>`,
    "words",
  );
  if (mode === "listen")
    setTimeout(() => speaker.preview(t.w, state.settings), 200);
}
function checkReview(answer) {
  if (reviewFlipped) return;
  reviewFlipped = true;
  const t = review[reviewIndex],
    ok = normalize(answer) === normalize(t.w);
  $("#review-feedback").innerHTML =
    `<div class="answer-feedback ${ok ? "correct" : "incorrect"}">${ok ? "答对了 ✓" : "再看一次：" + esc(t.w)}<p>${esc(t.meaning)}</p></div>`;
  $("#review-grades").classList.remove("hidden");
  document
    .querySelectorAll("[data-review-answer]")
    .forEach((b) => (b.disabled = true));
}
function tradeCoursePreview() {
  const completed = new Set(state.completedLessons || []);
  return `<div class="textbook-callout"><div><b>澳洲工地英语 · 4 个工种，24 个场景</b><p>HVAC、电工、水工和建筑：听懂任务、确认信息，把日常现场沟通说清楚。</p></div><button class="button dark" data-action="trades">进入工地英语 →</button></div><div class="course-grid">${tradeTracks.map((track) => {
    const units = tradeUnits.filter((unit) => unit.track === track.id);
    const count = units.filter((unit) => completed.has(unit.id)).length;
    return `<button class="course-card" data-trade-track="${esc(track.id)}"><div style="background:${track.color}22"><small>AUSTRALIAN WORKPLACE · ${esc(track.level)}</small><b>${esc(track.englishTitle)}</b><span>${esc(track.symbol)}</span></div><section><h3>${esc(track.title)}</h3><p>${esc(track.description)}</p><small>${units.length} 个场景 · ${count} 已完成 · 对话 / 术语 / 听力</small></section></button>`;
  }).join("")}</div><div class="catalog-caption"><h3>日常生活与系统学习</h3></div>`;
}
function coursesPage() {
  shell(
    `<div class="page-heading"><div><p class="eyebrow">SMALL LESSONS, REAL CONVERSATIONS</p><h1>把英语用在生活里。</h1><p class="subtle">澳洲工地英语、日常表达和系统学习：听、理解，再试着自己说。</p></div></div>${tradeCoursePreview()}<div class="textbook-callout"><div><b>新概念英语 1–4</b><p>四册 32 个原创配套单元：双语阅读、语法讲解、听力理解与练习。也可导入自己的 TXT / EPUB 教材。</p></div><button class="button dark" data-action="nce">打开教材 →</button></div><div class="course-grid">${lessons.map((l, i) => `<button class="course-card" data-lesson="${l.id}"><div style="background:${l.color}"><small>${l.level} · UNIT 0${i + 1}</small><b>${["Hello!", "Coffee?", "Let’s go.", "Good idea."][i]}</b><span>${["✺", "◒", "↗", "✦"][i]}</span></div><section><h3>${l.name}</h3><p>${l.subtitle}</p><small>6 句表达 · 听力 / 理解 / 拼句${state.completedLessons?.includes(l.id) ? " · 已完成 ✓" : ""}</small></section></button>`).join("")}</div><p class="page-footnote">这些是原创情境练习。未来计划增加更多学习主题、听力内容与字幕练习。</p>`,
    "courses",
  );
}
function startLesson(id) {
  lesson = lessons.find((l) => l.id === id);
  step = 0;
  renderLesson();
}
function renderLesson() {
  if (step >= lesson.items.length) {
    state.completedLessons = state.completedLessons || [];
    if (!state.completedLessons.includes(lesson.id)) {
      state.completedLessons.push(lesson.id);
      day().lessons++;
      save();
    }
    shell(
      `<div class="review-complete"><div class="completion-mark">✓</div><h1>这一课，学会了。</h1><p>你练习了 ${lesson.items.length} 句生活表达。</p><button class="button primary" data-action="courses">继续学习 →</button></div>`,
      "courses",
    );
    return;
  }
  answerLocked = false;
  const item = lesson.items[step],
    type = step % 3;
  const options = lesson.items
    .map((x) => x[1])
    .filter((x) => x !== item[1])
    .slice(0, 2)
    .concat(item[1])
    .sort(() => Math.random() - 0.5);
  const chunks = item[0]
    .split(" ")
    .map((w, i) => ({ w, i }))
    .sort(() => Math.random() - 0.5);
  shell(
    `<div class="lesson-session"><button class="link-button" data-action="courses">← ${lesson.name}</button><div class="session-progress"><i style="width:${(step / lesson.items.length) * 100}%"></i></div><p class="eyebrow">${step + 1} / ${lesson.items.length} · ${["理解表达", "听音理解", "拼出句子"][type]}</p><div class="lesson-scene"><small>EVERYDAY ENGLISH · ${lesson.level}</small>${type === 1 ? "<h2>听一听，这句话是什么意思？</h2>" : `<h2>${esc(type === 2 ? item[1] : item[0])}</h2>`}<button class="round" data-pronounce="${esc(item[0])}" aria-label="朗读练习句子">▶</button></div>${type === 2 ? `<div id="sentence-build" class="sentence-build" aria-label="拼句区域"></div><div class="word-bank">${chunks.map((c) => `<button data-chunk="${esc(c.w)}" data-chunk-id="${c.i}">${esc(c.w)}</button>`).join("")}</div><div class="button-row"><button class="button soft" data-action="clear-sentence">重排</button><button class="button primary" data-action="check-sentence">检查句子</button></div>` : `<div class="review-options">${options.map((o) => `<button data-lesson-answer="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}<div id="lesson-feedback"></div><button class="button primary wide hidden" id="lesson-next" data-action="lesson-next">继续 →</button></div>`,
    "courses",
  );
  if (type === 1)
    setTimeout(() => speaker.preview(item[0], state.settings), 200);
}
function profile() {
  const totalSeconds = Object.values(state.daily).reduce(
      (n, x) => n + (x.seconds || 0),
      0,
    ),
    totalReviews = Object.values(state.daily).reduce(
      (n, x) => n + (x.reviews || 0),
      0,
    ),
    finished = Object.values(state.records).filter((x) => x.finished).length;
  shell(
    `<div class="page-heading"><div><p class="eyebrow">A LITTLE EVERY DAY</p><h1>每一点进步，都算数。</h1><p class="subtle">无需账号，学习属于你自己。</p></div><button class="button soft" data-action="settings">阅读设置</button></div><div class="profile-stats">${[
      [Math.floor(totalSeconds / 60), "阅读分钟"],
      [Object.keys(state.daily).length, "学习天数"],
      [finished, "读完书籍"],
      [totalReviews, "完成复习"],
    ]
      .map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`)
      .join("")}</div><div class="week-chart">${Array.from(
      { length: 7 },
      (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 6 + i);
        const key = d.toLocaleDateString("en-CA"),
          seconds = state.daily[key]?.seconds || 0;
        return `<div><small>${Math.floor(seconds / 60)}分</small><i style="height:${Math.max(5, Math.min(130, seconds / 6))}px"></i><span>${d.getMonth() + 1}/${d.getDate()}</span></div>`;
      },
    ).join(
      "",
    )}</div><section class="profile-panel"><h2>本地数据与备份</h2><p class="subtle">学习记录保存在这个浏览器中。清理浏览器数据或更换手机不会自动同步，请定期导出备份。</p><div class="button-row"><button class="button primary" data-action="export-backup">导出全部备份</button><label class="button soft file-button">恢复备份<input id="restore-v4" type="file" accept=".json"></label><button class="button soft" data-action="export-words">导出单词 CSV</button></div></section><section class="profile-panel"><h2>离线阅读</h2><p class="subtle">已打开的书和查过的词库分片会自动缓存。书籍详情中可提前下载正文与本书词汇。</p><button class="button soft" data-action="cache-info">检查离线缓存</button></section><section class="profile-panel"><h2>阅读与收藏</h2><p>${state.notes.length} 条笔记 · ${state.bookmarks.length} 个书签 · ${state.imports.length} 本本地书籍</p><button class="button soft" data-action="manage-imports">管理本地书籍</button></section><p class="page-footnote"><button data-action="sources">版本、内容来源与使用限制</button> · English Studio 4.3</p>`,
    "profile",
  );
}
function sources() {
  sheet(
    "English Studio 4.3",
    `<p>English Studio 专注于英文阅读、听力练习与词汇积累，学习记录保存在当前浏览器。</p><ul class="source-list"><li>英汉词典：<a href="https://github.com/skywind3000/ECDICT" target="_blank" rel="noopener">ECDICT</a>，MIT 许可；<a href="lexicon/LICENSE.txt" target="_blank">许可原文</a>。</li><li>经典全文：Project Gutenberg 提供的公版文本，保留原始来源与许可。<a href="content/SOURCE.md" target="_blank" rel="noopener">12 本原著的完整书单与来源说明</a></li><li>KJV：<a href="bible/SOURCE.md" target="_blank">eBible.org 标准文本与来源说明</a>。</li><li>分级短篇、情境课程与澳洲职业英语：本站原创。<a href="docs/trade-english.md" target="_blank" rel="noopener">职业课程与术语参考</a>。</li><li>朗读：设备英语 TTS，不是真人有声书。部分设备不提供逐词边界，此时按句高亮。</li><li>在线翻译：可选 MyMemory 免费服务，可能限额、不可用或翻译有误，不上传整本读物。</li></ul><p>新概念四册含本站原创配套，原版教材可导入自己的文件。未来计划继续扩充阅读资源、音频支持与课程练习。</p><a class="button soft wide" href="https://github.com/Aeneas007/english-studio/blob/main/docs/roadmap.md" target="_blank" rel="noopener">项目现状与未来计划 ↗</a>`,
  );
}
function render() {
  const next = location.hash.slice(1) || "books";
  textbookPractice.reset();
  if (!next.startsWith("read/")) {
    openBookToken++;
    readerPopover.close(false);
    lookupResume = null;
    speaker.stop();
    book = null;
    speechUnits = [];
    listening = false;
    phraseMode = false;
    phraseStart = null;
  }
  route = next;
  if (next.startsWith("read/")) {
    const [, id, chapter] = next.split("/");
    if (!book || book.id !== id || ch !== Number(chapter))
      openBook(id, { chapter: Number(chapter) || 0 });
    else renderReader();
  } else if (next === "textbooks" || next.startsWith("textbooks/")) textbooksPage(next.split("/")[1]);
  else if (next.startsWith("textbook/")) textbookUnitPage(next.split("/")[1]);
  else if (next === "trades" || next.startsWith("trades/")) tradesPage(next.split("/")[1]);
  else if (next.startsWith("trade/")) tradeUnitPage(next.split("/")[1]);
  else if (next === "words") wordsPage();
  else if (next === "courses") coursesPage();
  else if (next === "profile") profile();
  else library();
}

document.addEventListener("click", async (e) => {
  if (Date.now() < suppressReaderClickUntil && e.target.closest(".reader-paper")) {
    e.preventDefault();
    return;
  }
  const node = e.target.closest("button,[data-word]");
  if (!node) return;
  const d = node.dataset,
    action = d.action;
  if (textbookPractice.handle(d)) return;
  if (d.tradeTrack) return nav("trades/" + d.tradeTrack);
  if (d.tradeUnit) return nav("trade/" + d.tradeUnit);
  if (d.tradeSaveTerm) return saveTradeTerm(d.tradeSaveTerm);
  if (d.textbookVolume) return nav("textbooks/" + d.textbookVolume);
  if (d.textbookUnit) return nav("textbook/" + d.textbookUnit);
  if (d.textbookImport) return importSheet(Number(d.textbookImport));
  if (d.textbookChapter) {
    const [volume, chapter] = d.textbookChapter.split(":").map(Number);
    return openBook("nce-" + volume, { chapter, sentence: 0, offset: 0 });
  }
  if (d.textbookRead) {
    const unit = learningUnits.find((item) => item.id === d.textbookRead);
    const textbook = learningBook(unit);
    if (textbook) return openBook(textbook.id, { chapter: unit.chapter, sentence: 0, offset: 0 });
    return;
  }
  if (d.textbookPractice) {
    const unit = learningUnits.find((item) => item.id === d.textbookPractice);
    if (unit) { speaker.stop(); textbookPractice.start(unit); }
    return;
  }
  if (readingStudy && practice.handle(d)) return;
  if (d.open) return openBook(d.open);
  if (d.listenBook) {
    await openBook(d.listenBook);
    if (book?.id === d.listenBook && route.startsWith("read/")) playFrom(activeSentence, activeOffset);
    return;
  }
  if (d.detail) return detail(d.detail);
  if (d.favorite) {
    const r = record(d.favorite);
    r.favorite = !r.favorite;
    save();
    if (modal.open) detail(d.favorite);
    else library();
    return;
  }
  if (d.category) {
    category = d.category;
    search = "";
    level = "全部";
    nav("books");
    return library();
  }
  if (d.word) {
    const i = Number(d.i);
    if (phraseMode) {
      if (!phraseStart) {
        phraseStart = { i, token: Number(d.token) };
        node.classList.add("selected-word");
        toast("再点短语的最后一个词");
        return;
      }
      if (phraseStart.i !== i) {
        phraseStart = null;
        toast("请在同一句中选择短语");
        return;
      }
      const tokens = [...$("#sentence-" + i).querySelectorAll("[data-word]")],
        a = Math.min(phraseStart.token, Number(d.token)),
        b = Math.max(phraseStart.token, Number(d.token));
      const text = tokens
        .slice(a, b + 1)
        .map((n) => n.textContent)
        .join(" ");
      phraseStart = null;
      phraseMode = false;
      return termSheet(text, i, { phrase: true });
    }
    node.classList.add("selected-word");
    return wordPopover(d.word, i, node, Number(d.start) || 0);
  }
  if (d.sentenceTranslate !== undefined)
    return sentencePopover(Number(d.sentenceTranslate), node);
  if (d.sentenceSheet !== undefined)
    return sentenceSheet(Number(d.sentenceSheet));
  if (d.pronounce) {
    try {
      speaker.preview(d.pronounce, state.settings);
    } catch {
      toast("当前设备不支持朗读");
    }
    return;
  }
  if (d.saveTerm) {
    const meaning = $("#term-meaning").value.trim();
    if (!meaning) return toast("先查到词义，或填写自己的释义");
    const previous = state.terms.find((t) => t.w === d.saveTerm);
    if (previous) Object.assign(previous, { meaning });
    else {
      state.terms.push({
        w: d.saveTerm,
        meaning,
        phonetic: modal.dataset.termPhonetic,
        example: modal.dataset.termContext,
        source: modal.dataset.termSource,
        book: book?.id,
        chapter: ch,
        sentence: Number(d.index) || 0,
        offset: Number(modal.dataset.termOffset) || 0,
        status: "learning",
        due: Date.now(),
        interval: 0,
        repetitions: 0,
        added: Date.now(),
      });
      day().words++;
    }
    if (book && route.startsWith("read/")) queueReadingWord(previous || state.terms.find((term) => term.w === d.saveTerm));
    save();
    closeSheet();
    if (book) refreshText();
    toast(previous ? "单词卡已更新" : "已加入单词本 ✓");
    return;
  }
  if (d.onlineTerm) {
    const text = d.onlineTerm;
    return translationFor(text, "#term-result");
  }
  if (d.enableTranslate) {
    if (!$("#online-enable").checked) return toast("请先勾选允许发送选中文本");
    state.settings.online = true;
    save();
    const text = d.enableTranslate;
    modal.dataset.termContext =
      book?.chapters[ch]?.lines[activeSentence]?.[0] || text;
    modal.dataset.termSource = book?.title || "词典查询";
    modal.dataset.termPhonetic = "";
    sheet(
      "在线翻译",
      `<p class="sentence-quote">${esc(text)}</p><div id="sentence-translation-result">正在翻译…</div><label class="meaning-editor" id="meaning-editor">我的释义<textarea id="term-meaning" rows="3"></textarea></label><button class="button primary wide" data-save-term="${esc(normalize(text))}" data-index="${activeSentence}">收藏这个表达</button>`,
    );
    return translationFor(text);
  }
  if (d.translate !== undefined) {
    activeSentence = Number(d.translate);
    const text = book.chapters[ch].lines[activeSentence][0];
    if (!modal.open) sentenceSheet(activeSentence);
    return translationFor(text);
  }
  if (d.startSentence !== undefined) {
    readerPopover.close(false);
    lookupResume = null;
    closeSheet();
    return playFrom(Number(d.startSentence), Number(d.offset) || 0);
  }
  if (d.bookmark !== undefined) {
    const i = Number(d.bookmark),
      p = state.bookmarks.findIndex(
        (n) => n.book === book.id && n.chapter === ch && n.sentence === i,
      );
    if (p >= 0) state.bookmarks.splice(p, 1);
    else state.bookmarks.push({ book: book.id, chapter: ch, sentence: i, offset: visibleFragment(i)?.start || 0 });
    save();
    closeSheet();
    refreshText();
    toast(p >= 0 ? "已取消书签" : "已添加书签");
    return;
  }
  if (d.saveNote !== undefined) {
    const i = Number(d.saveNote),
      text = $("#note-text").value.trim();
    state.notes = state.notes.filter(
      (n) => !(n.book === book.id && n.chapter === ch && n.sentence === i),
    );
    if (text)
      state.notes.push({ book: book.id, chapter: ch, sentence: i, offset: visibleFragment(i)?.start || 0, text });
    save();
    closeSheet();
    toast("笔记已保存");
    return;
  }
  if (d.jumpChapter !== undefined) {
    speaker.stop();
    closeSheet();
    return openBook(book.id, { chapter: Number(d.jumpChapter), sentence: 0 });
  }
  if (d.jumpMark) {
    const [chapter, sentence, offset = 0] = d.jumpMark.split(":").map(Number);
    closeSheet();
    return openBook(book.id, { chapter, sentence, offset });
  }
  if (d.theme) {
    state.settings.theme = d.theme;
    save();
    document.body.dataset.theme = d.theme;
    modal
      .querySelectorAll("[data-theme]")
      .forEach((b) =>
        b.classList.toggle("chosen", b.dataset.theme === d.theme),
      );
    return;
  }
  if (d.nce) {
    return nav("textbooks/" + d.nce);
  }
  if (d.importPaste !== undefined) {
    try {
      const text = $("#import-paste").value;
      if (text.length > 1000000) throw Error("内容过长，请拆成较小文件");
      return commitImport(
        makeBook(
          $("#import-name").value,
          textChapters(text),
          Number(d.importPaste),
        ),
      );
    } catch (e) {
      toast(e.message);
      return;
    }
  }
  if (d.vocabDetail) {
    const t = state.terms.find((t) => t.w === d.vocabDetail);
    sheet(
      esc(t.w),
      `<p class="dictionary-meaning">${esc(t.meaning)}</p><div class="context-box"><span>${esc(t.source || "原文语境")}</span><p>${esc(t.example || "暂无例句")}</p></div><div class="button-row"><button class="button primary" data-pronounce="${esc(t.w)}">▶ 发音</button><button class="button soft" data-known="${esc(t.w)}">${t.status === "known" ? "重新学习" : "标记掌握"}</button></div>${t.book ? `<button class="button soft wide" data-return-source="${esc(t.w)}">回到原文 →</button>` : ""}`,
    );
    return;
  }
  if (d.known) {
    const t = state.terms.find((t) => t.w === d.known);
    t.status = t.status === "known" ? "learning" : "known";
    t.due = Date.now();
    save();
    closeSheet();
    wordsPage();
    return;
  }
  if (d.returnSource) {
    const t = state.terms.find((t) => t.w === d.returnSource);
    return openBook(t.book, { chapter: t.chapter, sentence: t.sentence, offset: t.offset || 0 });
  }
  if (d.reviewAnswer) return checkReview(d.reviewAnswer);
  if (d.reviewGrade) {
    const t = review[reviewIndex],
      index = state.terms.findIndex((x) => x.w === t.w);
    state.terms[index] = schedule(state.terms[index], d.reviewGrade);
    day().reviews++;
    save();
    reviewIndex++;
    return renderReview();
  }
  if (d.lesson) return startLesson(d.lesson);
  if (d.lessonAnswer) {
    if (answerLocked) return;
    answerLocked = true;
    const correct = d.lessonAnswer === lesson.items[step][1];
    $("#lesson-feedback").innerHTML =
      `<div class="answer-feedback ${correct ? "correct" : "incorrect"}">${correct ? "正确 ✓" : "正确意思：" + esc(lesson.items[step][1])}</div>`;
    $("#lesson-next").classList.remove("hidden");
    return;
  }
  if (d.chunk) {
    const token = document.createElement("button");
    token.textContent = d.chunk;
    token.dataset.returnChunk = d.chunkId;
    $("#sentence-build").append(token);
    node.disabled = true;
    return;
  }
  if (d.returnChunk !== undefined) {
    const source = $(`[data-chunk-id="${d.returnChunk}"]`);
    if (source) source.disabled = false;
    node.remove();
    return;
  }
  if (d.cacheBook) {
    node.disabled = true;
    node.textContent = "正在下载正文和词汇…";
    try {
      const b = catalog().find((b) => b.id === d.cacheBook);
      let content = b;
      if (b.remote) {
        const r = await fetch(b.remote);
        if (!r.ok) throw Error();
        content = await r.json();
      }
      const set = new Set(
        content.chapters.flatMap((c) =>
          c.lines.flatMap((l) =>
            (l[0].toLowerCase().match(/[a-z]+/g) || []).map((w) =>
              w.slice(0, 2),
            ),
          ),
        ),
      );
      const info = await dictionaryInfo(),
        cache = await caches.open("english-studio-data");
      if (b.remote) await cache.add(b.remote);
      const keys = [...set].filter((k) => info.shards.includes(k));
      for (let i = 0; i < keys.length; i += 4)
        await Promise.all(
          keys.slice(i, i + 4).map((k) => cache.add("lexicon/" + k + ".json")),
        );
      cachedBooks.add(b.id);
      node.textContent = "已下载正文和本书词汇 ✓";
    } catch {
      node.textContent = "下载失败，点击重试";
      node.disabled = false;
    }
    return;
  }
  if (d.removeImport) {
    state.trash = state.trash || [];
    const i = state.imports.findIndex((b) => b.id === d.removeImport);
    if (i >= 0) state.trash.push(state.imports.splice(i, 1)[0]);
    save();
    manageImports();
    return;
  }
  if (d.restoreImport) {
    const i = state.trash.findIndex((b) => b.id === d.restoreImport);
    if (i >= 0) state.imports.push(state.trash.splice(i, 1)[0]);
    save();
    manageImports();
    return;
  }
  switch (action) {
    case "popover-close":
      readerPopover.close();
      break;
    case "popover-save":
      savePopoverWord();
      break;
    case "word-more":
      if (selectedLookup?.kind === "word") termSheet(selectedLookup.term, selectedLookup.index);
      break;
    case "popover-enable-translate":
      if (!$("#popover-online-consent")?.checked) return toast("请先勾选允许发送点选的文字");
      state.settings.online = true;
      save();
      translatePopover();
      break;
    case "popover-retry-translate":
      translatePopover();
      break;
    case "reading-practice":
      startReadingPractice();
      break;
    case "listen-mode": {
      readerPopover.close(false);
      lookupResume = null;
      speaker.stop();
      listening = !listening;
      buildParts();
      part = findReadingPage(parts, activeSentence, activeOffset);
      renderReader();
      if (listening) playFrom(activeSentence, activeOffset);
      break;
    }
    case "expand-context": {
      const expanded = node
        .closest(".context-box")
        .classList.toggle("expanded");
      node.textContent = expanded ? "收起原文" : "展开原文";
      break;
    }
    case "close":
      closeSheet();
      break;
    case "back-books":
      nav(book?.track ? "trades/" + book.track : book?.course ? "textbooks/" + book.course : "books");
      break;
    case "words":
      closeSheet();
      wordsPage();
      break;
    case "courses":
      nav("courses");
      break;
    case "contents":
      contents();
      break;
    case "marks":
      marks();
      break;
    case "reader-settings":
      settings(true);
      break;
    case "settings":
      settings();
      break;
    case "apply-settings":
      closeSheet();
      if (book) {
        speaker.stop();
        lookupResume = null;
        buildParts();
        part = findReadingPage(parts, activeSentence, activeOffset);
        renderReader();
      }
      break;
    case "prev-page":
      turnPage(-1);
      break;
    case "next-page":
      turnPage(1);
      break;
    case "phrase-mode":
      speaker.stop();
      lookupResume = null;
      phraseMode = !phraseMode;
      phraseStart = null;
      refreshText();
      toast(phraseMode ? "先点短语首词，再点末词" : "已退出短语选择");
      node.classList.toggle("selected", phraseMode);
      node.textContent = phraseMode ? "请依次点选短语首词、末词" : "选短语";
      break;
    case "translation-toggle":
      state.settings.translations = !state.settings.translations;
      save();
      renderReader();
      break;
    case "play":
      if (["playing", "paused"].includes(speaker.mode)) speaker.toggle();
      else playFrom(activeSentence, activeOffset);
      break;
    case "stop-audio":
      speaker.stop();
      break;
    case "audio-prev":
      stepSpeech(-1);
      break;
    case "audio-next":
      stepSpeech(1);
      break;
    case "sleep":
      sheet(
        "睡眠定时",
        `<p class="subtle">到时间后停止设备朗读。</p><div class="button-row">${[5, 10, 15, 30].map((n) => `<button class="button soft" data-sleep-minutes="${n}">${n} 分钟</button>`).join("")}<button class="button soft" data-sleep-minutes="0">关闭定时</button></div>`,
      );
      break;
    case "edit-meaning":
      $("#meaning-editor").classList.remove("hidden");
      $("#term-meaning").focus();
      break;
    case "import":
      importSheet();
      break;
    case "nce":
      nce();
      break;
    case "trades":
      nav("trades");
      break;
    case "lookup":
      sheet(
        "查一个单词或短语",
        '<div class="lookup-search"><input id="dictionary-query" placeholder="输入英文，例如 curiosity" aria-label="词典查询"><button class="button primary" data-action="do-lookup">查询</button></div><p class="micro">英汉释义来自 ECDICT；词库分片首次加载需联网。</p>',
      );
      break;
    case "do-lookup": {
      const w = $("#dictionary-query").value.trim();
      if (w) return termSheet(w);
      break;
    }
    case "clear-filters":
      search = "";
      category = "all";
      level = "全部";
      library();
      break;
    case "review-start":
      startReview();
      break;
    case "check-spelling":
      checkReview($("#spelling").value);
      break;
    case "lesson-next":
      step++;
      renderLesson();
      break;
    case "clear-sentence":
      $("#sentence-build").innerHTML = "";
      document
        .querySelectorAll("[data-chunk]")
        .forEach((n) => (n.disabled = false));
      break;
    case "check-sentence": {
      if (answerLocked) break;
      const value = [...$("#sentence-build").children]
          .map((n) => n.textContent)
          .join(" "),
        ok = value === lesson.items[step][0];
      answerLocked = true;
      $("#lesson-feedback").innerHTML =
        `<div class="answer-feedback ${ok ? "correct" : "incorrect"}">${ok ? "句子正确 ✓" : "正确句子：" + esc(lesson.items[step][0])}</div>`;
      $("#lesson-next").classList.remove("hidden");
      break;
    }
    case "export-backup":
      download(
        "english-studio-backup.json",
        JSON.stringify(
          {
            format: "english-studio-v4",
            date: new Date().toISOString(),
            data: state,
          },
          null,
          2,
        ),
      );
      break;
    case "export-words": {
      const q = (s) => '"' + String(s || "").replace(/"/g, '""') + '"';
      download(
        "english-studio-words.csv",
        "\ufeffword,meaning,example,source\n" +
          state.terms
            .map((t) => [t.w, t.meaning, t.example, t.source].map(q).join(","))
            .join("\n"),
        "text/csv",
      );
      break;
    }
    case "cache-info": {
      const keys = await caches.keys();
      let n = 0;
      for (const key of keys)
        n += (await (await caches.open(key)).keys()).length;
      sheet(
        "离线缓存",
        `<p>当前浏览器缓存了 ${n} 个文件。</p><p class="subtle">包含打开过的书籍、词库分片和应用页面。设备语音离线可用性取决于手机是否安装英语语音包。</p>`,
      );
      break;
    }
    case "manage-imports":
      manageImports();
      break;
    case "sources":
      sources();
      break;
  }
  if (d.sleepMinutes !== undefined) {
    sleepUntil = Number(d.sleepMinutes)
      ? Date.now() + Number(d.sleepMinutes) * 60000
      : 0;
    closeSheet();
    toast(sleepUntil ? "定时已设置" : "已关闭定时");
  }
});
function refreshText() {
  const el = $("#reading-text");
  if (el) el.innerHTML = sentenceHTML();
}
function manageImports() {
  sheet(
    "本地书籍管理",
    `${state.imports.map((b) => `<div class="manage-row"><span>${esc(b.title)}</span><button class="link-button" data-remove-import="${esc(b.id)}">移出书架</button></div>`).join("") || '<p class="subtle">还没有导入书籍。</p>'}<h3>可恢复的书籍</h3>${(state.trash || []).map((b) => `<div class="manage-row"><span>${esc(b.title)}</span><button class="link-button" data-restore-import="${esc(b.id)}">恢复</button></div>`).join("") || '<p class="subtle">这里是空的。</p>'}`,
  );
}
document.addEventListener("keydown", (e) => {
  if (e.target.matches("[data-word]") && ["Enter", " "].includes(e.key)) {
    e.preventDefault();
    e.target.click();
  }
  if (e.key === "Enter" && e.target.id === "dictionary-query")
    $('[data-action="do-lookup"]').click();
  if (e.key === "Enter" && e.target.id === "spelling")
    checkReview(e.target.value);
});
let draftSaveTimer;
window.addEventListener("pagehide", () => {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    save();
  }
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "textbook-draft") {
    const unit = learningUnits.find((item) => item.id === t.dataset.unitDraft);
    const textbook = learningBook(unit);
    if (textbook) {
      const rec = record(textbook.id);
      rec.drafts ||= {};
      rec.drafts[unit.id] = t.value;
      rec.updated = Date.now();
      clearTimeout(draftSaveTimer);
      const status = $("#draft-status");
      if (status) status.textContent = "正在保存草稿…";
      draftSaveTimer = setTimeout(() => {
        draftSaveTimer = null;
        const saved = save();
        if ($("#textbook-draft")?.dataset.unitDraft === unit.id && $("#draft-status"))
          $("#draft-status").textContent = saved ? "草稿已保存在当前浏览器。" : "保存失败，请先复制草稿并导出备份。";
      }, 350);
    }
  }
  if (t.id === "reader-seek") {
    const label = $(".reader-page-label");
    if (label) label.textContent = `${readerHeading().label} · ${Number(t.value) + 1}/${parts.length}`;
  }
  if (t.id === "library-search") {
    search = t.value;
    const pos = t.selectionStart;
    library();
    const input = $("#library-search");
    input.focus();
    if (pos !== null) input.setSelectionRange(pos, pos);
  }
  if (t.id === "term-filter") {
    const q = t.value.toLowerCase();
    document
      .querySelectorAll(".vocab-item")
      .forEach((n) => (n.hidden = !n.dataset.search.includes(q)));
  }
  if (t.id === "chapter-search") {
    const q = t.value.toLowerCase();
    document
      .querySelectorAll("[data-jump-chapter]")
      .forEach((n) => (n.hidden = !n.textContent.toLowerCase().includes(q)));
  }
  if (t.id === "font-size") {
    state.settings.size = Number(t.value);
    save();
    const paper = $(".reader-paper");
    if (paper) paper.style.setProperty("--font", t.value + "px");
    $("#font-label").textContent = t.value + "px";
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.id === "reader-seek" && book) {
    readerPopover.close(false);
    lookupResume = null;
    speaker.stop();
    speechUnits = [];
    part = Math.min(parts.length - 1, Math.max(0, Number(t.value) || 0));
    const fragment = parts[part].fragments[0];
    savePosition(fragment.index, fragment.start);
    renderReader();
    return;
  }
  if (t.id === "library-level") {
    level = t.value;
    library();
  }
  if (t.id === "library-sort") {
    sort = t.value;
    library();
  }
  const config = {
    "line-height": ["line", Number],
    "speech-rate": ["rate", Number],
    "speech-voice": ["voice", String],
  };
  if (config[t.id]) {
    const [key, cast] = config[t.id];
    state.settings[key] = cast(t.value);
    save();
    if (key === "line")
      $(".reader-paper")?.style.setProperty("--leading", state.settings.line);
  }
  for (const [id, key] of [
    ["auto-next", "autoNext"],
    ["show-terms", "known"],
    ["online-setting", "online"],
  ])
    if (t.id === id) {
      state.settings[key] = t.checked;
      save();
    }
  if (t.id === "import-file-v4" && t.files[0]) {
    try {
      toast("正在本地解析…");
      commitImport(
        await parseFile(
          t.files[0],
          $("#import-name").value.trim(),
          Number(t.dataset.course),
        ),
      );
    } catch (error) {
      toast(error.message);
    }
  }
  if (t.id === "restore-v4" && t.files[0]) {
    try {
      if (t.files[0].size > 15000000) throw Error("备份文件过大");
      const data = JSON.parse(await t.files[0].text()),
        next = mergeBackup(state, data),
        previous = state;
      state = next;
      if (!save()) {
        state = previous;
        return;
      }
      toast("备份已合并恢复");
      profile();
    } catch (error) {
      toast(error.message || "备份文件无效");
    }
  }
});
let suppressReaderClickUntil = 0;
let readerGesture = null;
document.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch" || !book || modal.open || readerPopover.element.open || !event.target.closest(".reader-paper") || event.target.closest("button,input,textarea,a") || event.button !== 0) return;
  readerGesture = { id: event.pointerId, x: event.clientX, y: event.clientY, at: Date.now() };
}, { passive: true });
document.addEventListener("pointercancel", () => {
  if (readerGesture?.id !== "touch") readerGesture = null;
}, { passive: true });
document.addEventListener("pointerup", (event) => {
  if (!readerGesture || event.pointerId !== readerGesture.id) return;
  finishReaderGesture(event.clientX, event.clientY);
}, { passive: true });
function finishReaderGesture(x, y) {
  if (!readerGesture) return;
  const gesture = readerGesture;
  readerGesture = null;
  const dx = x - gesture.x;
  const dy = y - gesture.y;
  if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - gesture.at > 2500) return;
  suppressReaderClickUntil = Date.now() + 600;
  turnPage(dx < 0 ? 1 : -1);
}
document.addEventListener("touchstart", (event) => {
  if (!book || modal.open || readerPopover.element.open || event.touches.length !== 1 || !event.target.closest(".reader-paper") || event.target.closest("button,input,textarea,a")) return;
  const touch = event.touches[0];
  readerGesture = { id: "touch", x: touch.clientX, y: touch.clientY, at: Date.now() };
}, { passive: true });
document.addEventListener("touchend", (event) => {
  if (readerGesture?.id !== "touch" || !event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  finishReaderGesture(touch.clientX, touch.clientY);
}, { passive: true });
document.addEventListener("touchmove", (event) => {
  if (readerGesture?.id !== "touch" || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const dx = touch.clientX - readerGesture.x;
  const dy = touch.clientY - readerGesture.y;
  if (event.cancelable && Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy) * 1.5) event.preventDefault();
}, { passive: false });
document.addEventListener("touchcancel", () => { readerGesture = null; }, { passive: true });
let reflowTimer;
let readerViewport = { width: window.innerWidth, height: window.innerHeight };
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - readerViewport.width) < 2 && Math.abs(window.innerHeight - readerViewport.height) < 100) return;
  clearTimeout(reflowTimer);
  reflowTimer = setTimeout(() => {
    readerViewport = { width: window.innerWidth, height: window.innerHeight };
    if (!book || !route.startsWith("read/")) return;
    if (modal.open) {
      pendingReaderReflow = true;
      return;
    }
    const wasPlaying = speaker.mode === "playing";
    readerPopover.close(false);
    lookupResume = null;
    speaker.stop();
    buildParts();
    part = findReadingPage(parts, activeSentence, activeOffset);
    renderReader();
    if (wasPlaying) playFrom(activeSentence, activeOffset);
  }, 160);
});
window.addEventListener("hashchange", () => {
  readerPopover.close(false);
  closeSheet();
  render();
});
window.addEventListener("online", () => {
  const n = $("#offline-label");
  if (n) n.textContent = "已联网";
});
window.addEventListener("offline", () => {
  const n = $("#offline-label");
  if (n) n.textContent = "离线模式";
});
setInterval(() => {
  if (route.startsWith("read/") && !document.hidden) {
    day().seconds += 15;
    save();
  }
  if (sleepUntil && Date.now() >= sleepUntil) {
    speaker.stop();
    sleepUntil = 0;
  }
}, 15000);
let scrollTimer;
document.addEventListener(
  "scroll",
  () => {
    if (!book || !route.startsWith("read/") || speaker.mode === "playing" || modal.open || readerPopover.element.open || Date.now() < ignoreReaderScrollUntil)
      return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const nodes = [...document.querySelectorAll(".reading-sentence")];
      const found = nodes.find((n) => n.getBoundingClientRect().bottom > 120);
      if (found && !modal.open && !readerPopover.element.open && Date.now() >= ignoreReaderScrollUntil) savePosition(Number(found.dataset.sentence), Number(found.dataset.offset) || 0);
    }, 250);
  },
  { passive: true },
);
if (location.hash === "#reader")
  location.hash =
    "read/" +
    (state.current || "morning") +
    "/" +
    (state.records[state.current]?.chapter || 0);
else if (!location.hash || location.hash === "#home")
  history.replaceState(null, "", "#books");
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
