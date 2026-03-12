import * as THREE from 'three';
import { InstancedPool } from './instancing';
import { getMaterial } from './materials';
import { getVoxelGeometry } from './voxel-mesh';
import { ALL_BUILDING_MODELS } from '../models/buildings';

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
    for (const model of ALL_BUILDING_MODELS) {
      const primaryVoxel = model.voxels[0];
      const material = getMaterial(primaryVoxel.color);
      if (!material) {
        console.warn(`Material not found for building model ${model.id}: ${primaryVoxel.color}`);
        continue;
      }

      const pool = new InstancedPool(this.geometry, material, 20);
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

    const index = pool.addInstance(position);
    const indices = this.instanceIndices.get(modelId)!;
    indices.set(index, (indices.get(index) || 0) + 1);
    return index;
  }

  updateBuilding(modelId: string, index: number, position: THREE.Vector3): void {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    pool.updateInstance(index, position);
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