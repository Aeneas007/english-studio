export class ReaderSpeech {
  constructor(update) {
    this.update = update;
    this.run = 0;
    this.mode = "stopped";
    this.index = 0;
    this.word = -1;
    this.offset = 0;
    this.boundary = null;
    this.timer = null;
    this.active = null;
    this.lookup = null;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.mode === "playing") this.emit();
    });
  }
  emit() {
    this.update({ mode: this.mode, index: this.index, word: this.word, offset: this.offset });
  }
  stop() {
    this.run++;
    clearTimeout(this.timer);
    this.lookup = null;
    this.mode = "stopped";
    this.word = -1;
    this.offset = 0;
    this.boundary = null;
    this.error = null;
    this.cancelAudio();
    this.emit();
  }
  cancelAudio() {
    // Invalidate callbacks before cancel(), which may synchronously report an end.
    this.active = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  play(lines, index, settings, onEnd, offset = 0) {
    if (!("speechSynthesis" in window)) throw Error("当前浏览器不支持朗读");
    this.stop();
    this.lines = lines;
    this.index = index;
    this.offset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
    this.settings = settings;
    this.onEnd = onEnd;
    this.mode = "playing";
    this.next(this.run);
  }
  next(run) {
    if (run !== this.run || this.mode !== "playing") return;
    while (this.index < this.lines.length && this.offset >= this.lines[this.index][0].length) {
      this.index++;
      this.offset = 0;
    }
    if (this.index >= this.lines.length) {
      this.mode = "stopped";
      this.word = -1;
      this.offset = 0;
      this.boundary = null;
      this.emit();
      this.onEnd?.();
      return;
    }
    this.error = null;
    this.boundary = null;
    const start = this.offset;
    const text = this.lines[this.index][0].slice(start);
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
    utterance.onboundary = (event) => {
      if (
        current() && event.name === "word" &&
        Number.isInteger(event.charIndex) && event.charIndex >= 0 && event.charIndex < text.length
      ) {
        this.boundary = start + event.charIndex;
        this.word = this.boundary;
        this.emit();
      }
    };
    utterance.onend = () => {
      if (current()) {
        this.active = null;
        this.index++;
        this.offset = 0;
        this.boundary = null;
        this.word = -1;
        this.next(run);
      }
    };
    utterance.onerror = (event) => {
      if (current()) {
        this.saveResumeOffset();
        this.active = null;
        this.mode = ["canceled", "interrupted"].includes(event.error)
          ? "paused"
          : "error";
        this.error = event.error;
        this.word = -1;
        this.emit();
      }
    };
    speechSynthesis.speak(utterance);
    if (current()) this.emit();
  }
  utterance(text, settings) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    // Re-query for each utterance: voice lists can become available after startup.
    const voices = speechSynthesis.getVoices() || [];
    const english = (voice) => /^en(?:[-_]|$)/i.test(voice.lang);
    const voice =
      voices.find((item) => item.name === settings.voice) ||
      voices.find((item) => item.default && english(item)) ||
      voices.find((item) => /^en[-_]US/i.test(item.lang)) ||
      voices.find(english);
    utterance.lang = voice?.lang || "en-US";
    if (voice) utterance.voice = voice;
    return utterance;
  }
  saveResumeOffset(fallbackOffset) {
    const length = this.lines?.[this.index]?.[0]?.length || 0;
    if (this.boundary !== null) this.offset = this.boundary;
    else if (Number.isFinite(fallbackOffset) && fallbackOffset >= 0 && fallbackOffset < length)
      this.offset = Math.floor(fallbackOffset);
    this.boundary = null;
  }
  toggle() {
    if (this.mode === "playing") {
      this.saveResumeOffset();
      this.lookup = null;
      this.mode = "paused";
      this.word = -1;
      this.cancelAudio();
      this.emit();
    } else if (this.mode === "paused") {
      this.lookup = null;
      this.cancelAudio();
      this.mode = "playing";
      // Restart the remaining text instead of relying on native pause/resume.
      this.next(this.run);
    }
  }
  suspendForLookup(fallbackOffset) {
    if (this.mode !== "playing") return null;
    this.saveResumeOffset(fallbackOffset);
    const handle = Object.freeze({});
    this.lookup = { handle, run: this.run, index: this.index };
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
      this.lookup.index !== this.index ||
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
    const utterance = this.utterance(text, settings);
    const active = { run: this.run, utterance };
    this.active = active;
    const finish = () => {
      if (this.active === active) this.active = null;
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
  }
}
