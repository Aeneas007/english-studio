import test from 'node:test';
import assert from 'node:assert/strict';
import { ChapterAudioPlayer, validAudioTrack } from '../studio/chapter-audio.mjs';
import { audioTrackKey } from '../studio/audio-cache.mjs';

class FakeAudio extends EventTarget {
  currentTime = 0;
  playbackRate = 1;
  paused = true;
  ended = false;
  loads = 0;
  plays = 0;
  load() { this.loads++; this.playbackRate = this.defaultPlaybackRate ?? 1; }
  async play() {
    this.plays++;
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    if (this.pendingPlay) await this.pendingPlay;
  }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  removeAttribute() {}
  tick(time) { this.currentTime = time; this.dispatchEvent(new Event('timeupdate')); }
}
const track = () => ({ key: 'one', blob: new Blob([new Uint8Array(100)]), cues: [
  { index: 0, start: 0, end: 4 }, { index: 1, start: 4, end: 9 }, { index: 2, start: 9, end: 15 },
] });
function setup() {
  const audio = new FakeAudio(), updates = [], actions = new Map(), released = [];
  const mediaSession = { setActionHandler: (key, value) => actions.set(key, value), setPositionState: (state) => { mediaSession.position = state; } };
  const player = new ChapterAudioPlayer((state) => updates.push(state), { audio, mediaSession,
    urls: { createObjectURL: () => 'blob:test', revokeObjectURL: (url) => released.push(url) },
    MediaMetadata: class { constructor(data) { Object.assign(this, data); } },
  });
  player.load(track(), { title: 'Book', chapter: 'Chapter 1', rate: 0.65 });
  return { player, audio, updates, actions, mediaSession, released };
}

test('lookup resumes exact audio time without repeating the sentence or accepting stale handles', async () => {
  const { player, audio } = setup();
  await player.play();
  audio.tick(6.75);
  const handle = player.suspendForLookup();
  assert.equal(player.mode, 'paused');
  assert.equal(player.index, 1);
  assert.equal(audio.currentTime, 6.75);
  assert.equal(player.resumeAfterLookup(handle), true);
  await Promise.resolve();
  assert.equal(audio.currentTime, 6.75);
  assert.equal(player.mode, 'playing');
  assert.equal(player.resumeAfterLookup(handle), false);
  const second = player.suspendForLookup();
  player.stop();
  assert.equal(player.resumeAfterLookup(second), false);
});

test('one continuous audio source crosses sentence cues without JavaScript starting another file', async () => {
  const { player, audio } = setup();
  const loads = audio.loads;
  await player.play();
  audio.tick(2); assert.equal(player.index, 0);
  audio.tick(4); assert.equal(player.index, 1);
  audio.tick(12); assert.equal(player.index, 2);
  assert.equal(audio.plays, 1);
  assert.equal(audio.loads, loads);
});

test('lock screen media handlers pause, resume and seek while preserving rate and pitch', async () => {
  const { player, audio, actions, mediaSession } = setup();
  await actions.get('play')();
  audio.tick(7.25);
  actions.get('pause')();
  assert.equal(player.mode, 'paused');
  await actions.get('play')();
  assert.equal(audio.currentTime, 7.25);
  actions.get('seekbackward')({ seekOffset: 2 });
  assert.equal(audio.currentTime, 5.25);
  actions.get('seekto')({ seekTime: 10 });
  assert.equal(player.index, 2);
  assert.equal(mediaSession.position.playbackRate, 0.65);
  assert.equal(audio.preservesPitch, true);
  assert.equal(mediaSession.metadata.title, 'Book');
});

test('stopping while play is pending cannot restore playing state', async () => {
  const { player, audio } = setup();
  let resolve;
  audio.pendingPlay = new Promise((done) => { resolve = done; });
  const pending = player.play();
  player.stop();
  resolve();
  assert.equal(await pending, false);
  assert.equal(player.mode, 'stopped');
});

test('a blocked autoplay stays paused and tells the user to tap play', async () => {
  const { player, audio } = setup();
  audio.play = async () => { throw Object.assign(Error('blocked'), { name: 'NotAllowedError' }); };
  assert.equal(await player.play(), false);
  assert.equal(player.mode, 'paused');
  assert.equal(player.error, 'tap-to-play');
});

test('releasing audio revokes its URL and lock screen handlers', () => {
  const { player, actions, released } = setup();
  player.release();
  assert.equal(player.track, null);
  assert.deepEqual(released, ['blob:test']);
  assert.equal(actions.get('play'), null);
});

test('bad cue order cannot be loaded as a usable cached track', () => {
  const bad = track();
  bad.cues[1].start = 3;
  assert.equal(validAudioTrack(bad), false);
  assert.throws(() => setup().player.load(bad));
});

test('audio cache identity changes when text, voice or source anchors change', async () => {
  const units = [{ chapter: 0, index: 0, start: 0, end: 5, text: 'Hello' }];
  const key = await audioTrackKey('book', 0, 0, 'af_heart', units);
  assert.equal(key, await audioTrackKey('book', 0, 0, 'af_heart', structuredClone(units)));
  assert.notEqual(key, await audioTrackKey('book', 0, 0, 'bf_emma', units));
  assert.notEqual(key, await audioTrackKey('book', 0, 0, 'af_heart', [{ ...units[0], text: 'World' }]));
  assert.notEqual(key, await audioTrackKey('book', 0, 0, 'af_heart', [{ ...units[0], start: 1 }]));
});


test('loading an audio source retains the requested slow rate instead of resetting to one', () => {
  const { player, audio } = setup();
  assert.equal(audio.playbackRate, 0.65);
  assert.equal(audio.defaultPlaybackRate, 0.65);
  player.setRate(0.5);
  audio.load();
  assert.equal(audio.playbackRate, 0.5);
});

test('media seeking reads the live audio clock even when no timeupdate was delivered', async () => {
  const { player, audio, actions } = setup();
  await player.play();
  audio.currentTime = 12;
  actions.get('seekbackward')({ seekOffset: 2 });
  assert.equal(audio.currentTime, 10);
  audio.currentTime = 5;
  actions.get('nexttrack')();
  assert.equal(audio.currentTime, 9);
});
