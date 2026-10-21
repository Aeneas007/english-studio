import test from 'node:test';
import assert from 'node:assert/strict';
import { ReaderPlayback } from '../studio/reader-playback.mjs';

const settings = { rate: 0.65, voice: 'English voice' };

class FakeAudio extends EventTarget {
  currentTime = 0;
  playbackRate = 1;
  paused = true;
  ended = false;
  plays = 0;
  load() {}
  async play() {
    this.plays++;
    this.paused = false;
    if (!this.deferPlayEvent) this.dispatchEvent(new Event('play'));
    if (this.pendingPlay) await this.pendingPlay;
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  tick(time) {
    this.currentTime = time;
    this.dispatchEvent(new Event('timeupdate'));
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function setup(t) {
  const names = ['document', 'window', 'speechSynthesis', 'SpeechSynthesisUtterance', 'Audio'];
  const previous = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const synth = {
    current: null,
    spoken: [],
    cancelCalls: 0,
    getVoices: () => [{ name: 'English voice', lang: 'en-US', default: true }],
    speak(utterance) { this.current = utterance; this.spoken.push(utterance); },
    cancel() { this.cancelCalls++; this.current = null; },
    pause() { throw Error('Native pause cannot be used'); },
    resume() { throw Error('Native resume cannot be used'); },
  };
  globalThis.document = new EventTarget();
  globalThis.window = Object.assign(new EventTarget(), { speechSynthesis: synth });
  globalThis.speechSynthesis = synth;
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  globalThis.Audio = FakeAudio;
  const updates = [], actions = new Map(), released = [];
  const mediaSession = {
    setActionHandler: (name, handler) => actions.set(name, handler),
    setPositionState(state) { this.position = state; },
  };
  const playback = new ReaderPlayback((state) => updates.push({ ...state }), {
    mediaSession,
    urls: { createObjectURL: () => 'blob:chapter-one', revokeObjectURL: (url) => released.push(url) },
    MediaMetadata: class { constructor(data) { Object.assign(this, data); } },
  });
  const track = {
    key: 'chapter-one', bookId: 'book-one',
    blob: new Blob([new Uint8Array(100)]),
    cues: [
      { index: 0, start: 0, end: 4 },
      { index: 1, start: 4, end: 9 },
      { index: 2, start: 9, end: 15 },
    ],
    units: [
      { chapter: 0, index: 0, start: 0, end: 15, text: 'First sentence.' },
      { chapter: 0, index: 1, start: 0, end: 16, text: 'Second sentence.' },
      { chapter: 1, index: 0, start: 0, end: 14, text: 'Last sentence.' },
    ],
  };
  t.after(() => {
    playback.reset();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { playback, audio: playback.audio.audio, synth, track, actions, released, updates, mediaSession };
}

test('audio lookup with two previews resumes the exact time and ignores obsolete preview events', async (t) => {
  const { playback, audio, synth, track, updates } = setup(t);
  playback.loadAudio(track, { rate: settings.rate });
  await playback.playAudio();
  audio.tick(6.75);
  const handle = playback.suspendForLookup();
  assert.ok(handle);
  assert.equal(playback.mode, 'paused');
  playback.preview('first word', settings);
  const first = synth.current;
  playback.preview('second word', settings);
  const second = synth.current;
  first.onend();
  assert.equal(synth.current, second);
  assert.equal(playback.mode, 'paused');
  assert.equal(audio.currentTime, 6.75);
  assert.equal(updates.at(-1).engine, 'audio', 'preview state cannot replace the active reader UI');

  assert.equal(playback.resumeAfterLookup(handle), true);
  await Promise.resolve();
  assert.equal(synth.current, null, 'resuming the reader cancels the second pronunciation');
  second.onend();
  second.onerror({ error: 'interrupted' });
  assert.equal(audio.currentTime, 6.75);
  assert.equal(playback.mode, 'playing');
  assert.equal(playback.index, 1);
  assert.equal(audio.playbackRate, settings.rate);
  assert.equal(playback.resumeAfterLookup(handle), false);
});

test('a manually paused audio reader stays paused after lookup and pronunciation', async (t) => {
  const { playback, audio, synth, track } = setup(t);
  playback.loadAudio(track);
  await playback.playAudio();
  audio.tick(6.75);
  playback.toggle();
  const playCount = audio.plays;
  assert.equal(playback.mode, 'paused');
  const handle = playback.suspendForLookup();
  assert.equal(handle, null);
  playback.preview('word', settings);
  synth.current.onend();
  assert.equal(playback.resumeAfterLookup(handle), false);
  assert.equal(playback.mode, 'paused');
  assert.equal(audio.currentTime, 6.75);
  assert.equal(audio.plays, playCount);
});

test('reset removes the previous audio source, its lookup handle and media actions', async (t) => {
  const { playback, audio, track, actions, released, mediaSession } = setup(t);
  playback.loadAudio(track);
  await playback.playAudio();
  audio.tick(6.75);
  const handle = playback.suspendForLookup();
  const oldMediaPlay = actions.get('play');
  playback.reset();
  assert.equal(playback.engine, 'device');
  assert.equal(playback.mode, 'stopped');
  assert.equal(playback.audio.track, null);
  assert.equal(audio.src, '');
  assert.deepEqual(released, ['blob:chapter-one']);
  assert.ok([...actions.values()].every((handler) => handler === null));
  assert.equal(mediaSession.playbackState, 'none');
  assert.equal(playback.resumeAfterLookup(handle), false);
  assert.equal(await oldMediaPlay(), false, 'even a previously captured media callback cannot restart released audio');
});

test('switching to device reading releases old audio and prevents lock screen playback of it', async (t) => {
  const { playback, audio, synth, track, actions, released, updates } = setup(t);
  playback.loadAudio(track);
  await playback.playAudio();
  const oldMediaPlay = actions.get('play');
  playback.play([['A new reading sentence.']], 0, settings, undefined, 6);
  const utterance = synth.current;
  assert.equal(playback.engine, 'device');
  assert.equal(playback.mode, 'playing');
  assert.equal(utterance.text, 'reading sentence.');
  assert.equal(playback.audio.track, null);
  assert.equal(audio.paused, true);
  assert.equal(actions.get('play'), null);
  assert.deepEqual(released, ['blob:chapter-one']);
  assert.equal(await oldMediaPlay(), false);
  assert.equal(synth.current, utterance);
  assert.equal(updates.at(-1).engine, 'device');
});

test('lock screen play cancels a word preview before resuming the audio reader', async (t) => {
  const { playback, audio, synth, track, actions } = setup(t);
  playback.loadAudio(track);
  await playback.playAudio();
  audio.tick(6.75);
  const handle = playback.suspendForLookup();
  playback.preview('pronunciation', settings);
  const preview = synth.current;
  assert.ok(preview);
  await actions.get('play')();
  assert.equal(synth.current, null, 'media playback must not overlap the active word pronunciation');
  assert.equal(playback.mode, 'playing');
  assert.equal(audio.currentTime, 6.75);
  assert.equal(playback.resumeAfterLookup(handle), false, 'explicit media playback supersedes lookup auto-resume');
  preview.onend();
  assert.equal(playback.mode, 'playing');
});

test('a delayed play event and promise cannot undo an explicit media pause', async (t) => {
  const { playback, audio, track, actions } = setup(t);
  playback.loadAudio(track);
  audio.tick(6.75);
  const pending = deferred();
  audio.deferPlayEvent = true;
  audio.pendingPlay = pending.promise;
  const playing = playback.playAudio();
  actions.get('pause')();
  audio.dispatchEvent(new Event('play'));
  assert.equal(playback.mode, 'paused');
  pending.resolve();
  assert.equal(await playing, false);
  assert.equal(playback.mode, 'paused');
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 6.75);
});

test('lookup during a pending play keeps its checkpoint until explicitly resumed', async (t) => {
  const { playback, audio, synth, track } = setup(t);
  playback.loadAudio(track);
  const pending = deferred();
  audio.pendingPlay = pending.promise;
  const playing = playback.playAudio();
  audio.tick(6.75);
  const handle = playback.suspendForLookup();
  assert.ok(handle);
  playback.preview('word', settings);
  const preview = synth.current;
  audio.dispatchEvent(new Event('play'));
  pending.resolve();
  assert.equal(await playing, false);
  assert.equal(playback.mode, 'paused');
  assert.equal(synth.current, preview);
  assert.equal(audio.currentTime, 6.75);
  audio.pendingPlay = null;
  assert.equal(playback.resumeAfterLookup(handle), true);
  await Promise.resolve();
  assert.equal(playback.mode, 'playing');
  assert.equal(synth.current, null);
  assert.equal(audio.currentTime, 6.75);
});
