import * as THREE from 'three';
import { CharacterStateManager } from './character-state';
import { decayNeeds } from './needs-system';
import { selectTask, getAvailableTasks, computeUtility } from './ai-system';
import { SeededRNG } from '../utils/rng';
import { MovementSystem } from './movement-system';
import { uiState } from '../ui/ui-state';

/**
 * Main simulation loop running at 4 ticks/sec (250ms interval)
 * Each tick: decay needs, select tasks, execute movement
 */
export class SimulationLoop {
  private stateManager: CharacterStateManager;
  private buildings: Array<{ id: number; type: string; position: THREE.Vector3 }> = [];
  private movementSystem: MovementSystem | null = null;
  private rng: SeededRNG;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private debugEnabled = false;

  constructor(
    stateManager: CharacterStateManager,
    buildings: Array<{ id: number; type: string; position: THREE.Vector3 }> = [],
    seed: number = 42,
  ) {
    this.stateManager = stateManager;
    this.buildings = buildings;
    this.rng = new SeededRNG(seed);
  }

  /**
   * Set movement system (called after RoadGrid is initialized)
   */
  setMovementSystem(movementSystem: MovementSystem): void {
    this.movementSystem = movementSystem;
  }

  /**
   * Start the simulation loop (4 ticks/sec)
   */
  start(): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), 250);
  }

  /**
   * Stop the simulation loop
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Enable debug logging for needs decay
   */
  enableDebug(): void {
    this.debugEnabled = true;
  }

  /**
   * Disable debug logging
   */
  disableDebug(): void {
    this.debugEnabled = false;
  }

  /**
   * Single simulation tick
   * Phase 1 (04-01): Decay needs
   * Phase 2 (04-02): Task selection
   * Phase 3 (04-03): Movement
   * Phase 4 (05-02): UI stats update
   */
  private tick(): void {
    this.tickCount++;

    // 1. Decay needs for all characters
    for (const entityId of this.stateManager.getAllEntityIds()) {
      const sim = this.stateManager.getCharacter(entityId);
      if (!sim) continue;

      sim.needs = decayNeeds(sim.needs);

      // 2. Task selection (if no current task)
      if (!sim.currentTask) {
        const availableTasks = getAvailableTasks(sim, this.buildings);
        const selectedTask = selectTask(availableTasks, sim, this.rng);

        if (selectedTask) {
          sim.currentTask = selectedTask;
          sim.targetPosition.copy(selectedTask.location);

          // Clear any existing path
          sim.currentPath = null;
          sim.pathIndex = 0;

          // Debug log task selection
          if (this.debugEnabled && this.tickCount % 5 === 0) {
            const utility = computeUtility(selectedTask, sim);
            console.log(
              `Char ${entityId}: Selected ${selectedTask.type} (utility: ${utility.toFixed(3)})`,
            );
          }
        }
      }
    }

    // 3. Movement update (one step per tick)
    if (this.movementSystem) {
      this.movementSystem.update();
    }

    // 4. Update UI stats every 4 ticks (1 second)
    if (this.tickCount % 4 === 0) {
      const population = this.stateManager.characterCount;
      
      // Calculate average happiness (inverse of average needs)
      let totalNeedScore = 0;
      let count = 0;
      for (const entityId of this.stateManager.getAllEntityIds()) {
        const sim = this.stateManager.getCharacter(entityId);
        if (sim) {
          const avgNeed = (sim.needs.hunger + sim.needs.energy + 
                          sim.needs.social + sim.needs.hygiene) / 4;
          totalNeedScore += 1 - avgNeed;  // Higher = happier
          count++;
        }
      }
      const happiness = count > 0 ? totalNeedScore / count : 0;
      
      uiState.updateStats(population, happiness);
    }

    // Debug logging every 10 ticks to avoid spam
    if (this.debugEnabled && this.tickCount % 10 === 0) {
      const ids = this.stateManager.getAllEntityIds().slice(0, 3);
      console.group(`Tick ${this.tickCount} - Needs Debug`);
      for (const id of ids) {
        const sim = this.stateManager.getCharacter(id);
        if (sim) {
          console.log(
            `Char ${id}: H=${sim.needs.hunger.toFixed(2)} E=${sim.needs.energy.toFixed(2)} S=${sim.needs.social.toFixed(2)} Hy=${sim.needs.hygiene.toFixed(2)}`,
          );
        }
      }
      console.groupEnd();
    }
  }

  /**
   * Current tick count
   */
  get currentTick(): number {
    return this.tickCount;
  }
}
