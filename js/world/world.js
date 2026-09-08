import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from "./chunk.js";
import { Noise2D } from "./noise.js";
import { hash32 } from "../util/random.js";
import { placeTree } from "./tree.js";

// Block IDs we use in v0.1.
const STONE = 3;
const DIRT = 2;
const GRASS = 1;
const SAND = 4;
const BEDROCK = 11;

// World height clamp (CHUNK_HEIGHT is 16, so 4..9 keeps room for the 7-block trees).
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 9;

// Per-column surface height: 2 octaves of Perlin, scaled to fit in the clamp range.
function surfaceHeight(x, z, noise) {
  const n1 = noise.noise(x * 0.05, z * 0.05);
  const n2 = noise.noise(x * 0.10, z * 0.10) * 0.5;
  const h = Math.floor(7 + (n1 + n2) * 4);
  if (h < MIN_HEIGHT) return MIN_HEIGHT;
  if (h > MAX_HEIGHT) return MAX_HEIGHT;
  return h;
}

// Slow-frequency noise decides whether the surface biome is grass or sand.
function isSand(x, z, noise) {
  const b = noise.noise(x * 0.02 + 9999, z * 0.02 + 9999);
  return b < 0;
}

// 1 in 200 columns gets a tree. Deterministic per world (lx, lz) so trees
// appear in the same place every reload.
const TREE_DENOM = 200;
function shouldPlaceTree(wx, wz, seed) {
  return (hash32(wx, wz, seed) % TREE_DENOM) === 0;
}

export class World {
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
    this.chunks = new Map();
    this.decorated = new Set(); // chunk keys that already had trees scattered
    this.noise = new Noise2D(this.seed);
  }

  chunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz, create = false) {
    const k = this.chunkKey(cx, cz);
    let c = this.chunks.get(k);
    if (!c && create) {
      c = new Chunk(cx, cz);
      this.generateChunk(c);
      this.chunks.set(k, c);
    }
    return c;
  }

  ensureChunksAround(cx, cz, radius) {
    // Pass 1: generate terrain for every chunk in range.
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.getChunk(cx + dx, cz + dz, true);
      }
    }
    // Pass 2: scatter trees, but only on chunks that have never been
    // decorated. Re-scattering would be wasted work and — worse — would
    // resurrect player-chopped trees and stamp canopies over player edits.
    // Decoration is deterministic per (x, z, seed), so a chunk decorated
    // late (when the player walks into range) looks exactly as if it had
    // been decorated at startup.
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const k = this.chunkKey(cx + dx, cz + dz);
        if (this.decorated.has(k)) continue;
        const chunk = this.chunks.get(k);
        if (!chunk) continue;
        this.decorateChunk(chunk);
        this.decorated.add(k);
      }
    }
  }

  // Insert a chunk's block data without running the generator. Used when
  // restoring from a save file. Marks the chunk dirty so its mesh rebuilds.
  // Loaded chunks were decorated when first generated, so they count as
  // decorated — otherwise the loader would re-scatter trees over the save.
  setChunkBlocks(cx, cz, blocks) {
    const k = this.chunkKey(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = new Chunk(cx, cz);
      this.chunks.set(k, c);
    }
    c.blocks.set(blocks);
    c.dirty = true;
    this.decorated.add(k);
  }

  // World-space coords.
  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const c = this.chunks.get(this.chunkKey(cx, cz));
    if (!c) return 0;
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    return c.get(lx, y, lz);
  }

  setBlock(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const c = this.getChunk(cx, cz, true);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    c.set(lx, y, lz, id);
  }

  // Phase 10 generator: 2-octave Perlin terrain with a grass/sand biome overlay.
  //   y = surface:           grass or sand (chosen by isSand)
  //   y = surface-1..surface-3: dirt
  //   y = 1..surface-4:      stone
  //   y = 0:                 bedrock
  generateChunk(chunk) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = chunk.cx * CHUNK_SIZE + lx;
        const wz = chunk.cz * CHUNK_SIZE + lz;
        const surface = surfaceHeight(wx, wz, this.noise);
        const surfaceId = isSand(wx, wz, this.noise) ? SAND : GRASS;

        for (let y = 0; y <= surface; y++) {
          let id;
          if (y === 0) id = BEDROCK;
          else if (y === surface) id = surfaceId;
          else if (surface - y < 4) id = DIRT;
          else id = STONE;
          chunk.set(lx, y, lz, id);
        }
      }
    }
    chunk.dirty = true;
  }

  // Scatter trees onto a chunk. Trees are placed only on grass columns; sand
  // stays bare so the visual distinction between biomes is preserved.
  decorateChunk(chunk) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = chunk.cx * CHUNK_SIZE + lx;
        const wz = chunk.cz * CHUNK_SIZE + lz;
        if (!shouldPlaceTree(wx, wz, this.seed)) continue;
        // Surface block at this column.
        let surfaceY = -1;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          if (chunk.get(lx, y, lz) !== 0) { surfaceY = y; break; }
        }
        if (surfaceY < 0) continue;
        // Only plant on grass.
        if (chunk.get(lx, surfaceY, lz) !== GRASS) continue;
        placeTree(this, wx, wz, surfaceY);
      }
    }
  }
}