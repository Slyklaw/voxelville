import * as THREE from 'three';
import { Needs, Task } from './types';

/**
 * Animation states for characters
 */
export type AnimationState = 'idle' | 'walk' | 'work' | 'party' | 'clean' | 'sleep' | 'build';

/**
 * Simulation state updated by simulation at 4 ticks/sec
 */
export interface CharacterSimState {
  /** Current grid position (integer coordinates) */
  position: THREE.Vector3;
  /** Next grid position (for pathfinding) */
  targetPosition: THREE.Vector3;
  /** Current animation state */
  animationState: AnimationState;
  /** Position before last tick (for interpolation) */
  previousPosition: THREE.Vector3;
  /** Animation before last tick */
  previousAnimation: AnimationState;
  /** performance.now() of last simulation tick */
  tickTimestamp: number;
  /** Character variant ID (e.g., 'male_1') */
  modelId: string;
  /** Index in InstancedPool */
  instanceIndex: number;
  /** Needs system (0-1, where 1 = urgent). Per SIM-01 */
  needs: Needs;
  /** Personality traits (-1 to 1). For utility-based AI task selection */
  personality: {
    playfulness: number;  // -1 = very diligent, +1 = very playful
    diligence: number;    // -1 = lazy, +1 = very hardworking
  };
  /** Current task being executed (null if idle) */
  currentTask: Task | null;
  /** Task queue for future tasks */
  taskQueue: Task[];
  /** Current path from A* pathfinding (null if no path) */
  currentPath: THREE.Vector3[] | null;
  /** Current index in path (for movement along path) */
  pathIndex: number;
}

/**
 * Render state updated every frame at 60fps
 */
export interface CharacterRenderState {
  /** Computed position for this frame */
  interpolatedPosition: THREE.Vector3;
  /** Facing direction (Y-axis rotation in radians) */
  interpolatedRotation: number;
  /** Animation transform offset */
  animationOffset: THREE.Vector3;
  /** Animation cycle position (0..1) */
  animationPhase: number;
}

/**
 * Interpolate character state between simulation ticks.
 * @param sim - Current simulation state
 * @param render - Current render state (will be updated)
 * @param currentTime - Current time in milliseconds (performance.now())
 */
export function interpolateCharacter(
  sim: CharacterSimState,
  render: CharacterRenderState,
  currentTime: number,
): void {
  // Calculate interpolation alpha (0..1)
  // 250ms = 4 ticks/sec
  const elapsed = currentTime - sim.tickTimestamp;
  const alpha = Math.min(elapsed / 250, 1.0);

  // Interpolate position between previous and current
  render.interpolatedPosition.lerpVectors(
    sim.previousPosition,
    sim.position,
    alpha,
  );

  // Update animation phase based on current animation state and alpha
  switch (sim.animationState) {
    case 'idle':
      // Gentle bob, phase cycles every 2 seconds
      render.animationPhase = (elapsed / 2000) % 1;
      break;
    case 'walk':
      // Faster step cycle, phase cycles every 0.5 seconds
      render.animationPhase = (elapsed / 500) % 1;
      break;
    case 'work':
      // Slow arm movement, phase cycles every 3 seconds
      render.animationPhase = (elapsed / 3000) % 1;
      break;
    case 'party':
      // Fast bounce, phase cycles every 0.25 seconds
      render.animationPhase = (elapsed / 250) % 1;
      break;
    case 'clean':
      // Medium arm sweep, phase cycles every 1.5 seconds
      render.animationPhase = (elapsed / 1500) % 1;
      break;
    case 'sleep':
      // No animation phase needed
      render.animationPhase = 0;
      break;
    case 'build':
      // Arm raise, phase cycles every 1 second
      render.animationPhase = (elapsed / 1000) % 1;
      break;
  }
}

/**
 * Create a new character simulation state.
 * @param modelId - Character variant ID
 * @param position - Initial position
 * @param timestamp - Current timestamp
 * @returns New CharacterSimState
 */
export function createSimState(
  modelId: string,
  position: THREE.Vector3,
  timestamp: number,
): CharacterSimState {
  return {
    position: position.clone(),
    targetPosition: position.clone(),
    animationState: 'idle',
    previousPosition: position.clone(),
    previousAnimation: 'idle',
    tickTimestamp: timestamp,
    modelId,
    instanceIndex: -1, // Will be set when added to renderer
    needs: { hunger: 0.1, energy: 0.1, social: 0.1, hygiene: 0.1 },
    personality: {
      playfulness: Math.random() * 2 - 1,
      diligence: Math.random() * 2 - 1,
    },
    currentTask: null,
    taskQueue: [],
    currentPath: null,
    pathIndex: 0,
  };
}

/**
 * Create a new character render state.
 * @param position - Initial position
 * @returns New CharacterRenderState
 */
export function createRenderState(position: THREE.Vector3): CharacterRenderState {
  return {
    interpolatedPosition: position.clone(),
    interpolatedRotation: 0,
    animationOffset: new THREE.Vector3(),
    animationPhase: 0,
  };
}

/**
 * Update simulation state for a character (called by simulation at 4 ticks/sec).
 * @param sim - Current simulation state to update
 * @param newPosition - New grid position
 * @param newAnimation - New animation state
 */
export function updateSimulation(
  sim: CharacterSimState,
  newPosition: THREE.Vector3,
  newAnimation: AnimationState,
): void {
  // Store previous values for interpolation
  sim.previousPosition.copy(sim.position);
  sim.previousAnimation = sim.animationState;

  // Update to new values
  sim.position.copy(newPosition);
  sim.animationState = newAnimation;
  sim.tickTimestamp = performance.now();
}

/**
 * Get animation offset vector for a given animation state and phase.
 * @param state - Animation state
 * @param phase - Animation phase (0..1)
 * @returns Offset vector (Y-bob, rotation, etc.)
 */
export function getAnimationOffset(state: AnimationState, phase: number): THREE.Vector3 {
  const offset = new THREE.Vector3();
  
  switch (state) {
    case 'idle':
      // Gentle vertical bob
      offset.y = Math.sin(phase * Math.PI * 2) * 0.05;
      break;
    case 'walk':
      // Vertical bob + leg swing
      offset.y = Math.sin(phase * Math.PI * 4) * 0.05;
      // Could add rotation for leg swing here
      break;
    case 'work':
      // Arm rotation (no position offset, rotation handled separately)
      break;
    case 'party':
      // Bouncy jump
      offset.y = Math.abs(Math.sin(phase * Math.PI * 8)) * 0.1;
      break;
    case 'clean':
      // Arm sweep (no position offset)
      break;
    case 'sleep':
      // Lying flat (rotation handled separately)
      break;
    case 'build':
      // Arm raise (no position offset)
      break;
  }
  
  return offset;
}

/**
 * Get rotation for a given animation state and phase.
 * @param state - Animation state
 * @param phase - Animation phase (0..1)
 * @returns Rotation in radians (Y-axis)
 */
export function getAnimationRotation(state: AnimationState, phase: number): number {
  switch (state) {
    case 'idle':
      return 0;
    case 'walk':
      // Slight side-to-side rotation
      return Math.sin(phase * Math.PI * 4) * 0.1;
    case 'work':
      // Arm rotation (this would be arm-specific, not body rotation)
      return 0;
    case 'party':
      // Spinning
      return phase * Math.PI * 2;
    case 'clean':
      // Side-to-side sweep
      return Math.sin(phase * Math.PI * 2) * 0.3;
    case 'sleep':
      // Lie flat on side
      return Math.PI / 2;
    case 'build':
      // Face building direction
      return 0;
    default:
      return 0;
  }
}

/**
 * CharacterStateManager - manages simulation and render state separation.
 * Provides API for simulation to update character states and for renderer to get interpolated states.
 */
export class CharacterStateManager {
  private characters: Map<number, CharacterSimState>;
  private renderStates: Map<number, CharacterRenderState>;

  constructor() {
    this.characters = new Map();
    this.renderStates = new Map();
  }

  /**
   * Create a new character entity.
   * @param entityId - Unique entity ID
   * @param modelId - Character variant ID
   * @param position - Initial position
   */
  createCharacter(entityId: number, modelId: string, position: THREE.Vector3): void {
    const timestamp = performance.now();
    this.characters.set(entityId, createSimState(modelId, position, timestamp));
    this.renderStates.set(entityId, createRenderState(position));
  }

  /**
   * Update simulation state for a character (called by simulation at 4 ticks/sec).
   * @param entityId - Entity ID
   * @param newPosition - New grid position
   * @param newAnimation - New animation state
   */
  updateSimulation(entityId: number, newPosition: THREE.Vector3, newAnimation: AnimationState): void {
    const sim = this.characters.get(entityId);
    if (sim) {
      updateSimulation(sim, newPosition, newAnimation);
    }
  }

  /**
   * Get interpolated render state for a character.
   * @param entityId - Entity ID
   * @returns Interpolated render state
   */
  getRenderState(entityId: number): CharacterRenderState | undefined {
    const sim = this.characters.get(entityId);
    const render = this.renderStates.get(entityId);
    
    if (!sim || !render) {
      return undefined;
    }
    
    // Interpolate from simulation state
    interpolateCharacter(sim, render, performance.now());
    
    return render;
  }

  /**
   * Get all interpolated render states.
   * @returns Map of entityId to interpolated render state
   */
  getAllRenderStates(): Map<number, CharacterRenderState> {
    const currentTime = performance.now();
    
    // Interpolate all characters
    for (const [entityId, sim] of this.characters) {
      const render = this.renderStates.get(entityId);
      if (render) {
        interpolateCharacter(sim, render, currentTime);
      }
    }
    
    return this.renderStates;
  }

  /**
   * Get simulation state for a character.
   * @param entityId - Entity ID
   * @returns Simulation state or undefined
   */
  getCharacter(entityId: number): CharacterSimState | undefined {
    return this.characters.get(entityId);
  }

  /**
   * Remove a character entity.
   * @param entityId - Entity ID to remove
   */
  removeCharacter(entityId: number): void {
    this.characters.delete(entityId);
    this.renderStates.delete(entityId);
  }

  /**
   * Get all entity IDs.
   * @returns Array of entity IDs
   */
  getAllEntityIds(): number[] {
    return Array.from(this.characters.keys());
  }

  /**
   * Get total number of characters.
   * @returns Number of characters
   */
  get characterCount(): number {
    return this.characters.size;
  }
}
