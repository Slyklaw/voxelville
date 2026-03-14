
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
        // Flat terrain at y=0 for development
        this.tiles.push({ x, y: 0, z, color: 'grass' });
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
