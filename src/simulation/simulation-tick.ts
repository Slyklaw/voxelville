import * as THREE from 'three';
import { CharacterStateManager } from './character-state';
import { decayNeeds } from './needs-system';
import { selectTask, getAvailableTasks, computeUtility } from './ai-system';
import { SeededRNG } from '../utils/rng';
import { MovementSystem } from './movement-system';
import { uiState } from '../ui/ui-state';
import { computeBuildingDemand, selectBuildingToConstruct, autoConstructBuilding, GROWTH_CONFIG } from './growth-system';
import { Building, isHousing, isWorkplace, BuildingType } from './types';
import { RoadGrid } from './road-grid';
import { BuildingRenderer } from '../engine/building-renderer';
import { ALL_BUILDING_MODELS } from '../models/buildings';

/**
 * Building instance with full occupancy tracking for construction system
 */
interface BuildingInstance {
  id: number;
  type: BuildingType;
  position: THREE.Vector3;
  capacity: number;
  occupancy: number;
  modelId: string;
}

/**
 * Main simulation loop running at 4 ticks/sec (250ms interval)
 * Each tick: decay needs, select tasks, execute movement, construction
 */
export class SimulationLoop {
  private stateManager: CharacterStateManager;
  private buildings: BuildingInstance[] = [];
  private movementSystem: MovementSystem | null = null;
  private roadGrid: RoadGrid | null = null;
  private buildingRenderer: BuildingRenderer | null = null;
  private rng: SeededRNG;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private debugEnabled = false;
  private nextBuildingId = 0;

  constructor(
    stateManager: CharacterStateManager,
    buildings: BuildingInstance[] = [],
    seed: number = 42,
  ) {
    this.stateManager = stateManager;
    this.buildings = buildings;
    this.rng = new SeededRNG(seed);
    this.nextBuildingId = buildings.length;
  }

  /**
   * Set movement system (called after RoadGrid is initialized)
   */
  setMovementSystem(movementSystem: MovementSystem): void {
    this.movementSystem = movementSystem;
  }

  /**
   * Set road grid for construction placement validation
   */
  setRoadGrid(roadGrid: RoadGrid): void {
    this.roadGrid = roadGrid;
  }

  /**
   * Set building renderer for adding constructed buildings
   */
  setBuildingRenderer(buildingRenderer: BuildingRenderer): void {
    this.buildingRenderer = buildingRenderer;
  }

  /**
   * Get current buildings array for demand calculation
   */
  getBuildings(): BuildingInstance[] {
    return this.buildings;
  }

  /**
   * Add a building to the simulation (called from grid-placement)
   */
  addBuilding(building: BuildingInstance): void {
    this.buildings.push(building);
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
   * Phase 5 (06-02): Construction system
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

    // 4. Construction check every 240 ticks (60 seconds)
    if (this.tickCount % GROWTH_CONFIG.constructionInterval === 0) {
      this.performConstructionCheck();
    }

    // 5. Update UI stats every 4 ticks (1 second)
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
   * Perform construction check and auto-build if demand exists
   * Called every 60 seconds (240 ticks)
   */
  private performConstructionCheck(): void {
    if (!this.roadGrid || !this.buildingRenderer) return;

    const population = this.stateManager.characterCount;
    if (population === 0) return;

    // Calculate building demands
    const demands = computeBuildingDemand(population, this.buildings);
    if (demands.length === 0) return;

    // Select building type based on demand and slider
    const selected = selectBuildingToConstruct(demands);
    if (!selected) return;

    // Auto-construct the building
    const instanceIndex = autoConstructBuilding(
      selected.modelId,
      this.roadGrid,
      this.buildingRenderer,
      this.rng,
    );

    if (instanceIndex !== -1) {
      // Get the model to determine capacity
      const model = ALL_BUILDING_MODELS.find(m => m.id === selected.modelId);
      const capacity = model ? (isHousing({ type: selected.type } as Building) ? 2 : isWorkplace({ type: selected.type } as Building) ? 2 : 0) : 0;

      // Add the new building to simulation
      const newBuilding: BuildingInstance = {
        id: this.nextBuildingId++,
        type: selected.type,
        position: new THREE.Vector3(0, 0, 0), // Position managed by grid-placement
        capacity,
        occupancy: 0,
        modelId: selected.modelId,
      };
      this.buildings.push(newBuilding);

      if (this.debugEnabled) {
        console.log(`Tick ${this.tickCount}: Auto-constructed ${selected.modelId} (capacity: ${capacity})`);
      }
    }
  }

  /**
   * Current tick count
   */
  get currentTick(): number {
    return this.tickCount;
  }
}
