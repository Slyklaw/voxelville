import * as THREE from 'three';
import { InstancedPool } from './instancing';
import { getMaterial } from './materials';
import { getVoxelGeometry } from './voxel-mesh';
import { ALL_CHARACTER_MODELS } from '../models/characters';
import { CharacterRenderState, getAnimationOffset } from '../simulation/character-state';

// Maximum number of instances per character model variant
const MAX_INSTANCES_PER_MODEL = 50;

/**
 * Convert a material name to THREE.Color for per-instance coloring
 */
function materialToColor(colorName: string): THREE.Color {
  const material = getMaterial(colorName);
  return material ? new THREE.Color(material.color) : new THREE.Color(0xffffff);
}

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
    // Create neutral white material for all pools
    // Individual voxel colors will be set via setColorAt()
    const neutralMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
    });

    for (const model of ALL_CHARACTER_MODELS) {
      // Pool size = voxels per model * max instances
      const poolSize = model.voxels.length * MAX_INSTANCES_PER_MODEL;

      const pool = new InstancedPool(this.geometry, neutralMaterial, poolSize, { withColors: true });
      this.scene.add(pool.meshInstance);
      this.pools.set(model.id, pool);
      this.instanceIndices.set(model.id, new Map());
    }
  }

  /**
   * Add a character instance to the specified model's pool.
   * @param modelId - The character model ID (e.g., 'male_1', 'child_3')
   * @param position - World position for the character (base position, feet)
   * @returns Instance index for the first voxel (for compatibility with existing callers)
   */
  addCharacter(modelId: string, position: THREE.Vector3): number {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const model = ALL_CHARACTER_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model definition not found: ${modelId}`);
    }

    const indices = this.instanceIndices.get(modelId)!;

    // Track the first instance index (for compatibility)
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

  /**
   * Update a character instance's position (updates all voxels).
   * @param modelId - The character model ID
   * @param index - Instance index returned from addCharacter (first voxel)
   * @param position - New world position (base position)
   */
  updateCharacter(modelId: string, index: number, position: THREE.Vector3): void {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const model = ALL_CHARACTER_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model definition not found: ${modelId}`);
    }

    // Update all voxel instances for this character
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

  /**
   * Update a character instance with position and rotation (updates all voxels).
   * @param modelId - The character model ID
   * @param index - Instance index returned from addCharacter (first voxel)
   * @param position - New world position (base position)
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

    const model = ALL_CHARACTER_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model definition not found: ${modelId}`);
    }

    // Update all voxel instances for this character
    for (let i = 0; i < model.voxels.length; i++) {
      const voxel = model.voxels[i];
      this.dummy.position.set(
        position.x + voxel.x,
        position.y + voxel.y,
        position.z + voxel.z,
      );
      this.dummy.scale.set(1, 1, 1);
      if (rotation) {
        this.dummy.rotation.copy(rotation);
      } else {
        this.dummy.rotation.set(0, 0, 0);
      }
      this.dummy.updateMatrix();
      pool.meshInstance.setMatrixAt(index + i, this.dummy.matrix);
      pool.meshInstance.instanceMatrix.needsUpdate = true;
    }
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

  /**
   * Update character instance with animation offsets (updates all voxels).
   * Applies position interpolation, animation transforms, and rotation to all voxels.
   * @param modelId - The character model ID
   * @param index - Instance index returned from addCharacter (first voxel)
   * @param renderState - Interpolated render state with animation data
   */
  updateCharacterInstance(
    modelId: string,
    index: number,
    renderState: CharacterRenderState,
  ): void {
    const pool = this.pools.get(modelId);
    if (!pool) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const model = ALL_CHARACTER_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model definition not found: ${modelId}`);
    }

    // Get animation offset (Y-bob, etc.)
    const offset = getAnimationOffset('idle', renderState.animationPhase);

    // Calculate base position with animation offset applied
    const basePos = renderState.interpolatedPosition.clone().add(offset);

    // Update all voxel instances for this character
    for (let i = 0; i < model.voxels.length; i++) {
      const voxel = model.voxels[i];

      // Calculate world position: animated base + voxel offset
      this.dummy.position.set(
        basePos.x + voxel.x,
        basePos.y + voxel.y,
        basePos.z + voxel.z,
      );

      // Scale remains 1:1
      this.dummy.scale.set(1, 1, 1);

      // Apply Y-axis rotation from render state
      this.dummy.rotation.set(0, renderState.interpolatedRotation, 0);

      // Update matrix and push to instanced mesh
      this.dummy.updateMatrix();
      pool.meshInstance.setMatrixAt(index + i, this.dummy.matrix);
    }

    // Batch the update flag - set once after all voxels
    pool.meshInstance.instanceMatrix.needsUpdate = true;
  }
}
