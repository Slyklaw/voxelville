# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** A city that lives without you — watching citizens make autonomous decisions, parties erupting, the city growing, all without player micromanagement.
**Current focus:** Phase 7: Per-Instance Coloring

## Current Position

Phase: 7 of 9 (Per-Instance Coloring)
Plan: 01 ready to execute
Status: Plan created and verified ✓
Last activity: 2026-03-11 — Phase 7 plan created (1 plan, 2 tasks)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed (v1.0): 14
- v1.0 status: All phases complete ✓

**v1.0 Milestone Summary:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Engine Foundation | 3 | ✓ Complete |
| 2. Characters | 2 | ✓ Complete |
| 3. Buildings | 2 | ✓ Complete |
| 4. Simulation | 3 | ✓ Complete |
| 5. UI Controls | 2 | ✓ Complete |
| 6. Population Growth | 2 | ✓ Complete |

**v1.1 Milestone:** Visual Polish (per-instance coloring, cartoon shader, positioning fixes)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- [Phase 1]: Used bun instead of pnpm (pnpm not available in environment)
- [Architecture]: Materials auto-initialize on first `getMaterial()` call (lazy init pattern)
- [Phase 2]: Sim/render state separation with 250ms interpolation between 4 ticks/sec and 60fps
- [Phase 2]: Character rendering via InstancedPool per variant (18 pools for 5+5+8 models)
- [Phase 3]: Building models follow same InstancedPool per type pattern as CharacterRenderer
- [Phase 3]: Road auto-connect uses directional connectivity bits, not procedural edge generation
- [Phase 3]: Grid placement is incremental (basic adjacency first, zoning later — avoiding Pitfall 10)
- [Phase 4]: Exponential decay formula for needs (rate * 1 + current) for realistic urgency scaling
- [Phase 4]: Utility scoring: 40% needs, 30% personality, 30% proximity
- [Phase 4]: A* pathfinding with 1-second cache on RoadGrid (time-sliced for performance)

### Phase 1 Accomplishments

- Vite + React + TS + Three.js project scaffold
- InstancedMesh batching for voxel rendering at 60fps
- Seeded deterministic world generation (mulberry32 PRNG)
- Orbit camera with drag-to-orbit and scroll-to-zoom
- React canvas ref mounting (decoupled from React re-renders)
- Proper GPU resource disposal on cleanup

### Phase 2 Accomplishments

- 18 character model definitions (5 male, 5 female, 8 child)
- CharacterRenderer with per-variant InstancedMesh pools
- Sim/render state separation with 250ms interpolation
- Animation states (idle, walk, work, party, clean, sleep, build) with transforms
- CharacterStateManager for entity lifecycle
- Demo: 20 characters spawn with random animation cycling

### Phase 3 Accomplishments

- 13 building models across 7 categories (houses, offices, stores, roads, parks, party halls, depots)
- 12 new materials (brick, roof, office, store, wood, etc.)
- BuildingRenderer with per-type InstancedMesh pools
- RoadGrid with directional auto-connect
- GridPlacement with road adjacency rules
- Demo: road cross pattern with buildings placed via grid rules

### Phase 4 Accomplishments

- Needs system: hunger, energy, social, hygiene decay at different rates (4 ticks/sec)
- AI task selection: utility scoring with needs/personality/proximity + weighted random
- A* pathfinding on road grid with 1-second path caching
- Movement system: characters navigate between buildings smoothly
- SimulationLoop: integrated tick system with needs, AI, and movement

### Phase 5 Accomplishments

- Play/Work slider with ±15% AI weight bonus
- Shared uiState module (sliderValue, buildPriority, population, happiness)
- Hud component with population count and happiness meter (100ms polling)
- computeSliderBonus() integrated into AI task selection

### Phase 6 Accomplishments

- GrowthSystem with spawn checks every 30 seconds
- Auto-construction every 60 seconds based on population demand
- Housing vacancy detection from buildings
- Happiness threshold gates for population growth
- SimulationLoop extended with spawn and construction tick logic

## Session Continuity

Last session: 2026-03-11
Status: **v1.0 complete, v1.1 starting** — visual polish milestone
Resume file: None
