import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const deps = path.resolve(process.argv[2] || path.join(root, "../offline-voice-build/node_modules"));
const require = createRequire(path.join(deps, "../package.json"));
const { build } = await import(pathToFileURL(require.resolve("esbuild")));
const target = path.join(root, "studio/vendor/offline-voice");
const revision = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
await fs.mkdir(target, { recursive: true });
const versions = {
  "kokoro-js": "1.2.1",
  "@huggingface/transformers": "3.5.1",
  "phonemizer": "1.2.1",
  "onnxruntime-web": "1.22.0-dev.20250409-89f8206ba4",
};
for (const [name, version] of Object.entries(versions)) {
  const pkg = JSON.parse(await fs.readFile(path.join(deps, name, "package.json"), "utf8"));
  if (pkg.version !== version) throw new Error("Use pinned dependency " + name + "@" + version);
}
const ort = path.join(deps, "onnxruntime-web/dist");
await build({
  entryPoints: [path.join(target, "runtime-source.mjs")],
  outfile: path.join(target, "runtime-v1.mjs"),
  bundle: true, minify: true, format: "esm", platform: "browser",
  target: "es2022", legalComments: "eof",
  alias: {
    "@huggingface/transformers": path.join(deps, "@huggingface/transformers/src/transformers.js"),
    "onnxruntime-web": path.join(ort, "ort.wasm.min.mjs"),
    "kokoro-js": path.join(deps, "kokoro-js/dist/kokoro.js"),
    "phonemizer": path.join(deps, "phonemizer/dist/phonemizer.js"),
  },
  banner: { js: "/* Pinned local Kokoro runtime. Built with a checked tokenizer and cached voice adapter; see NOTICE.txt. */" },
});
const output = path.join(target, "runtime-v1.mjs");
const bundled = await fs.readFile(output, "utf8");
await fs.writeFile(output, bundled.replaceAll(
  "Kokoro-82M-v1.0-ONNX/resolve/main/",
  "Kokoro-82M-v1.0-ONNX/resolve/" + revision + "/",
));
for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  await fs.copyFile(path.join(ort, file), path.join(target, file));
}
const licenses = [
  ["kokoro-js/LICENSE", "LICENSE-kokoro.txt"],
  ["@huggingface/transformers/LICENSE", "LICENSE-transformers.txt"],
  ["phonemizer/LICENSE", "LICENSE-phonemizer.txt"],
  ["onnxruntime-web/LICENSE", "LICENSE-onnxruntime.txt"],
  ["onnxruntime-web/ThirdPartyNotices.txt", "ONNX-ThirdPartyNotices.txt"],
];
for (const [source, destination] of licenses) {
  try { await fs.copyFile(path.join(deps, source), path.join(target, destination)); }
  catch (error) { if (error.code !== "ENOENT" || !await fs.stat(path.join(target, destination)).catch(() => null)) throw error; }
}
const manifest = { versions, model: "onnx-community/Kokoro-82M-v1.0-ONNX", revision, files: {} };
for (const name of ["runtime-v1.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  const data = await fs.readFile(path.join(target, name));
  manifest.files[name] = { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
}
await fs.writeFile(path.join(target, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
