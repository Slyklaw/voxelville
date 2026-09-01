// World persistence: IndexedDB-backed binary blob of all loaded chunks.
//
// Save format (little-endian):
//   header (16 bytes):
//     magic         4 bytes  'VXV0'
//     version       u32      1
//     seed          u32
//     chunkCount    u32
//   per chunk:
//     cx            i32
//     cz            i32
//     byteLength    u32      always CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE (4096)
//     blocks        byteLength bytes (one byte per block ID)
//
// One key per world: "world:<name>". v0.1 ships a single save slot named "main".

import { CHUNK_SIZE, CHUNK_HEIGHT } from "../world/chunk.js";

const MAGIC = [0x56, 0x58, 0x56, 0x30]; // 'VXV0'
const VERSION = 1;
const DB_NAME = "voxelville";
const STORE = "worlds";
const DEFAULT_NAME = "main";
const CHUNK_BYTES = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function get(key) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const req = tx(d, "readonly").get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
  );
}

function put(key, value) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const req = tx(d, "readwrite").put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

// Serialize the world's currently-loaded chunks into a single ArrayBuffer.
export function serializeWorld(world) {
  const chunks = [...world.chunks.values()];
  const buf = new ArrayBuffer(16 + chunks.length * (4 + 4 + 4 + CHUNK_BYTES));
  const dv = new DataView(buf);
  let p = 0;
  for (let i = 0; i < 4; i++) dv.setUint8(p++, MAGIC[i]);
  dv.setUint32(p, VERSION, true); p += 4;
  dv.setUint32(p, world.seed >>> 0, true); p += 4;
  dv.setUint32(p, chunks.length, true); p += 4;
  const u8 = new Uint8Array(buf);
  for (const chunk of chunks) {
    dv.setInt32(p, chunk.cx | 0, true); p += 4;
    dv.setInt32(p, chunk.cz | 0, true); p += 4;
    dv.setUint32(p, CHUNK_BYTES, true); p += 4;
    u8.set(chunk.blocks, p);
    p += CHUNK_BYTES;
  }
  return buf;
}

// Parse a saved buffer. Throws on bad magic/version. Returns
// { seed: number, chunks: [{ cx, cz, blocks: Uint8Array }] }.
export function deserializeWorld(buf) {
  const dv = new DataView(buf);
  if (dv.byteLength < 16) throw new Error("save: too small");
  for (let i = 0; i < 4; i++) {
    if (dv.getUint8(i) !== MAGIC[i]) throw new Error("save: bad magic");
  }
  const version = dv.getUint32(4, true);
  if (version !== VERSION) throw new Error(`save: unsupported version ${version}`);
  const seed = dv.getUint32(8, true);
  const count = dv.getUint32(12, true);
  const u8 = new Uint8Array(buf);
  const chunks = [];
  let p = 16;
  for (let i = 0; i < count; i++) {
    if (p + 12 + CHUNK_BYTES > buf.byteLength) throw new Error("save: truncated");
    const cx = dv.getInt32(p, true); p += 4;
    const cz = dv.getInt32(p, true); p += 4;
    const byteLen = dv.getUint32(p, true); p += 4;
    if (byteLen !== CHUNK_BYTES) throw new Error(`save: bad chunk length ${byteLen}`);
    const blocks = new Uint8Array(u8.buffer, u8.byteOffset + p, CHUNK_BYTES);
    // Copy into a standalone Uint8Array so the slice can outlive `buf`.
    chunks.push({ cx, cz, blocks: new Uint8Array(blocks) });
    p += CHUNK_BYTES;
  }
  return { seed, chunks };
}

export async function saveWorld(world, name = DEFAULT_NAME) {
  const buf = serializeWorld(world);
  await put(`world:${name}`, buf);
}

export async function loadWorld(name = DEFAULT_NAME) {
  const buf = await get(`world:${name}`);
  if (!buf) return null;
  return deserializeWorld(buf);
}