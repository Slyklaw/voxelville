# Domain Pitfalls

**Domain:** Browser-based voxel city builder games
**Researched:** 2026-03-11
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Per-Voxel Draw Calls Instead of Instanced Rendering

**What goes wrong:**
Each voxel cube rendered as a separate Mesh object, causing thousands of individual draw calls. A single building with 200 voxels generates 200 draw calls; 500 buildings = 100,000 draw calls per frame.

**Why it happens:**
Three.js beginners treat voxels like regular 3D objects. Each voxel = one Mesh is intuitive but catastrophically unscalable.

**Consequences:**
- Frame rate drops below 10fps with ~500 buildings
- GPU bandwidth exhausted on draw call overhead
- Cannot add LOD or culling later without major refactor

**Prevention:**
Use Three.js `InstancedMesh` for all voxel rendering. Batch identical geometry (cube) into one draw call with per-instance transforms/colors. VoxelVille's `VoxelMeshBuilder` should output InstancedMesh-ready data.

**Detection:**
- Check `renderer.info.render.calls` — should be < 1000, not 100,000+
- Frame rate drops linearly with building count

**Phase to address:**
M1 — Voxel Renderer (must use InstancedMesh from day one)

---

### Pitfall 2: Simulation Tick Rate Decoupled from Frame Rate

**What goes wrong:**
Simulation runs on `setInterval` at fixed 4 ticks/sec while rendering runs at 60fps. Citizens teleport between grid cells, tasks complete instantly between frames, movement looks jerky.

**Why it happens:**
Developer thinks "simulation should be deterministic" → fixed timestep, but forgets to interpolate visual state between ticks.

**Consequences:**
- Characters teleport instead of walking smoothly
- Task completion feels instantaneous and glitchy
- Debugging simulation vs. rendering issues becomes painful

**Prevention:**
Separate simulation state from render state. Store `prevPosition` and `nextPosition` for each citizen. Interpolate position during render frame based on time since last tick. Or: run simulation at same rate as render (1/60th sec tick).

**Detection:**
- Citizens snap to grid positions instead of sliding
- Animation states don't match current action
- Frame rate independent of simulation tick count

**Phase to address:**
M2 — Characters (animation interpolation must be in initial architecture)

---

### Pitfall 3: Custom ECS Over-Engineering Before Core Loop Works

**What goes wrong:**
Full ECS with Entity/Component/System abstraction, typed arrays, dirty flags, and query systems built before any game logic runs. 3 weeks of architecture work with zero playable result.

**Why it happens:**
ECS is the "right" architecture for simulations. Developers build the framework first, thinking it will save time later. It doesn't.

**Consequences:**
- No working prototype for weeks → lose momentum
- ECS complexity hides bugs (entity leaks, component memory)
- Refactoring ECS is harder than refactoring plain objects

**Prevention:**
Start with plain TypeScript classes and arrays. Only introduce ECS structure when:
1. Core game loop is working (citizens move, eat, work)
2. Performance requires it (> 100 entities with frequent updates)
3. You know exactly which components are needed

**Detection:**
- More time spent on Entity/Component base classes than game logic
- No visible game state after 2+ weeks
- Refactoring "just the foundation" repeatedly

**Phase to address:**
M4 — Simulation Core (start simple, introduce ECS when justified)

---

### Pitfall 4: Voxel Asset Pipeline Complexity

**What goes wrong:**
Custom .vox parser, palette extraction, coordinate transformation, and TypeScript code generation built before any 3D scene renders. Parser bugs delay everything.

**Why it happens:**
MagicaVoxel is the design tool, so you "need" the converter before you can use any models. This is backwards.

**Consequences:**
- Asset pipeline bugs block all rendering work
- Tight coupling between converter output format and renderer
- Changing model format requires changing both converter AND renderer

**Prevention:**
1. Start with hardcoded voxel arrays in TypeScript (hand-coded models)
2. Build renderer working with simple arrays first
3. Add .vox converter only when hand-coding becomes tedious (> 10 models)
4. Keep converter output format simple: `number[][][]` (3D array of color indices)

**Detection:**
- More time on scripts/convert-vox.ts than src/engine/
- Models don't render correctly due to coordinate/palette mismatches
- Every model change requires rebuild + restart

**Phase to address:**
M0 — Scaffolding (use hardcoded arrays first, converter in M1)

---

### Pitfall 5: AI Utility System Weight Tuning Without Visual Feedback

**What goes wrong:**
Utility-based AI with 4+ weighted factors (needs, personality, slider, proximity) but no way to see why a citizen chose a task. Tuning weights is pure guesswork.

**Why it happens:**
Utility scoring is mathematically elegant. Developers implement the formula, then realize nobody knows what the weights should actually be.

**Consequences:**
- Citizens make "wrong" decisions (sleeping when hungry, ignoring work)
- Tuning becomes endless trial-and-error
- Play/Work slider has no visible effect (weight bonus too small or too large)

**Prevention:**
1. Build debug overlay showing: current task, utility scores for alternatives, weight values
2. Start with simple rule-based AI (if hungry → eat), add utility later
3. Make Play/Work slider effect large enough to see (±30% is good, start with ±50% for visibility)
4. Log task decisions to console for debugging

**Detection:**
- Citizens seem to make random choices
- Slider changes don't visibly change behavior
- "Tuning" sessions that never end

**Phase to address:**
M4 — Simulation Core (debug overlay from day one)

---

### Pitfall 6: Pathfinding on Unbounded Grid Without Spatial Indexing

**What goes wrong:**
A* pathfinding scans entire world grid for each citizen every tick. With 500 citizens and a 100x100 grid, that's 5,000,000 node evaluations per second.

**Why it happens:**
Grid is "only" 100x100 = 10,000 cells, seems small. But A* is called per citizen per path request, and path requests are frequent.

**Consequences:**
- Simulation tick takes > 5ms (budget is ≤ 5ms)
- Frame rate stutters during pathfinding bursts
- Cannot increase grid size or citizen count later

**Prevention:**
1. Cache paths when destination hasn't changed
2. Recalculate only when target moves or road network changes
3. Use hierarchical pathfinding: citizens navigate to local road, road network finds route, citizen navigates to building
4. Limit A* iterations per tick (time-slicing)

**Detection:**
- `performance.now()` delta for simulation tick > 5ms
- Frame drops coinciding with many citizens moving simultaneously
- Pathfinding time increases linearly with citizen count

**Phase to address:**
M4 — Simulation Core (pathfinding optimization before adding many citizens)

---

### Pitfall 7: React UI Re-Renders Killing Three.js Frame Rate

**What goes wrong:**
React state updates (slider changes, HUD numbers) cause React re-renders that trigger Three.js scene updates or layout thrashing. Slider interaction causes frame drops.

**Why it happens:**
React and Three.js both want to own the render loop. Without careful separation, React's virtual DOM diffing and re-rendering compete with Three.js's requestAnimationFrame.

**Consequences:**
- UI interactions (slider drag) cause visible stuttering
- HUD updates (population counter) cause micro-freezes
- Hard to debug because tools show "React" and "Three.js" as separate profiles

**Prevention:**
1. Use React refs for Three.js canvas — React mounts it once, never re-renders it
2. Keep simulation state in plain JS objects, not React state
3. React only renders UI overlay (slider, HUD text)
4. Use `useRef` for any data shared between React and Three.js
5. Debounce HUD updates (update every 100ms, not every frame)

**Detection:**
- Slider drag causes visible frame drops
- Chrome DevTools shows "Recalculate Style" during animation
- React DevTools profiler shows unexpected re-renders

**Phase to address:**
M0 — Scaffolding (correct React/Three.js integration pattern from start)

---

### Pitfall 8: Memory Leaks from Undisposed Three.js Geometries

**What goes wrong:**
Each building model creates new Geometry and Material objects. Buildings destroyed (or model variants swapped) without calling `geometry.dispose()` and `material.dispose()`. Memory grows until browser tab crashes.

**Why it happens:**
Three.js garbage collection is automatic for regular JS objects, but GPU memory (buffers, textures) requires explicit disposal. Easy to forget.

**Consequences:**
- Browser tab crashes after ~30 minutes of play
- Memory usage climbs steadily in DevTools
- "It works fine for 5 minutes" → crashes in production

**Prevention:**
1. Use shared Geometry/Material per model type (one cube geometry, materials per color)
2. Track all created objects in a disposal registry
3. Call `.dispose()` on Geometry/Material when model is no longer needed
4. Use Three.js `onBeforeRender`/`onAfterRender` for cleanup hooks

**Detection:**
- Chrome DevTools Memory tab: GPU memory grows without bound
- "Aw, Snap!" page after extended play
- `renderer.info.memory` increases over time

**Phase to address:**
M1 — Voxel Renderer (disposal pattern in initial implementation)

---

## Moderate Pitfalls

### Pitfall 9: Seeded RNG Not Truly Deterministic

**What goes wrong:**
Using `Math.random()` with a seed doesn't work because `Math.random()` ignores seeds. Or using a weak PRNG that has visible patterns.

**Why it happens:**
Developer assumes "seeded random = deterministic world" without checking that the RNG implementation is actually deterministic.

**Consequences:**
- World generation varies between sessions despite same seed
- Save/load doesn't reproduce exact state
- Reproducible bugs become unreproducible

**Prevention:**
Use a proper seeded PRNG (xoshiro128**, mulberry32, or Three.js `MathUtils.randInt` with seed). Never use `Math.random()` anywhere in the codebase.

**Detection:**
- Same seed produces different results on page refresh
- Bug reports that can't be reproduced

**Phase to address:**
M0 — Scaffolding (seeded RNG from day one)

---

### Pitfall 10: Over-Complex Building Placement Before Road Network Works

**What goes wrong:**
Implementing zoning rules (residential vs commercial), density controls, and adjacency bonuses before the basic "place building on grid" mechanic works.

**Why it happens:**
City builders have complex placement rules. Developers implement all rules upfront instead of layering them incrementally.

**Consequences:**
- Can't debug placement if basic grid logic is broken
- Rules interact in unexpected ways (zoning + adjacency + density)
- Refactoring placement rules is painful when they're deeply coupled

**Prevention:**
1. Start with: click grid cell → place any building
2. Add: buildings must be adjacent to road
3. Add: residential vs commercial zones
4. Add: density/leveling
Each step is testable before adding the next.

**Detection:**
- Placement logic is > 300 lines before any buildings appear on screen
- Multiple nested if-statements in placement validation
- "Edge cases" file grows faster than core logic

**Phase to address:**
M3 — Buildings (incremental placement rules)

---

### Pitfall 11: Cartoon Shader Complexity Before Flat Shading Works

**What goes wrong:**
Implementing outline effect (back-face render pass), per-face lighting, and edge detection before getting basic voxel colors rendering correctly.

**Why it happens:**
The cartoon look is the goal, so developers start with complex shaders instead of simple flat-color rendering.

**Consequences:**
- Shader bugs prevent any rendering from working
- Outline pass doubles draw calls (important for perf budget)
- Complex shaders are hard to debug (no console.log in GLSL)

**Prevention:**
1. Start with `MeshBasicMaterial` (flat color, no lighting)
2. Add simple directional lighting (one light, flat shading)
3. Add cartoon outline as separate render pass (optional polish)
4. Add per-face color variation last (subtle effect)

**Detection:**
- Black screen because shader has compilation error
- Outline artifacts (gaps, overlapping lines)
- More time in .glsl files than TypeScript

**Phase to address:**
M1 — Voxel Renderer (layer shader complexity)

---

### Pitfall 12: Character Animation as Per-Voxel Transforms Without Pooling

**What goes wrong:**
Each character has 6 body parts (head, torso, 2 arms, 2 legs), each updated individually per frame. 500 characters = 3,000 transform updates. Plus per-voxel color variations.

**Why it happens:**
Animation feels like it should update each body part. InstancedMesh batching by color/animation state is counterintuitive.

**Consequences:**
- Animation updates dominate frame time
- Cannot batch characters by animation state easily
- Adding new animation states requires new InstancedMesh pools

**Prevention:**
1. Pool characters by: model type + skin color + clothing color
2. Update instanced transforms per pool, not per character
3. Use simple animation: offset Y position + rotation, not per-bone
4. Consider using sprite sheets for distant characters (LOD)

**Detection:**
- `setMatrixAt` calls exceed 5000 per frame
- Animation smoothness decreases with character count
- Cannot add new character variants without new pools

**Phase to address:**
M2 — Characters (animation pooling from start)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| M0 — Scaffolding | Spending too long on build config before rendering works | Time-box to 3 days, get pixels on screen |
| M1 — Voxel Renderer | Per-voxel draw calls | Use InstancedMesh from line one |
| M2 — Characters | Animation complexity explosion | Pool by color/state, keep animation simple |
| M3 — Buildings | Over-engineering placement rules | Layer rules incrementally, test each layer |
| M4 — Simulation Core | ECS before working prototype | Use plain objects first, introduce ECS when justified |
| M5 — Slider | Weight tuning without visibility | Build debug overlay showing utility scores |
| M6 — Population | Growth without housing check | Validate housing vacancy before spawning |
| M7 — Polish | Scope creep (sound, particles, minimap) | Ship core first, polish is optional |

## Sources

- Three.js documentation: InstancedMesh performance guidelines
- WebGL best practices: draw call batching, memory management
- Browser game development: memory limits, frame budget constraints
- City builder genre analysis: SimCity, Cities: Skylines, Simulopolis

---

*Pitfalls research for: Browser-based voxel city builder*
*Researched: 2026-03-11*
