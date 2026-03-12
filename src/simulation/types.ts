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
