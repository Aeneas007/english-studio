import { esc } from "./core.mjs";

function shuffled(values, random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function textbookTasks(unit, random = Math.random) {
  const grammar = (unit?.questions || []).filter((q) =>
    typeof q.prompt === "string" && Array.isArray(q.options) &&
    q.options.length >= 2 && q.options.every((o) => typeof o === "string") &&
    new Set(q.options).size === q.options.length && Number.isInteger(q.answer) &&
    q.answer >= 0 && q.answer < q.options.length && typeof q.explanation === "string",
  ).map((q) => ({
    kind: "grammar", prompt: q.prompt, options: [...q.options],
    answer: q.answer, explanation: q.explanation,
  }));
  const items = (unit?.items || []).filter((row) =>
    Array.isArray(row) && typeof row[0] === "string" && row[0].trim() &&
    typeof row[1] === "string" && row[1].trim(),
  );
  const listening = [0, 3].flatMap((index) => {
    const item = items[index];
    if (!item) return [];
    const meanings = [...new Set(items.map((row) => row[1]).filter((m) => m !== item[1]))];
    if (meanings.length < 2) return [];
    const options = shuffled([item[1], ...shuffled(meanings, random).slice(0, 3)], random);
    return [{ kind: "listen", prompt: "听一听，选择这句话的意思。", text: item[0], options,
      answer: options.indexOf(item[1]), explanation: `${item[0]}\n${item[1]}` }];
  });
  return [...grammar, ...listening];
}

export class TextbookPractice {
  constructor({ render, onComplete, onExit, onSpeak, random = Math.random }) {
    Object.assign(this, { render, onComplete, onExit, onSpeak, random });
    this.reset();
  }
  reset() {
    this.unit = null;
    this.tasks = [];
    this.index = 0;
    this.answers = [];
    this.completed = false;
  }
  start(unit) {
    const tasks = textbookTasks(unit, this.random);
    if (!unit?.id || !tasks.length) return false;
    this.reset();
    this.unit = unit;
    this.tasks = tasks;
    this.show();
    return true;
  }
  handle(data) {
    if (!this.unit) return false;
    if (data.textbookExit !== undefined) {
      const unit = this.unit;
      this.reset();
      this.onExit(unit);
      return true;
    }
    if (data.textbookSpeak !== undefined) {
      const task = this.tasks[this.index];
      if (!this.completed && task?.kind === "listen") this.onSpeak(task.text);
      return true;
    }
    if (data.textbookAnswer !== undefined) {
      if (this.completed || this.answers.length > this.index) return true;
      const answer = Number(data.textbookAnswer);
      const task = this.tasks[this.index];
      if (data.textbookAnswer === "" || !Number.isInteger(answer) || answer < 0 || answer >= task.options.length) return true;
      this.answers.push(answer);
      this.show();
      return true;
    }
    if (data.textbookNext !== undefined) {
      if (this.completed || this.answers.length <= this.index) return true;
      this.index++;
      this.show();
      return true;
    }
    return false;
  }
  show() {
    const unit = this.unit;
    if (this.index >= this.tasks.length) {
      const correct = this.tasks.reduce((sum, task, i) => sum + Number(task.answer === this.answers[i]), 0);
      if (!this.completed) {
        this.completed = true;
        this.onComplete(unit, { correct, total: this.tasks.length });
      }
      this.render(`<div class="lesson-session textbook-quiz"><p class="eyebrow">PRACTICE COMPLETE</p><div class="completion-mark">✓</div><h1>这次练习，完成了。</h1><p class="subtle">${esc(unit.title)} · ${correct} / ${this.tasks.length} 题</p><p>回到短文再读一遍，也可以用自己的话回答输出提示。</p><div class="button-row"><button class="button primary" data-textbook-read="${esc(unit.id)}">回到配套短文</button><button class="button soft" data-textbook-exit>查看本课讲解</button></div><div class="textbook-review">${this.tasks.map((task, i) => `<details><summary>${task.answer === this.answers[i] ? "✓" : "再看一次"} · ${esc(task.kind === "listen" ? "听力理解" : task.prompt)}</summary><p>${esc(task.options[task.answer])}</p><p class="subtle">${esc(task.explanation).replace(/\n/g, "<br>")}</p></details>`).join("")}</div></div>`);
      return;
    }
    const task = this.tasks[this.index];
    const answered = this.answers.length > this.index;
    const selected = this.answers[this.index];
    const correct = selected === task.answer;
    this.render(`<div class="lesson-session textbook-quiz"><button class="link-button" data-textbook-exit>← ${esc(unit.title)}</button><div class="session-progress"><i style="width:${this.index / this.tasks.length * 100}%"></i></div><p class="eyebrow">${this.index + 1} / ${this.tasks.length} · ${task.kind === "listen" ? "听力理解" : "语法与理解"}</p><div class="lesson-scene"><small>原创配套 · 第 ${unit.book} 册</small><h2>${esc(task.prompt)}</h2>${task.kind === "listen" ? '<button class="button primary" data-textbook-speak>▶ 听这句话</button>' : ""}</div><div class="review-options">${task.options.map((option, i) => `<button data-textbook-answer="${i}" class="grammar-option ${answered ? i === task.answer ? "chosen correct" : i === selected ? "chosen incorrect" : "" : ""}" ${answered ? "disabled" : ""}>${esc(option)}${answered && i === task.answer ? " ✓" : ""}</button>`).join("")}</div>${answered ? `<div class="answer-feedback ${correct ? "correct" : "incorrect"}" role="status">${correct ? "答对了 ✓" : "再理解一下"}<p>${esc(task.explanation).replace(/\n/g, "<br>")}</p></div><button class="button primary wide" data-textbook-next>${this.index === this.tasks.length - 1 ? "查看本课结果" : "下一题 →"}</button>` : '<p class="micro">选择后会显示解释。听力由设备英语语音朗读，可重复播放。</p>'}</div>`);
  }
}
