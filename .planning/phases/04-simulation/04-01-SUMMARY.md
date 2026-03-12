---
phase: 04-simulation
plan: 01
subsystem: simulation
tags: [needs, decay, simulation-tick, character-state]
requires: []
provides: [SIM-01]
affects: [CharacterSimState, SimulationLoop, character-rendering]
tech-stack:
  added: []
  patterns: [exponential-decay, 4-ticks-per-second]
key-files:
  created:
    - src/simulation/types.ts
    - src/simulation/needs-system.ts
    - src/simulation/simulation-tick.ts
  modified:
    - src/simulation/character-state.ts
key-decisions:
  - "Exponential decay formula: rate * (1 + current) — low needs decay slowly, high needs decay quickly"
  - "Debug logging on SimulationLoop with enableDebug()/disableDebug() for needs monitoring"
requirements-completed:
  - SIM-01
duration: ~15 min
completed: 2026-03-11
---

# Phase 4 Plan 01: Add needs system to citizen simulation Summary

Citizens have hunger, energy, social, and hygiene needs that decay at different rates each simulation tick (4/sec). Foundation for autonomous citizen behavior.

## Task Count: 3 | File Count: 4

### Tasks Executed

1. ✅ **Create simulation types** — `src/simulation/types.ts` exports Needs, Task, TaskType, ResidentSimState, TASK_NEED_SATISFACTION, TASK_PERSONALITY_FIT
2. ✅ **Implement needs decay system** — `src/simulation/needs-system.ts` exports decayNeeds, applyTaskSatisfaction, computeNeedSatisfaction, NEED_DECAY_RATES
3. ✅ **Integrate needs into CharacterSimState** — `src/simulation/character-state.ts` CharacterSimState has needs and personality fields; `src/simulation/simulation-tick.ts` SimulationLoop ticks at 4/sec calling decayNeeds

### Deviations from Plan

None — plan executed exactly as written.

### Verification Results

1. ✅ TypeScript compiles without errors
2. ✅ Needs decay at correct rates (hunger 4%/sec, energy 2%/sec, social 1.2%/sec, hygiene 0.8%/sec)
3. ✅ CharacterSimState interface includes needs and personality fields
4. ✅ SimulationLoop ticks at 4/sec calling decayNeeds

### Success Criteria Met

- ✅ CharacterSimState has hunger, energy, social, hygiene needs (SIM-01)
- ✅ Needs decay at different rates each tick
- ✅ SimulationLoop runs at 4 ticks/sec
- ✅ Debug logging available for needs monitoring

### Next Phase Readiness

Ready for 04-02: AI task selection — citizens can now score tasks using needs satisfaction

### Self-Check: PASSED
