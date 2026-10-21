export const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const MODEL_REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
export const MODEL_BASE = "https://huggingface.co/" + MODEL_ID + "/resolve/" + MODEL_REVISION + "/";
export const MODEL_CACHE = "english-studio-kokoro-q8-" + MODEL_REVISION;
export const SAMPLE_RATE = 24000;
export const SENTENCE_GAP_SECONDS = 0.18;
const FILES = [["config.json", 44], ["tokenizer.json", 3497], ["tokenizer_config.json", 113], ["onnx/model_quantized.onnx", 92361116]];
const VOICES = new Set(["af_heart", "bf_emma"]);

/** Cue boundaries come from PCM sample counts, without estimated word timings. */
export function encodePCM(chunks, sampleRate = SAMPLE_RATE, gapSeconds = SENTENCE_GAP_SECONDS) {
  if (!Number.isInteger(sampleRate) || sampleRate < 1 || !Number.isFinite(gapSeconds) || gapSeconds < 0) throw new RangeError("Invalid audio format");
  const gap = Math.round(sampleRate * gapSeconds);
  let count = 0;
  const cues = chunks.map((chunk, index) => {
    if (!(chunk instanceof Float32Array) || !chunk.length) throw new TypeError("Empty PCM sentence");
    const start = count / sampleRate;
    count += chunk.length;
    const end = count / sampleRate;
    if (index < chunks.length - 1) count += gap;
    return { index, start, end };
  });
  if (!chunks.length || count * 2 > 0xffffffff - 36) throw new RangeError("Audio is too long");
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true);
  text(8, "WAVE"); text(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, count * 2, true);
  let cursor = 44;
  chunks.forEach((chunk, index) => {
    for (const value of chunk) {
      const finite = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
      view.setInt16(cursor, Math.round(finite < 0 ? finite * 32768 : finite * 32767), true);
      cursor += 2;
    }
    if (index < chunks.length - 1) cursor += gap * 2;
  });
  return { wav: buffer, cues, sampleRate };
}
export async function cacheModelFile(cache, path, expectedSize, progress, fetcher = fetch) {
  const url = MODEL_BASE + path;
  const cached = await cache.match(url);
  if (cached?.ok) {
    const length = Number(cached.headers.get("content-length"));
    if (!length || length === expectedSize) {
      let actual = 0;
      if (cached.body?.getReader) {
        const reader = cached.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          actual += value.byteLength;
        }
      } else actual = (await cached.arrayBuffer()).byteLength;
      if (actual === expectedSize) { progress(expectedSize); return await cache.match(url); }
    }
    await cache.delete(url);
  }
  const response = await fetcher(url, { credentials: "omit" });
  if (!response.ok) throw new Error("模型下载失败：" + path + " (" + response.status + ")");
  let storeError;
  const stored = cache.put(url, response.clone()).catch((error) => { storeError = error; });
  let received = 0;
  try {
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        progress(Math.min(received, expectedSize));
      }
    } else {
      received = (await response.arrayBuffer()).byteLength;
      progress(Math.min(received, expectedSize));
    }
    await stored;
    if (storeError) throw new Error("模型无法保存到浏览器，请检查可用存储空间", { cause: storeError });
    if (received !== expectedSize) throw new Error("模型文件下载不完整，请重试");
    return await cache.match(url);
  } catch (error) {
    await stored;
    await cache.delete(url);
    throw error;
  }
}
export function divideText(text) {
  const words = text.trim().split(/\s+/);
  if (words.length > 1) {
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
  }
  const characters = Array.from(text);
  if (characters.length < 2) throw new Error("这一段文字无法生成语音");
  const half = Math.ceil(characters.length / 2);
  return [characters.slice(0, half).join(""), characters.slice(half).join("")];
}
export async function generatePCM(engine, text, voice, depth = 0) {
  try {
    const result = await engine.generate(text, { voice });
    if (result.sampling_rate !== SAMPLE_RATE || !(result.audio instanceof Float32Array) || !result.audio.length) throw new Error("语音模型返回了不支持的音频");
    return result.audio;
  } catch (error) {
    if (error.code !== "TEXT_TOO_LONG" || depth > 16) throw error;
    const pieces = [];
    for (const part of divideText(text)) pieces.push(await generatePCM(engine, part, voice, depth + 1));
    const joined = new Float32Array(pieces.reduce((sum, item) => sum + item.length, 0));
    let offset = 0;
    for (const item of pieces) { joined.set(item, offset); offset += item.length; }
    return joined;
  }
}
let engine;
async function prepare(message) {
  const { id, units, voice, wasmPaths } = message;
  const send = (value) => self.postMessage({ id, ...value });
  try {
    if (!Array.isArray(units) || !units.length || units.some((unit) => typeof unit?.text !== "string" || !unit.text.trim()) || !VOICES.has(voice)) throw new Error("无效的离线语音请求");
    const cache = await caches.open(MODEL_CACHE);
    const required = [...FILES, ["voices/" + voice + ".bin", 522240]];
    const total = required.reduce((sum, file) => sum + file[1], 0);
    let finished = 0;
    for (const [path, bytes] of required) {
      await cacheModelFile(cache, path, bytes, (loaded) => send({
        type: "progress", phase: "download", progress: (finished + loaded) / total,
        message: "正在缓存离线音色与模型…",
      }));
      finished += bytes;
    }
    send({ type: "progress", phase: "download", progress: 1, message: "模型已缓存，正在初始化本机语音…" });
    if (!engine) {
      const runtime = await import(message.runtimeUrl);
      engine = await runtime.createEngine({ cache, wasmPaths, modelId: MODEL_ID, revision: MODEL_REVISION });
    }
    const voiceResponse = await cache.match(MODEL_BASE + "voices/" + voice + ".bin");
    engine.setVoice(voice, new Float32Array(await voiceResponse.arrayBuffer()));
    const chunks = [];
    send({ type: "progress", phase: "generate", progress: 0, message: "正在生成第 1 / " + units.length + " 句…" });
    for (let index = 0; index < units.length; index++) {
      chunks.push(await generatePCM(engine, units[index].text, voice));
      send({ type: "progress", phase: "generate", progress: (index + 1) / units.length, message: "已生成 " + (index + 1) + " / " + units.length + " 句" });
    }
    const result = encodePCM(chunks);
    self.postMessage({ type: "result", id, ...result, voice }, [result.wav]);
  } catch (error) {
    send({ type: "error", message: error?.message || "离线语音生成失败", name: error?.name || "Error" });
  }
}
if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof document === "undefined") {
  self.onmessage = (event) => { if (event.data?.type === "prepare") prepare(event.data); };
}
