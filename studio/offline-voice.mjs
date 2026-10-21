const VERSION = "kokoro121-transformers351-ort122-v2";
export const OFFLINE_VOICE_MODEL_REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
export const OFFLINE_VOICE_ASSETS = Object.freeze([
  new URL("./offline-voice-worker.mjs?v=" + VERSION, import.meta.url).href,
  new URL("./vendor/offline-voice/runtime-v1.mjs", import.meta.url).href,
  new URL("./vendor/offline-voice/ort-wasm-simd-threaded.mjs", import.meta.url).href,
  new URL("./vendor/offline-voice/ort-wasm-simd-threaded.wasm", import.meta.url).href,
]);
const CACHE = "english-studio-offline-voice-runtime-" + VERSION;
const VOICES = new Set(["af_heart", "bf_emma"]);
const aborted = () => new DOMException("语音生成已取消", "AbortError");

async function asset(cache, url, signal, fetcher) {
  let response = await cache.match(url);
  if (!response?.ok) {
    response = await fetcher(url, { signal, credentials: "same-origin", cache: "no-cache" });
    if (!response.ok) throw new Error("离线语音组件下载失败：" + response.status);
    try { await cache.put(url, response.clone()); }
    catch (cause) { throw new Error("无法保存语音组件，请检查浏览器存储空间", { cause }); }
  }
  return response.blob();
}

/** Model downloads start only on prepare. dispose frees resources; the instance is reusable. */
export class OfflineVoice {
  constructor({ workerFactory, fetcher, cacheStorage } = {}) {
    this.workerFactory = workerFactory || ((url) => new Worker(url, { type: "module", name: "Offline English Voice" }));
    this.fetcher = fetcher || ((...args) => fetch(...args));
    this.cacheStorage = cacheStorage;
    this.worker = null;
    this.urls = [];
    this.serial = 0;
    this.active = null;
  }
  prepare(units, { voice = "af_heart", onProgress, signal } = {}) {
    if (!Array.isArray(units) || !units.length || units.some((unit) => typeof unit?.text !== "string" || !unit.text.trim())) {
      return Promise.reject(new TypeError("朗读句子不能为空"));
    }
    if (!VOICES.has(voice)) return Promise.reject(new RangeError("不支持的离线音色"));
    if (signal?.aborted) return Promise.reject(aborted());
    if (this.active) this.dispose();
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const job = { id, resolve, reject, onProgress, signal, controller: new AbortController() };
      job.abort = () => this.dispose();
      signal?.addEventListener("abort", job.abort, { once: true });
      this.active = job;
      this._start(units.map((unit) => ({ text: unit.text })), voice, job).catch((error) => {
        if (this.active?.id === id) this._fail(error);
      });
    });
  }
  async _start(units, voice, job) {
    if (!this.worker) {
      const storage = this.cacheStorage || globalThis.caches;
      if (!storage?.open) throw new Error("离线语音需要支持缓存的 HTTPS 或 localhost 页面");
      const cache = await storage.open(CACHE);
      const blobs = [];
      this._progress({ phase: "download", progress: 0, message: "正在准备离线语音组件…" });
      for (let i = 0; i < OFFLINE_VOICE_ASSETS.length; i++) {
        blobs.push(await asset(cache, OFFLINE_VOICE_ASSETS[i], job.controller.signal, this.fetcher));
        if (this.active?.id !== job.id) return;
        this._progress({ phase: "download", progress: (i + 1) / 4 * 0.15, message: "语音组件已缓存 " + (i + 1) + "/4" });
      }
      if (this.active?.id !== job.id) return;
      this.urls = blobs.map((blob, i) => URL.createObjectURL(new Blob([blob], { type: i === 3 ? "application/wasm" : "text/javascript" })));
      this.worker = this.workerFactory(this.urls[0]);
      this.worker.onmessage = (event) => this._message(event.data);
      this.worker.onerror = () => this._fail(new Error("离线语音运行失败，请重试或使用设备语音"));
      this.worker.onmessageerror = () => this._fail(new Error("离线语音结果无法读取"));
    }
    if (this.active?.id !== job.id) return;
    this.worker.postMessage({
      type: "prepare", id: job.id, units, voice, runtimeUrl: this.urls[1],
      wasmPaths: { mjs: this.urls[2], wasm: this.urls[3] },
    });
  }
  _progress(value) {
    try {
      this.active?.onProgress?.({
        phase: value.phase,
        progress: Math.max(0, Math.min(1, Number(value.progress) || 0)),
        message: String(value.message || ""),
      });
    } catch { /* Display callbacks do not interrupt generation. */ }
  }
  _message(message) {
    const job = this.active;
    if (!job || message?.id !== job.id) return;
    if (message.type === "progress") {
      this._progress({ ...message, progress: message.phase === "download" ? 0.15 + message.progress * 0.85 : message.progress });
    } else if (message.type === "result") {
      if (!(message.wav instanceof ArrayBuffer) || !Array.isArray(message.cues)) return this._fail(new Error("离线语音结果格式不正确"));
      this._detach(job);
      this.active = null;
      job.resolve({ blob: new Blob([message.wav], { type: "audio/wav" }), cues: message.cues, sampleRate: message.sampleRate, voice: message.voice });
    } else if (message.type === "error") {
      const error = new Error(message.message || "离线语音生成失败");
      error.name = message.name || "Error";
      this._fail(error);
    }
  }
  _detach(job) { job.signal?.removeEventListener("abort", job.abort); }
  _fail(error) {
    const job = this.active;
    if (job) {
      this._detach(job);
      this.active = null;
      job.controller.abort();
      job.reject(error);
    }
    this.worker?.terminate();
    this.worker = null;
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls = [];
  }
  dispose() { this._fail(aborted()); }
}
