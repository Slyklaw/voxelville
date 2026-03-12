# Project Research Summary

**Project:** VoxelVille
**Domain:** Browser-based voxel city builder (autonomous simulation)
**Researched:** 2026-03-11
**Confidence:** HIGH

## Executive Summary

VoxelVille is a browser-based voxel city builder where autonomous citizens live in a cartoon-style 3D world, controlled solely by a "Play/Work" slider. This is a unique "living diorama" concept with zero micromanagement—the player observes, not manages. The research concludes this requires Three.js with InstancedMesh for rendering thousands of voxel cubes at 60fps, a custom ECS simulation layer for citizen AI, and React for minimal UI overlay.

The recommended approach prioritizes performance from day one (InstancedMesh batching), builds incrementally (hardcoded arrays before asset pipeline), and defers complexity (ECS introduced only when justified). The biggest risks are: per-voxel draw calls killing performance, simulation tick decoupling causing teleporting citizens, over-engineering ECS before any prototype works, and React UI interfering with Three.js rendering.

Key mitigation strategies include: separate simulation state from render state with interpolation, use InstancedMesh from the first renderer implementation, start with plain objects before introducing ECS patterns, and use React refs for canvas to prevent re-renders. The seeded RNG ensures deterministic, shareable worlds—critical for the product's viral sharing mechanic.

## Key Findings

### Recommended Stack

A client-side-only stack using Three.js for 3D rendering, React for UI, and Vite for build tooling. No server required—all logic runs in browser.

**Core technologies:**
- **Three.js ^0.162.0**: GPU-efficient voxel rendering with InstancedMesh batching — handles thousands of cubes
- **Custom ECS**: Citizens, buildings, and tiles as entities with components — drives AI state machines
- **React ^18.3.1**: Minimal UI overlay (slider + HUD) — slider widget control
- **Vite + SWR plugin**: Fast dev server with ESM-native support — Three.js integration
- **Custom VoxelMeshBuilder**: Per-face colors and rounded bevels — too custom for off-the-shelf voxel libs
- **Tailwind CSS ^3.4.15**: Utility-first styling for UI overlay
- **Vitest ^2.1.8**: Unit tests for simulation logic

**Not used:** WebGPU (unstable), React Three Fiber (unnecessary abstraction), physics engines (grid-based movement only), IndexedDB (seeded worlds shareable via URL).

### Expected Features

Features that make VoxelVille viable in the city builder genre.

**Must have (table stakes):**
- 3D voxel rendering — core visual identity
- Building placement — city builder definition
- Camera controls — user must navigate
- Resident simulation — city feels alive
- Population growth — city evolves over time
- Pathfinding — residents move logically
- Roads — enable movement between buildings
- Basic needs (hunger, energy, social, hygiene) — residents feel human
- HUD overlay — player sees city state
- Seeded world generation — deterministic starting state

**Should have (differentiators):**
- Play/Work slider (sole control) — unique zen autonomy, "living diorama"
- Fully autonomous simulation — no micromanagement
- Cartoon voxel aesthetic — visual charm, distinct from realistic builders
- Personality-driven AI — emergent behavior from playfulness/diligence traits
- Building auto-construction — AI mayor logic, player remains observer

**Defer (v2+):**
- Sound effects — visual experience first
- Seasons/weather — cosmetic polish
- Combat/disasters — breaks peaceful vibe
- Save/load system — seeded worlds are shareable
- Multiplayer — scope creep, client-side only
- Mobile app — browser tab only for v1

### Architecture Approach

A four-layer architecture with clear boundaries: Engine (rendering), Simulation (state), Models (static data), UI (React overlay). The simulation runs at 4 ticks/sec via setInterval while rendering runs at 60fps. Citizens interpolate between ticks to avoid teleporting. The ECS structure uses entities (uint32) with position, voxel model, resident, building, and world tile components.

**Major components:**
1. **Engine Layer** (`src/engine/`): Three.js setup, InstancedMesh batching, cartoon shader, isometric camera
2. **Simulation Layer** (`src/simulation/`): ECS base, needs system, AI task selection (utility scoring), A* pathfinding, growth system
3. **Models Layer** (`src/models/`): Building/character model definitions, .vox parser converter
4. **UI Layer** (`src/ui/`): React App root, Play/Work slider component, HUD stats overlay

**Build order (from ARCHITECTURE.md):**
1. Engine Foundation → Voxel Renderer → Characters → Buildings → Simulation Core → Slider → Population Growth → Polish

### Critical Pitfalls

Research identified 8 critical and 4 moderate pitfalls to avoid.

1. **Per-voxel draw calls** — Use InstancedMesh from day one; 100,000 draw calls with 500 buildings kills performance. Detect via `renderer.info.render.calls`.
2. **Simulation tick decoupling** — Separate simulation state from render state; interpolate positions between 4 ticks/sec and 60fps renders to avoid teleporting.
3. **ECS over-engineering** — Start with plain TypeScript classes/arrays; introduce ECS only when core loop works and >100 entities exist.
4. **Asset pipeline complexity** — Use hardcoded voxel arrays first; add .vox converter only when hand-coding becomes tedious (>10 models).
5. **AI weight tuning without feedback** — Build debug overlay showing utility scores; start with ±50% slider effect for visibility.
6. **Pathfinding on unbounded grid** — Cache paths, recalculate only when targets move; limit A* iterations per tick.
7. **React UI killing frame rate** — Use React refs for canvas; React renders only UI overlay, not 3D scene; debounce HUD updates every 100ms.
8. **Memory leaks from undisposed geometries** — Share Geometry/Material per model type; track in disposal registry; call `.dispose()` when models are no longer needed.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Engine Foundation (M0)
**Rationale:** Get pixels on screen quickly; establish correct React/Three.js integration pattern from the start to avoid Pitfall 7 (UI killing frame rate).
**Delivers:** Vite project setup, Three.js renderer, basic camera, grid display, React canvas mount with refs.
**Addresses:** Camera controls (table stakes), seeded RNG utility (deterministic world).
**Avoids:** React UI re-renders killing Three.js frame rate (Pitfall 7).

### Phase 2: Voxel Renderer (M1)
**Rationale:** Core visual identity must be validated before adding simulation complexity. InstancedMesh from day one avoids Pitfall 1.
**Delivers:** InstancedMesh batching, cartoon shader (flat color + outline), model converter script, hardcoded voxel arrays for testing.
**Addresses:** 3D voxel rendering (table stakes), cartoon aesthetic (differentiator).
**Avoids:** Per-voxel draw calls (Pitfall 1), memory leaks from undisposed geometries (Pitfall 8), cartoon shader complexity before flat shading works (Pitfall 11).

### Phase 3: Characters (M2)
**Rationale:** Characters are the soul of the autonomous simulation. Animation interpolation must be in initial architecture to avoid Pitfall 2.
**Delivers:** Character model definitions (5 male, 5 female, 8 child), basic animation (idle, walk), character instancing pools with pooling by color/state.
**Addresses:** Resident simulation (table stakes), character variety (differentiator).
**Avoids:** Simulation tick decoupling (Pitfall 2), character animation complexity explosion (Pitfall 12).

### Phase 4: Buildings (M3)
**Rationale:** Buildings provide the city structure and enable population growth. Layer placement rules incrementally to avoid Pitfall 10.
**Delivers:** Building model definitions, grid placement, road network, simple placement rules (adjacency to road).
**Addresses:** Building placement (table stakes), roads (table stakes), basic building types (MVP).
**Avoids:** Over-complex building placement before road network works (Pitfall 10).

### Phase 5: Simulation Core (M4)
**Rationale:** Now that rendering works, introduce simulation. Start with plain objects, add ECS only when justified. Build debug overlay from day one for Pitfall 5.
**Delivers:** ECS base (Entity/Component/System), needs system (decay + satisfaction), AI task selection (utility scoring), A* pathfinding on road grid.
**Addresses:** Resident simulation (table stakes), basic needs (table stakes), personality-driven AI (differentiator), pathfinding (table stakes).
**Avoids:** ECS over-engineering (Pitfall 3), AI utility system weight tuning without visual feedback (Pitfall 5), pathfinding on unbounded grid (Pitfall 6).

### Phase 6: Play/Work Slider (M5)
**Rationale:** Core player interaction depends on AI system from Phase 5. Weight integration with slider must be visible.
**Delivers:** React slider component, weight bonus integration with AI task selection, build priority influence.
**Addresses:** Play/Work slider (differentiator, sole control).
**Avoids:** Slider weight tuning without visibility (extension of Pitfall 5).

### Phase 7: Population Growth (M6)
**Rationale:** Growth depends on working simulation (needs, housing vacancy) and building placement. Validate housing before spawning residents.
**Delivers:** Housing vacancy check, happiness threshold, resident spawn + home/job assignment.
**Addresses:** Population growth (table stakes), building auto-construction (differentiator).
**Avoids:** Growth without housing check (Pitfall 12 mitigation).

### Phase 8: Polish (M7)
**Rationale:** Core loop is working; add visual polish and remaining features. Scope creep is the main risk here.
**Delivers:** Building variants, party halls, parks, cleaning depots, character animations (walk, work, party, clean).
**Addresses:** Remaining table stakes and differentiators from MVP.
**Avoids:** Scope creep (sound, particles, minimap) — ship core first, polish is optional.

### Phase Ordering Rationale

- **Rendering before simulation** — Visual foundation must validate before adding complexity
- **Characters before buildings** — Characters are the soul; buildings serve them
- **Simulation before slider** — Slider is just a weight modifier on AI task selection
- **Slider before growth** — Population growth triggers building placement; slider influences AI priorities
- **Incremental complexity** — Hardcoded arrays → .vox converter, plain objects → ECS, simple rules → complex rules

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 5 (Simulation Core):** Complex integration between ECS, AI, and pathfinding; needs API research for utility scoring patterns
- **Phase 2 (Voxel Renderer):** Custom cartoon shader with outline effect; niche domain, sparse documentation

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Engine Foundation):** Well-documented Three.js setup, established Vite + React patterns
- **Phase 4 (Buildings):** Grid-based placement is standard in city builders
- **Phase 6 (Slider):** Simple UI component with weight integration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on design.md tech stack decisions; Three.js + InstancedMesh is proven pattern |
| Features | MEDIUM | Based on competitor analysis (Simulopolis, VoxelHamlet); autonomous simulation is niche |
| Architecture | HIGH | Based on design.md architecture deep-dives; clear component boundaries |
| Pitfalls | HIGH | Based on Three.js documentation, WebGL best practices, browser game development patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **Utility scoring formula:** The specific weighted formula for AI task selection needs validation during Phase 5 implementation. Start with ±50% slider effect for visibility, tune based on debug overlay feedback.
- **Shader complexity:** The cartoon outline effect (back-face render pass) should be added only after flat-color rendering works perfectly. May need shader debugging tools.
- **Character animation pooling:** The strategy for pooling characters by model type + skin color + clothing color needs testing with 500+ characters to validate performance.
- **Pathfinding optimization:** A* on road grid with path caching and time-slicing needs performance testing with varying citizen counts.

## Sources

### Primary (HIGH confidence)
- Three.js documentation — InstancedMesh performance guidelines, WebGL2 rendering
- Design.md architecture deep-dives — Component boundaries, data flow patterns
- Architecture.md build order — Phase structure and dependencies

### Secondary (MEDIUM confidence)
- Simulopolis (GitHub) — Autonomous citizen AI reference
- VoxelHamlet (GitHub) — Colony-builder structure
- Voxel Tycoon modding docs — Voxel asset size/coord conventions

### Tertiary (LOW confidence)
- Procedural_Smooth_Voxels (GitHub) — Technical voxel meshing patterns
- magical-voxel-3d-city-model (GitHub) — Voxel city asset conventions

---
*Research completed: 2026-03-11*
*Ready for roadmap: yes*
