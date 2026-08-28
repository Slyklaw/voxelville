import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from "./chunk.js";
import { Noise2D } from "./noise.js";
import { hash32 } from "../util/random.js";

// Block IDs we use in v0.1.
const STONE = 3;
const DIRT = 2;
const GRASS = 1;
const BEDROCK = 11;

export class World {
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
    this.chunks = new Map();
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
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.getChunk(cx + dx, cz + dz, true);
      }
    }
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

  // Phase 5 generator: flat layers, no noise.
  // y=15: grass, y=11..14: dirt, y=1..10: stone, y=0: bedrock.
  generateChunk(chunk) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let id;
          if (y === CHUNK_HEIGHT - 1) id = GRASS;
          else if (y >= CHUNK_HEIGHT - 5) id = DIRT;
          else if (y === 0) id = BEDROCK;
          else id = STONE;
          chunk.set(lx, y, lz, id);
        }
      }
    }
    chunk.dirty = true;
  }
}
