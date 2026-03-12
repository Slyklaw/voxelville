import * as THREE from 'three';
import { RoadGrid } from './road-grid';
import { BuildingRenderer } from '../engine/building-renderer';
import { ALL_BUILDING_MODELS } from '../models/buildings';
import { World, getTerrainHeight } from './world';

// Building grid to track placed buildings: key is "x,z", value is modelId
const buildingGrid = new Map<string, string>();

/**
 * Check if a building can be placed at the given grid coordinates.
 * 
 * Rules:
 * 1. Building footprint must be empty (no existing building or road)
 * 2. At least one cell in the footprint must be adjacent to a road tile
 * 
 * @param gridX Grid X coordinate
 * @param gridZ Grid Z coordinate
 * @param roadGrid The road grid to check adjacency
 * @param buildingSize Optional building footprint [width, depth], defaults to [1, 1]
 * @returns true if the building can be placed
 */
export function canPlaceBuilding(
  gridX: number,
  gridZ: number,
  roadGrid: RoadGrid,
  buildingSize: [number, number] = [1, 1],
): boolean {
  const [width, depth] = buildingSize;

  // Check each cell in the footprint
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      const x = gridX + dx;
      const z = gridZ + dz;

      // Check if cell is occupied by a building
      if (buildingGrid.has(`${x},${z}`)) {
        return false;
      }

      // Check if cell is occupied by a road
      if (roadGrid.hasTile(x, z)) {
        return false;
      }
    }
  }

  // Check that at least one cell in the footprint is adjacent to a road
  let adjacentToRoad = false;
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      const x = gridX + dx;
      const z = gridZ + dz;

      // Check adjacent cells (N/S/E/W)
      const directions = [
        { dx: 0, dz: -1 }, // north
        { dx: 0, dz: 1 },  // south
        { dx: 1, dz: 0 },  // east
        { dx: -1, dz: 0 }, // west
      ];

      for (const { dx: adx, dz: adz } of directions) {
        if (roadGrid.hasTile(x + adx, z + adz)) {
          adjacentToRoad = true;
          break;
        }
      }

      if (adjacentToRoad) break;
    }
    if (adjacentToRoad) break;
  }

  return adjacentToRoad;
}

/**
 * Place a building at the given grid coordinates.
 * 
 * @param gridX Grid X coordinate
 * @param gridZ Grid Z coordinate
 * @param modelId The building model ID
 * @param buildingRenderer The BuildingRenderer to add the building to
 * @param roadGrid The road grid to check adjacency
 * @param buildingSize Optional building footprint [width, depth]
 * @param world Optional World for terrain height lookup
 * @returns The instance index if placed, -1 if placement failed
 */
export function placeBuilding(
  gridX: number,
  gridZ: number,
  modelId: string,
  buildingRenderer: BuildingRenderer,
  roadGrid: RoadGrid,
  buildingSize?: [number, number],
  world?: World,
): number {
  // Get building size from model if not provided
  let size = buildingSize;
  if (!size) {
    const model = ALL_BUILDING_MODELS.find(m => m.id === modelId);
    if (model) {
      size = [model.size[0], model.size[2]]; // width, depth
    } else {
      size = [1, 1];
    }
  }

  // Check if placement is allowed
  if (!canPlaceBuilding(gridX, gridZ, roadGrid, size)) {
    return -1;
  }

  // Convert grid coordinates to world coordinates
  const worldX = gridX;
  const worldZ = gridZ;
  // Use terrain height if world provided, otherwise fall back to y=1
  const worldY = world ? getTerrainHeight(world, worldX, worldZ) : 1;
  const position = new THREE.Vector3(worldX, worldY, worldZ);

  // Add building to renderer
  const instanceIndex = buildingRenderer.addBuilding(modelId, position);

  // Track placement in building grid
  const [width, depth] = size;
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      const x = gridX + dx;
      const z = gridZ + dz;
      buildingGrid.set(`${x},${z}`, modelId);
    }
  }

  return instanceIndex;
}

/**
 * Get all placed buildings.
 */
export function getPlacedBuildings(): Array<{ x: number; z: number; modelId: string }> {
  const buildings: Array<{ x: number; z: number; modelId: string }> = [];
  for (const [key, modelId] of buildingGrid) {
    const [x, z] = key.split(',').map(Number);
    buildings.push({ x, z, modelId });
  }
  return buildings;
}

/**
 * Remove a building from the grid.
 */
export function removeBuilding(gridX: number, gridZ: number): boolean {
  const key = `${gridX},${gridZ}`;
  if (!buildingGrid.has(key)) {
    return false;
  }

  // Get the building model to know its size
  const modelId = buildingGrid.get(key);
  const model = ALL_BUILDING_MODELS.find(m => m.id === modelId);
  if (!model) return false;

  // Remove all cells of the building
  const [width, depth] = model.size;
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      buildingGrid.delete(`${gridX + dx},${gridZ + dz}`);
    }
  }

  return true;
}

/**
 * Clear all buildings from the grid.
 */
export function clearBuildings(): void {
  buildingGrid.clear();
}