# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** A city that lives without you — watching citizens make autonomous decisions, parties erupting, the city growing, all without player micromanagement.
**Current focus:** v1.2 Visual Verification & Tests — Defining requirements

## Current Position

Phase: 10 (defining requirements, about to start)
Plan: —
Status: Defining requirements for v1.2
Last activity: 2026-03-12 — Milestone v1.2 started

Progress: ░░░░░░░░░░ (v1.2: 0/1 phases)

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

| Phase | Plans | Status |
|-------|-------|--------|
| 7. Per-Instance Coloring | 1 | ✓ Complete |
| 8. Cartoon Shader | 1 | ✓ Complete |
| 9. Positioning & Terrain | 1 | ✓ Complete |

**Total plans completed (v1.0 + v1.1):** 17

**v1.2 Milestone:** Visual Verification & Tests (20 comprehensive test requirements)

| Phase | Plans | Status |
|-------|-------|--------|
| 10. Visual Verification Tests | 0 | ○ Not started |

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
- [Phase 7]: Per-instance coloring via neutral white material + setColorAt() per-voxel
- [Phase 09-positioning-terrain]: Fixed terrain noise to use deterministic calculation without rng.next() inside noise function
- [Phase 09-positioning-terrain]: Added getTerrainHeight() for entity positioning on terrain surface

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

### Phase 7 Accomplishments

- BuildingRenderer reworked for per-instance coloring (neutral material + setColorAt())
- CharacterRenderer reworked for per-instance coloring (neutral material + setColorAt())
- materialToColor() helper for converting material names to THREE.Color
- Pool sizing: model.voxels.length * maxInstances for capacity
- All update methods now update ALL voxel instances for buildings/characters

### Phase 8 Accomplishments

- OutlineRenderer class created with back-face technique (MeshBasicMaterial, BackSide, 1.08× scale)
- renderer.ts exports MeshWithOutline, createOutlineFor(), renderWithOutlines()
- Two-pass rendering: outlines first, then main meshes on top
- App.tsx creates outline pairs for terrain, building, and character meshes
- Outline meshes properly disposed on cleanup

### Phase 9 Accomplishments

- Fixed terrain noise bug: removed `rng.next()` from noise calculation
- Added deterministic water tile pattern
- Added `getTerrainHeight()` function for terrain-aware positioning
- Buildings placed at terrain height (sitting on surface)
- Characters spawned at terrain height (standing on surface)
- Roads placed at terrain height + 0.5

## Session Continuity

Last session: 2026-03-12
Status: **v1.1 Visual Polish milestone complete — all 9 phases done**
Resume file: None
