import { normalize } from "./core.mjs";

const partOfSpeech = /^(?:(?:n|v|vt|vi|vbl|pl|pp|adj|adv|pron|prep|conj|interj|int|num|art|aux|abbr|det|modal)\.\s*(?:[&/,]\s*)?)+/i;

export function shortMeaning(meaning, maxLength = 42) {
  if (typeof meaning !== "string") return "";
  const gloss = meaning
    .replace(/\[[^\]\r\n]*\]|【[^】\r\n]*】/g, "")
    .split(/[;；\r\n]+/)
    .map((part) =>
      part
        .trim()
        .replace(/^(?:\(?\d+\)?[.、]\s*)/, "")
        .replace(partOfSpeech, "")
        .replace(/\s+/g, " ")
        .replace(/^[,，、\s]+|[,，、\s]+$/g, ""),
    )
    .find(Boolean) || "";
  const limit = Number.isFinite(maxLength)
    ? Math.max(0, Math.floor(maxLength))
    : 42;
  const characters = Array.from(gloss);
  if (characters.length <= limit) return gloss;
  return limit ? characters.slice(0, limit - 1).join("").trimEnd() + "…" : "";
}

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const sample = Number(random());
    const fraction = Number.isFinite(sample)
      ? Math.min(1 - Number.EPSILON, Math.max(0, sample))
      : 0;
    const j = Math.floor(fraction * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createReadingStudy(terms, random = Math.random) {
  const words = [];
  const seenWords = new Set();
  const seenMeanings = new Set();
  const samples = Array.isArray(terms) ? terms : [];
  for (const term of samples) {
    if (!term || typeof term.w !== "string") continue;
    const id = normalize(term.w.replace(/\s+/g, " "));
    const meaning = shortMeaning(term.meaning);
    const label = meaning.toLocaleLowerCase();
    if (
      !/^[a-z]+(?:[' -][a-z]+)*$/.test(id) ||
      !meaning ||
      seenWords.has(id) ||
      seenMeanings.has(label)
    ) continue;
    seenWords.add(id);
    seenMeanings.add(label);
    words.push({ id, w: id, meaning });
    if (words.length === 5) break;
  }
  const rng = typeof random === "function" ? random : Math.random;
  const pairs = {
    left: shuffled(words.map(({ id, w }) => ({ id, w })), rng),
    right: shuffled(words.map(({ id, meaning }) => ({ id, meaning })), rng),
  };
  const questions = words.length < 2 ? [] : words.map(({ id, w, meaning }) => ({
    id,
    w,
    meaning,
    options: shuffled([
      { id, meaning },
      ...shuffled(words.filter((word) => word.id !== id), rng)
        .slice(0, 3)
        .map(({ id: otherId, meaning: otherMeaning }) => ({
          id: otherId,
          meaning: otherMeaning,
        })),
    ], rng),
  }));
  return { words, pairs, questions, totalQuestions: questions.length };
}
