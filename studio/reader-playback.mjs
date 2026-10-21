import { ReaderSpeech } from './speech.mjs';
import { ChapterAudioPlayer } from './chapter-audio.mjs';

export class ReaderPlayback {
  constructor(update, options = {}) {
    this.engine = 'device';
    this.device = new ReaderSpeech((state) => {
      if (this.engine === 'device') update({ ...state, engine: 'device' });
    });
    this.audio = new ChapterAudioPlayer((state) => {
      if (this.engine === 'audio') update({ ...state, engine: 'audio' });
    }, options);
    this.audio.beforePlay = () => this.device.cancelAudio();
  }
  get current() { return this.engine === 'audio' ? this.audio : this.device; }
  get mode() { return this.current.mode; }
  get index() { return this.current.index; }
  get word() { return this.current.word; }
  get offset() { return this.current.offset || 0; }
  get error() { return this.current.error; }
  get time() { return this.engine === 'audio' ? this.audio.time : 0; }
  stop() {
    this.device.stop();
    this.audio.stop();
  }
  reset() {
    this.stop();
    this.engine = 'device';
    this.audio.release();
  }
  play(lines, index, settings, onEnd, offset = 0) {
    this.reset();
    this.device.play(lines, index, settings, onEnd, offset);
  }
  loadAudio(track, options) {
    this.stop();
    this.engine = 'audio';
    this.audio.load(track, options);
  }
  playAudio() {
    this.device.cancelAudio();
    return this.audio.play();
  }
  toggle() {
    if (this.engine === 'audio') this.device.cancelAudio();
    return this.current.toggle();
  }
  suspendForLookup(fallbackOffset) {
    return this.current.suspendForLookup(fallbackOffset);
  }
  resumeAfterLookup(handle) {
    if (this.engine === 'audio') this.device.cancelAudio();
    return this.current.resumeAfterLookup(handle);
  }
  preview(text, settings) {
    if (this.engine === 'audio' && this.audio.mode === 'playing') this.audio.pause();
    return this.device.preview(text, settings);
  }
  setRate(rate) {
    if (this.engine === 'audio') this.audio.setRate(rate);
  }
}
