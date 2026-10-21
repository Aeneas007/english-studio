import test from "node:test";
import assert from "node:assert/strict";
import { OfflineVoice, OFFLINE_VOICE_ASSETS } from "../studio/offline-voice.mjs";
import { encodePCM, cacheModelFile, generatePCM, MODEL_BASE } from "../studio/offline-voice-worker.mjs";

class MemoryCache {
  constructor() { this.entries = new Map(); }
  async match(key) { return this.entries.get(String(key))?.clone(); }
  async put(key, response) {
    const bytes = await response.arrayBuffer();
    this.entries.set(String(key), new Response(bytes, { status: response.status, headers: response.headers }));
  }
  async delete(key) { return this.entries.delete(String(key)); }
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function fixture({ silent = false } = {}) {
  const cache = new MemoryCache();
  const workers = [];
  let downloads = 0;
  const voice = new OfflineVoice({
    cacheStorage: { open: async () => cache },
    fetcher: async () => { downloads++; return new Response("runtime component"); },
    workerFactory: () => {
      const worker = {
        terminated: false,
        terminate() { this.terminated = true; },
        postMessage(message) {
          this.message = message;
          if (!silent) queueMicrotask(() => {
            this.onmessage({ data: { type: "progress", id: message.id, phase: "generate", progress: 0.5, message: "half" } });
            const result = encodePCM(message.units.map(() => new Float32Array([0.2, -0.3])));
            this.onmessage({ data: { type: "result", id: message.id, ...result, voice: message.voice } });
          });
        },
      };
      workers.push(worker);
      return worker;
    },
  });
  return { voice, cache, workers, downloads: () => downloads };
}

test("WAV is mono PCM16 with real sentence boundaries and silent inter-sentence gap", () => {
  const { wav, cues } = encodePCM([new Float32Array([1, -1, NaN]), new Float32Array([0.5, 0])], 100, 0.18);
  const view = new DataView(wav);
  assert.equal(new TextDecoder().decode(new Uint8Array(wav, 0, 4)), "RIFF");
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 100);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(46, true), -32768);
  assert.equal(view.getInt16(48, true), 0);
  assert.equal(wav.byteLength, 44 + (3 + 18 + 2) * 2);
  assert.deepEqual(cues, [{ index: 0, start: 0, end: 0.03 }, { index: 1, start: 0.21, end: 0.23 }]);
  for (let offset = 50; offset < 86; offset += 2) assert.equal(view.getInt16(offset, true), 0);
});
test("invalid or empty PCM does not produce a misleading audio file", () => {
  assert.throws(() => encodePCM([]), RangeError);
  assert.throws(() => encodePCM([new Float32Array()]), TypeError);
  assert.throws(() => encodePCM([new Float32Array(1)], 24000, -1), RangeError);
});
test("model downloads use pinned URLs, complete cache entries, and no fetch on cache reuse", async () => {
  const cache = new MemoryCache();
  let requests = 0;
  const fetcher = async (url) => {
    requests++;
    assert.equal(url, MODEL_BASE + "sample.bin");
    assert.match(url, /resolve\/[a-f0-9]{40}\//);
    return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "content-length": "4" } });
  };
  const progress = [];
  await cacheModelFile(cache, "sample.bin", 4, (bytes) => progress.push(bytes), fetcher);
  const result = await cacheModelFile(cache, "sample.bin", 4, () => {}, async () => { throw Error("offline"); });
  assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [1, 2, 3, 4]);
  assert.equal(requests, 1);
  assert.equal(progress.at(-1), 4);
});
test("partial model response is rejected and removed instead of cached as ready", async () => {
  const cache = new MemoryCache();
  await assert.rejects(cacheModelFile(cache, "partial.bin", 8, () => {}, async () => new Response("short")), /不完整/);
  assert.equal(await cache.match(MODEL_BASE + "partial.bin"), undefined);
});
test("storage quota failures are surfaced and do not leave a ready model entry", async () => {
  const cache = new MemoryCache();
  cache.put = async () => { throw new DOMException("full", "QuotaExceededError"); };
  await assert.rejects(cacheModelFile(cache, "full.bin", 4, () => {}, async () => new Response("1234")), /存储空间/);
});
test("oversized sentences are split and generated fully rather than silently truncated", async () => {
  const texts = [];
  const engine = { async generate(text) {
    if (text.length > 12) { const error = new RangeError("long"); error.code = "TEXT_TOO_LONG"; throw error; }
    texts.push(text);
    return { audio: new Float32Array(text.length).fill(0.2), sampling_rate: 24000 };
  } };
  const original = "Every word in this long sentence must still be generated.";
  const pcm = await generatePCM(engine, original, "af_heart");
  assert.equal(texts.join(" "), original);
  assert.equal(pcm.length, texts.reduce((sum, text) => sum + text.length, 0));
});
test("real synthesis errors are propagated rather than treated as sentence length", async () => {
  await assert.rejects(generatePCM({ generate: async () => { throw Error("inference failed"); } }, "Hello.", "af_heart"), /inference failed/);
});
test("prepare maps array positions to cues, sends only text, and yields a WAV Blob", async () => {
  const f = fixture();
  const progress = [];
  const result = await f.voice.prepare([{ index: 88, start: 20, end: 30, text: "Hello." }, { index: 90, text: "Again." }], { voice: "bf_emma", onProgress: (value) => progress.push(value) });
  assert.equal(result.blob.type, "audio/wav");
  assert.equal(result.voice, "bf_emma");
  assert.equal(result.sampleRate, 24000);
  assert.deepEqual(result.cues.map((cue) => cue.index), [0, 1]);
  assert.deepEqual(f.workers[0].message.units, [{ text: "Hello." }, { text: "Again." }]);
  assert.equal(f.downloads(), OFFLINE_VOICE_ASSETS.length);
  assert.ok(progress.some((value) => value.phase === "generate"));
  f.voice.dispose();
});
test("a fresh Worker can reuse all cached runtime components with network unavailable", async () => {
  const f = fixture();
  await f.voice.prepare([{ text: "First." }]);
  f.voice.dispose();
  f.voice.fetcher = async () => { throw Error("offline"); };
  await f.voice.prepare([{ text: "Second." }], { onProgress() { throw Error("display callback"); } });
  assert.equal(f.workers.length, 2);
  assert.equal(f.downloads(), 4);
  f.voice.dispose();
});
test("AbortSignal terminates inference and rejects once with AbortError", async () => {
  const f = fixture({ silent: true });
  const controller = new AbortController();
  const pending = f.voice.prepare([{ text: "Please cancel." }], { signal: controller.signal });
  const rejection = assert.rejects(pending, { name: "AbortError" });
  while (!f.workers.length) await tick();
  controller.abort();
  await rejection;
  assert.equal(f.workers[0].terminated, true);
  assert.equal(f.voice.active, null);
});
test("invalid input or an already cancelled request never downloads runtime assets", async () => {
  const f = fixture();
  await assert.rejects(f.voice.prepare([]), TypeError);
  await assert.rejects(f.voice.prepare([{ text: "Hello." }], { voice: "unknown" }), RangeError);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(f.voice.prepare([{ text: "Hello." }], { signal: controller.signal }), { name: "AbortError" });
  assert.equal(f.downloads(), 0);
});

test("a corrupt cached file with a plausible header is checked against actual bytes", async () => {
  const cache = new MemoryCache();
  await cache.put(MODEL_BASE + "corrupt.bin", new Response("bad", { headers: { "content-length": "4" } }));
  let requests = 0;
  const result = await cacheModelFile(cache, "corrupt.bin", 4, () => {}, async () => {
    requests++;
    return new Response("good", { headers: { "content-length": "4" } });
  });
  assert.equal(await result.text(), "good");
  assert.equal(requests, 1);
});
test("sequential successful requests reuse a warm Worker", async () => {
  const f = fixture();
  await f.voice.prepare([{ text: "First." }]);
  await f.voice.prepare([{ text: "Second." }]);
  assert.equal(f.workers.length, 1);
  assert.equal(f.downloads(), 4);
  f.voice.dispose();
});
test("replacing an in-flight request rejects it and ignores its late result", async () => {
  const f = fixture({ silent: true });
  const first = f.voice.prepare([{ text: "Old." }]);
  const rejected = assert.rejects(first, { name: "AbortError" });
  while (!f.workers.length) await tick();
  const oldWorker = f.workers[0];
  const second = f.voice.prepare([{ text: "New." }]);
  while (f.workers.length < 2) await tick();
  const current = f.workers[1];
  const data = encodePCM([new Float32Array([0.2])]);
  oldWorker.onmessage({ data: { type: "result", id: oldWorker.message.id, ...data, voice: "af_heart" } });
  assert.equal(f.voice.active.id, current.message.id);
  current.onmessage({ data: { type: "result", id: current.message.id, ...data, voice: "af_heart" } });
  await second;
  await rejected;
  assert.equal(oldWorker.terminated, true);
  f.voice.dispose();
});
