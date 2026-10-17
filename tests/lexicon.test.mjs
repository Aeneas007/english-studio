import test from "node:test";
import assert from "node:assert/strict";

let moduleId = 0;
const json = (data) => ({ ok: true, json: async () => data });

async function setup(t, serve, shards = ["we", "go"]) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const calls = new Map();
  globalThis.fetch = async (input) => {
    const path = String(input);
    calls.set(path, (calls.get(path) || 0) + 1);
    if (path === "lexicon/manifest.json") return json({ shards });
    return serve(path, calls.get(path));
  };
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "fetch", previous);
    else delete globalThis.fetch;
  });
  const module = await import(`../studio/lexicon.mjs?lookup-test=${moduleId++}`);
  return { ...module, calls };
}

test("cached exact entries remain usable when a different root shard is offline", async (t) => {
  let offline = true;
  const { lookup, calls } = await setup(t, (path) => {
    if (path === "lexicon/we.json")
      return json({
        well: ["wel", "adv. 好"],
        went: ["went", "v. go 的过去式"],
      });
    if (offline) throw Error("Network unavailable");
    return json({ go: ["ɡəʊ", "v. 去"] });
  });
  await lookup("well");
  const exact = await lookup("went");
  assert.equal(exact.base, "went");
  assert.equal(exact.meaning, "v. go 的过去式");
  assert.deepEqual(exact.alternatives, []);
  assert.equal(calls.get("lexicon/we.json"), 1);

  offline = false;
  const retried = await lookup("went");
  assert.equal(retried.base, "went");
  assert.equal(retried.alternatives[0].base, "go");
  assert.equal(retried.alternatives[0].meaning, "v. 去");
  assert.equal(calls.get("lexicon/we.json"), 1);
  assert.equal(calls.get("lexicon/go.json"), 2);
  assert.equal(calls.get("lexicon/manifest.json"), 1);
});

test("HTTP shard failures are retried instead of cached as empty dictionaries", async (t) => {
  const { lookup, calls } = await setup(t, (path, attempt) => {
    if (path === "lexicon/we.json") return json({ went: ["went", "v. 去的过去式"] });
    if (attempt === 1) return { ok: false, status: 503 };
    return json({ go: ["ɡəʊ", "v. 去"] });
  });
  assert.deepEqual((await lookup("went")).alternatives, []);
  assert.equal((await lookup("went")).alternatives[0].base, "go");
  assert.equal(calls.get("lexicon/go.json"), 2);
});

test("a readable root can satisfy lookup when the exact shard cannot be reached", async (t) => {
  const { lookup } = await setup(t, (path) => {
    if (path === "lexicon/we.json") throw Error("Offline exact prefix");
    return json({ go: ["ɡəʊ", "v. 去"] });
  });
  const result = await lookup("went");
  assert.equal(result.word, "went");
  assert.equal(result.base, "go");
  assert.equal(result.meaning, "v. 去");
});

test("unreachable dictionaries still report failure and can recover on retry", async (t) => {
  let offline = true;
  const networkError = Error("Network unavailable");
  const { lookup } = await setup(t, (path) => {
    if (offline) throw networkError;
    return json(path === "lexicon/go.json" ? { go: ["ɡəʊ", "v. 去"] } : {});
  });
  await assert.rejects(lookup("went"), (error) => error === networkError);
  offline = false;
  assert.equal((await lookup("went")).base, "go");
  assert.equal(await lookup("well"), null, "a readable but unlisted word is not a network error");
});

test("malformed shard responses never hide a valid match and are retried", async (t) => {
  const { lookup, calls } = await setup(t, (path, attempt) => {
    if (path === "lexicon/we.json") return json({ went: ["went", "v. 去的过去式"] });
    if (attempt === 1) return { ok: true, json: async () => { throw SyntaxError("Invalid JSON"); } };
    if (attempt === 2) return json(null);
    return json({ go: ["ɡəʊ", "v. 去"] });
  });
  assert.equal((await lookup("went")).base, "went");
  assert.deepEqual((await lookup("went")).alternatives, []);
  assert.equal((await lookup("went")).alternatives[0].base, "go");
  assert.equal(calls.get("lexicon/go.json"), 3);
});
