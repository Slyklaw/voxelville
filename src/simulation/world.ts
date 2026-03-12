import { SeededRNG } from '../utils/rng';

export interface TileData {
  x: number;
  y: number;
  z: number;
  color: string;
}

export class World {
  private size: number;
  private rng: SeededRNG;
  private tiles: TileData[] = [];

  constructor(size: number) {
    this.size = size;
    this.rng = new SeededRNG(42);
  }

  generate(seed: number): void {
    this.rng = new SeededRNG(seed);
    this.tiles = [];

    const half = Math.floor(this.size / 2);

    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        // Simple heightmap using seeded noise
        const nx = x * 0.15;
        const nz = z * 0.15;
        const noise = Math.sin(nx * 2.5 + this.rng.next() * 0.3) *
          Math.cos(nz * 2.5 + this.rng.next() * 0.3);
        const rawHeight = Math.floor((noise + 1) * 2);
        const height = Math.max(0, Math.min(4, rawHeight));

        for (let y = 0; y <= height; y++) {
          let color: string;
          if (y === 0 && height === 0) {
            color = this.rng.next() > 0.85 ? 'water' : 'grass';
          } else if (y === 0) {
            color = 'grass';
          } else if (y <= 1) {
            color = 'grass';
          } else if (y === 2) {
            color = 'dirt';
          } else {
            color = 'stone';
          }

          this.tiles.push({ x, y, z, color });
        }
      }
    }
  }

  getTiles(): TileData[] {
    return this.tiles;
  }

  get sizeValue(): number {
    return this.size;
  }
}

export function createWorld(size: number): World {
  return new World(size);
}

export function getTile(world: World, x: number, z: number): TileData[] {
  return world.getTiles().filter((t) => t.x === x && t.z === z);
}

export function setTile(
  world: World,
  x: number,
  y: number,
  z: number,
  color: string,
): void {
  // For now, tiles are read-only after generation.
  // Full grid mutation will come in later phases.
  void world;
  void x;
  void y;
  void z;
  void color;
}
