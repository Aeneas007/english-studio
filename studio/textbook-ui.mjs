import { esc } from "./core.mjs";

const volumeDescriptions = {
  1: "从日常表达开始，建立清楚的句子骨架。",
  2: "把动作、时间和细节连成完整故事。",
  3: "围绕真实话题，练习理解、组织与表达。",
  4: "用更准确的语气展开观点与论证。",
};

function volumeUnits(units, course) {
  return (Array.isArray(units) ? units : [])
    .filter((unit) => Number(unit.book) === Number(course))
    .sort((a, b) => a.chapter - b.chapter);
}

function completedIds(completed) {
  return new Set(Array.isArray(completed) ? completed : []);
}

function importedFor(imports, course) {
  const books = Array.isArray(imports)
    ? imports
    : imports && typeof imports === "object"
      ? Object.values(imports)
      : [];
  return books.find((book) => Number(book?.course) === Number(course));
}

function progressHTML(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return `<div class="textbook-progress"><div><span>已完成 ${done} / ${total} 单元</span><b>${percent}%</b></div><div class="session-progress" role="progressbar" aria-label="单元完成进度" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${percent}%"></i></div></div>`;
}

export function renderTextbookHub({ books = [], units = [], imports = [], completed = [] } = {}) {
  const done = completedIds(completed);
  const cards = books.map((book) => {
    const lessons = volumeUnits(units, book.course);
    const count = lessons.filter((unit) => done.has(unit.id)).length;
    const next = lessons.find((unit) => !done.has(unit.id));
    const imported = importedFor(imports, book.course);
    return `<article class="textbook-volume-card"><div class="textbook-volume-art textbook-volume-${Number(book.course)}"><span class="textbook-volume-number">${String(book.course).padStart(2, "0")}</span><div><span class="eyebrow">ORIGINAL COMPANION</span><h2>第 ${esc(book.course)} 册</h2><span class="textbook-level">${esc(book.level)}</span></div></div><div class="textbook-volume-copy"><h3>${esc(book.title)}</h3><p>${esc(book.description || volumeDescriptions[book.course] || book.zh)}</p>${progressHTML(count, lessons.length)}<p class="textbook-next">${next ? `下一单元 · ${esc(next.title)}` : "本册单元已完成，可以继续回顾。"}</p><div class="textbook-card-actions"><button class="button dark" data-textbook-volume="${esc(book.course)}">${count ? "继续学习" : "开始学习"} <span aria-hidden="true">→</span></button>${imported ? '<span class="textbook-import-status">已导入个人教材</span>' : ""}</div></div></article>`;
  }).join("");
  return `<div class="textbook-hub"><div class="page-heading"><div><p class="eyebrow">A LITTLE PRACTICE, EVERY DAY</p><h1>四册，循序学下去。</h1><p class="subtle">阅读、理解、表达。每一单元，都走完一个小循环。</p></div><button class="button soft" data-action="courses">返回课程</button></div><div class="textbook-intro"><span aria-hidden="true">↗</span><div><h2>原创配套，现在就能学。</h2><p>四册共 ${units.length} 个原创单元，可直接阅读、做练习并尝试英文输出。它们是独立编写的配套学习内容；原版教材可另行导入自己的 TXT 或未加密 EPUB 文件。</p></div></div><div class="textbook-volume-grid">${cards}</div><p class="textbook-footnote">学习进度保存在当前浏览器。原创配套内容与个人导入的教材分别保留，导入文件在本机解析。</p></div>`;
}

export function renderTextbookVolume({ book, units = [], imported, completed = [] } = {}) {
  if (!book) return '<p class="subtle">暂时没有找到这一册。</p>';
  const done = completedIds(completed);
  const lessons = volumeUnits(units, book.course);
  const count = lessons.filter((unit) => done.has(unit.id)).length;
  const next = lessons.find((unit) => !done.has(unit.id)) || lessons[0];
  const lessonList = lessons.map((unit) => `<button class="textbook-unit-row${done.has(unit.id) ? " completed" : ""}" data-textbook-unit="${esc(unit.id)}"><span class="textbook-unit-number">${String(unit.chapter + 1).padStart(2, "0")}</span><span class="textbook-unit-copy"><strong>${esc(unit.title)}</strong><span>${esc(unit.focus)}</span></span><span class="textbook-unit-state">${done.has(unit.id) ? '已完成 <b aria-hidden="true">✓</b>' : '<b aria-hidden="true">›</b>'}</span></button>`).join("");
  const chapterList = imported?.chapters?.length
    ? `<details class="textbook-import-chapters"><summary>查看原版目录 <span>${imported.chapters.length} 课</span></summary><div>${imported.chapters.map((chapter, index) => `<button data-textbook-chapter="${esc(book.course)}:${index}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(chapter.title)}</strong><i aria-hidden="true">›</i></button>`).join("")}</div></details>`
    : "";
  return `<div class="textbook-volume-page"><button class="textbook-back link-button" data-action="nce">← 四册学习路线</button><div class="textbook-volume-heading"><div><p class="eyebrow">VOLUME ${String(book.course).padStart(2, "0")} · ${esc(book.level)}</p><h1>${esc(book.title)}</h1><p class="subtle">${esc(book.description || volumeDescriptions[book.course] || book.zh)}</p></div><span class="textbook-heading-number" aria-hidden="true">${String(book.course).padStart(2, "0")}</span></div>${progressHTML(count, lessons.length)}<div class="textbook-volume-actions">${next ? `<button class="button primary" data-textbook-unit="${esc(next.id)}">${count === lessons.length ? "回顾第一单元" : count ? "继续下一单元" : "开始第一单元"} →</button>` : ""}<button class="button soft" data-open="${esc(book.id)}">继续配套阅读</button></div><section class="textbook-unit-section"><div class="textbook-section-title"><h2>一步一步，学会表达。</h2><span>${lessons.length} 个单元</span></div><div class="textbook-unit-list">${lessonList}</div></section><section class="textbook-personal"><div><p class="eyebrow">YOUR OWN TEXTBOOK</p><h2>自己的教材，也放在这里。</h2><p>${imported ? `已导入：${esc(imported.title)}。个人教材与原创配套各自保存阅读位置。` : "如果你有这一册的电子教材，可以在本机导入，按课阅读、查词和听读。"}</p></div><div class="textbook-volume-actions">${imported ? `<button class="button dark" data-open="${esc(imported.id)}">打开已导入教材</button>` : ""}<button class="button soft" data-textbook-import="${esc(book.course)}">${imported ? "更换原版教材" : "导入原版教材"}</button></div>${chapterList}</section></div>`;
}

export function renderTextbookUnit({ book, unit, done = false, draft = "" } = {}) {
  if (!book || !unit) return '<p class="subtle">暂时没有找到这一单元。</p>';
  const chapter = book.chapters?.[unit.chapter];
  const lines = chapter?.lines || unit.items || [];
  const preview = lines[0]?.[0] || "";
  return `<div class="textbook-unit-page"><button class="textbook-back link-button" data-textbook-volume="${esc(book.course)}">← 第 ${esc(book.course)} 册学习路线</button><div class="textbook-unit-heading"><p class="eyebrow">VOLUME ${String(book.course).padStart(2, "0")} · UNIT ${String(unit.chapter + 1).padStart(2, "0")}</p><h1>${esc(unit.title)}</h1><span class="textbook-status${done ? " completed" : ""}">${done ? "本单元已完成 ✓" : "阅读 · 理解 · 输出"}</span></div><section class="textbook-goal"><span class="eyebrow">THIS TIME, YOU WILL LEARN</span><h2>${esc(unit.focus)}</h2><p>${esc(unit.tip)}</p></section><section class="textbook-reading-preview"><div class="textbook-section-title"><h2>先读一个小故事。</h2><span>${lines.length} 句英文</span></div><h3>${esc(chapter?.title || unit.title)}</h3>${preview ? `<blockquote>${esc(preview)}</blockquote>` : ""}<p>进入正文阅读完整内容。遇到不熟悉的表达，可以点词查看、逐句翻译，或切换听读。</p><button class="button dark" data-textbook-read="${esc(unit.id)}">开始配套阅读 →</button></section><section class="textbook-practice-preview"><span class="textbook-step-label">02 · CHECK YOUR UNDERSTANDING</span><h2>理解之后，试一试。</h2><p>用本单元的语境练习句子结构和表达，提交答案后查看解析。</p><button class="button primary" data-textbook-practice="${esc(unit.id)}">${done ? "再次练习" : "开始本课练习"} →</button></section><section class="textbook-writing"><span class="textbook-step-label">03 · MAKE IT YOURS</span><h2>用自己的话，写下来。</h2><p>${esc(unit.writing)}</p><label class="field-label" for="textbook-draft">我的英文草稿</label><textarea id="textbook-draft" data-unit-draft="${esc(unit.id)}" rows="5" maxlength="20000" placeholder="把今天的表达换成你的生活，也可以先说一遍。">${esc(draft)}</textarea><small id="draft-status" role="status">草稿自动保存在当前浏览器，可随全部备份导出。</small></section></div>`;
}
