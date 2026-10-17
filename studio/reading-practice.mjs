import { esc } from "./core.mjs";
import { createReadingStudy } from "./reading-study.mjs";

export class ReadingPractice {
  constructor({ render, onComplete, onExit, onPronounce } = {}) {
    this.render = typeof render === "function" ? render : () => {};
    this.onComplete = typeof onComplete === "function" ? onComplete : () => {};
    this.onExit = typeof onExit === "function" ? onExit : () => {};
    this.onPronounce = typeof onPronounce === "function" ? onPronounce : () => {};
    this.session = null;
  }

  start(terms) {
    const session = createReadingStudy(terms);
    if (session.words.length < 2) return false;
    this.session = session;
    this.phase = "pairs";
    this.matched = new Set();
    this.pairAttempts = new Map();
    this.selectedLeft = null;
    this.selectedRight = null;
    this.wrongPair = null;
    this.questionIndex = 0;
    this.answer = null;
    this.choiceCorrect = 0;
    this.completed = false;
    this.draw();
    return true;
  }

  handle(dataset) {
    if (!dataset) return false;
    const isAction = ["practicePair", "practiceAnswer", "practiceNext", "practiceExit", "practiceRestart", "practicePronounce"]
      .some((key) => dataset[key] !== undefined);
    if (!isAction) return false;
    if (dataset.practiceExit !== undefined) {
      this.session = null;
      this.onExit();
      return true;
    }
    if (!this.session) return true;
    if (dataset.practicePronounce !== undefined) {
      const word = this.session.words.find((term) => term.id === dataset.practicePronounce);
      if (word) this.onPronounce(word.w);
    } else if (dataset.practiceRestart !== undefined) {
      if (this.phase === "result") this.start(this.session.words);
    } else if (dataset.practicePair !== undefined) {
      this.selectPair(dataset.practicePair, dataset.side);
    } else if (dataset.practiceAnswer !== undefined) {
      this.selectAnswer(dataset.practiceAnswer);
    } else if (dataset.practiceNext !== undefined) {
      this.next();
    }
    return true;
  }

  selectPair(id, side) {
    if (this.phase !== "pairs" || !["left", "right"].includes(side) || this.matched.has(id)) return;
    if (!this.session.words.some((word) => word.id === id)) return;
    if (this.wrongPair) {
      this.selectedLeft = null;
      this.selectedRight = null;
      this.wrongPair = null;
    }
    const key = side === "left" ? "selectedLeft" : "selectedRight";
    this[key] = this[key] === id ? null : id;
    if (this.selectedLeft && this.selectedRight) {
      const correct = this.selectedLeft === this.selectedRight;
      if (!this.pairAttempts.has(this.selectedLeft)) this.pairAttempts.set(this.selectedLeft, correct);
      if (correct) {
        this.matched.add(this.selectedLeft);
        this.selectedLeft = null;
        this.selectedRight = null;
      } else {
        this.wrongPair = { left: this.selectedLeft, right: this.selectedRight };
      }
    }
    this.draw();
  }

  selectAnswer(id) {
    if (this.phase !== "choice" || this.answer !== null) return;
    const question = this.session.questions[this.questionIndex];
    if (!question?.options.some((option) => option.id === id)) return;
    this.answer = id;
    if (id === question.id) this.choiceCorrect++;
    this.draw();
  }

  next() {
    if (this.phase === "pairs") {
      if (this.matched.size !== this.session.words.length) return;
      this.phase = "choice";
    } else if (this.phase === "choice") {
      if (this.answer === null) return;
      this.questionIndex++;
      this.answer = null;
      if (this.questionIndex >= this.session.questions.length) this.phase = "result";
    } else return;
    if (this.phase === "result" && !this.completed) {
      this.completed = true;
      this.onComplete({
        words: this.session.words.map((word) => ({ ...word })),
        correct: this.score(),
        total: this.session.words.length * 2,
      });
    }
    this.draw();
  }

  score() {
    return [...this.pairAttempts.values()].filter(Boolean).length + this.choiceCorrect;
  }

  draw() {
    if (!this.session) return;
    const count = this.session.words.length;
    const completed = this.phase === "pairs"
      ? this.matched.size
      : this.phase === "choice"
        ? count + this.questionIndex + (this.answer !== null ? 1 : 0)
        : count * 2;
    const label = this.phase === "pairs" ? "单词配对" : this.phase === "choice" ? "选择释义" : "练习完成";
    this.render(`<div class="reading-study-shell"><div class="study-top"><div><span class="eyebrow">阅读小练习</span><h2>${label}</h2></div><button type="button" class="button soft" data-practice-exit>返回阅读</button></div><div class="study-progress" role="progressbar" aria-label="练习进度" aria-valuemin="0" aria-valuemax="${count * 2}" aria-valuenow="${completed}"><span style="width:${completed / (count * 2) * 100}%"></span></div>${this.phase === "pairs" ? this.drawPairs() : this.phase === "choice" ? this.drawChoice() : this.drawResult()}</div>`);
  }

  drawPairs() {
    const count = this.session.words.length;
    const done = this.matched.size === count;
    const column = (items, side) => `<div class="study-pair-column">${items.map((item) => {
      const selected = (side === "left" ? this.selectedLeft : this.selectedRight) === item.id;
      const matched = this.matched.has(item.id);
      const wrong = this.wrongPair?.[side] === item.id;
      return `<button type="button" class="study-pair${selected ? " selected" : ""}${matched ? " matched" : ""}${wrong ? " wrong" : ""}" data-practice-pair="${esc(item.id)}" data-side="${side}" aria-pressed="${selected}" ${matched ? "disabled" : ""}>${esc(side === "left" ? item.w : item.meaning)}${matched ? '<span class="study-pair-check" aria-hidden="true">✓</span>' : ""}</button>`;
    }).join("")}</div>`;
    const feedback = done ? "全部配对完成，继续看看你是否记住了。" : this.wrongPair ? "还没对应上，再选一次。" : "选一个单词，再选它的释义。";
    return `<p class="subtle">这些词都来自刚才的阅读。已配对 ${this.matched.size} / ${count}</p><div class="study-pairs">${column(this.session.pairs.left, "left")}${column(this.session.pairs.right, "right")}</div><div class="study-feedback${this.wrongPair ? " wrong" : done ? " correct" : ""}" aria-live="polite">${feedback}</div><div class="study-actions"><button type="button" class="button primary wide" data-practice-next ${done ? "" : "disabled"}>继续 · 选择释义 →</button></div>`;
  }

  drawChoice() {
    const question = this.session.questions[this.questionIndex];
    const answered = this.answer !== null;
    const correct = this.answer === question.id;
    return `<p class="subtle">选择释义 · ${this.questionIndex + 1} / ${this.session.questions.length}</p><div class="study-question"><h3>${esc(question.w)}</h3><button type="button" class="button soft study-pronounce" data-practice-pronounce="${esc(question.id)}" aria-label="朗读 ${esc(question.w)}">朗读单词</button></div><div class="study-choices">${question.options.map((option) => `<button type="button" class="study-choice${answered && option.id === question.id ? " correct" : ""}${answered && option.id === this.answer && !correct ? " wrong" : ""}" data-practice-answer="${esc(option.id)}" ${answered ? "disabled" : ""}>${esc(option.meaning)}</button>`).join("")}</div><div class="study-feedback${answered ? correct ? " correct" : " wrong" : ""}" aria-live="polite">${answered ? `${correct ? "答对了" : "再记一遍"}：<b>${esc(question.w)}</b> · ${esc(question.meaning)}` : "选出这个词在词卡中的释义。"}</div><div class="study-actions"><button type="button" class="button primary wide" data-practice-next ${answered ? "" : "disabled"}>${this.questionIndex === this.session.questions.length - 1 ? "查看练习结果" : "下一词 →"}</button></div>`;
  }

  drawResult() {
    return `<div class="study-result"><p class="eyebrow">这一小段，记得更牢了</p><h3>${this.score()} <small>/ ${this.session.words.length * 2}</small></h3><p class="subtle">配对和释义选择的首次作答成绩。继续读故事，再遇见这些词。</p></div><div class="study-word-list">${this.session.words.map((word) => `<div class="study-word-row"><div><b>${esc(word.w)}</b><span>${esc(word.meaning)}</span></div><button type="button" class="button soft study-pronounce" data-practice-pronounce="${esc(word.id)}" aria-label="朗读 ${esc(word.w)}">朗读</button></div>`).join("")}</div><div class="study-actions"><button type="button" class="button soft" data-practice-restart>再练一次</button><button type="button" class="button primary" data-practice-exit>继续阅读 →</button></div>`;
  }
}
