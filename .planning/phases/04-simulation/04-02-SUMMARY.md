---
phase: 04-simulation
plan: 02
subsystem: simulation
tags: [ai, utility-scoring, task-selection, personality]
requires: [04-simulation/01]
provides: [SIM-02]
affects: [SimulationLoop, CharacterSimState, ai-system]
tech-stack:
  added: []
  patterns: [utility-scoring, softmax-selection, epsilon-greedy]
key-files:
  created:
    - src/simulation/ai-system.ts
  modified:
    - src/simulation/simulation-tick.ts
key-decisions:
  - "Utility weights: 40% needs satisfaction, 30% personality fit, 30% proximity"
  - "Softmax selection with temperature=0.5 for weighted random (not always highest utility)"
  - "Epsilon-greedy: 10% chance to pick random task for exploration"
requirements-completed:
  - SIM-02
duration: ~15 min
completed: 2026-03-11
---

# Phase 4 Plan 02: Add utility-based AI task selection Summary

Citizens select tasks based on utility scoring (needs, personality, proximity) with weighted random selection using softmax. Enables autonomous citizen behavior driven by needs and personality.

## Task Count: 2 | File Count: 2

### Tasks Executed

1. ✅ **Create AI system with utility scoring** — `src/simulation/ai-system.ts` exports computeUtility, selectTask, getAvailableTasks, UTILITY_WEIGHTS
2. ✅ **Integrate AI system into simulation tick** — `src/simulation/simulation-tick.ts` tick() calls getAvailableTasks and selectTask for idle characters

### Deviations from Plan

None — plan executed exactly as written.

### Verification Results

1. ✅ TypeScript compiles without errors
2. ✅ Utility scoring uses 40% needs, 30% personality, 30% proximity
3. ✅ Task selection uses weighted random (softmax)
4. ✅ Citizens with no current task select a new task each tick

### Success Criteria Met

- ✅ Citizens score tasks using utility function (SIM-02)
- ✅ Personality and needs influence task selection
- ✅ Task selection uses weighted random (not always highest)
- ✅ Citizens can have currentTask and taskQueue

### Next Phase Readiness

Ready for 04-03: Pathfinding — citizens can now navigate between buildings for task execution

### Self-Check: PASSED
