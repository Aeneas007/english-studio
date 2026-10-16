import {
  KEY,
  esc,
  normalize,
  load,
  mergeBackup,
  schedule,
  progress,
  textChapters,
} from "./core.mjs";
import { lookup, dictionaryInfo, translate } from "./lexicon.mjs";
import { ReaderSpeech } from "./speech.mjs";
import { parseFile, makeBook } from "./imports.mjs";
import { lessons } from "./courses.mjs";

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
const loaded = new Map(),
  cachedBooks = new Set(),
  cacheNames = new Set(),
  today = () => new Date().toLocaleDateString("en-CA");
const catalog = () => [...window.READING_BOOKS, ...state.imports];
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
  document
    .querySelectorAll(".selected-word")
    .forEach((n) => n.classList.remove("selected-word"));
}
function sheet(title, html, kind = "") {
  sheetToken++;
  modal.className = kind;
  modal.innerHTML = `<div class="sheet-handle"></div><header class="sheet-head"><h2>${title}</h2><button data-action="close" class="round" aria-label="关闭">×</button></header><div class="sheet-content">${html}</div>`;
  if (!modal.open) modal.showModal();
  return sheetToken;
}
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeSheet();
});
modal.addEventListener("cancel", () => {
  sheetToken++;
  translationAbort?.abort();
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
  return `<article class="library-book"><button class="cover-button" data-open="${esc(b.id)}" aria-label="阅读 ${esc(b.title)}">${cover(b)}</button><div class="book-card-title"><button data-detail="${esc(b.id)}">${esc(b.zh)}</button><button class="heart ${r.favorite ? "filled" : ""}" data-favorite="${esc(b.id)}" aria-label="${r.favorite ? "取消收藏" : "收藏"} ${esc(b.title)}">${r.favorite ? "♥" : "♡"}</button></div><p>${esc(b.level)} · ${b.chapters.length} 章 ${b.imported ? "· 我的书籍" : b.collection === "classics" ? "· 完整原著" : ""}</p>${r.updated ? `<div class="tiny-progress"><i style="width:${r.finished ? 100 : r.percent}%"></i></div><small>${r.finished ? "已读完 ✓" : "读至 " + r.percent + "%"}</small>` : ""}</article>`;
}
function library() {
  let found = catalog().filter((b) => {
    const r = record(b.id);
    return (
      ((category === "all" && b.collection !== "bible") ||
        (category === "classics" && b.collection === "classics") ||
        (category === "bible" && b.collection === "bible") ||
        (category === "favorites" && r.favorite) ||
        (category === "continue" && r.updated && !r.finished) ||
        (category === "imports" && b.imported) ||
        (category === "finished" && r.finished)) &&
      (!search ||
        [b.title, b.zh, b.description, b.author]
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
    `<div class="page-heading"><div><p class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h1>在故事里，遇见英语。</h1><p class="subtle">读懂一个词，听懂一句话，把每次好奇变成进步。</p></div><button class="button soft" data-action="import">＋ 导入书籍</button></div><section class="library-hero"><div class="hero-copy">${badge(last ? "继续你的故事" : "本周精选 · 完整英文原著")}<h2>${esc(featured.zh || featured.title)}</h2><p>${last ? "上次读到第 " + (record(last.id).chapter + 1) + " 章 · " + record(last.id).percent + "%" : esc(featured.zh) + " · 点词查义，逐句听读，从容进入英文世界。"}</p><button class="button dark" data-open="${esc(featured.id)}">${last ? "继续阅读" : "开始阅读"} <span>↗</span></button></div><div class="hero-book">${cover(featured, true)}</div><div class="hero-line"></div></section><div class="quick-paths"><button data-action="nce"><span class="path-icon orange">Aa</span><div><b>新概念 1–4</b><small>导入自己的教材</small></div><span>›</span></button><button data-category="bible"><span class="path-icon green">✝</span><div><b>KJV 圣经</b><small>66 卷 · 逐节阅读</small></div><span>›</span></button><button data-action="lookup"><span class="path-icon purple">A中</span><div><b>英汉词典</b><small id="dictionary-count">完整词库 · 按需加载</small></div><span>›</span></button></div><div class="catalog-tools"><label class="searchbox"><span>⌕</span><input id="library-search" type="search" aria-label="搜索书名或作者" placeholder="搜索书名、作者、关键词" value="${esc(search)}"></label><select id="library-level" aria-label="按级别筛选">${["全部", "A1", "A2", "B1", "B2", "KJV", "自选"].map((x) => `<option ${x === level ? "selected" : ""}>${x}</option>`).join("")}</select><select id="library-sort" aria-label="书架排序">${["推荐", "最近阅读", "篇幅短优先"].map((x) => `<option ${x === sort ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="catalog-tabs">${[
      ["all", "发现"],
      ["classics", "经典原著"],
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
async function openBook(id, { chapter, sentence } = {}) {
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
      return toast("这本书尚未缓存，请联网后再试");
    }
  }
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
  state.current = id;
  buildParts();
  part = Math.max(
    0,
    parts.findIndex((p) => activeSentence >= p.start && activeSentence < p.end),
  );
  location.hash = "read/" + id + "/" + ch;
  route = location.hash.slice(1);
  renderReader();
  savePosition(activeSentence);
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
function buildParts() {
  parts = [];
  let start = 0,
    n = 0;
  const lines = book.chapters[ch].lines;
  for (let i = 0; i < lines.length; i++) {
    n += (lines[i][0].match(/[A-Za-z]+/g) || []).length;
    if (n >= 180 && i + 1 < lines.length) {
      parts.push({ start, end: i + 1 });
      start = i + 1;
      n = 0;
    }
  }
  parts.push({ start, end: lines.length });
}
function tokenHTML(text, i) {
  const re = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[’'][A-Za-z]+)*/g;
  let p = 0,
    out = "",
    m,
    n = 0;
  while ((m = re.exec(text))) {
    out += esc(text.slice(p, m.index));
    const t = state.terms.find((t) => t.w === normalize(m[0]));
    out += `<span class="reader-token ${t && state.settings.known ? "term-" + t.status : ""}" role="button" tabindex="0" data-word="${esc(m[0])}" data-i="${i}" data-token="${n++}" data-start="${m.index}">${esc(m[0])}</span>`;
    p = re.lastIndex;
  }
  return out + esc(text.slice(p));
}
function renderReader() {
  if (!book) return;
  activeSentence = Math.min(
    Math.max(0, activeSentence),
    book.chapters[ch].lines.length - 1,
  );
  document.body.classList.add("immersive");
  document.body.dataset.theme = state.settings.theme;
  root.innerHTML = `<div class="reader-shell"><header class="reading-top"><button class="round" data-action="back-books" aria-label="返回书架">‹</button><div><strong>${esc(book.title)}</strong><small>${esc(book.chapters[ch].title)}</small></div><button class="round" data-action="contents" aria-label="章节目录">☷</button><button class="round" data-action="reader-settings" aria-label="阅读设置">Aa</button></header><div class="reading-track"><i style="width:${record(book.id).percent || 0}%"></i></div><main class="reader-paper" style="--font:${state.settings.size}px;--leading:${state.settings.line}"><div class="reader-chapter-head"><p class="eyebrow">${book.collection === "bible" ? "KING JAMES VERSION" : "CHAPTER " + String(ch + 1).padStart(2, "0")}</p><h1>${esc(book.chapters[ch].title)}</h1><p>${esc(book.chapters[ch].zh || book.zh)} <span>·</span> 第 ${part + 1} / ${parts.length} 页</p></div><div class="reader-mode-strip"><button data-action="phrase-mode" class="${phraseMode ? "selected" : ""}">${phraseMode ? "请依次点选短语首词、末词" : "选短语"}</button><button data-action="translation-toggle">${state.settings.translations ? "隐藏译文" : "双语阅读"}</button><button data-action="marks">书签 / 笔记</button></div><div id="reading-text">${sentenceHTML()}</div><div class="page-turner"><button class="button soft" data-action="prev-page" ${ch === 0 && part === 0 ? "disabled" : ""}>← 上一页</button><span>${Math.min(100, record(book.id).percent || 0)}%</span><button class="button dark" data-action="next-page">${ch === book.chapters.length - 1 && part === parts.length - 1 ? "读完这本书 ✓" : "下一页 →"}</button></div></main><section class="audio-dock"><div class="audio-progress"><span id="audio-caption">${book.chapters[ch].title}</span><button data-action="sleep">${sleepUntil ? "定时关闭中" : "睡眠定时"}</button></div><div class="audio-controls"><button class="round" data-action="audio-prev" aria-label="上一句">│‹</button><button class="play-button" id="reader-play" data-action="play" aria-label="开始朗读">▶</button><button class="round" data-action="audio-next" aria-label="下一句">›│</button><button class="audio-small" data-action="reader-settings">${state.settings.rate}×</button><button class="audio-small" data-action="stop-audio">停止</button></div><small>设备语音 · 听读同步 <span id="offline-label">${navigator.onLine ? "已联网" : "离线模式"}</span></small></section></div>`;
  document.documentElement.scrollTop = 0;
}
function sentenceHTML() {
  const range = parts[part],
    lines = book.chapters[ch].lines;
  let out = "";
  for (let i = range.start; i < range.end; i++) {
    const l = lines[i],
      translated = l[1] || state.translations[l[0]],
      mark = state.bookmarks.some(
        (m) => m.book === book.id && m.chapter === ch && m.sentence === i,
      );
    out += `<section class="reading-sentence ${mark ? "marked" : ""}" id="sentence-${i}" data-sentence="${i}"><div class="sentence-english">${book.collection === "bible" ? `<sup>${l[2] || i + 1}</sup>` : ""}${tokenHTML(l[0], i)}</div><button class="sentence-tools" data-sentence-sheet="${i}" aria-label="第 ${i + 1} 句翻译与操作">⋯</button>${state.settings.translations ? `<div class="parallel-translation" id="translation-${i}">${translated ? esc(translated) : `<button data-translate="${i}">点击翻译这句${state.settings.online ? "" : " · 需开启在线翻译"}</button>`}</div>` : ""}</section>`;
  }
  return out;
}
function savePosition(i) {
  if (!book) return;
  activeSentence = i;
  const r = record(book.id);
  Object.assign(r, {
    chapter: ch,
    sentence: i,
    percent: progress(book, ch, i),
    updated: Date.now(),
  });
  state.current = book.id;
  save();
  const bar = $(".reading-track i");
  if (bar) bar.style.width = r.percent + "%";
}
function turnPage(delta) {
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
  savePosition(parts[part].start);
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
  const target = parts.findIndex((p) => s.index >= p.start && s.index < p.end);
  if (target >= 0 && target !== part) {
    part = target;
    renderReader();
  }
  document
    .querySelectorAll(".reading-sentence.speaking,.reader-token.speaking-word")
    .forEach((n) => n.classList.remove("speaking", "speaking-word"));
  const sentence = $("#sentence-" + s.index);
  if (sentence) {
    sentence.classList.add("speaking");
    if (s.word >= 0) {
      const tokens = [...sentence.querySelectorAll(".reader-token")];
      const t = tokens.find(
        (n, i) =>
          Number(n.dataset.start) <= s.word &&
          (!tokens[i + 1] || Number(tokens[i + 1].dataset.start) > s.word),
      );
      t?.classList.add("speaking-word");
    }
    if (activeSentence !== s.index) {
      savePosition(s.index);
      sentence.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  const caption = $("#audio-caption");
  if (caption)
    caption.textContent = `${s.mode === "playing" ? "正在朗读" : "已暂停"} · 第 ${s.index + 1} / ${book.chapters[ch].lines.length} 句`;
}
function playFrom(i) {
  try {
    speaker.play(book.chapters[ch].lines, i, state.settings, () => {
      if (state.settings.autoNext && ch < book.chapters.length - 1) {
        ch++;
        buildParts();
        part = 0;
        savePosition(0);
        renderReader();
        playFrom(0);
      } else toast("本章朗读完成");
    });
  } catch (e) {
    toast(e.message);
  }
}
function detail(id) {
  const b = catalog().find((x) => x.id === id);
  if (!b) return;
  const r = record(id);
  sheet(
    esc(b.zh),
    `<div class="book-detail-layout">${cover(b, true)}<div><h3>${esc(b.title)}</h3><p>${esc(b.author || "English Studio")}</p>${badge(b.level)}<p class="subtle">${b.chapters.length} 章 · ${words(b).toLocaleString()} 词</p></div></div><p class="detail-description">${esc(b.description || "从点词开始，进入你的下一段英文旅程。")}</p><div class="button-row"><button class="button primary" data-open="${esc(id)}">${r.updated ? "继续阅读" : "开始阅读"} →</button><button class="button soft" data-favorite="${esc(id)}">${r.favorite ? "已收藏 ♥" : "收藏 ♡"}</button></div><button class="button soft wide" data-cache-book="${esc(id)}">↓ 下载正文与本书词汇，供离线阅读</button><p class="micro">${b.source ? `<a href="${esc(b.source)}" target="_blank" rel="noopener">查看原文来源 ↗</a>` : "原创故事或本地导入内容"} · 朗读使用设备语音</p>`,
  );
}
async function termSheet(
  term,
  index = activeSentence,
  { phrase = false } = {},
) {
  if (book?.chapters[ch]?.lines[index]) activeSentence = index;
  speaker.mode === "playing" && speaker.toggle();
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
  speaker.mode === "playing" && speaker.toggle();
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
          `<button class="mark-item" data-jump-mark="${n.chapter}:${n.sentence}"><small>第 ${n.chapter + 1} 章</small><p>${esc(isNote ? n.text : book.chapters[n.chapter].lines[n.sentence][0])}</p></button>`,
      )
      .join("");
  sheet(
    "书签与笔记",
    `<h3>书签 · ${marks.length}</h3>${rows(marks, false) || '<p class="subtle">点击句子旁 ⋯ 可添加书签。</p>'}<h3>笔记 · ${notes.length}</h3>${rows(notes, true) || '<p class="subtle">还没有笔记。</p>'}`,
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
  category = "imports";
  search = "";
  level = "全部";
  nav("books");
  toast("已导入 " + b.title);
}
function nce() {
  sheet(
    "新概念英语 1–4",
    `<p class="subtle">选择一册，导入自己的教材即可使用相同的阅读、查词和听读功能。</p><div class="nce-grid">${[
      "First Things First",
      "Practice and Progress",
      "Developing Skills",
      "Fluency in English",
    ]
      .map((title, i) => {
        const b = state.imports.find((b) => b.id === "nce-" + (i + 1));
        return `<button data-nce="${i + 1}"><b>0${i + 1}</b><div><strong>新概念英语 第${i + 1}册</strong><small>${title}</small><span>${b ? "已导入 · " + b.chapters.length + " 课" : "待导入 TXT / EPUB"}</span></div><i>›</i></button>`;
      })
      .join("")}</div><p class="micro">不提供原版教材或音频下载。</p>`,
  );
}
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
    `<div class="review-session"><button class="link-button" data-action="words">← 退出复习</button><div class="session-progress"><i style="width:${(reviewIndex / review.length) * 100}%"></i></div><p class="eyebrow">${reviewIndex + 1} / ${review.length} · ${mode === "choice" ? "选出正确释义" : mode === "listen" ? "听音辨词" : "拼写回忆"}</p><div class="review-prompt">${mode === "listen" ? `<button class="listen-bubble" data-pronounce="${esc(t.w)}" aria-label="听单词">▶</button><h2>你听到了哪个词？</h2>` : mode === "spell" ? `<h2>${esc(t.meaning.split("\n")[0])}</h2><button class="button soft" data-pronounce="${esc(t.w)}">听发音</button>` : `<h1>${esc(t.w)}</h1><button class="button soft" data-pronounce="${esc(t.w)}">▶ 听发音</button>`}</div>${mode === "spell" ? '<div class="spelling-answer"><input id="spelling" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入英文" aria-label="拼写单词"><button class="button primary" data-action="check-spelling">检查</button></div>' : `<div class="review-options">${options.map((o) => `<button data-review-answer="${esc(o.w)}">${esc(mode === "listen" ? o.w : o.meaning.split("\n")[0])}</button>`).join("")}</div>`}<div id="review-feedback"></div><div id="review-grades" class="hidden"><div class="context-box"><span>你读过的句子</span><p>${esc(t.example || "这个词来自你的收藏。")}</p><small>${esc(t.source || "")}</small></div><div class="button-row"><button class="button soft" data-review-grade="again">再学一次 · 10分钟</button><button class="button primary" data-review-grade="good">记住了</button><button class="button soft" data-review-grade="easy">很熟悉</button></div></div></div>`,
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
function coursesPage() {
  shell(
    `<div class="page-heading"><div><p class="eyebrow">SMALL LESSONS, REAL CONVERSATIONS</p><h1>把英语用在生活里。</h1><p class="subtle">原创情境短课 · 听、理解、拼句，走完一个完整练习。</p></div></div><div class="textbook-callout"><div><b>新概念英语 1–4</b><p>你的教材，你的学习节奏。支持 TXT / EPUB 按课导入。</p></div><button class="button dark" data-action="nce">打开教材 →</button></div><div class="course-grid">${lessons.map((l, i) => `<button class="course-card" data-lesson="${l.id}"><div style="background:${l.color}"><small>${l.level} · UNIT 0${i + 1}</small><b>${["Hello!", "Coffee?", "Let’s go.", "Good idea."][i]}</b><span>${["✺", "◒", "↗", "✦"][i]}</span></div><section><h3>${l.name}</h3><p>${l.subtitle}</p><small>6 句表达 · 听力 / 理解 / 拼句${state.completedLessons?.includes(l.id) ? " · 已完成 ✓" : ""}</small></section></button>`).join("")}</div><p class="page-footnote">这些是原创情境练习。影视课程需要有权使用的视频与字幕素材，目前未接入 EWA 片库。</p>`,
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
    )}</div><section class="profile-panel"><h2>本地数据与备份</h2><p class="subtle">学习记录保存在这个浏览器中。清理浏览器数据或更换手机不会自动同步，请定期导出备份。</p><div class="button-row"><button class="button primary" data-action="export-backup">导出全部备份</button><label class="button soft file-button">恢复备份<input id="restore-v4" type="file" accept=".json"></label><button class="button soft" data-action="export-words">导出单词 CSV</button></div></section><section class="profile-panel"><h2>离线阅读</h2><p class="subtle">已打开的书和查过的词库分片会自动缓存。书籍详情中可提前下载正文与本书词汇。</p><button class="button soft" data-action="cache-info">检查离线缓存</button></section><section class="profile-panel"><h2>阅读与收藏</h2><p>${state.notes.length} 条笔记 · ${state.bookmarks.length} 个书签 · ${state.imports.length} 本本地书籍</p><button class="button soft" data-action="manage-imports">管理本地书籍</button></section><p class="page-footnote"><button data-action="sources">版本、内容来源与使用限制</button> · English Studio 4.0</p>`,
    "profile",
  );
}
function sources() {
  sheet(
    "English Studio 4.0",
    `<p>这是独立实现的英语学习工具，与 EWA 无关联。</p><ul class="source-list"><li>英汉词典：<a href="https://github.com/skywind3000/ECDICT" target="_blank" rel="noopener">ECDICT</a>，MIT 许可；<a href="lexicon/LICENSE.txt" target="_blank">许可原文</a>。</li><li>经典全文：Project Gutenberg 提供的公版文本，保留原始来源与许可。<a href="content/sources/alice.txt" target="_blank">爱丽丝原文件</a> · <a href="content/sources/treasure.txt" target="_blank">金银岛原文件</a> · <a href="content/sources/garden.txt" target="_blank">秘密花园原文件</a></li><li>KJV：<a href="bible/SOURCE.md" target="_blank">eBible.org 标准文本与来源说明</a>。</li><li>分级短篇与情境课程：原创示例内容。</li><li>朗读：设备英语 TTS，不是真人有声书。部分设备不提供逐词边界，此时按句高亮。</li><li>在线翻译：可选 MyMemory 免费服务，可能限额、不可用或翻译有误，不上传整本读物。</li></ul><p>新概念教材正文、EWA 付费内容和影视资源未内置。新概念需导入自己的教材。</p><a class="button soft wide" href="https://blog.appewa.com/how-to-learn-a-language-with-books/" target="_blank" rel="noopener">EWA 官方阅读功能说明 ↗</a>`,
  );
}
function render() {
  const next = location.hash.slice(1) || "books";
  if (!next.startsWith("read/")) {
    speaker.stop();
    book = null;
    phraseMode = false;
    phraseStart = null;
  }
  route = next;
  if (next.startsWith("read/")) {
    const [, id, chapter] = next.split("/");
    if (!book || book.id !== id || ch !== Number(chapter))
      openBook(id, { chapter: Number(chapter) || 0 });
    else renderReader();
  } else if (next === "words") wordsPage();
  else if (next === "courses") coursesPage();
  else if (next === "profile") profile();
  else library();
}

document.addEventListener("click", async (e) => {
  const node = e.target.closest("button,[data-word]");
  if (!node) return;
  const d = node.dataset,
    action = d.action;
  if (d.open) return openBook(d.open);
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
    return termSheet(d.word, i);
  }
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
        status: "learning",
        due: Date.now(),
        interval: 0,
        repetitions: 0,
        added: Date.now(),
      });
      day().words++;
    }
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
    closeSheet();
    return playFrom(Number(d.startSentence));
  }
  if (d.bookmark !== undefined) {
    const i = Number(d.bookmark),
      p = state.bookmarks.findIndex(
        (n) => n.book === book.id && n.chapter === ch && n.sentence === i,
      );
    if (p >= 0) state.bookmarks.splice(p, 1);
    else state.bookmarks.push({ book: book.id, chapter: ch, sentence: i });
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
      state.notes.push({ book: book.id, chapter: ch, sentence: i, text });
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
    const [chapter, sentence] = d.jumpMark.split(":").map(Number);
    closeSheet();
    return openBook(book.id, { chapter, sentence });
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
    const b = state.imports.find((b) => b.id === "nce-" + d.nce);
    return b ? openBook(b.id) : importSheet(Number(d.nce));
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
    return openBook(t.book, { chapter: t.chapter, sentence: t.sentence });
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
      nav("books");
      break;
    case "words":
      closeSheet();
      wordsPage();
      break;
    case "courses":
      closeSheet();
      coursesPage();
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
      else playFrom(activeSentence);
      break;
    case "stop-audio":
      speaker.stop();
      break;
    case "audio-prev":
      playFrom(Math.max(0, activeSentence - 1));
      break;
    case "audio-next":
      playFrom(
        Math.min(book.chapters[ch].lines.length - 1, activeSentence + 1),
      );
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
document.addEventListener("input", (e) => {
  const t = e.target;
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
window.addEventListener("hashchange", () => {
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
    if (!book || !route.startsWith("read/") || speaker.mode === "playing")
      return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const nodes = [...document.querySelectorAll(".reading-sentence")];
      const found = nodes.find((n) => n.getBoundingClientRect().bottom > 120);
      if (found) savePosition(Number(found.dataset.sentence));
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
  navigator.serviceWorker.register("./sw.js").catch(() => {});
