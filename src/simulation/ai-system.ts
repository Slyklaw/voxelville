import * as THREE from 'three';
import { CharacterSimState } from './character-state';
import { Task, TaskType, TASK_PERSONALITY_FIT } from './types';
import { computeNeedSatisfaction } from './needs-system';
import { uiState } from '../ui/ui-state';

/**
 * Utility weights for task selection (total = 1.0)
 * 35% needs satisfaction, 25% personality fit, 25% proximity, 15% slider bonus
 */
export const UTILITY_WEIGHTS = {
  needSatisfaction: 0.35,
  personalityFit: 0.25,
  proximity: 0.25,
  sliderBonus: 0.15,
};

/**
 * Task selection parameters
 */
export const TASK_SELECTION_CONFIG = {
  temperature: 0.5,        // Softmax temperature (lower = more deterministic)
  epsilon: 0.1,            // 10% exploration rate (random tasks)
  minUtilityThreshold: 0.1, // Ignore tasks below this utility
};

/**
 * Compute personality fit score (0-1)
 * Dot product of resident personality with task preference vector
 */
export function computePersonalityFit(taskType: TaskType, personality: {
  playfulness: number;
  diligence: number;
}): number {
  const fit = TASK_PERSONALITY_FIT[taskType];
  if (!fit) return 0.5;

  const dot = personality.playfulness * fit.playfulness +
              personality.diligence * fit.diligence;

  // Normalize dot product (-1..1) to (0..1)
  return (dot + 1) / 2;
}

/**
 * Compute proximity score based on distance to task location
 * Closer tasks score higher (0-1)
 */
export function computeProximityScore(
  currentPosition: THREE.Vector3,
  taskLocation: THREE.Vector3,
  maxDistance: number = 50
): number {
  const distance = currentPosition.distanceTo(taskLocation);
  // Linear falloff: distance 0 = 1.0, distance maxDistance = 0.0
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Compute slider bonus for a task type
 * Play tasks get bonus when slider is low, work tasks when slider is high
 * Returns -0.15 to +0.15 bonus
 */
export function computeSliderBonus(taskType: TaskType): number {
  const slider = uiState.sliderValue;
  
  const playTasks: TaskType[] = ['shop', 'party', 'park'];
  const workTasks: TaskType[] = ['work', 'clean'];
  
  if (playTasks.includes(taskType)) {
    // Play tasks favored when slider is low (0)
    return (1 - slider) * 0.3 - 0.15; // -0.15 to +0.15
  } else if (workTasks.includes(taskType)) {
    // Work tasks favored when slider is high (1)
    return slider * 0.3 - 0.15; // -0.15 to +0.15
  }
  
  // Neutral tasks (eat, sleep, shower) - no slider effect
  return 0;
}

/**
 * Compute total utility score for a task
 * U(task) = w1*needSatisfaction + w2*personalityFit + w3*proximity + w4*sliderBonus
 */
export function computeUtility(
  task: Task,
  resident: CharacterSimState,
): number {
  const needScore = computeNeedSatisfaction(task.type, resident.needs);
  const personalityScore = computePersonalityFit(task.type, resident.personality);
  const proximityScore = computeProximityScore(resident.position, task.location);
  const sliderScore = computeSliderBonus(task.type);

  return (
    UTILITY_WEIGHTS.needSatisfaction * needScore +
    UTILITY_WEIGHTS.personalityFit * personalityScore +
    UTILITY_WEIGHTS.proximity * proximityScore +
    UTILITY_WEIGHTS.sliderBonus * sliderScore
  );
}

/**
 * Map building type to task type
 */
function buildingTypeToTask(buildingType: string): TaskType | null {
  const mapping: Record<string, TaskType> = {
    office: 'work',
    store: 'shop',
    park: 'park',
    partyhall: 'party',
    cleaningdepot: 'clean',
  };
  return mapping[buildingType] || null;
}

/**
 * Get task duration in ticks (250ms per tick)
 */
function getTaskDuration(taskType: TaskType): number {
  const durations: Record<TaskType, number> = {
    eat: 2,
    sleep: 8,
    shower: 3,
    work: 6,
    shop: 4,
    party: 8,
    park: 4,
    clean: 5,
  };
  return durations[taskType] || 2;
}

/**
 * Get available tasks for a resident based on current state
 * Tasks are generated based on need urgency and building availability
 */
export function getAvailableTasks(
  resident: CharacterSimState,
  buildings: Array<{ id: number; type: string; position: THREE.Vector3 }>,
): Task[] {
  const tasks: Task[] = [];

  // Basic needs tasks always available at current location
  if (resident.needs.hunger > 0.6) {
    tasks.push({
      id: 'eat_current',
      type: 'eat',
      location: resident.position.clone(),
      buildingId: null,
      duration: 2,
    });
  }

  if (resident.needs.energy > 0.7) {
    tasks.push({
      id: 'sleep_current',
      type: 'sleep',
      location: resident.position.clone(),
      buildingId: null,
      duration: 8,
    });
  }

  if (resident.needs.hygiene > 0.7) {
    tasks.push({
      id: 'shower_current',
      type: 'shower',
      location: resident.position.clone(),
      buildingId: null,
      duration: 3,
    });
  }

  // Building-based tasks (work, shop, party, park, clean)
  for (const building of buildings) {
    const taskType = buildingTypeToTask(building.type);
    if (taskType) {
      tasks.push({
        id: `${taskType}_${building.id}`,
        type: taskType,
        location: building.position.clone(),
        buildingId: building.id,
        duration: getTaskDuration(taskType),
      });
    }
  }

  return tasks;
}

/**
 * Softmax function with temperature for weighted random selection
 */
function softmax(values: number[], temperature: number): number[] {
  const scaled = values.map(v => v / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

/**
 * Select a task for a resident using utility scoring + weighted random
 * @param availableTasks - List of available tasks
 * @param resident - Resident state
 * @param rng - Seeded RNG for deterministic random
 * @returns Selected task or null
 */
export function selectTask(
  availableTasks: Task[],
  resident: CharacterSimState,
  rng: { next: () => number },
): Task | null {
  if (availableTasks.length === 0) return null;

  // ε-greedy: 10% chance to pick random task
  if (rng.next() < TASK_SELECTION_CONFIG.epsilon) {
    return availableTasks[Math.floor(rng.next() * availableTasks.length)];
  }

  // Compute utilities for all tasks
  const utilities = availableTasks.map(task => ({
    task,
    utility: computeUtility(task, resident),
  }));

  // Filter out low-utility tasks
  const viableTasks = utilities.filter(u => u.utility >= TASK_SELECTION_CONFIG.minUtilityThreshold);
  if (viableTasks.length === 0) return null;

  // Softmax selection with weighted random
  const softmaxWeights = softmax(
    viableTasks.map(v => v.utility),
    TASK_SELECTION_CONFIG.temperature,
  );

  const totalWeight = softmaxWeights.reduce((sum, w) => sum + w, 0);
  let random = rng.next() * totalWeight;

  for (let i = 0; i < viableTasks.length; i++) {
    random -= softmaxWeights[i];
    if (random <= 0) {
      return viableTasks[i].task;
    }
  }

  return viableTasks[viableTasks.length - 1].task;
}
