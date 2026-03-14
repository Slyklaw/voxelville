---
phase: 09-positioning-terrain
plan: 01
subsystem: terrain, positioning, buildings, characters
tags: [bugfix, terrain-generation, positioning, height-lookup]
dependency_graph:
  requires: []
  provides: [getTerrainHeight]
  affects: [App.tsx, simulation-tick, growth-system, grid-placement]
tech_stack:
  added: []
  patterns: [deterministic-noise, terrain-height-lookup]
key_files:
  created: []
  modified:
    - src/simulation/world.ts
    - src/simulation/grid-placement.ts
    - src/simulation/growth-system.ts
    - src/simulation/simulation-tick.ts
    - src/App.tsx
decisions: []
metrics:
  duration: 8min
  completed: 2026-03-11
---

# Phase 09 Plan 01: Fix Terrain Generation and Position Entities Above Terrain

Fixed three positioning/terrain issues: (1) terrain noise broken (rng.next() called inside noise calc creating random holes), (2) buildings placed at fixed y=0 getting buried inside terrain hills, (3) characters spawning at y=0 also buried.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Auto-constructed buildings used hardcoded y=1**
- **Found during:** Task 2
- **Issue:** `grid-placement.ts:placeBuilding()` hardcoded `worldY=1` regardless of terrain height. Auto-constructed buildings from growth system would be buried.
- **Fix:** Added optional `world?: World` parameter to `placeBuilding()`, `autoConstructBuilding()`, and `SimulationLoop.setWorld()`. Buildings now use `getTerrainHeight()` for correct placement.
- **Files modified:** src/simulation/grid-placement.ts, src/simulation/growth-system.ts, src/simulation/simulation-tick.ts, src/App.tsx
- **Commits:** d4f207b (Task 1), 8f71fb4 (Task 2)

## Completed Tasks

### Task 1: Fix terrain generation and add height lookup
- **Commit:** d4f207b
- **Files:** src/simulation/world.ts
- **Changes:**
  - Removed `this.rng.next()` from noise calculation (was creating random holes)
  - Replaced random water pattern with deterministic position-based hash
  - Removed unused `SeededRNG` import and class field
  - Added `getTerrainHeight()` export function

### Task 2: Position buildings and characters above terrain
- **Commit:** 8f71fb4
- **Files:** src/App.tsx, src/simulation/grid-placement.ts, src/simulation/growth-system.ts, src/simulation/simulation-tick.ts
- **Changes:**
  - Roads placed at terrain height + 0.5
  - Buildings placed at terrain height
  - Characters spawned at terrain height
  - Added `setWorld()` to SimulationLoop for terrain-aware construction
  - Updated `placeBuilding()` and `autoConstructBuilding()` with optional world parameter

## Verification

```
npx tsc --noEmit  ✓ (passed)
```

## Summary

Terrain now generates smooth deterministic noise without random holes. All entities (buildings, roads, characters) are positioned at the correct terrain height. Auto-constructed buildings from the growth system also use terrain-aware placement.
