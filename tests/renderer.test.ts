import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingRenderer } from '../src/engine/building-renderer';
import { CharacterRenderer } from '../src/engine/character-renderer';
import { ALL_BUILDING_MODELS, BuildingModelDefinition } from '../src/models/buildings';
import { ALL_CHARACTER_MODELS, CharacterModelDefinition } from '../src/models/characters';
import { InstancedPool } from '../src/engine/instancing';

// Create a mock scene for testing
function createMockScene(): THREE.Scene {
  return new THREE.Scene();
}

describe('BuildingRenderer (VIZ-10, VIZ-11, VIZ-13)', () => {
  let scene: THREE.Scene;
  let renderer: BuildingRenderer;

  beforeEach(() => {
    scene = createMockScene();
    renderer = new BuildingRenderer(scene);
  });

  describe('Pool initialization', () => {
    it('should create one pool per building model', () => {
      console.log('\n=== BuildingRenderer Pool Init ===');
      console.log(`Total building models: ${ALL_BUILDING_MODELS.length}`);
      
      // Check that each model has a pool
      for (const model of ALL_BUILDING_MODELS) {
        const pool = renderer.getPool(model.id);
        console.log(`  Pool for ${model.id}: ${pool ? 'exists' : 'MISSING'}`);
        expect(pool).toBeDefined();
      }
    });
  });

  describe('addBuilding (VIZ-10, VIZ-13)', () => {
    it('should create correct number of instances for a house', () => {
      const houseModel = ALL_BUILDING_MODELS.find(m => m.id === 'house_cottage');
      if (!houseModel) throw new Error('house_cottage not found');
      
      console.log(`\n=== Testing house_cottage ===`);
      console.log(`Model voxel count: ${houseModel.voxels.length}`);
      console.log(`Expected instances after addBuilding: ${houseModel.voxels.length}`);
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addBuilding('house_cottage', position);
      
      const pool = renderer.getPool('house_cottage');
      console.log(`Actual instance count: ${pool?.count}`);
      
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(pool?.count).toBe(houseModel.voxels.length);
    });

    it('should create correct number of instances for an office', () => {
      const officeModel = ALL_BUILDING_MODELS.find(m => m.id === 'office_small');
      if (!officeModel) throw new Error('office_small not found');
      
      console.log(`\n=== Testing office_small ===`);
      console.log(`Model voxel count: ${officeModel.voxels.length}`);
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addBuilding('office_small', position);
      
      const pool = renderer.getPool('office_small');
      console.log(`Actual instance count: ${pool?.count}`);
      
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(pool?.count).toBe(officeModel.voxels.length);
    });

    it('should create 1 instance for a road tile', () => {
      console.log(`\n=== Testing road_tile ===`);
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addBuilding('road_tile', position);
      
      const pool = renderer.getPool('road_tile');
      console.log(`Model voxel count: 1`);
      console.log(`Actual instance count: ${pool?.count}`);
      
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(pool?.count).toBe(1);
    });

    it('should return consistent first instance index', () => {
      console.log(`\n=== Testing first index consistency ===`);
      
      const pos1 = new THREE.Vector3(0, 0, 0);
      const pos2 = new THREE.Vector3(10, 0, 10);
      
      const index1 = renderer.addBuilding('house_cottage', pos1);
      const index2 = renderer.addBuilding('house_cottage', pos2);
      
      const houseModel = ALL_BUILDING_MODELS.find(m => m.id === 'house_cottage');
      console.log(`First building first index: ${index1}`);
      console.log(`Second building first index: ${index2}`);
      console.log(`Expected offset: ${houseModel?.voxels.length}`);
      
      // Second index should be exactly firstIndex + voxel count of first building
      expect(index2).toBe(index1 + (houseModel?.voxels.length || 0));
    });
  });

  describe('Color assignment (VIZ-13)', () => {
    it('should set per-instance colors when adding a building', () => {
      const houseModel = ALL_BUILDING_MODELS.find(m => m.id === 'house_cottage');
      if (!houseModel) throw new Error('house_cottage not found');
      
      console.log(`\n=== Testing color assignment for house_cottage ===`);
      console.log(`Model voxels:`);
      houseModel.voxels.forEach((v, i) => {
        console.log(`  [${i}] (${v.x},${v.y},${v.z}) color: ${v.color}`);
      });
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addBuilding('house_cottage', position);
      
      const pool = renderer.getPool('house_cottage');
      console.log(`\nPool instanceColor exists: ${!!pool?.meshInstance.instanceColor}`);
      console.log(`Pool count: ${pool?.count}`);
      
      // The pool should have instance colors enabled
      expect(pool?.meshInstance.instanceColor).toBeDefined();
    });
  });
});

describe('CharacterRenderer (VIZ-12, VIZ-13)', () => {
  let scene: THREE.Scene;
  let renderer: CharacterRenderer;

  beforeEach(() => {
    scene = createMockScene();
    renderer = new CharacterRenderer(scene);
  });

  describe('Pool initialization', () => {
    it('should create one pool per character model', () => {
      console.log('\n=== CharacterRenderer Pool Init ===');
      console.log(`Total character models: ${ALL_CHARACTER_MODELS.length}`);
      
      for (const model of ALL_CHARACTER_MODELS) {
        const pool = renderer.getPool(model.id);
        if (!pool) {
          console.log(`  Pool for ${model.id}: MISSING`);
        }
        expect(pool).toBeDefined();
      }
    });
  });

  describe('addCharacter (VIZ-12)', () => {
    it('should create 12 instances for a male character', () => {
      const maleModel = ALL_CHARACTER_MODELS.find(m => m.id === 'male_1');
      if (!maleModel) throw new Error('male_1 not found');
      
      console.log(`\n=== Testing male_1 ===`);
      console.log(`Model voxel count: ${maleModel.voxels.length}`);
      console.log(`Voxel structure:`);
      maleModel.voxels.forEach((v, i) => {
        console.log(`  [${i}] (${v.x},${v.y},${v.z}) color: ${v.color}`);
      });
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addCharacter('male_1', position);
      
      const pool = renderer.getPool('male_1');
      console.log(`\nActual instance count: ${pool?.count}`);
      
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(pool?.count).toBe(12);
    });

    it('should create 9 instances for a child character', () => {
      const childModel = ALL_CHARACTER_MODELS.find(m => m.id === 'child_1');
      if (!childModel) throw new Error('child_1 not found');
      
      console.log(`\n=== Testing child_1 ===`);
      console.log(`Model voxel count: ${childModel.voxels.length}`);
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addCharacter('child_1', position);
      
      const pool = renderer.getPool('child_1');
      console.log(`Actual instance count: ${pool?.count}`);
      
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(pool?.count).toBe(9);
    });

    it('should create multiple character instances', () => {
      console.log(`\n=== Testing multiple characters ===`);
      
      const pos1 = new THREE.Vector3(0, 0, 0);
      const pos2 = new THREE.Vector3(5, 0, 5);
      const pos3 = new THREE.Vector3(10, 0, 10);
      
      const idx1 = renderer.addCharacter('male_1', pos1);
      const idx2 = renderer.addCharacter('male_1', pos2);
      const idx3 = renderer.addCharacter('male_1', pos3);
      
      const pool = renderer.getPool('male_1');
      console.log(`Added 3 male_1 characters`);
      console.log(`Instance indices: ${idx1}, ${idx2}, ${idx3}`);
      console.log(`Total pool count: ${pool?.count}`);
      
      expect(pool?.count).toBe(36); // 3 characters × 12 voxels
    });
  });

  describe('Color assignment (VIZ-13)', () => {
    it('should set per-instance colors when adding a character', () => {
      const femaleModel = ALL_CHARACTER_MODELS.find(m => m.id === 'female_1');
      if (!femaleModel) throw new Error('female_1 not found');
      
      console.log(`\n=== Testing color assignment for female_1 ===`);
      console.log(`Model voxels:`);
      femaleModel.voxels.forEach((v, i) => {
        console.log(`  [${i}] (${v.x},${v.y},${v.z}) color: ${v.color}`);
      });
      
      const position = new THREE.Vector3(0, 0, 0);
      const firstIndex = renderer.addCharacter('female_1', position);
      
      const pool = renderer.getPool('female_1');
      console.log(`\nPool instanceColor exists: ${!!pool?.meshInstance.instanceColor}`);
      
      expect(pool?.meshInstance.instanceColor).toBeDefined();
    });
  });
});

describe('InstancedPool (VIZ-20)', () => {
  it('should properly update mesh count when instances are added', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    
    console.log(`\n=== InstancedPool Count Test ===`);
    
    const pool = new InstancedPool(geometry, material, 100);
    console.log(`Initial count: ${pool.count}`);
    expect(pool.count).toBe(0);
    
    pool.addInstance(new THREE.Vector3(0, 0, 0));
    console.log(`After addInstance: ${pool.count}`);
    expect(pool.count).toBe(1);
    
    pool.addInstance(new THREE.Vector3(1, 0, 0));
    console.log(`After second addInstance: ${pool.count}`);
    expect(pool.count).toBe(2);
    
    pool.clear();
    console.log(`After clear: ${pool.count}`);
    expect(pool.count).toBe(0);
    
    pool.dispose();
  });
});
