export function cueAt(cues, time) {
  let low = 0, high = cues.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (cues[mid].start <= time) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

export function validAudioTrack(track) {
  return track?.blob instanceof Blob && track.blob.size > 44 &&
    Array.isArray(track.cues) && track.cues.length > 0 &&
    track.cues.every((cue, i, cues) => cue.index === i &&
      Number.isFinite(cue.start) && Number.isFinite(cue.end) &&
      cue.start >= 0 && cue.end > cue.start &&
      (!i || cue.start >= cues[i - 1].end));
}

export class ChapterAudioPlayer {
  constructor(update, options = {}) {
    this.update = update;
    this.audio = options.audio || new Audio();
    this.urls = options.urls || URL;
    this.media = options.mediaSession ?? globalThis.navigator?.mediaSession;
    this.Metadata = options.MediaMetadata || globalThis.MediaMetadata;
    this.mode = 'stopped';
    this.index = 0;
    this.word = -1;
    this.offset = 0;
    this.run = 0;
    this.attempt = 0;
    this.wantsPlaying = false;
    this.time = 0;
    this.lookup = null;
    this.audio.preload = 'auto';
    this.audio.preservesPitch = true;
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.pendingSeek !== undefined) this.seek(this.pendingSeek);
    });
    this.audio.addEventListener('timeupdate', () => this.emit());
    this.audio.addEventListener('play', () => {
      if (!this.track || !this.wantsPlaying || this.audio.paused) return;
      this.mode = 'playing';
      this.error = null;
      this.emit();
    });
    this.audio.addEventListener('pause', () => {
      if (!this.audio.paused) return;
      if (this.mode === 'playing') this.mode = 'paused';
      this.emit();
    });
    this.audio.addEventListener('ended', () => {
      if (!this.track || !this.audio.ended) return;
      this.wantsPlaying = false;
      this.mode = 'stopped';
      this.lookup = null;
      this.emit();
      this.onEnd?.();
    });
    this.audio.addEventListener('error', () => {
      if (!this.track) return;
      this.mode = 'error';
      this.error = 'audio-playback';
      this.emit();
    });
    this.onVisibility = () => this.emit();
    globalThis.document?.addEventListener?.('visibilitychange', this.onVisibility);
    globalThis.window?.addEventListener?.('pagehide', this.onVisibility);
  }
  get duration() { return this.track?.cues.at(-1)?.end || 0; }
  emit() {
    this.time = Math.max(0, Number(this.audio.currentTime) || 0);
    if (this.track) this.index = cueAt(this.track.cues, this.time);
    if (this.media && this.track) {
      this.media.playbackState = this.mode === 'playing' ? 'playing' : this.mode === 'paused' ? 'paused' : 'none';
      const duration = this.duration;
      if (duration > 0) {
        try { this.media.setPositionState?.({ duration, position: Math.min(duration, this.time), playbackRate: this.audio.playbackRate }); } catch {}
      }
    }
    this.update({ mode: this.mode, index: this.index, word: -1, offset: 0,
      time: this.time, duration: this.duration, trackKey: this.track?.key, error: this.error });
  }
  load(track, { rate = 1, title = 'English Studio', chapter = '', onEnd, time = 0 } = {}) {
    if (!validAudioTrack(track)) throw Error('听读音频不完整，请重新准备');
    this.release();
    this.track = track;
    this.onEnd = onEnd;
    this.url = this.urls.createObjectURL(track.blob);
    this.audio.src = this.url;
    this.setRate(rate);
    this.pendingSeek = Math.max(0, Math.min(this.duration, time));
    this.audio.load();
    this.seek(this.pendingSeek);
    this.mode = 'paused';
    this.installMedia(title, chapter);
    this.emit();
  }
  installMedia(title, chapter) {
    if (!this.media) return;
    if (this.Metadata) this.media.metadata = new this.Metadata({ title, artist: chapter || 'English Studio · 离线听读', album: 'English Studio' });
    const actions = {
      play: () => this.play(), pause: () => this.pause(), stop: () => this.stop(),
      seekbackward: (event = {}) => this.seek((Number(this.audio.currentTime) || 0) - (event.seekOffset || 10)),
      seekforward: (event = {}) => this.seek((Number(this.audio.currentTime) || 0) + (event.seekOffset || 10)),
      seekto: (event) => this.seek(event.seekTime),
      previoustrack: () => this.seek(this.track.cues[Math.max(0, cueAt(this.track.cues, this.audio.currentTime) - 1)].start),
      nexttrack: () => this.seek(this.track.cues[Math.min(this.track.cues.length - 1, cueAt(this.track.cues, this.audio.currentTime) + 1)].start),
    };
    for (const [name, handler] of Object.entries(actions)) {
      try { this.media.setActionHandler(name, handler); } catch {}
    }
  }
  seek(time) {
    if (!this.track || !Number.isFinite(time)) return;
    const target = Math.max(0, Math.min(Math.max(0, this.duration - 0.001), time));
    try {
      this.audio.currentTime = target;
      this.pendingSeek = undefined;
    } catch { this.pendingSeek = target; }
    this.emit();
  }
  setRate(rate) {
    const value = Math.min(2, Math.max(0.5, Number(rate) || 1));
    this.audio.defaultPlaybackRate = value;
    this.audio.playbackRate = value;
    this.audio.preservesPitch = true;
    if (this.track) this.emit();
  }
  async play() {
    if (!this.track) return false;
    this.beforePlay?.();
    const run = this.run;
    const attempt = ++this.attempt;
    this.wantsPlaying = true;
    this.lookup = null;
    this.error = null;
    try {
      await this.audio.play();
      if (run !== this.run || attempt !== this.attempt || !this.wantsPlaying) return false;
      this.mode = 'playing';
      this.emit();
      return true;
    } catch (error) {
      if (run !== this.run || attempt !== this.attempt) return false;
      this.wantsPlaying = false;
      this.mode = error?.name === 'NotAllowedError' ? 'paused' : 'error';
      this.error = error?.name === 'NotAllowedError' ? 'tap-to-play' : 'audio-playback';
      this.emit();
      return false;
    }
  }
  pause() {
    this.attempt++;
    this.wantsPlaying = false;
    this.lookup = null;
    if (this.mode !== 'stopped') this.mode = 'paused';
    this.audio.pause();
    this.emit();
  }
  toggle() {
    this.lookup = null;
    return this.mode === 'playing' ? this.pause() : this.play();
  }
  stop() {
    this.run++;
    this.attempt++;
    this.wantsPlaying = false;
    this.lookup = null;
    this.mode = 'stopped';
    this.audio.pause();
    this.error = null;
    this.emit();
  }
  suspendForLookup() {
    if (this.mode !== 'playing') return null;
    this.attempt++;
    this.wantsPlaying = false;
    const handle = Object.freeze({});
    this.lookup = { handle, run: this.run };
    this.mode = 'paused';
    this.audio.pause();
    this.emit();
    return handle;
  }
  resumeAfterLookup(handle) {
    if (!this.lookup || this.lookup.handle !== handle || this.lookup.run !== this.run || this.mode !== 'paused') return false;
    this.lookup = null;
    void this.play();
    return true;
  }
  release() {
    this.stop();
    this.track = null;
    this.audio.removeAttribute?.('src');
    this.audio.load();
    if (this.url) this.urls.revokeObjectURL(this.url);
    this.url = null;
    this.onEnd = null;
    if (this.media) {
      for (const action of ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack']) {
        try { this.media.setActionHandler(action, null); } catch {}
      }
      this.media.playbackState = 'none';
    }
  }
}
