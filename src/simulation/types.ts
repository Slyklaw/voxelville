import * as THREE from 'three';

/**
 * Needs system (0-1, where 1 = urgent need)
 */
export interface Needs {
  hunger: number;   // Decay: 1%/tick (4%/sec)
  energy: number;   // Decay: 0.5%/tick
  social: number;   // Decay: 0.3%/tick
  hygiene: number;  // Decay: 0.2%/tick
}

/**
 * Task types available to residents
 */
export type TaskType = 'eat' | 'sleep' | 'shower' | 'work' | 'shop' | 'party' | 'park' | 'clean';

/**
 * Task definition
 */
export interface Task {
  id: string;
  type: TaskType;
  location: THREE.Vector3;
  buildingId: number | null;
  duration: number;  // Ticks to complete
}

/**
 * Extended sim state with needs and AI
 * Extends existing CharacterSimState (see character-state.ts)
 */
export interface ResidentSimState {
  entityId: number;
  needs: Needs;
  personality: { playfulness: number; diligence: number };
  currentTask: Task | null;
  taskQueue: Task[];
  homeId: number | null;
  workplaceId: number | null;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  currentPath: THREE.Vector3[] | null;
  pathIndex: number;
}

/**
 * Task need satisfaction map (how much each task satisfies each need)
 * Positive = satisfies, negative = depletes
 */
export const TASK_NEED_SATISFACTION: Record<TaskType, Partial<Needs>> = {
  eat: { hunger: 0.8, energy: 0.2, social: 0.1 },
  sleep: { energy: 1.0 },
  shower: { hygiene: 0.9, energy: 0.3 },
  work: { hunger: -0.1, energy: -0.3, social: 0.2, hygiene: -0.1 },
  shop: { hunger: 0.3, energy: -0.1, social: 0.4 },
  party: { hunger: -0.2, energy: -0.5, social: 0.8, hygiene: -0.3 },
  park: { energy: -0.2, social: 0.6 },
  clean: { hunger: -0.1, energy: -0.2, social: 0.1, hygiene: 0.5 },
};

/**
 * Personality-task preferences (playfulness vs diligence)
 * Each task has preferred personality traits (-1 to 1)
 */
export const TASK_PERSONALITY_FIT: Record<TaskType, { playfulness: number; diligence: number }> = {
  work: { playfulness: -0.8, diligence: 0.8 },
  shop: { playfulness: 0.6, diligence: 0.2 },
  party: { playfulness: 1.0, diligence: -0.5 },
  park: { playfulness: 0.8, diligence: 0 },
  clean: { playfulness: -0.3, diligence: 0.7 },
  eat: { playfulness: 0.1, diligence: 0.1 },
  sleep: { playfulness: 0, diligence: 0 },
  shower: { playfulness: 0, diligence: 0.2 },
};

/**
 * Building types for runtime instances
 */
export type BuildingType = 'house' | 'office' | 'store' | 'park' | 'party_hall' | 'cleaning_depot';

/**
 * Runtime building instance with occupancy tracking
 */
export interface Building {
  id: number;
  type: BuildingType;
  position: THREE.Vector3;
  capacity: number;    // Max residents/workers
  occupancy: number;   // Current residents/workers
  modelId: string;     // Links to BuildingModelDefinition.id
}

/**
 * Capacity values per building type
 * Houses provide housing capacity, offices/stores provide workplace capacity
 */
export const BUILDING_CAPACITIES: Record<string, number> = {
  house_cottage: 2,
  house_two_storey: 3,
  house_row_house: 2,
  office_small: 4,
  office_tower: 6,
  store_corner_shop: 2,
  store_market_stall: 1,
  park: 0,
  party_hall: 0,
  cleaning_depot: 2,
};

/**
 * Get capacity for a building model ID
 */
export function getBuildingCapacity(modelId: string): number {
  return BUILDING_CAPACITIES[modelId] || 0;
}

/**
 * Check if building type provides housing (for population spawning)
 */
export function isHousing(building: Building): boolean {
  return building.type === 'house';
}

/**
 * Check if building type provides workplace (for job assignment)
 */
export function isWorkplace(building: Building): boolean {
  return building.type === 'office' || building.type === 'store' || building.type === 'cleaning_depot';
}

/**
 * Check if building has vacancy (occupancy < capacity)
 */
export function hasVacancy(building: Building): boolean {
  return building.occupancy < building.capacity;
}
