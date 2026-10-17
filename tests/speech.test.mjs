import test from "node:test";
import assert from "node:assert/strict";
import { ReaderSpeech } from "../studio/speech.mjs";

const settings = { rate: 0.8, voice: "English voice" };
const lines = [["First sentence."], ["Second sentence."], ["Last sentence."]];

function setup(t) {
  const names = [
    "window", "document", "speechSynthesis", "SpeechSynthesisUtterance",
  ];
  const previous = names.map((name) => ({
    name,
    descriptor: Object.getOwnPropertyDescriptor(globalThis, name),
  }));
  const synth = {
    spoken: [],
    current: null,
    cancelCalls: 0,
    cancelHook: null,
    cancel() {
      this.cancelCalls++;
      const previous = this.current;
      this.current = null;
      if (previous) this.cancelHook?.(previous);
    },
    speak(utterance) {
      this.spoken.push(utterance);
      this.current = utterance;
    },
    getVoices: () => [{ name: "English voice", lang: "en-US" }],
    pause() { throw Error("Native pause is unreliable"); },
    resume() { throw Error("Native resume is unreliable"); },
    end(utterance = this.current) {
      if (this.current === utterance) this.current = null;
      utterance.onend?.();
    },
  };
  globalThis.window = { speechSynthesis: synth };
  globalThis.document = { hidden: false, addEventListener() {} };
  globalThis.speechSynthesis = synth;
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  const updates = [];
  const reader = new ReaderSpeech((state) => updates.push({ ...state }));
  t.after(() => {
    for (const { name, descriptor } of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { synth, reader, updates };
}

test("lookup preview preserves the reading sentence until explicitly closed", (t) => {
  const { reader, synth, updates } = setup(t);
  let completed = 0;
  reader.play(lines, 1, settings, () => completed++);
  const original = synth.current;
  original.onboundary({ name: "word", charIndex: 7 });
  assert.equal(updates.at(-1).word, 7);

  const handle = reader.suspendForLookup();
  assert.ok(handle);
  assert.equal(reader.mode, "paused");
  assert.equal(reader.index, 1);
  assert.equal(reader.word, -1);
  reader.preview("sentence", settings);
  const preview = synth.current;
  assert.equal(preview.text, "sentence");
  assert.equal(reader.mode, "paused");
  synth.end(preview);
  assert.equal(synth.spoken.length, 2, "preview completion cannot resume reading");
  assert.equal(reader.resumeAfterLookup(handle), true);
  assert.equal(synth.current.text, "Second sentence.");
  assert.equal(synth.current.rate, 0.8);
  assert.equal(synth.current.voice.name, "English voice");
  assert.equal(reader.resumeAfterLookup(handle), false, "a handle is single-use");

  synth.end();
  assert.equal(synth.current.text, "Last sentence.");
  synth.end();
  assert.equal(reader.mode, "stopped");
  assert.equal(completed, 1);
});

test("synchronous and delayed canceled callbacks cannot advance or corrupt reading", (t) => {
  const { reader, synth } = setup(t);
  let completed = 0;
  synth.cancelHook = (utterance) => {
    utterance.onend?.();
    utterance.onerror?.({ error: "interrupted" });
    utterance.onboundary?.({ name: "word", charIndex: 20 });
  };
  reader.play(lines, 0, settings, () => completed++);
  const original = synth.current;
  const handle = reader.suspendForLookup();
  assert.equal(reader.index, 0);
  assert.equal(reader.mode, "paused");
  reader.resumeAfterLookup(handle);
  const resumed = synth.current;
  original.onend();
  original.onerror({ error: "audio-busy" });
  original.onboundary({ name: "word", charIndex: 20 });
  original.onstart();
  assert.equal(synth.current, resumed);
  assert.equal(reader.index, 0);
  assert.equal(reader.mode, "playing");
  assert.equal(reader.word, -1);
  assert.equal(completed, 0);
});

test("replacing a preview and closing lookup ignore every obsolete audio event", (t) => {
  const { reader, synth } = setup(t);
  reader.play(lines, 1, settings);
  const handle = reader.suspendForLookup();
  reader.preview("one", settings);
  const firstPreview = synth.current;
  reader.preview("two", settings);
  const secondPreview = synth.current;
  firstPreview.onend();
  firstPreview.onerror({ error: "interrupted" });
  assert.equal(synth.current, secondPreview);
  assert.equal(reader.mode, "paused");
  reader.resumeAfterLookup(handle);
  const resumed = synth.current;
  assert.equal(resumed.text, "Second sentence.");
  secondPreview.onend();
  secondPreview.onerror({ error: "audio-busy" });
  assert.equal(synth.current, resumed);
  synth.end(resumed);
  assert.equal(reader.index, 2);
  assert.equal(synth.current.text, "Last sentence.");
});

test("stop and new book playback invalidate prior lookup handles", (t) => {
  const { reader, synth } = setup(t);
  reader.play(lines, 1, settings);
  const first = reader.suspendForLookup();
  reader.preview("word", settings);
  const preview = synth.current;
  reader.stop();
  assert.equal(reader.resumeAfterLookup(first), false);
  assert.equal(reader.mode, "stopped");
  preview.onend();
  reader.play(lines, 2, settings);
  const second = reader.suspendForLookup();
  reader.play([["Another book."]], 0, settings);
  const replacement = synth.current;
  assert.equal(reader.resumeAfterLookup(second), false);
  assert.equal(synth.current, replacement);
  assert.equal(reader.index, 0);
  assert.equal(reader.mode, "playing");
});

test("manual pause remains paused through lookup and pronunciation", (t) => {
  const { reader, synth } = setup(t);
  reader.play(lines, 1, settings);
  const original = synth.current;
  reader.toggle();
  assert.equal(reader.mode, "paused");
  assert.equal(reader.suspendForLookup(), null);
  reader.preview("word", settings);
  synth.end();
  assert.equal(reader.resumeAfterLookup(null), false);
  assert.equal(reader.mode, "paused");
  assert.equal(reader.index, 1);
  reader.toggle();
  assert.equal(reader.mode, "playing");
  assert.equal(synth.current.text, "Second sentence.");
  original.onend();
  assert.equal(reader.index, 1);
});

test("explicit playback controls invalidate lookup auto-resume", (t) => {
  const { reader, synth } = setup(t);
  reader.play(lines, 0, settings);
  const handle = reader.suspendForLookup();
  reader.preview("word", settings);
  reader.toggle();
  assert.equal(reader.mode, "playing");
  reader.toggle();
  assert.equal(reader.mode, "paused");
  const count = synth.spoken.length;
  assert.equal(reader.resumeAfterLookup(handle), false);
  assert.equal(synth.spoken.length, count);
  assert.equal(reader.mode, "paused");
});

test("duplicate sentence end events do not skip the next sentence or finish twice", (t) => {
  const { reader, synth } = setup(t);
  let completed = 0;
  reader.play(lines, 1, settings, () => completed++);
  const second = synth.current;
  synth.end(second);
  const last = synth.current;
  synth.end(second);
  assert.equal(reader.index, 2);
  assert.equal(synth.current, last);
  synth.end(last);
  synth.end(last);
  assert.equal(reader.index, 3);
  assert.equal(completed, 1);
});

test("an active audio failure becomes recoverable state while stale failures do nothing", (t) => {
  const { reader, synth, updates } = setup(t);
  reader.play(lines, 0, settings);
  const first = synth.current;
  first.onerror({ error: "interrupted" });
  assert.equal(reader.mode, "paused");
  assert.equal(updates.at(-1).word, -1);
  reader.toggle();
  const restarted = synth.current;
  first.onerror({ error: "audio-busy" });
  assert.equal(reader.mode, "playing");
  restarted.onerror({ error: "audio-busy" });
  assert.equal(reader.mode, "error");
  assert.equal(reader.error, "audio-busy");
});

test("standalone pronunciation stops playback without advancing its old sentence", (t) => {
  const { reader, synth } = setup(t);
  reader.play(lines, 1, settings);
  const original = synth.current;
  reader.preview("pronunciation", settings);
  const preview = synth.current;
  assert.equal(reader.mode, "stopped");
  assert.equal(preview.text, "pronunciation");
  original.onend();
  original.onboundary({ name: "word", charIndex: 12 });
  assert.equal(reader.index, 1);
  assert.equal(reader.word, -1);
  synth.end(preview);
  assert.equal(reader.mode, "stopped");
  assert.equal(synth.spoken.length, 2);
});
