// A tiny IndexedDB key-value wrapper: everything ORILOS keeps lives in this
// browser profile. Stores: "kv" (app state, encrypted key, crypto key) and
// "blobs" (images).

type StoreName = 'kv' | 'blobs';

let dbp: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  return (dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('orilos', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
      req.result.createObjectStore('blobs');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const idbGet = <T>(store: StoreName, key: string) => tx<T | undefined>(store, 'readonly', (s) => s.get(key));
export const idbSet = (store: StoreName, key: string, value: unknown) => tx<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key));
export const idbDel = (store: StoreName, key: string) => tx<undefined>(store, 'readwrite', (s) => s.delete(key));
export const idbKeys = (store: StoreName) => tx<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys());
export const idbClear = (store: StoreName) => tx<undefined>(store, 'readwrite', (s) => s.clear());
