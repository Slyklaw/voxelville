# Architecture Recommendations

**Domain:** Browser-based voxel city builder  
**Researched:** 2026-03-11  
**Confidence:** HIGH (based on design.md architecture deep-dives)

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                      Entry Point                         │
│  main.ts → Three.js renderer → InstancedMesh pools      │
│          → Simulation loop (requestAnimationFrame)      │
│          → Mount React UI root                          │
└──────────────┬───────────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │  Simulation    │  4 ticks/sec via setInterval
       │  tick()        │
       └───────┬────────┘
               │ writes component data
       ┌───────▼────────┐
       │ Render System  │  every frame via rAF
       │ - Update inst. │
       │   transforms   │
       │ - Apply anims  │
       │ - Draw scene   │
       └────────────────┘
```

## Component Boundaries

### Engine Layer (`src/engine/`)

| Module | Responsibility | Interfaces |
|--------|----------------|------------|
| `renderer.ts` | Three.js setup, camera, resize | Exports: `initRenderer()`, `render()` |
| `voxel-mesh.ts` | Cube geometry, per-face color, instancing | Exports: `VoxelMeshBuilder`, `buildInstanceData()` |
| `instancing.ts` | InstancedMesh pool management | Exports: `InstancedPool`, `updateTransforms()` |
| `materials.ts` | Cartoon shader (flat color + outline) | Exports: `createCartoonMaterial()` |
| `camera.ts` | Isometric-style orbit camera | Exports: `OrbitCamera`, `updateCamera()` |

### Simulation Layer (`src/simulation/`)

| Module | Responsibility | Interfaces |
|--------|----------------|------------|
| `world.ts` | World grid, tiles, chunk streaming | Exports: `World`, `getTile()`, `setTile()` |
| `entity.ts` | ECS: Entity, Component, System base | Exports: `Entity`, `Component`, `System` |
| `components/resident.ts` | Resident component + AI needs | Exports: `ResidentComponent`, `needs` |
| `components/building.ts` | Building component | Exports: `BuildingComponent`, `buildingType` |
| `components/position.ts` | Grid position component | Exports: `PositionComponent`, `gridPos` |
| `systems/ai-system.ts` | Task selection, utility scoring | Exports: `AISystem`, `selectTask()` |
| `systems/movement-system.ts` | A* pathfinding on road grid | Exports: `MovementSystem`, `findPath()` |
| `systems/needs-system.ts` | Need decay and satisfaction | Exports: `NeedsSystem`, `decayNeeds()` |
| `systems/growth-system.ts` | Population growth, building placement | Exports: `GrowthSystem`, `spawnResident()` |
| `systems/animation-system.ts` | Idle/walk/work/party animation | Exports: `AnimationSystem`, `updateAnimation()` |
| `config.ts` | Tuning constants (tick rate, rates, weights) | Exports: `CONFIG` |

### Models Layer (`src/models/`)

| Module | Responsibility | Interfaces |
|--------|----------------|------------|
| `buildings.ts` | Building model definitions (voxel arrays) | Exports: `buildingModels` |
| `characters.ts` | Character model definitions | Exports: `characterModels` |
| `converter.ts` | .vox → voxel-array parser | Exports: `parseVox()` |

### UI Layer (`src/ui/`)

| Module | Responsibility | Interfaces |
|--------|----------------|------------|
| `App.tsx` | React root, mounts canvas + overlay | Exports: `App` component |
| `Slider.tsx` | Play/Work slider component | Exports: `PlayWorkSlider` |
| `Hud.tsx` | Stats overlay (population, happiness) | Exports: `Hud` component |
| `index.css` | Tailwind directives | N/A |

### Utils Layer (`src/utils/`)

| Module | Responsibility | Interfaces |
|--------|----------------|------------|
| `rng.ts` | Seeded RNG for deterministic world | Exports: `SeededRNG` |
| `grid.ts` | 2D grid helpers | Exports: `Grid`, `neighbors()` |
| `math.ts` | Lerp, clamp, smoothstep | Exports: `lerp()`, `clamp()`, `smoothstep()` |

## Data Flow

```
[Simulation tick]
    → NeedsSystem: decay needs for all residents
    → AISystem: compute utility scores, select tasks
    → MovementSystem: A* pathfinding, update positions
    → GrowthSystem: check housing vacancy, spawn new residents
    → AnimationSystem: update animation states

[Render frame]
    → Read simulation component data
    → Update InstancedMesh transforms (per character, per building)
    → Apply animation offsets (Y-bob, leg alternation)
    → Render scene with cartoon shader
    → React UI reads simulation state (debounced, every 100ms)
```

## Entity-Component-System Structure

```
Entity = uint32
  ├── Position { x, y, z }
  ├── VoxelModel { meshId, instancedIndex }
  ├── Resident {
  │     gender, age, personality{playfulness, diligence},
  │     needs{hunger, energy, social, hygiene},
  │     currentTask, taskQueue, homeId, workplaceId
  │   }
  ├── Building {
  │     type: 'house'|'road'|'office'|'store'|'park'|'partyhall'|'cleaningdepot',
  │     capacity, occupancy[], level
  │   }
  └── WorldTile { x, z, terrainType }
```

## Build Order (Dependencies)

```
Phase 1: Engine Foundation
  └── Vite + Three.js + React project setup
  └── Camera, grid, renderer
  └── No simulation yet — just rendering

Phase 2: Voxel Renderer
  └── InstancedMesh batching
  └── Cartoon shader (flat color + outline)
  └── Model converter script
  └── Hardcoded voxel arrays for testing

Phase 3: Characters
  └── Character model definitions (5 male, 5 female, 8 child)
  └── Basic animation (idle, walk)
  └── Character instancing pools

Phase 4: Buildings
  └── Building model definitions (houses, offices, stores, etc.)
  └── Building placement on grid
  └── Road network

Phase 5: Simulation Core
  └── ECS base (Entity, Component, System)
  └── Needs system (decay + satisfaction)
  └── AI task selection (utility scoring)
  └── Movement system (A* pathfinding)

Phase 6: Play/Work Slider
  └── React slider component
  └── Weight bonus integration with AI
  └── Build priority influence

Phase 7: Population Growth
  └── Housing vacancy check
  └── Happiness threshold
  └── Resident spawn + home/job assignment

Phase 8: Polish
  └── Sound effects (optional)
  └── Particles (construction, party confetti)
  └── Minimap (optional)
  └── Performance pass
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Separate simulation/render state | Citizens interpolate between ticks (avoid teleporting) |
| InstancedMesh batching | Thousands of cubes require batched draw calls |
| Plain objects before ECS | Avoid over-engineering; introduce ECS when justified |
| Hardcoded arrays before .vox converter | Get rendering working first, add pipeline later |
| React refs for Three.js canvas | Prevent React re-renders from affecting render loop |
| Debounced HUD updates | Update stats every 100ms, not every frame |
| Shared geometry/material per model | Minimize GPU memory, enable disposal tracking |

## Component Boundaries Summary

- **Engine** → owns rendering, no simulation knowledge
- **Simulation** → owns state, no rendering knowledge
- **Models** → static data, no engine or simulation knowledge
- **UI** → reads simulation state (debounced), writes slider value
- **Utils** → pure functions, no side effects

---

*Architecture research for: VoxelVille — browser-based autonomous voxel city builder*
*Researched: 2026-03-11*
