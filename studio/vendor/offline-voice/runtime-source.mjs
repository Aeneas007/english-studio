import { KokoroTTS } from "kokoro-js";
import { env, StyleTextToSpeech2Model, AutoTokenizer, Tensor } from "@huggingface/transformers";

// The upstream normalizer/phonemizer is retained; voice loading and token limits are explicit.
class CachedKokoro extends KokoroTTS {
  constructor(model, tokenizer) {
    super(model, (text) => {
      const encoded = tokenizer(text, { truncation: false });
      if (encoded.input_ids.dims.at(-1) > 512) {
        const error = new RangeError("Sentence needs smaller synthesis segments");
        error.code = "TEXT_TOO_LONG";
        throw error;
      }
      return encoded;
    });
    this.styles = new Map();
  }
  setVoice(voice, data) {
    if (!(data instanceof Float32Array) || data.length !== 510 * 256) throw new Error("音色文件不完整");
    this.styles.set(voice, data);
  }
  async generate_from_ids(inputIds, { voice = "af_heart", speed = 1 } = {}) {
    const data = this.styles.get(voice);
    if (!data) throw new Error("音色尚未缓存");
    const length = inputIds.dims.at(-1);
    if (length > 512) throw new RangeError("Token limit exceeded");
    const offset = Math.min(Math.max(length - 2, 0), 509) * 256;
    const { waveform } = await this.model({
      input_ids: inputIds,
      style: new Tensor("float32", data.slice(offset, offset + 256), [1, 256]),
      speed: new Tensor("float32", [speed], [1]),
    });
    return { audio: waveform.data, sampling_rate: 24000 };
  }
}
export async function createEngine({ cache, wasmPaths, modelId, revision }) {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.useCustomCache = true;
  env.customCache = cache;
  env.backends.onnx.wasm.wasmPaths = wasmPaths;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  const options = { revision, local_files_only: true };
  const [model, tokenizer] = await Promise.all([
    StyleTextToSpeech2Model.from_pretrained(modelId, { ...options, dtype: "q8", device: "wasm" }),
    AutoTokenizer.from_pretrained(modelId, options),
  ]);
  return new CachedKokoro(model, tokenizer);
}
