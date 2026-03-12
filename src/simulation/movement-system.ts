import * as THREE from 'three';
import { CharacterStateManager, updateSimulation } from './character-state';
import { Pathfinder } from './pathfinding';
import { RoadGrid } from './road-grid';

/**
 * Movement system for character movement along paths
 * Integrates with Pathfinder for navigation
 */
export class MovementSystem {
  private pathfinder: Pathfinder;
  private stateManager: CharacterStateManager;

  constructor(roadGrid: RoadGrid, stateManager: CharacterStateManager) {
    this.pathfinder = new Pathfinder(roadGrid);
    this.stateManager = stateManager;
  }

  /**
   * Update movement for all characters (called each tick)
   * Moves characters one step along their current path
   */
  update(): void {
    for (const entityId of this.stateManager.getAllEntityIds()) {
      const sim = this.stateManager.getCharacter(entityId);
      if (!sim) continue;

      // If character has a task with a location different from current position
      if (sim.currentTask) {
        const taskLocation = sim.currentTask.location;
        const currentPosition = sim.position;

        // Check if we're at the destination
        const distance = currentPosition.distanceTo(taskLocation);
        if (distance < 0.5) {
          // Reached destination, clear current task
          sim.currentTask = null;
          sim.targetPosition.copy(currentPosition);
          updateSimulation(sim, currentPosition, 'idle');
          continue;
        }

        // Find path to task location if we don't have one
        if (!sim.currentPath || sim.currentPath.length === 0) {
          const path = this.pathfinder.findPath(currentPosition, taskLocation);
          if (path && path.length > 1) {
            sim.currentPath = path;
            sim.pathIndex = 1; // Start from second position (first is current)
          } else {
            // No path found, clear task
            sim.currentTask = null;
            continue;
          }
        }

        // Move along path
        if (sim.currentPath && sim.pathIndex < sim.currentPath.length) {
          const nextStep = sim.currentPath[sim.pathIndex];
          const newPosition = new THREE.Vector3(nextStep.x, 0, nextStep.z);

          // Update simulation state with new position and walk animation
          updateSimulation(sim, newPosition, 'walk');
          sim.targetPosition.copy(newPosition);

          // Move to next step
          sim.pathIndex++;

          // Clear path when reached end
          if (sim.pathIndex >= sim.currentPath.length) {
            sim.currentPath = null;
            sim.pathIndex = 0;
          }
        }
      }
    }
  }

  /**
   * Get pathfinder for external use
   */
  get pathfinderRef(): Pathfinder {
    return this.pathfinder;
  }

  /**
   * Clear all path caches (call when road network changes)
   */
  clearPathCaches(): void {
    this.pathfinder.clearCache();
  }
}
