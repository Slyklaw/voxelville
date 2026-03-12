import * as THREE from 'three';
import { InstancedPool } from './instancing';
import { getMaterial } from './materials';
import { getVoxelGeometry } from './voxel-mesh';
import { ALL_CHARACTER_MODELS } from '../models/characters';

export class CharacterRenderer {
  private scene: THREE.Scene;
  private pools: Map<string, InstancedPool>;
  private instanceIndices: Map<string, Map<number, number>>;
  private geometry: THREE.BoxGeometry;
  private dummy: THREE.Object3D;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pools = new Map();
    this.instanceIndices = new Map();
    this.geometry = getVoxelGeometry();
    this.dummy = new THREE.Object3D();

    this.initPools();
  }

  private initPools(): void {
    for (const model of ALL_CHARACTER_MODELS) {
      const primaryVoxel = model.voxels[0];
      const material = getMaterial(primaryVoxel.color);
      if (!material) {
        console.warn(`Material not found for model ${model.id}: ${primaryVoxel.color}`);
        continue;
      }

      const pool = new InstancedPool(this.geometry, material, 50);
      this.scene.add(pool.meshInstance);
      this.pools.set(model.id, pool);
      this.instanceIndices.set(model.id, new Map());
    }
  }

  /**
   * Add a character instance to the specified model's pool.
   * @param modelId - The character model ID (e.g., 'male_1', 'child_3')
   * @param position - World position for the character
   * @returns Instance index for later updates
   */
  addCharacter(modelId: string, position: THREE.Vector3): number {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const index = pool.addInstance(position);
    const indices = this.instanceIndices.get(modelId)!;
    indices.set(index, (indices.get(index) || 0) + 1);
    return index;
  }

  /**
   * Update a character instance's position.
   * @param modelId - The character model ID
   * @param index - Instance index returned from addCharacter
   * @param position - New world position
   */
  updateCharacter(modelId: string, index: number, position: THREE.Vector3): void {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    pool.updateInstance(index, position);
  }

  /**
   * Update a character instance with position and rotation.
   * @param modelId - The character model ID
   * @param index - Instance index returned from addCharacter
   * @param position - New world position
   * @param rotation - Optional Euler rotation (for animation)
   */
  updateCharacterWithRotation(
    modelId: string,
    index: number,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
  ): void {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    this.dummy.position.copy(position);
    this.dummy.scale.set(1, 1, 1);
    if (rotation) {
      this.dummy.rotation.copy(rotation);
    }
    this.dummy.updateMatrix();
    pool.meshInstance.setMatrixAt(index, this.dummy.matrix);
    pool.meshInstance.instanceMatrix.needsUpdate = true;
  }

  /**
   * Get the pool for a specific model.
   * @param modelId - The character model ID
   * @returns The InstancedPool for this model
   */
  getPool(modelId: string): InstancedPool | undefined {
    return this.pools.get(modelId);
  }

  /**
   * Clear all character instances from all pools.
   */
  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    for (const indices of this.instanceIndices.values()) {
      indices.clear();
    }
  }

  /**
   * Dispose all pools and remove from scene.
   */
  dispose(): void {
    for (const pool of this.pools.values()) {
      this.scene.remove(pool.meshInstance);
      pool.dispose();
    }
    this.pools.clear();
    this.instanceIndices.clear();
  }

  /**
   * Get all pool meshes for rendering.
   * @returns Array of InstancedMesh objects
   */
  getMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.pools.values()).map(pool => pool.meshInstance);
  }
}
