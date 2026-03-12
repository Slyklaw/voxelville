import { Needs, TASK_NEED_SATISFACTION, TaskType } from './types';

/**
 * Needs decay rates (per tick = 0.25 seconds at 4 ticks/sec)
 * Hunger decays fastest (4%/sec), hygiene slowest (0.8%/sec)
 */
export const NEED_DECAY_RATES: Record<keyof Needs, number> = {
  hunger: 0.01,    // 1%/tick = 4%/sec
  energy: 0.005,   // 0.5%/tick = 2%/sec
  social: 0.003,   // 0.3%/tick = 1.2%/sec
  hygiene: 0.002,  // 0.2%/tick = 0.8%/sec
};

/**
 * Exponential decay formula: need += rate * (1 + current)
 * This makes low needs decay slowly, high needs decay quickly
 * @param current - Current need value (0-1)
 * @param rate - Decay rate per tick
 * @returns New need value (0-1)
 */
export function decayNeed(current: number, rate: number): number {
  return Math.min(1, current + rate * (1 + current));
}

/**
 * Decay all needs for a resident (called each simulation tick)
 * @param needs - Current needs
 * @returns New needs after decay
 */
export function decayNeeds(needs: Needs): Needs {
  return {
    hunger: decayNeed(needs.hunger, NEED_DECAY_RATES.hunger),
    energy: decayNeed(needs.energy, NEED_DECAY_RATES.energy),
    social: decayNeed(needs.social, NEED_DECAY_RATES.social),
    hygiene: decayNeed(needs.hygiene, NEED_DECAY_RATES.hygiene),
  };
}

/**
 * Apply need satisfaction from a completed task
 * @param needs - Current needs
 * @param taskType - Type of task completed
 * @returns New needs after satisfaction
 */
export function applyTaskSatisfaction(needs: Needs, taskType: TaskType): Needs {
  const satisfaction = TASK_NEED_SATISFACTION[taskType];
  if (!satisfaction) return needs;

  return {
    hunger: Math.max(0, needs.hunger - (satisfaction.hunger || 0)),
    energy: Math.max(0, needs.energy - (satisfaction.energy || 0)),
    social: Math.max(0, needs.social - (satisfaction.social || 0)),
    hygiene: Math.max(0, needs.hygiene - (satisfaction.hygiene || 0)),
  };
}

/**
 * Compute need satisfaction score for utility scoring (0-1)
 * Higher score = task better addresses current urgent needs
 * @param taskType - Type of task to evaluate
 * @param needs - Current needs
 * @returns Satisfaction score (0-1)
 */
export function computeNeedSatisfaction(taskType: TaskType, needs: Needs): number {
  const satisfaction = TASK_NEED_SATISFACTION[taskType];
  if (!satisfaction) return 0;

  let totalSatisfaction = 0;
  let totalUrgency = 0;

  for (const [need, value] of Object.entries(satisfaction)) {
    if (value !== 0) {
      const urgency = needs[need as keyof Needs];
      totalSatisfaction += Math.abs(value) * urgency;
      totalUrgency += urgency;
    }
  }

  return totalUrgency > 0 ? totalSatisfaction / totalUrgency : 0;
}
