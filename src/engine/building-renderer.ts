import * as THREE from 'three';
import { InstancedPool } from './instancing';
import { getMaterial } from './materials';
import { getVoxelGeometry } from './voxel-mesh';
import { ALL_BUILDING_MODELS } from '../models/buildings';

// Maximum number of instances per building type
const MAX_INSTANCES_PER_BUILDING = 10;

/**
 * Convert a material name to THREE.Color for per-instance coloring
 */
function materialToColor(colorName: string): THREE.Color {
  const material = getMaterial(colorName);
  return material ? new THREE.Color(material.color) : new THREE.Color(0xffffff);
}

export class BuildingRenderer {
  private scene: THREE.Scene;
  private pools: Map<string, InstancedPool>;
  private instanceIndices: Map<string, Map<number, number>>;
  private geometry: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pools = new Map();
    this.instanceIndices = new Map();
    this.geometry = getVoxelGeometry();

    this.initPools();
  }

  private initPools(): void {
    // Create neutral white material for all pools
    // Individual voxel colors will be set via setColorAt()
    const neutralMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
    });

    for (const model of ALL_BUILDING_MODELS) {
      // Pool size = voxels per model * max instances
      const poolSize = model.voxels.length * MAX_INSTANCES_PER_BUILDING;

      const pool = new InstancedPool(this.geometry, neutralMaterial, poolSize, { withColors: true });
      this.scene.add(pool.meshInstance);
      this.pools.set(model.id, pool);
      this.instanceIndices.set(model.id, new Map());
    }
  }

  addBuilding(modelId: string, position: THREE.Vector3): number {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Get model from ALL_BUILDING_MODELS
    const model = ALL_BUILDING_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model definition not found: ${modelId}`);
    }

    const indices = this.instanceIndices.get(modelId)!;

    // Track the first instance index (for compatibility with existing callers)
    let firstIndex = -1;

    // Add each voxel as a separate instance with its correct color
    for (const voxel of model.voxels) {
      // Calculate world position: base position + voxel offset
      const worldPos = new THREE.Vector3(
        position.x + voxel.x,
        position.y + voxel.y,
        position.z + voxel.z,
      );

      // Add instance at voxel position
      const instanceIndex = pool.addInstance(worldPos);

      // Set per-instance color from voxel material
      const color = materialToColor(voxel.color);
      pool.meshInstance.setColorAt(instanceIndex, color);
      pool.meshInstance.instanceColor!.needsUpdate = true;

      // Track instance index
      indices.set(instanceIndex, (indices.get(instanceIndex) || 0) + 1);

      if (firstIndex === -1) {
        firstIndex = instanceIndex;
      }
    }

    return firstIndex;
  }

  updateBuilding(modelId: string, index: number, position: THREE.Vector3): void {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const model = ALL_BUILDING_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model definition not found: ${modelId}`);
    }

    // Update all voxel instances for this building
    // The index parameter is the first instance index
    for (let i = 0; i < model.voxels.length; i++) {
      const voxel = model.voxels[i];
      const worldPos = new THREE.Vector3(
        position.x + voxel.x,
        position.y + voxel.y,
        position.z + voxel.z,
      );
      pool.updateInstance(index + i, worldPos);
    }
  }

  getPool(modelId: string): InstancedPool | undefined {
    return this.pools.get(modelId);
  }

  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    for (const indices of this.instanceIndices.values()) {
      indices.clear();
    }
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      this.scene.remove(pool.meshInstance);
      pool.dispose();
    }
    this.pools.clear();
    this.instanceIndices.clear();
  }

  getMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.pools.values()).map(pool => pool.meshInstance);
  }
}
