const DB_NAME = 'english-studio-audio';
const STORE = 'chapters';
let database;

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(Error('当前浏览器不支持离线音频保存'));
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = null; };
      resolve(db);
    };
    request.onerror = () => { database = null; reject(request.error); };
    request.onblocked = () => { database = null; reject(Error('请关闭其他页面后重试音频保存')); };
  });
  return database;
}

async function transaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    let value;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error || request.error || Error('音频保存失败'));
    tx.onabort = () => reject(tx.error || Error('音频保存已取消'));
  });
}

export async function audioTrackKey(book, firstChapter, lastChapter, voice, units) {
  const text = JSON.stringify(['offline-audio-v1', book, firstChapter, lastChapter, voice,
    units.map((unit) => [unit.chapter, unit.index, unit.start, unit.end, unit.text])]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const readAudioTrack = (key) => transaction('readonly', (store) => store.get(key));
export const saveAudioTrack = (track) => transaction('readwrite', (store) => store.put(track));
export const deleteAudioTrack = (key) => transaction('readwrite', (store) => store.delete(key));
