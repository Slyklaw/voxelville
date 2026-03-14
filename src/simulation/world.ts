
export interface TileData {
  x: number;
  y: number;
  z: number;
  color: string;
}

export class World {
  private size: number;
  private tiles: TileData[] = [];

  constructor(size: number) {
    this.size = size;
  }

  generate(_seed: number): void {
    this.tiles = [];

    const half = Math.floor(this.size / 2);

    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        // Simple heightmap using seeded noise
        const nx = x * 0.15;
        const nz = z * 0.15;
        // Deterministic noise - no rng.next() inside noise calculation
        const noise = Math.sin(nx * 2.5) * Math.cos(nz * 2.5);
        const rawHeight = Math.floor((noise + 1) * 2);
        const height = Math.max(0, Math.min(4, rawHeight));

        for (let y = 0; y <= height; y++) {
          let color: string;
          if (y === 0 && height === 0) {
            // Deterministic water pattern instead of random
            color = ((Math.abs(x * 7 + z * 13) % 10) < 1) ? 'water' : 'grass';
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

/**
 * Get the top Y coordinate of terrain at (x, z).
 * Returns the height of the highest tile column at this position.
 * If no tiles exist at (x, z), returns 0.
 */
export function getTerrainHeight(world: World, x: number, z: number): number {
  const tiles = world.getTiles();
  let maxHeight = 0;

  for (const tile of tiles) {
    if (tile.x === x && tile.z === z) {
      if (tile.y > maxHeight) {
        maxHeight = tile.y;
      }
    }
  }

  return maxHeight;
}

/**
 * Get the maximum terrain height across a rectangular area.
 * Iterates all tiles in the World and returns the highest tile.y
 * found within the bounds [x, x + width) × [z, z + depth).
 * Returns 0 if no tiles exist in the area.
 */
export function getMaxTerrainHeightInArea(
  world: World,
  x: number,
  z: number,
  width: number,
  depth: number,
): number {
  const tiles = world.getTiles();
  let maxHeight = 0;

  for (const tile of tiles) {
    if (tile.x >= x && tile.x < x + width && tile.z >= z && tile.z < z + depth) {
      if (tile.y > maxHeight) {
        maxHeight = tile.y;
      }
    }
  }

  return maxHeight;
}
