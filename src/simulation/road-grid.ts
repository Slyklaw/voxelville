/**
 * Road grid data structure for Voxelville
 * 
 * Manages road tiles with auto-connecting neighbors.
 * Roads can only be placed on grid cells, and buildings can only be placed adjacent to roads.
 */

export interface RoadTile {
  x: number;
  z: number;
  connections: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
}

export class RoadGrid {
  private tiles: Map<string, RoadTile>;

  constructor() {
    this.tiles = new Map();
  }

  private getKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  /**
   * Get a road tile at the given grid coordinates.
   */
  getTile(x: number, z: number): RoadTile | undefined {
    return this.tiles.get(this.getKey(x, z));
  }

  /**
   * Check if a road tile exists at the given coordinates.
   */
  hasTile(x: number, z: number): boolean {
    return this.tiles.has(this.getKey(x, z));
  }

  /**
   * Place a road tile at the given grid coordinates.
   * Updates connectivity with neighboring tiles.
   */
  placeRoad(x: number, z: number): RoadTile {
    const key = this.getKey(x, z);
    
    // Skip if road already exists
    if (this.tiles.has(key)) {
      return this.tiles.get(key)!;
    }

    // Create new tile with no connections initially
    const tile: RoadTile = {
      x,
      z,
      connections: {
        north: false,
        south: false,
        east: false,
        west: false,
      },
    };

    this.tiles.set(key, tile);

    // Update connectivity with neighbors
    this.updateConnections(x, z);

    return tile;
  }

  /**
   * Update connectivity between a tile and its neighbors.
   */
  private updateConnections(x: number, z: number): void {
    const directions = [
      { dir: 'north' as const, opposite: 'south' as const, dx: 0, dz: -1 },
      { dir: 'south' as const, opposite: 'north' as const, dx: 0, dz: 1 },
      { dir: 'east' as const, opposite: 'west' as const, dx: 1, dz: 0 },
      { dir: 'west' as const, opposite: 'east' as const, dx: -1, dz: 0 },
    ];

    const currentTile = this.getTile(x, z);
    if (!currentTile) return;

    for (const { dir, opposite, dx, dz } of directions) {
      const neighbor = this.getTile(x + dx, z + dz);
      if (neighbor) {
        currentTile.connections[dir] = true;
        neighbor.connections[opposite] = true;
      }
    }
  }

  /**
   * Get all road tiles.
   */
  getAllTiles(): RoadTile[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Get the total number of road tiles.
   */
  get count(): number {
    return this.tiles.size;
  }

  /**
   * Remove a road tile and update neighbor connections.
   */
  removeRoad(x: number, z: number): boolean {
    const key = this.getKey(x, z);
    if (!this.tiles.has(key)) {
      return false;
    }

    this.tiles.delete(key);
    this.updateConnections(x, z);
    return true;
  }

  /**
   * Check if two points are connected via roads (for pathfinding).
   */
  isConnected(x1: number, z1: number, x2: number, z2: number): boolean {
    if (!this.hasTile(x1, z1) || !this.hasTile(x2, z2)) {
      return false;
    }

    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[x1, z1]];

    while (queue.length > 0) {
      const [cx, cz] = queue.shift()!;
      const key = this.getKey(cx, cz);

      if (visited.has(key)) continue;
      visited.add(key);

      if (cx === x2 && cz === z2) {
        return true;
      }

      const tile = this.getTile(cx, cz);
      if (!tile) continue;

      const directions = [
        { dir: 'north' as const, dx: 0, dz: -1 },
        { dir: 'south' as const, dx: 0, dz: 1 },
        { dir: 'east' as const, dx: 1, dz: 0 },
        { dir: 'west' as const, dx: -1, dz: 0 },
      ];

      for (const { dir, dx, dz } of directions) {
        if (tile.connections[dir]) {
          queue.push([cx + dx, cz + dz]);
        }
      }
    }

    return false;
  }
}