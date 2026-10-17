import { candidates, normalize } from "./core.mjs";
const cache = new Map();
let manifest;
export async function dictionaryInfo() {
  if (!manifest)
    manifest = await fetch("lexicon/manifest.json").then((r) => {
      if (!r.ok) throw Error("词库不可用");
      return r.json();
    });
  return manifest;
}
async function shard(key) {
  if (cache.has(key)) return cache.get(key);
  const response = await fetch("lexicon/" + key + ".json");
  if (!response.ok) throw Error("词库分片暂不可用");
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw Error("词库分片格式无效");
  cache.set(key, data);
  return data;
}
export async function lookup(word) {
  const list = candidates(word);
  const info = await dictionaryInfo(),
    matches = [];
  let readable = false,
    failure;
  for (const w of list) {
    const prefix = w.slice(0, 2).replace(/[ '\-]/g, "_");
    if (!info.shards.includes(prefix)) continue;
    let data;
    try {
      data = await shard(prefix);
      readable = true;
    } catch (error) {
      failure ||= error;
      continue;
    }
    if (data[w])
      matches.push({
        word: normalize(word),
        base: w,
        phonetic: data[w][0],
        meaning: data[w][1],
        definition: data[w][2],
        exchange: data[w][3],
        source: "ECDICT",
      });
  }
  if (!readable && failure) throw failure;
  return matches.length
    ? { ...matches[0], alternatives: matches.slice(1) }
    : null;
}
export function splitForTranslation(text, max = 480) {
  const parts = [];
  let part = "";
  for (const word of text.split(/\s+/)) {
    const next = (part ? part + " " : "") + word;
    if (new TextEncoder().encode(next).length > max && part) {
      parts.push(part);
      part = word;
    } else part = next;
  }
  if (part) parts.push(part);
  return parts;
}
export async function translate(text, signal) {
  const outputs = [];
  for (const part of splitForTranslation(text)) {
    if (new TextEncoder().encode(part).length > 500)
      throw Error("选中文本过长，请缩短后再试");
    const url =
      "https://api.mymemory.translated.net/get?" +
      new URLSearchParams({ q: part, langpair: "en|zh-CN" });
    const r = await fetch(url, { signal });
    if (!r.ok) throw Error("翻译服务暂时不可用");
    const data = await r.json();
    if (
      Number(data.responseStatus) !== 200 ||
      !data.responseData?.translatedText
    )
      throw Error(
        data.responseStatus === 429
          ? "免费翻译额度暂时用完，请稍后再试"
          : "翻译服务未返回结果",
      );
    outputs.push(data.responseData.translatedText);
  }
  return outputs.join(" ");
}
