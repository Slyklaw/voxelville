# Phase 6: Population Growth - Planning Summary

**Phase:** 06-population-growth
**Plans Created:** 2
**Waves:** 2
**Total Tasks:** 5
**Requirements Covered:** GROW-01, GROW-02

## Wave Structure

| Wave | Plans | Autonomous | Dependencies |
|------|-------|------------|--------------|
| 1 | 06-01 | yes | Phase 4, Phase 5 |
| 2 | 06-02 | yes | 06-01 |

## Plans Summary

### 06-01: Population Growth with Housing Vacancy Checks

**Objective:** Implement automatic population spawning when housing vacancy exists and city happiness exceeds threshold (0.6).

**Key Components:**
- Building interface extension with `capacity` and `occupancy` fields
- Growth constants configuration (spawn interval, thresholds)
- Population spawn logic with 30-second intervals
- Character model selection from existing 18 variants

**Files Modified:**
- `src/simulation/types.ts` — Building interface extension
- `src/simulation/growth-system.ts` — Core growth logic
- `src/simulation/simulation-tick.ts` — Integration with spawn tick
- `src/models/buildings.ts` — Capacity values for building definitions

**Tasks:** 3

### 06-02: Auto-construction System with Slider-influenced Build Priorities

**Objective:** Implement automatic building construction based on population demand, with slider-influenced building selection priorities.

**Key Components:**
- Building demand detection (housing/workplace/leisure shortages)
- Slider-weighted building priority system
- Auto-construction rules with building selection logic
- Building placement algorithm adjacent to road grid

**Files Modified:**
- `src/simulation/growth-system.ts` — Construction demand and placement logic
- `src/simulation/road-grid.ts` — `getAllTiles()` method already exists
- `src/simulation/grid-placement.ts` — Reuse existing `canPlaceBuilding` and `placeBuilding`

**Tasks:** 2

## Must-Haves (Goal-Backward Derived)

### Truths (Observable Behaviors)
1. User can see new residents appearing when housing vacancy is available
2. User can see new buildings being constructed automatically when population demands
3. User can see the city happiness influencing population growth rate
4. User can see slider position affecting which types of buildings are constructed

### Artifacts
- `src/simulation/growth-system.ts` — Core spawn/construction logic
- `src/simulation/types.ts` — Building interface with occupancy tracking
- Capacity data in `src/models/buildings.ts`

### Key Links
- Growth system → CharacterStateManager (spawn)
- Growth system → BuildingRenderer + GridPlacement (construction)
- Growth system → uiState.buildPriority (slider influence)
- Growth system → uiState.updateStats (population/happiness export)

## Integration Points

| Component | API Used | Status |
|-----------|----------|--------|
| CharacterStateManager | `createCharacter(entityId, modelId, position)` | Ready |
| BuildingRenderer | `addBuilding(modelId, position)` | Ready |
| GridPlacement | `canPlaceBuilding()`, `placeBuilding()` | Ready |
| uiState | `buildPriority`, `updateStats()`, `sliderValue` | Ready |
| RoadGrid | `getAllTiles()` | Ready |
| SeededRNG | `next()` for randomization | Ready |
| SimulationLoop | `tickCount` for spawn/construction intervals | Ready |

## Quality Gate Status

- [x] Happiness formula uses existing needs data (`simulation-tick.ts:121-133`)
- [x] Auto-construction uses existing BuildingRenderer and GridPlacement
- [x] Housing vacancy detection via building occupancy fields
- [x] Slider influence via existing uiState.buildPriority multipliers
- [x] All requirements covered (GROW-01, GROW-02)
