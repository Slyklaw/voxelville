# Roadmap: VoxelVille

## Overview

VoxelVille evolves from a basic Three.js renderer to a living autonomous city. The journey builds incrementally: first a 3D voxel world, then animated characters, buildings, autonomous simulation, player controls, and finally self-sustaining growth. Each phase delivers a complete, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Engine Foundation** - Three.js renderer, camera, infrastructure
- [x] **Phase 2: Characters** - Animated character models with smooth movement
- [ ] **Phase 3: Buildings** - Building models and grid placement
- [ ] **Phase 4: Simulation** - Autonomous citizen behavior with needs and AI
- [ ] **Phase 5: UI Controls** - Play/Work slider and city statistics HUD
- [ ] **Phase 6: Population Growth** - Automatic city growth and expansion

## Phase Details

### Phase 1: Engine Foundation
**Goal**: Users can see a 3D voxel world rendered in the browser with basic camera controls
**Depends on**: Nothing (first phase)
**Requirements**: REND-01, UI-03, INFRA-01, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User can open the application and see a 3D voxel grid rendered at 60fps
  2. User can orbit the camera around the voxel world using mouse controls
  3. User can see that the world generation is deterministic (same seed produces same layout)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project setup with Vite, TypeScript, Three.js, React, and Tailwind
- [x] 01-02-PLAN.md — InstancedMesh voxel renderer with seeded deterministic world generation
- [x] 01-03-PLAN.md — OrbitCamera with mouse controls and React canvas ref mounting

### Phase 2: Characters
**Goal**: Users can see animated characters in the voxel world with smooth movement
**Depends on**: Phase 1
**Requirements**: REND-02, REND-04, INFRA-02
**Success Criteria** (what must be TRUE):
  1. User can see multiple character models (male, female, child variants) in the world
  2. User can see characters transitioning between animation states (idle, walk, etc.)
  3. User can see characters moving smoothly without teleporting between simulation ticks
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Character model definitions and instancing pools (5 male, 5 female, 8 child)
- [x] 02-02-PLAN.md — Animation system with state interpolation and simulation/render separation

### Phase 3: Buildings
**Goal**: Users can see buildings placed in the voxel world
**Depends on**: Phase 1
**Requirements**: REND-03
**Success Criteria** (what must be TRUE):
  1. User can see various building types (houses, offices, stores, roads, parks, etc.) rendered in the world
  2. User can see buildings placed in a grid pattern with roads connecting them
  3. User can distinguish between different building types by their appearance
**Plans**: 2 plans

Plans:
- [ ] 03-01: Building model definitions and voxel mesh generation
- [ ] 03-02: Grid placement system with road network and building adjacency rules

### Phase 4: Simulation
**Goal**: Users can see autonomous citizen behavior driven by needs and AI
**Depends on**: Phase 2, Phase 3
**Requirements**: SIM-01, SIM-02, SIM-03
**Success Criteria** (what must be TRUE):
  1. User can see citizens moving to different buildings (work, home, shops, etc.)
  2. User can see citizens performing activities at buildings (working, sleeping, shopping)
  3. User can see citizens' needs affecting their behavior (e.g., hungry citizens go to stores)
**Plans**: 3 plans

Plans:
- [ ] 04-01: ECS foundation with needs system (hunger, energy, social, hygiene decay)
- [ ] 04-02: Utility-based AI task selection with personality and slider weighting
- [ ] 04-03: A* pathfinding on road grid with path caching

### Phase 5: UI Controls
**Goal**: Users can interact with the simulation via a Play/Work slider and view city stats
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, GROW-03
**Success Criteria** (what must be TRUE):
  1. User can adjust the Play/Work slider and see changes in citizen behavior (more work vs leisure)
  2. User can see population count and happiness meter updating in real-time
  3. User can see the slider affecting building construction priorities (more work = offices, more play = parks)
**Plans**: 2 plans

Plans:
- [ ] 05-01: Play/Work React slider component with weight integration to AI task selection
- [ ] 05-02: HUD overlay with population count and happiness meter (debounced updates)

### Phase 6: Population Growth
**Goal**: Users can see the city grow automatically with new residents and buildings
**Depends on**: Phase 4, Phase 5
**Requirements**: GROW-01, GROW-02
**Success Criteria** (what must be TRUE):
  1. User can see new residents appearing when housing vacancy is available
  2. User can see new buildings being constructed automatically when population demands
  3. User can see the city happiness influencing population growth rate
**Plans**: 2 plans

Plans:
- [ ] 06-01: Population growth with housing vacancy checks and happiness threshold
- [ ] 06-02: Auto-construction system with slider-influenced build priorities

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Engine Foundation | 3/3 | Complete | 2026-03-11 |
| 2. Characters | 2/2 | Complete | 2026-03-11 |
| 3. Buildings | 0/2 | Not started | - |
| 4. Simulation | 0/3 | Not started | - |
| 5. UI Controls | 0/2 | Not started | - |
| 6. Population Growth | 0/2 | Not started | - |