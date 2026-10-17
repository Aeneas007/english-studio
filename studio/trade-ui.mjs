import { esc } from "./core.mjs";

const trackColours = { hvac: "#477c6c", electrical: "#a88437", plumbing: "#4d7f9c", construction: "#aa7151" };

function trackUnits(units, track) {
  return (Array.isArray(units) ? units : [])
    .filter((unit) => unit.track === track)
    .sort((a, b) => a.chapter - b.chapter);
}

function completionSet(completed) {
  return new Set(Array.isArray(completed) ? completed : []);
}

function trackStyle(track) {
  const colour = track.colour || track.color;
  const safe = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(colour || "")
    ? colour
    : trackColours[track.id] || "#667d5d";
  return `--trade-identity:${safe}`;
}

function progressHTML(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return `<div class="trade-progress"><div><span>已完成 ${done} / ${total} 单元</span><b>${percent}%</b></div><div class="session-progress" role="progressbar" aria-label="职业英语学习进度" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${percent}%"></i></div></div>`;
}

export function renderTradeHub({ tracks = [], units = [], completed = [] } = {}) {
  const done = completionSet(completed);
  const cards = tracks.map((track) => {
    const lessons = trackUnits(units, track.id);
    const count = lessons.filter((unit) => done.has(unit.id)).length;
    const next = lessons.find((unit) => !done.has(unit.id));
    return `<article class="trade-card" style="${trackStyle(track)}"><div class="trade-card-art"><span class="trade-symbol" aria-hidden="true">${esc(track.symbol || "↗")}</span><span class="trade-level">${esc(track.level || "现场英语")}</span><p class="eyebrow">AUSTRALIAN WORKPLACE ENGLISH</p><h2>${esc(track.title)}</h2><span class="trade-english-name">${esc(track.englishTitle)}</span></div><div class="trade-card-copy"><p>${esc(track.description)}</p>${progressHTML(count, lessons.length)}<p class="trade-next">${next ? `下一场景 · ${esc(next.title)}` : "本路线已完成，随时回来巩固表达。"}</p><button class="button dark" data-trade-track="${esc(track.id)}">${count ? "继续学习" : "进入学习路线"} →</button></div></article>`;
  }).join("");
  return `<div class="trade-hub"><div class="page-heading"><div><p class="eyebrow">ON SITE, IN ENGLISH</p><h1>把现场沟通，说得更清楚。</h1><p class="subtle">从听懂同事，到说明问题、确认安排，一次练一个真实场景。</p></div><button class="button soft" data-action="courses">返回课程</button></div><div class="trade-intro"><span class="trade-intro-mark" aria-hidden="true">AU</span><div><h2>选一个工种，从开口开始。</h2><p>这是围绕澳洲现场场景编写的英语沟通练习。${tracks.length} 条工种路线、${units.length} 个单元，包含对话、术语、理解练习与角色扮演。</p></div></div><div class="trade-track-grid">${cards}</div><p class="trade-footnote">进度、词汇和英文草稿保存在当前浏览器，可在“我的学习”中导出备份。</p></div>`;
}

export function renderTradeTrack({ track, units = [], completed = [] } = {}) {
  if (!track) return '<p class="subtle">暂时没有找到这条学习路线。</p>';
  const done = completionSet(completed);
  const lessons = trackUnits(units, track.id);
  const count = lessons.filter((unit) => done.has(unit.id)).length;
  const next = lessons.find((unit) => !done.has(unit.id)) || lessons[0];
  const list = lessons.map((unit) => `<button class="trade-unit-row${done.has(unit.id) ? " completed" : ""}" data-trade-unit="${esc(unit.id)}"><span class="trade-unit-number">${String(unit.chapter + 1).padStart(2, "0")}</span><span class="trade-unit-copy"><strong>${esc(unit.title)}</strong><span class="trade-unit-english">${esc(unit.englishTitle)}</span><span>${esc(unit.focus)}</span></span><span class="trade-unit-state">${done.has(unit.id) ? '已完成 <b aria-hidden="true">✓</b>' : '<b aria-hidden="true">›</b>'}</span></button>`).join("");
  return `<div class="trade-track-page" style="${trackStyle(track)}"><button class="trade-back link-button" data-action="trades">← 澳洲工地英语</button><header class="trade-track-heading"><span class="trade-heading-symbol" aria-hidden="true">${esc(track.symbol || "↗")}</span><div><p class="eyebrow">${esc(track.level || "AU ENGLISH")}</p><h1>${esc(track.title)}</h1><p class="trade-track-english">${esc(track.englishTitle)}</p><p class="subtle">${esc(track.description)}</p></div></header>${progressHTML(count, lessons.length)}<div class="trade-route-actions">${next ? `<button class="button primary" data-trade-unit="${esc(next.id)}">${count === lessons.length ? "回顾第一单元" : count ? "继续下一单元" : "开始第一单元"} →</button>` : ""}${track.bookId ? `<button class="button soft" data-open="${esc(track.bookId)}">打开对话读本</button>` : ""}</div><div class="trade-section-heading"><h2>先听懂，再回应。</h2><span>${lessons.length} 个现场场景</span></div><div class="trade-unit-list">${list}</div><div class="trade-route-note"><b>每课一个沟通循环</b><p>读一段对话，熟悉常用术语，完成理解练习，再把表达用到自己的角色扮演里。</p></div></div>`;
}

export function renderTradeUnit({ track, unit, done = false, draft = "" } = {}) {
  if (!track || !unit) return '<p class="subtle">暂时没有找到这个单元。</p>';
  const lines = Array.isArray(unit.items) ? unit.items : [];
  const glossary = Array.isArray(unit.glossary) ? unit.glossary : [];
  const terms = glossary.map((entry) => `<article class="trade-term"><div><h3>${esc(entry.term)}</h3><p class="trade-term-meaning">${esc(entry.meaning)}</p>${entry.note ? `<p class="trade-term-note">${esc(entry.note)}</p>` : ""}</div><div class="trade-term-actions"><button class="button soft" data-pronounce="${esc(entry.term)}" aria-label="朗读 ${esc(entry.term)}">▶ 发音</button><button class="button soft" data-trade-save-term="${esc(entry.term)}">＋ 加入单词本</button></div></article>`).join("");
  return `<div class="trade-unit-page" style="${trackStyle(track)}"><button class="trade-back link-button" data-trade-track="${esc(track.id)}">← ${esc(track.title)}学习路线</button><header class="trade-lesson-heading"><p class="eyebrow">AU WORKPLACE · UNIT ${String(unit.chapter + 1).padStart(2, "0")}</p><h1>${esc(unit.title)}</h1><p class="trade-lesson-english">${esc(unit.englishTitle)}</p><div class="trade-tags"><span>${esc(track.title)}</span><span>${lines.length} 句现场对话</span><span class="${done ? "completed" : ""}">${done ? "已完成 ✓" : "沟通练习"}</span></div></header><section class="trade-goal"><p class="eyebrow">YOUR COMMUNICATION GOAL</p><h2>${esc(unit.focus)}</h2></section><section class="trade-reading"><div class="trade-section-heading"><h2>先听一听现场怎么说。</h2><span>01 · 对话</span></div>${lines[0]?.[0] ? `<blockquote>${esc(lines[0][0])}</blockquote>` : ""}<p>打开完整对话，逐句阅读或听读。遇到不熟悉的表达，可以点词查看并加入本组练习。</p><button class="button dark" data-textbook-read="${esc(unit.id)}">阅读 / 听读这段对话 →</button></section><section class="trade-glossary"><div class="trade-section-heading"><h2>这次会用到的词。</h2><span>${glossary.length} 个术语</span></div><div class="trade-term-grid">${terms}</div></section><section class="trade-au-tip"><span class="trade-au-label">AU · LOCAL LANGUAGE</span><div><h2>澳洲现场，留意这样说。</h2><p>${esc(unit.tip)}</p></div></section><section class="trade-practice"><div class="trade-section-heading"><h2>换个场景，你听懂了吗？</h2><span>02 · 理解</span></div><p>用本课的表达完成场景选择，提交后查看解释。</p><button class="button primary" data-textbook-practice="${esc(unit.id)}">${done ? "再次练习" : "开始场景练习"} →</button></section><section class="trade-writing"><div class="trade-section-heading"><h2>轮到你开口。</h2><span>03 · 角色扮演</span></div><p>${esc(unit.writing)}</p><label class="field-label" for="textbook-draft">我的英文草稿</label><textarea id="textbook-draft" data-unit-draft="${esc(unit.id)}" aria-label="我的英文草稿" rows="6" maxlength="20000" placeholder="试着写下你的回应，再读出声。">${esc(draft)}</textarea><small id="draft-status" role="status">草稿自动保存在当前浏览器，可随全部备份导出。</small></section></div>`;
}
