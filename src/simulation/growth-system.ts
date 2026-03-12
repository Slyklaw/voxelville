import { Building, isHousing, isWorkplace, hasVacancy } from './types';
import { CharacterStateManager } from './character-state';
import { SeededRNG } from '../utils/rng';
import { uiState } from '../ui/ui-state';
import { ALL_CHARACTER_MODELS } from '../models/characters';

/**
 * Growth system configuration
 */
export const GROWTH_CONFIG = {
  /** Ticks between spawn checks (120 ticks = 30 seconds at 4 ticks/sec) */
  spawnInterval: 120,
  /** Minimum happiness (0-1) to allow spawning */
  happinessThreshold: 0.6,
  /** Chance of spawning when conditions met (prevents clustering) */
  spawnChance: 0.8,
};

/**
 * Calculate total housing vacancy across all houses
 * @param buildings - Array of buildings in the city
 * @returns Total available housing slots (0 if none)
 */
export function getHousingVacancy(buildings: Building[]): number {
  let totalVacancy = 0;

  for (const building of buildings) {
    if (isHousing(building)) {
      totalVacancy += Math.max(0, building.capacity - building.occupancy);
    }
  }

  return totalVacancy;
}

/**
 * Calculate total workplace vacancy across offices, stores, and depots
 * @param buildings - Array of buildings in the city
 * @returns Total available workplace slots (0 if none)
 */
export function getWorkplaceVacancy(buildings: Building[]): number {
  let totalVacancy = 0;

  for (const building of buildings) {
    if (isWorkplace(building)) {
      totalVacancy += Math.max(0, building.capacity - building.occupancy);
    }
  }

  return totalVacancy;
}

/**
 * Check if spawn conditions are met
 * @param happiness - Current city happiness (0-1)
 * @param housingVacancy - Available housing slots
 * @param workplaceVacancy - Available workplace slots
 * @param tickCount - Current simulation tick count
 * @returns true if all conditions for spawning are met
 */
export function checkSpawnConditions(
  happiness: number,
  housingVacancy: number,
  workplaceVacancy: number,
  tickCount: number,
): boolean {
  return (
    happiness > GROWTH_CONFIG.happinessThreshold &&
    housingVacancy > 0 &&
    workplaceVacancy > 0 &&
    tickCount % GROWTH_CONFIG.spawnInterval === 0
  );
}

/**
 * Select a random character model ID from available models
 * @param rng - Seeded RNG for deterministic selection
 * @returns Random character model ID
 */
export function selectRandomCharacterModel(rng: SeededRNG): string {
  const model = rng.pick(ALL_CHARACTER_MODELS);
  return model.id;
}

/**
 * Find a vacant house (occupancy < capacity)
 * @param buildings - Array of buildings
 * @returns A building with vacancy, or null if none found
 */
export function findVacantHouse(buildings: Building[], rng: SeededRNG): Building | null {
  const vacantHouses = buildings.filter(b => isHousing(b) && hasVacancy(b));
  if (vacantHouses.length === 0) return null;

  // Pick a random vacant house using seeded RNG
  return rng.pick(vacantHouses);
}

/**
 * Find a vacant workplace (office, store, or cleaning depot with vacancy)
 * @param buildings - Array of buildings
 * @returns A building with vacancy, or null if none found
 */
export function findVacantWorkplace(buildings: Building[], rng: SeededRNG): Building | null {
  const vacantWorkplaces = buildings.filter(b => isWorkplace(b) && hasVacancy(b));
  if (vacantWorkplaces.length === 0) return null;

  // Pick a random vacant workplace using seeded RNG
  return rng.pick(vacantWorkplaces);
}

/**
 * Spawn a new resident in the city
 * Creates a character at a vacant home and assigns a workplace
 *
 * @param stateManager - Character state manager for entity creation
 * @param buildings - Array of buildings in the city
 * @param rng - Seeded RNG for deterministic random selection
 * @param entityIdCounter - Counter for generating unique entity IDs
 * @returns The new entity ID, or -1 if spawn failed
 */
export function spawnResident(
  stateManager: CharacterStateManager,
  buildings: Building[],
  rng: SeededRNG,
  entityIdCounter: { value: number },
): number {
  // Random chance check to prevent clustering
  if (rng.next() > GROWTH_CONFIG.spawnChance) {
    return -1;
  }

  // Find a vacant house
  const home = findVacantHouse(buildings, rng);
  if (!home) return -1;

  // Find a vacant workplace
  const workplace = findVacantWorkplace(buildings, rng);
  if (!workplace) return -1;

  // Select random character model
  const modelId = selectRandomCharacterModel(rng);

  // Generate unique entity ID
  const entityId = entityIdCounter.value++;

  // Create character at home position
  stateManager.createCharacter(entityId, modelId, home.position.clone());

  // Update occupancy counts
  home.occupancy++;
  workplace.occupancy++;

  // Set home and workplace IDs on character sim state
  const sim = stateManager.getCharacter(entityId);
  if (sim) {
    // Add homeId and workplaceId to sim state if available
    // For now, we'll track via the building occupancy system
    // These IDs can be extended later for direct references
  }

  return entityId;
}

/**
 * Main spawn check function - called from simulation loop
 * Checks conditions and spawns residents when appropriate
 *
 * @param stateManager - Character state manager
 * @param buildings - Array of buildings
 * @param rng - Seeded RNG
 * @param entityIdCounter - Counter for unique entity IDs
 * @returns The new entity ID, or -1 if no spawn occurred
 */
export function checkAndSpawn(
  stateManager: CharacterStateManager,
  buildings: Building[],
  rng: SeededRNG,
  entityIdCounter: { value: number },
  tickCount: number,
): number {
  const happiness = uiState.happiness;
  const housingVacancy = getHousingVacancy(buildings);
  const workplaceVacancy = getWorkplaceVacancy(buildings);

  if (checkSpawnConditions(happiness, housingVacancy, workplaceVacancy, tickCount)) {
    const newEntityId = spawnResident(stateManager, buildings, rng, entityIdCounter);
    if (newEntityId !== -1) {
      // Update UI stats
      uiState.updateStats(stateManager.characterCount, happiness);
    }
    return newEntityId;
  }

  return -1;
}
