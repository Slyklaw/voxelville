import * as THREE from 'three';
import { RoadGrid } from './road-grid';

/**
 * Pathfinding configuration
 */
export const PATHFINDING_CONFIG = {
  maxIterationsPerTick: 100,  // Time-slicing limit
  cacheTTL: 1000,             // Cache paths for 1 second (4 ticks)
  heuristicWeight: 1.2,       // A* heuristic weight (1 = optimal, >1 = faster)
};

/**
 * Path cache entry
 */
interface PathCacheEntry {
  path: THREE.Vector3[];
  timestamp: number;
  ttl: number;
}

/**
 * Path cache for avoiding recalculation
 * Key: "startX,startZ-endX,endZ"
 */
export class PathCache {
  private cache: Map<string, PathCacheEntry>;

  constructor() {
    this.cache = new Map();
  }

  private getKey(start: { x: number; z: number }, end: { x: number; z: number }): string {
    return `${start.x},${start.z}-${end.x},${end.z}`;
  }

  get(start: { x: number; z: number }, end: { x: number; z: number }, tick: number): THREE.Vector3[] | null {
    const key = this.getKey(start, end);
    const entry = this.cache.get(key);

    if (entry && tick - entry.timestamp < entry.ttl) {
      return entry.path;
    }

    return null;
  }

  set(start: { x: number; z: number }, end: { x: number; z: number }, path: THREE.Vector3[], tick: number): void {
    const key = this.getKey(start, end);
    this.cache.set(key, {
      path,
      timestamp: tick,
      ttl: PATHFINDING_CONFIG.cacheTTL,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * A* pathfinder using RoadGrid
 * Supports time-slicing (limited iterations per call)
 */
export class Pathfinder {
  private roadGrid: RoadGrid;
  private pathCache: PathCache;
  private tick: number;

  constructor(roadGrid: RoadGrid) {
    this.roadGrid = roadGrid;
    this.pathCache = new PathCache();
    this.tick = 0;
  }

  /**
   * Find path from start to end using A*
   * @param start - Start position (grid coordinates)
   * @param end - End position (grid coordinates)
   * @returns Array of Vector3 positions along path, or null if no path
   */
  findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] | null {
    this.tick++;

    const startKey = { x: Math.round(start.x), z: Math.round(start.z) };
    const endKey = { x: Math.round(end.x), z: Math.round(end.z) };

    // Check if start and end are on road tiles
    if (!this.roadGrid.hasTile(startKey.x, startKey.z) || !this.roadGrid.hasTile(endKey.x, endKey.z)) {
      return null;
    }

    // Check cache first
    const cached = this.pathCache.get(startKey, endKey, this.tick);
    if (cached) return cached;

    // Compute new path
    const path = this.computePath(startKey, endKey);
    if (path) {
      this.pathCache.set(startKey, endKey, path, this.tick);
    }

    return path;
  }

  /**
   * Clear path cache (call when road network changes)
   */
  clearCache(): void {
    this.pathCache.clear();
  }

  /**
   * Get current tick
   */
  get currentTick(): number {
    return this.tick;
  }

  /**
   * Get cache size for debugging
   */
  get cacheSize(): number {
    return this.pathCache.size;
  }

  /**
   * A* pathfinding with time-slicing
   * Limited to maxIterationsPerTick to avoid blocking
   */
  private computePath(start: { x: number; z: number }, end: { x: number; z: number }): THREE.Vector3[] | null {
    const openSet: Array<{
      x: number;
      z: number;
      g: number;
      h: number;
      f: number;
      parent: { x: number; z: number } | null;
    }> = [];

    const closedSet = new Set<string>();
    const cameFrom = new Map<string, { x: number; z: number }>();

    // Start node
    const startNode = {
      x: start.x,
      z: start.z,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null,
    };
    openSet.push(startNode);

    let iterations = 0;
    while (openSet.length > 0 && iterations < PATHFINDING_CONFIG.maxIterationsPerTick) {
      iterations++;

      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.z}`;

      // Check if we reached the end
      if (current.x === end.x && current.z === end.z) {
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(currentKey);

      // Check neighbors
      const neighbors = this.getNeighbors(current.x, current.z);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.z}`;

        // Skip if in closed set
        if (closedSet.has(neighborKey)) continue;

        // Calculate new g score
        const tentativeG = current.g + 1;  // Cost = 1 for all moves

        // Check if this path is better
        const existingNode = openSet.find(n => n.x === neighbor.x && n.z === neighbor.z);
        if (!existingNode || tentativeG < existingNode.g) {
          cameFrom.set(neighborKey, { x: current.x, z: current.z });
          const h = this.heuristic(neighbor, end);

          if (existingNode) {
            existingNode.g = tentativeG;
            existingNode.f = tentativeG + h;
          } else {
            openSet.push({
              x: neighbor.x,
              z: neighbor.z,
              g: tentativeG,
              h,
              f: tentativeG + h,
              parent: { x: current.x, z: current.z },
            });
          }
        }
      }
    }

    // No path found within iteration limit
    return null;
  }

  /**
   * Heuristic: Manhattan distance with weight
   */
  private heuristic(a: { x: number; z: number }, b: { x: number; z: number }): number {
    return (Math.abs(a.x - b.x) + Math.abs(a.z - b.z)) * PATHFINDING_CONFIG.heuristicWeight;
  }

  /**
   * Get walkable neighbors (connected roads)
   */
  private getNeighbors(x: number, z: number): Array<{ x: number; z: number }> {
    const neighbors: Array<{ x: number; z: number }> = [];

    const directions = [
      { dx: 0, dz: -1, dir: 'north' as const },
      { dx: 0, dz: 1, dir: 'south' as const },
      { dx: 1, dz: 0, dir: 'east' as const },
      { dx: -1, dz: 0, dir: 'west' as const },
    ];

    const tile = this.roadGrid.getTile(x, z);
    if (!tile) return neighbors;

    for (const { dx, dz, dir } of directions) {
      if (tile.connections[dir]) {
        neighbors.push({ x: x + dx, z: z + dz });
      }
    }

    return neighbors;
  }

  /**
   * Reconstruct path from cameFrom map
   */
  private reconstructPath(
    cameFrom: Map<string, { x: number; z: number }>,
    current: { x: number; z: number },
  ): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    let node: { x: number; z: number } | undefined = current;

    while (node) {
      path.unshift(new THREE.Vector3(node.x, 0, node.z));
      node = cameFrom.get(`${node.x},${node.z}`);
    }

    return path;
  }
}
