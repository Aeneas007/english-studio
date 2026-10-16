export class ReaderSpeech {
  constructor(update) {
    this.update = update;
    this.run = 0;
    this.mode = "stopped";
    this.index = 0;
    this.word = -1;
    this.timer = null;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.mode === "playing") this.emit();
    });
  }
  emit() {
    this.update({ mode: this.mode, index: this.index, word: this.word });
  }
  stop() {
    this.run++;
    clearTimeout(this.timer);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    this.mode = "stopped";
    this.word = -1;
    this.emit();
  }
  play(lines, index, settings, onEnd) {
    if (!("speechSynthesis" in window)) throw Error("当前浏览器不支持朗读");
    this.stop();
    this.lines = lines;
    this.index = index;
    this.settings = settings;
    this.onEnd = onEnd;
    this.mode = "playing";
    this.next(this.run);
  }
  next(run) {
    if (run !== this.run) return;
    if (this.index >= this.lines.length) {
      this.mode = "stopped";
      this.emit();
      this.onEnd?.();
      return;
    }
    const text = this.lines[this.index][0];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = this.settings.rate;
    const voices = speechSynthesis.getVoices(),
      voice =
        voices.find((v) => v.name === this.settings.voice) ||
        voices.find((v) => /^en[-_]US/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (run === this.run) {
        this.word = -1;
        this.emit();
      }
    };
    utterance.onboundary = (e) => {
      if (run === this.run && e.name === "word") {
        this.word = e.charIndex;
        this.emit();
      }
    };
    utterance.onend = () => {
      if (run === this.run) {
        this.index++;
        this.word = -1;
        this.next(run);
      }
    };
    utterance.onerror = (e) => {
      if (run === this.run && !["canceled", "interrupted"].includes(e.error)) {
        this.mode = "error";
        this.error = e.error;
        this.emit();
      }
    };
    speechSynthesis.speak(utterance);
    this.emit();
  }
  toggle() {
    if (this.mode === "playing") {
      speechSynthesis.pause();
      this.mode = "paused";
    } else if (this.mode === "paused") {
      speechSynthesis.resume();
      this.mode = "playing";
    }
    this.emit();
  }
  preview(text, settings) {
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = settings.rate;
    const v = speechSynthesis
      .getVoices()
      .find((v) => v.name === settings.voice);
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
}
