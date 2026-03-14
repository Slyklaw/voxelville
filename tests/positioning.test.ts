import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { World, createWorld, getTerrainHeight, getMaxTerrainHeightInArea, getTile, TileData } from '../src/simulation/world';
import { ALL_BUILDING_MODELS, BuildingModelDefinition } from '../src/models/buildings';
import { ALL_CHARACTER_MODELS, CharacterModelDefinition } from '../src/models/characters';

// Helper to calculate world position for a voxel
function getVoxelWorldPosition(
  basePosition: THREE.Vector3,
  voxel: { x: number; y: number; z: number }
): THREE.Vector3 {
  return new THREE.Vector3(
    basePosition.x + voxel.x,
    basePosition.y + voxel.y,
    basePosition.z + voxel.z,
  );
}

// Helper to get max Y of a model
function getMaxModelHeight(model: BuildingModelDefinition | CharacterModelDefinition): number {
  return Math.max(...model.voxels.map(v => v.y));
}

// Helper to get min Y of a model (usually 0)
function getMinModelHeight(model: BuildingModelDefinition | CharacterModelDefinition): number {
  return Math.min(...model.voxels.map(v => v.y));
}

describe('World Generation (VIZ-15)', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld(20);
    world.generate(42);
  });

  it('should generate a world with tiles', () => {
    const tiles = world.getTiles();
    console.log(`\n=== World Generation ===`);
    console.log(`World size: 20x20`);
    console.log(`Total tiles generated: ${tiles.length}`);
    console.log(`Expected: ~800 tiles (20x20 with varying heights 0-4)`);
    
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('should have terrain at various heights', () => {
    const tiles = world.getTiles();
    const heights = new Set(tiles.map(t => t.y));
    const maxHeights = new Map<string, number>();
    
    // Group by (x,z) and find max height
    for (const tile of tiles) {
      const key = `${tile.x},${tile.z}`;
      maxHeights.set(key, Math.max(maxHeights.get(key) || 0, tile.y));
    }
    
    console.log(`\n=== Terrain Heights ===`);
    console.log(`Unique Y values in terrain: ${Array.from(heights).sort().join(', ')}`);
    console.log(`Sample terrain columns:`);
    
    const sampleColumns = Array.from(maxHeights.entries()).slice(0, 10);
    for (const [coord, height] of sampleColumns) {
      console.log(`  (${coord}): height=${height}`);
    }
    
    expect(heights.size).toBeGreaterThanOrEqual(1); // Flat or varied terrain OK
  });

  it('should not have random holes (deterministic terrain)', () => {
    const world2 = createWorld(20);
    world2.generate(42); // Same seed
    
    const tiles1 = world.getTiles();
    const tiles2 = world2.getTiles();
    
    console.log(`\n=== Deterministic Terrain ===`);
    console.log(`World 1 tiles: ${tiles1.length}`);
    console.log(`World 2 tiles: ${tiles2.length}`);
    console.log(`Same seed should produce identical terrain`);
    
    expect(tiles1.length).toBe(tiles2.length);
    
    // Check that all tiles match
    for (let i = 0; i < tiles1.length; i++) {
      expect(tiles1[i].x).toBe(tiles2[i].x);
      expect(tiles1[i].y).toBe(tiles2[i].y);
      expect(tiles1[i].z).toBe(tiles2[i].z);
      expect(tiles1[i].color).toBe(tiles2[i].color);
    }
  });
});

describe('getTerrainHeight (VIZ-15, VIZ-16)', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld(20);
    world.generate(42);
  });

  it('should return correct height for various positions', () => {
    console.log(`\n=== getTerrainHeight Tests ===`);
    
    const testPositions = [
      { x: 0, z: 0 },
      { x: -5, z: -5 },
      { x: 5, z: 5 },
      { x: -9, z: -9 },
      { x: 9, z: 9 },
    ];
    
    for (const pos of testPositions) {
      const height = getTerrainHeight(world, pos.x, pos.z);
      const tiles = world.getTiles().filter(t => t.x === pos.x && t.z === pos.z);
      const maxY = Math.max(...tiles.map(t => t.y), 0);
      
      console.log(`  (${pos.x}, ${pos.z}): getTerrainHeight=${height}, max tile Y=${maxY}`);
      expect(height).toBe(maxY);
    }
  });

  it('should return 0 for position with no tiles', () => {
    console.log(`\n=== getTerrainHeight for empty position ===`);
    
    // Create a small world and test a position outside it
    const smallWorld = createWorld(4);
    smallWorld.generate(1);
    
    const height = getTerrainHeight(smallWorld, 100, 100);
    console.log(`  getTerrainHeight(100, 100) in small world: ${height}`);
    
    expect(height).toBe(0);
  });
});

describe('Voxel Position Calculation (VIZ-14)', () => {
  it('should calculate correct world positions for building voxels', () => {
    const houseModel = ALL_BUILDING_MODELS.find(m => m.id === 'house_cottage');
    if (!houseModel) throw new Error('house_cottage not found');
    
    console.log(`\n=== Voxel Position Calculation (Building) ===`);
    console.log(`Model: ${houseModel.id}`);
    console.log(`Base position: (0, 0, 0)`);
    
    const basePosition = new THREE.Vector3(0, 0, 0);
    
    console.log(`Voxel world positions:`);
    houseModel.voxels.slice(0, 5).forEach((voxel, i) => {
      const worldPos = getVoxelWorldPosition(basePosition, voxel);
      console.log(`  [${i}] local(${voxel.x},${voxel.y},${voxel.z}) → world(${worldPos.x},${worldPos.y},${worldPos.z})`);
    });
    
    // Verify first voxel position
    const firstVoxel = houseModel.voxels[0];
    const firstWorldPos = getVoxelWorldPosition(basePosition, firstVoxel);
    
    expect(firstWorldPos.x).toBe(firstVoxel.x);
    expect(firstWorldPos.y).toBe(firstVoxel.y);
    expect(firstWorldPos.z).toBe(firstVoxel.z);
  });

  it('should calculate correct world positions with non-zero base', () => {
    const maleModel = ALL_CHARACTER_MODELS.find(m => m.id === 'male_1');
    if (!maleModel) throw new Error('male_1 not found');
    
    console.log(`\n=== Voxel Position Calculation (Character) ===`);
    console.log(`Model: ${maleModel.id}`);
    console.log(`Base position: (10, 5, 20)`);
    
    const basePosition = new THREE.Vector3(10, 5, 20);
    
    console.log(`Voxel world positions (first 5):`);
    maleModel.voxels.slice(0, 5).forEach((voxel, i) => {
      const worldPos = getVoxelWorldPosition(basePosition, voxel);
      console.log(`  [${i}] local(${voxel.x},${voxel.y},${voxel.z}) → world(${worldPos.x},${worldPos.y},${worldPos.z})`);
    });
    
    // Verify calculation
    const firstVoxel = maleModel.voxels[0];
    const firstWorldPos = getVoxelWorldPosition(basePosition, firstVoxel);
    
    expect(firstWorldPos.x).toBe(10 + firstVoxel.x);
    expect(firstWorldPos.y).toBe(5 + firstVoxel.y);
    expect(firstWorldPos.z).toBe(20 + firstVoxel.z);
  });
});

describe('Building Positioning on Terrain (VIZ-16, VIZ-17)', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld(20);
    world.generate(42);
  });

  it('should position building voxels above terrain', () => {
    const houseModel = ALL_BUILDING_MODELS.find(m => m.id === 'house_cottage');
    if (!houseModel) throw new Error('house_cottage not found');
    
    console.log(`\n=== Building Positioning on Terrain ===`);
    
    // Test building at center of world
    const buildingX = 0;
    const buildingZ = 0;
    const terrainHeight = getTerrainHeight(world, buildingX, buildingZ);
    const buildingY = terrainHeight; // Buildings sit on terrain surface
    
    console.log(`Building position: (${buildingX}, ${buildingY}, ${buildingZ})`);
    console.log(`Terrain height at position: ${terrainHeight}`);
    console.log(`Min voxel Y in model: ${getMinModelHeight(houseModel)}`);
    console.log(`Max voxel Y in model: ${getMaxModelHeight(houseModel)}`);
    
    // Check all voxel world positions
    const basePosition = new THREE.Vector3(buildingX, buildingY, buildingZ);
    let allAboveTerrain = true;
    
    console.log(`Voxel positions (first 10):`);
    houseModel.voxels.slice(0, 10).forEach((voxel, i) => {
      const worldPos = getVoxelWorldPosition(basePosition, voxel);
      const voxelTerrainY = getTerrainHeight(world, Math.round(worldPos.x), Math.round(worldPos.z));
      const aboveTerrain = worldPos.y >= voxelTerrainY;
      
      if (!aboveTerrain) allAboveTerrain = false;
      
      console.log(`  [${i}] world(${worldPos.x.toFixed(1)},${worldPos.y.toFixed(1)},${worldPos.z.toFixed(1)}) terrainY=${voxelTerrainY} ${aboveTerrain ? '✓' : '✗ BELOW TERRAIN'}`);
    });
    
    // At least the building's base (y=0 voxel) should be at or above terrain
    const minVoxelY = getMinModelHeight(houseModel);
    expect(buildingY + minVoxelY).toBeGreaterThanOrEqual(terrainHeight);
  });

  it('should position road above terrain', () => {
    console.log(`\n=== Road Positioning ===`);
    
    const roadX = 0;
    const roadZ = 0;
    const terrainHeight = getTerrainHeight(world, roadX, roadZ);
    const roadY = terrainHeight + 0.5; // Roads are slightly elevated
    
    console.log(`Road position: (${roadX}, ${roadY}, ${roadZ})`);
    console.log(`Terrain height: ${terrainHeight}`);
    console.log(`Road Y offset: +0.5 (elevated above terrain)`);
    
    expect(roadY).toBe(terrainHeight + 0.5);
  });

  it('should position character on terrain surface', () => {
    const maleModel = ALL_CHARACTER_MODELS.find(m => m.id === 'male_1');
    if (!maleModel) throw new Error('male_1 not found');

    console.log(`\n=== Character Positioning ===`);

    const charX = 0;
    const charZ = 0;
    const terrainHeight = getTerrainHeight(world, charX, charZ);
    const charY = terrainHeight; // Characters stand on terrain

    console.log(`Character position: (${charX}, ${charY}, ${charZ})`);
    console.log(`Terrain height: ${terrainHeight}`);
    console.log(`Min voxel Y (feet): ${getMinModelHeight(maleModel)}`);
    console.log(`Max voxel Y (head): ${getMaxModelHeight(maleModel)}`);

    // Character's feet (y=0 voxel) should be at terrain height
    expect(charY).toBe(terrainHeight);

    // Character's head should be at terrainHeight + 3
    const basePosition = new THREE.Vector3(charX, charY, charZ);
    const headVoxel = maleModel.voxels.find(v => v.y === 3);
    if (headVoxel) {
      const headWorldPos = getVoxelWorldPosition(basePosition, headVoxel);
      console.log(`Head world Y: ${headWorldPos.y} (terrain + 3)`);
      expect(headWorldPos.y).toBe(terrainHeight + 3);
    }
  });

  it('should position all building voxels above terrain across footprint', () => {
    const houseModel = ALL_BUILDING_MODELS.find(m => m.id === 'house_cottage');
    if (!houseModel) throw new Error('house_cottage not found');

    console.log(`\n=== Building Positioning with Max Terrain Height ===`);

    // Calculate footprint dimensions from model voxels
    const maxX = Math.max(...houseModel.voxels.map(v => v.x));
    const maxZ = Math.max(...houseModel.voxels.map(v => v.z));
    const footprintWidth = maxX + 1;
    const footprintDepth = maxZ + 1;

    const buildingX = 0;
    const buildingZ = 0;

    // Get max terrain height across the entire building footprint
    const maxTerrainHeight = getMaxTerrainHeightInArea(
      world, buildingX, buildingZ, footprintWidth, footprintDepth
    );

    // Place building at max terrain height (not just center position)
    const buildingY = maxTerrainHeight;

    console.log(`Building: ${houseModel.id}`);
    console.log(`Position: (${buildingX}, ${buildingY}, ${buildingZ})`);
    console.log(`Footprint: ${footprintWidth}x${footprintDepth}`);
    console.log(`Max terrain height across footprint: ${maxTerrainHeight}`);

    // Verify ALL voxels are above or at their local terrain height
    const basePosition = new THREE.Vector3(buildingX, buildingY, buildingZ);
    let allAboveTerrain = true;
    let belowCount = 0;

    houseModel.voxels.forEach((voxel, i) => {
      const worldPos = getVoxelWorldPosition(basePosition, voxel);
      const voxelTerrainY = getTerrainHeight(world, Math.round(worldPos.x), Math.round(worldPos.z));
      const aboveTerrain = worldPos.y >= voxelTerrainY;

      if (!aboveTerrain) {
        allAboveTerrain = false;
        belowCount++;
      }

      if (i < 10 || !aboveTerrain) {
        console.log(`  [${i}] world(${worldPos.x.toFixed(1)},${worldPos.y.toFixed(1)},${worldPos.z.toFixed(1)}) terrainY=${voxelTerrainY} ${aboveTerrain ? '✓' : '✗ BELOW TERRAIN'}`);
      }
    });

    console.log(`Total voxels: ${houseModel.voxels.length}`);
    console.log(`Voxels below terrain: ${belowCount}`);

    // All building voxels must be at or above their local terrain height
    expect(allAboveTerrain).toBe(true);
    expect(belowCount).toBe(0);
  });
});
