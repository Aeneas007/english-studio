export class ReaderSpeech {
  constructor(update) {
    this.update = update;
    this.run = 0;
    this.mode = "stopped";
    this.index = 0;
    this.word = -1;
    this.timer = null;
    this.active = null;
    this.lookup = null;
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
    this.lookup = null;
    this.mode = "stopped";
    this.word = -1;
    this.error = null;
    this.cancelAudio();
    this.emit();
  }
  cancelAudio() {
    // Invalidate callbacks before cancel(), which may synchronously report an end.
    this.active = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
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
    if (run !== this.run || this.mode !== "playing") return;
    if (this.index >= this.lines.length) {
      this.mode = "stopped";
      this.word = -1;
      this.emit();
      this.onEnd?.();
      return;
    }
    this.error = null;
    const text = this.lines[this.index][0];
    const utterance = this.utterance(text, this.settings);
    const active = { run, utterance };
    this.active = active;
    const current = () =>
      this.active === active && run === this.run && this.mode === "playing";
    utterance.onstart = () => {
      if (current()) {
        this.word = -1;
        this.emit();
      }
    };
    utterance.onboundary = (e) => {
      if (current() && e.name === "word") {
        this.word = e.charIndex;
        this.emit();
      }
    };
    utterance.onend = () => {
      if (current()) {
        this.active = null;
        this.index++;
        this.word = -1;
        this.next(run);
      }
    };
    utterance.onerror = (e) => {
      if (current()) {
        this.active = null;
        this.mode = ["canceled", "interrupted"].includes(e.error)
          ? "paused"
          : "error";
        this.error = e.error;
        this.word = -1;
        this.emit();
      }
    };
    speechSynthesis.speak(utterance);
    if (current()) this.emit();
  }
  utterance(text, settings) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = settings.rate;
    const voices = speechSynthesis.getVoices(),
      voice =
        voices.find((v) => v.name === settings.voice) ||
        voices.find((v) => /^en[-_]US/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang));
    if (voice) utterance.voice = voice;
    return utterance;
  }
  toggle() {
    if (this.mode === "playing") {
      this.lookup = null;
      this.mode = "paused";
      this.word = -1;
      this.cancelAudio();
      this.emit();
    } else if (this.mode === "paused") {
      this.lookup = null;
      this.cancelAudio();
      this.mode = "playing";
      // Restart this sentence: native pause/resume is unreliable on some phones.
      this.next(this.run);
    }
  }
  suspendForLookup() {
    if (this.mode !== "playing") return null;
    const handle = Object.freeze({});
    this.lookup = { handle, run: this.run };
    this.mode = "paused";
    this.word = -1;
    this.cancelAudio();
    this.emit();
    return handle;
  }
  resumeAfterLookup(handle) {
    if (
      !this.lookup ||
      this.lookup.handle !== handle ||
      this.lookup.run !== this.run ||
      this.mode !== "paused"
    )
      return false;
    this.lookup = null;
    this.cancelAudio();
    this.mode = "playing";
    this.next(this.run);
    return true;
  }
  preview(text, settings) {
    if (!("speechSynthesis" in window)) throw Error("当前浏览器不支持朗读");
    if (this.mode === "paused" && this.lines) this.cancelAudio();
    else this.stop();
    const u = this.utterance(text, settings);
    const active = { run: this.run, utterance: u };
    this.active = active;
    const finish = () => {
      if (this.active === active) this.active = null;
    };
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  }
}
