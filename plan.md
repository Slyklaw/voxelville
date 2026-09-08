# Voxelville — Implementation Plan (Minimum Viable Game)

A bare-bones but playable Minecraft-clone. The design doc is huge; this plan strips it down to the smallest set of features that still feels like Minecraft. Anything not listed here is **out of scope** until a later phase.

## Guiding principles

- **One running program beats ten half-built ones.** Every phase ends with something you can load in a browser and play.
- **No placeholders for finished features.** Phases that ship a feature must fully implement it; no "TODO: real textures later" stubs.
- **Procedural everything.** No external assets, no model files, no sound files — generate at runtime.
- **Single static folder, no build step.** Open `index.html` and play.
- **Vertical slices > horizontal layers.** A working block-placer with 3 block types beats a beautiful renderer with no world.
- **Each phase is independently playable.** If work stops after any phase, the game still works.

## Out of scope for the entire plan

These are deliberately deferred; the plan does not even mention them. Refer to `design.md` for the long-term target.

- Multiplayer / WebRTC
- Mob AI, mob spawning, hostile mobs, bosses
- Hunger, health regen, fall damage, status effects
- Crafting, smelting, brewing, enchanting, anvil
- Inventory UI (in v0.1 we use hotbar-only)
- Redstone, all block entities (chest, furnace, hopper, …)
- Structures (villages, temples, mineshafts, monuments, …)
- Nether, End, dimensions
- Resource packs, settings persistence, sound settings
- Procedural music
- Particle system (only minimal block-break particles)
- Animated textures (water, lava, fire, etc. are static)
- Biomes (single biome: plains-like)
- Per-block block states (all blocks are single-state)
- Slabs, stairs, fences, doors, beds, walls, panes, signs, banners, candles, … (just full cube blocks)
- Fluids (no water/lava — terrain is dry)
- Day/night cycle visuals (sky is static, ambient light is constant)
- Weather
- Mob drops, experience orbs, XP
- Sounds beyond a few procedural clicks
- Save format beyond raw binary dump
- Compression, encryption, chunk format optimization

## Scope (minimum viable)

The result of this plan is a game with:

- WebGL 2.0 renderer with custom shaders and texture atlas
- Procedural perlin-based terrain (overworld only, no biomes)
- Tree generation
- First-person camera with pointer lock
- Player physics: walking, sprinting, jumping, sneaking, gravity, AABB collision
- Block break / place with raycast, in survival feel (instant break for any block)
- Hotbar of 9 selectable block types
- Creative-mode flight
- Single-player only
- World persists across reloads via IndexedDB
- One biome, one set of "block types": grass, dirt, stone, sand, water (no flow), wood log, wood planks, leaves, glass, cobblestone, bedrock
- 8×8 chunk render distance (small but feels open)
- One static sky color, one ambient light level
- Block-break particle puff, hand-swing animation
- Procedural 16×16 textures for every block

That is enough to walk around, build, break, and reload.

---

## Phases

Each phase is a vertical slice. The game is **always playable** between phases.

### Phase 0 — Project skeleton & blank canvas
**Goal**: An HTML file opens, shows a black canvas, and reports FPS in the console. No errors, no warnings.

Tasks:
1. Create `index.html` with `<canvas id="gl">` filling the viewport, linked CSS, single `<script type="module" src="js/main.js">`.
2. Create `css/hud.css` (empty for now).
3. Create `js/main.js` entry that:
   - Obtains WebGL 2 context (fall back to WebGL 1 with a clear error message if unavailable).
   - Clears to dark blue.
   - Starts `requestAnimationFrame` loop with delta-time.
   - Logs FPS to console every second.
4. Add a `js/util/gl.js` helper for context creation + error reporting.

Done when: opening the file shows a solid dark blue screen and `console.log` reports ~60 FPS.

---

### Phase 1 — Hand-written WebGL triangle
**Goal**: One textured triangle proves the shader pipeline works end-to-end.

Tasks:
1. Add `js/engine/shader.js` with `compile` and `link` helpers, error reporting.
2. Add `js/engine/mesh.js` with VBO + attribute binding + drawArrays.
3. Add inline GLSL strings for `tri.vert` / `tri.frag` in `main.js`.
4. Generate one 16×16 RGBA texture procedurally (checkerboard) in `js/engine/texture.js`; upload via `texImage2D`.
5. Make the triangle rotate with time and fill the canvas.

Done when: a colored, rotating, textured triangle is visible, and resizing the window keeps it correct aspect.

---

### Phase 2 — Math & camera
**Goal**: A `mat4` and `vec3` library exists, plus a perspective camera that responds to mouse.

Tasks:
1. Add `js/util/math.js` with `vec3`, `mat4` (column-major, gl-matrix style), `perspective`, `lookAt`, `translate`, `rotate`, `scale`, `inverse`, `transpose`. Pure functions, no allocation surprises (return new arrays).
2. Add `js/engine/camera.js` with `Camera` class: position, yaw, pitch, FOV, aspect, near, far; `getView()`, `getProj()`, `getViewProj()`.
3. Add `js/engine/input.js` wrapping `KeyboardEvent`, `MouseEvent` + Pointer Lock. Exposes `keys` map and `mouse.dx/dy` per-frame.
4. In `main.js`, on canvas click, request pointer lock; apply `mouse.dy/dx` to pitch/yaw; render a 1m × 1m × 1m wireframe cube at the origin using the camera.

Done when: clicking the canvas locks the cursor; moving the mouse orbits around a visible cube; ESC releases the cursor.

---

### Phase 3 — Procedural texture atlas
**Goal**: One image holding tiles for every block we will ever ship, generated from code.

Tasks:
1. Add `js/engine/atlas.js` with a 256×256 (16×16 grid of 16×16 tiles) RGBA canvas.
2. Define a `BLOCKS` table in `js/world/block.js` (initial set: grass_top, dirt, stone, sand, water, log_side, log_top, planks, leaves, glass, cobblestone, bedrock — 12 tiles, only 11 needed; reserve the 12th for future expansion).
3. Each tile is a procedural function that writes 16×16 RGBA pixels using pixel-art-friendly rules (palette of 4 shades per material, dithered noise overlay, fixed patterns per material).
4. Upload the canvas as a single WebGL texture with `LINEAR` filtering and `CLAMP_TO_EDGE` (no mipmaps in v0.1; clamp to avoid bleeding between tiles).

Done when: a single fullscreen quad rendered with this atlas shows a grid of distinct tiles that match the block list.

---

### Phase 4 — Block mesh & first block in the world
**Goal**: One 1×1×1 textured cube rendered at world origin, lit.

Tasks:
1. Add `js/world/chunkmesh.js` with `buildBlockMesh(blockId, x, y, z)` that returns a vertex array and index array. For now, just produce all 6 faces (no culling); each face has 4 vertices, 6 indices, with face normal, atlas UV, and a constant light value.
2. Add vertex layout constants to `js/engine/mesh.js`.
3. Write `block.vert` and `block.frag` shaders:
   - `vert`: MVP transform, pass UV, normal, light.
   - `frag`: sample atlas, multiply by light, simple lambert on `dot(normal, lightDir)` with a fixed light direction.
4. Place a single stone block at (0, 0, 0) in `main.js` and render it through the camera.

Done when: a single textured, lit cube floats at the origin, orients correctly when the camera moves.

---

### Phase 5 — World container & infinite-feeling flat ground
**Goal**: An 8×8 chunk (16 blocks = 128×128 blocks) flat grass plain around the player.

Tasks:
1. Add `js/world/chunk.js` with `Chunk` class: 16×16×16 arrays for block IDs (start at -64 to 320, but for v0.1 only the layer Y=0..15 is needed). Lazy-allocate vertical slabs as needed.
2. Add `js/world/world.js` with `World` class:
   - `getBlock(x, y, z)`, `setBlock(x, y, z, id)`.
   - `chunks` map keyed by `cx,cx` (only X/Z for v0.1; vertical layer is implicit).
3. Add `js/world/noise.js` with `noise2D(x, z, seed)` returning -1..1 via classic 2D Perlin with 2 octaves.
4. In `main.js`, on startup, generate an 8×8 chunk area:
   - Top layer: grass.
   - 4 layers below: dirt.
   - Rest: stone.
   - Bedrock at Y = 0 (we are not using -64 yet, keep it simple).
5. Build a mesh for each chunk and render all of them.

Done when: the player spawns in the middle of a flat grassy plain; looking around shows grass on top, dirt/stone on the sides via chunk boundaries.

---

### Phase 6 — Player physics
**Goal**: The player walks on the ground, jumps, and can't fall through the world.

Tasks:
1. Add `js/physics/aabb.js` with `AABB` class.
2. Add `js/physics/collision.js` with `moveWithCollision(world, aabb, dx, dy, dz)` doing per-axis swept resolution against solid blocks.
3. Add `js/entity/player.js` with `Player`:
   - Position, velocity, yaw, pitch, onGround, flying flags.
   - `update(dt, input, world)`: applies gravity, jump, sprint, sneak; resolves collisions; updates camera target.
4. Hook into `main.js`: W/A/S/D + space + shift + ctrl. Sprint with `ctrl`? (No — sprint on double-tap W is overkill; use `left shift` to sneak, `left ctrl` to sprint; vanilla-flavored but minimal.)

Done when: player spawns at Y=10, falls, lands on grass, can walk, jump, sprint, sneak. Stays on the surface and doesn't tunnel through blocks.

---

### Phase 7 — Block break & place
**Goal**: Left-click breaks a block, right-click places a block.

Tasks:
1. Add `js/physics/raycast.js` with `raycastBlock(world, origin, dir, maxDist)` returning `{hit, x, y, z, face, nx, ny, nz}`.
2. Add `js/ui/hud.js` to draw a crosshair (CSS or canvas overlay) and a hotbar (9 slots, 1–9 keys to pick). Render the hotbar via a second canvas layered on top.
3. Add `js/world/block.js` `BLOCKS` registry with `id`, `name`, `isSolid`, `isTransparent`, `atlasIndex` (top, side, bottom indices).
4. In `main.js`, on left click: raycast, set block to 0 (air) at hit position.
5. On right click: raycast, place the currently selected hotbar block on the hit face (don't place if it would intersect player AABB).
6. Add selection box: highlight the targeted block by drawing a wireframe outline (use `LINES` with a thin shader; depth-test enabled).

Done when: I can place grass next to a stone wall, break it, and see the selection box follow my crosshair.

---

### Phase 8 — Texture faces per block
**Goal**: Grass has green top + dirt sides + dirt bottom; logs have wood on sides + top/bottom rings; water is blue and slightly transparent.

Tasks:
1. Extend `block.js` to support per-face atlas indices: `[+x, -x, +y, -y, +z, -z]`. Most blocks use the same tile on all faces; grass and logs use 3.
2. Update `chunkmesh.js` to look up face UVs from the block.
3. Add a transparent material pass:
   - Water and glass have `isTransparent: true`.
   - Chunk mesh is split into opaque + transparent sub-meshes; transparent is drawn last, sorted back-to-front by camera distance, alpha-blended.
4. Update `block.frag` to optionally discard alpha < 0.5 for glass.

Done when: grass looks correct, logs look correct, glass shows what's behind it, water is blue and translucent.

---

### Phase 9 — Face culling
**Goal**: Hidden faces between two solid blocks are not drawn.

Tasks:
1. In `chunkmesh.js`, when building a face, check the neighbor block on that side. If both blocks are opaque, skip the face. If the neighbor is air or transparent, draw it. Custom rule: never cull between two same-type transparent blocks (e.g., water-water).
2. Rebuild meshes only when a block changes within or adjacent to a chunk (mark dirty flag).

Done when: walking around the world shows the same visuals but the vertex count drops dramatically (verify via `gl.getParameter(MAX_ELEMENTS_VERTICES)` logging or similar).

---

### Phase 10 — Procedural terrain
**Goal**: The world is no longer flat. Hills, valleys, beaches, and trees.

Tasks:
1. In `world.js`, replace the flat top-layer logic with:
   - `noise2D(x, z)` for base height (2 octaves, amplitude 8).
   - `biomeNoise(x, z)` (single octave) — below 0 = beach sand, above 0 = grass. For v0.1, only two materials.
   - Clamp Y to 4..20.
2. Add surface decoration: 1 in 200 columns gets a tree.
3. Add `js/world/tree.js` with `placeTree(world, x, y, z)`: 4-block trunk of `log`; 5×5×3 leaf canopy using `leaves` block.
4. Regenerate the 8×8 chunk area on each fresh world.

Done when: I spawn into a hilly landscape with sand at low elevations, grass elsewhere, and a few trees scattered around. Walking through trees shows logs + leaves with correct faces.

---

### Phase 11 — Block selection by scroll wheel
**Goal**: Mouse wheel cycles the hotbar; 1–9 also work.

Tasks:
1. Add a `selectedSlot` to player state (0..8).
2. Bind `wheel` event with delta sign.
3. Bind `Digit1`..`Digit9`.
4. Update HUD to highlight selected slot.

Done when: I can swap between grass, dirt, stone, log, planks, leaves, glass, cobblestone, sand smoothly while building.

---

### Phase 12 — Creative flight
**Goal**: Press F to toggle fly; in fly, space goes up, shift goes down, no gravity.

Tasks:
1. Add `flying` flag to player, bound to `F` key.
2. In `update`, skip gravity when `flying`; use jump key for up velocity, sneak for down; horizontal speed slightly higher (5 m/s).
3. Show small "Flying: ON" text in HUD when active.

Done when: I can build tall structures by flying up, and feel the difference between walk and fly modes.

---

### Phase 13 — World persistence
**Goal**: Quit and reload the page; my world is still there.

Tasks:
1. Add `js/storage/save.js`:
   - `saveWorld(world, name)`: write all loaded chunks to IndexedDB as a single key under `world:<name>`. Use a compact binary format:
     - 8-byte header: magic `'VXV0'`, u32 version, u32 chunk count.
     - Per chunk: int32 cx, int32 cz, u32 byte length, then 16×16×(maxY-minY) bytes (one byte per block ID, no states, no light).
   - `loadWorld(name)`: read it back, populate world chunks.
2. On startup, if a saved world exists, load it; else generate a new one.
3. Save on every block change, debounced 500ms.
4. Add `F2` to manually save and log.

Done when: I build a small house, hit F2, refresh the page, and my house is still there with all blocks intact.

---

### Phase 14 — More blocks & the rest of the material list
**Goal**: Hotbar has all 11 blocks; creative inventory (no, just hotbar) shows them all.

Tasks:
1. Extend `BLOCKS` table: add the missing tile (bedrock was implicit; add it). Ensure each has a procedural texture function.
2. Reorder hotbar: 0 grass, 1 dirt, 2 stone, 3 cobblestone, 4 sand, 5 log, 6 planks, 7 leaves, 8 glass.
3. Add bedrock only to debug: it's the bottom layer of the world; player can't break it (creative is a v0.2 concern; in v0.1 bedrock is unbreakable for simplicity).
4. Add a small block-info tooltip when hovering the hotbar (just block name).

Done when: all hotbar slots have visibly distinct blocks; I can build a varied structure with the full palette.

---

### Phase 15 — Block-break particles
**Goal**: Breaking a block spawns 8 small particles colored like the broken face.

Tasks:
1. Add `js/engine/particles.js` with a particle pool of 256 particles.
2. On block break, spawn 8 particles at the hit position with random velocity, colored from the face texture.
3. Each particle is a billboarded quad drawn with the atlas (or a 1×1 white quad tinted).
4. Particles age out over 0.5s with gravity.

Done when: breaking a block produces a small puff of colored particles. (This is a "feel" feature; cheap and worth shipping.)

---

### Phase 16 — First-person hand with swing animation
**Goal**: A visible right hand sits in the lower-right of the view at rest and swings down-and-back when the player left-clicks.

Tasks:
1. Build the hand in `js/entity/hand.js` as two boxes parented to **camera-local space** (right=+X, up=+Y, forward=-Z): forearm 0.26×0.26×0.36 m at `(0.34, -0.22, -0.70)`, fist 0.30×0.30×0.20 m coaxial with it, embedded 0.03 m into the forearm end so the joint is one solid arm with no gap or coplanar seam. The Y offset keeps the hand above the HUD hotbar even on tiny canvases; the Z keeps the back face of the forearm well past the 0.1 near plane so it doesn't z-clip.
2. Reuse the block shader + atlas (vertex layout is identical: pos3 + uv2 + light3 = 8 floats). Tint toward a skin tone via the light attribute (`[1.20, 1.05, 0.85]` — values > 1.0 brighten the tiles above their native palettes). Forearm uses planks (reads as a sleeve), fist uses sand (smooth pale tile that reads as skin) so the joint is visually defined.
3. Draw in a separate pass **after** the world: depth-test on, depth-write on, `CULL_FACE` disabled (faces rotate in and out of front-facing mid-swing; both sides must draw). Use `proj * handVertices` only — skip the view matrix because the hand's world position equals the camera's and the view would cancel out anyway.
4. Swing: rotate the whole arm around a **shoulder pivot** at `(0.42, -0.65, -0.35)` over 200 ms — pitch (stitched half-sine curve `0→-1→+0.3`, 22° amp; the snap-back past neutral is what reads as a swing) plus yaw 14° toward screen center, roll 8°, and 0.08 m forward thrust, the latter three on a `sin(π·t)` envelope so the fist arcs inward like a punch rather than seesawing around the wrist.
5. Trigger: on left-click (`Input.leftClick` edge), call `hand.triggerSwing()`; ignore re-triggers while one is in progress. `hand.update(dt)` advances `swingT` and clears `swinging` when `>= 0.20 s`.

Done when: at rest, the hand sits in the lower-right of the view at a readable size; clicking produces a visible down-and-back rotation; nothing clips the world or the HUD.

---

### Phase 17 — Chunk loading & unloading around player
**Goal**: Walk 100 blocks away from spawn and the world keeps generating.

Tasks:
1. Add a chunk loader: each tick, ensure chunks within `renderDistance = 4` (4 chunks = 64 blocks) of the player are loaded.
2. When a chunk is loaded, generate terrain (reuse Phase 10 logic) and mesh it.
3. When out of range, optionally keep it (v0.1: keep loaded; memory is cheap for this size).
4. Add a worker (`js/engine/worker.js`) for chunk meshing on a separate thread; main thread only uploads the VBO when ready.

Done when: walking far in any direction keeps showing hilly terrain; FPS stays reasonable.

---

### Phase 18 — Polish pass
**Goal**: The game feels done.

Tasks:
1. **Settings menu**: `Esc` opens a small panel with render distance slider (2–8), mouse sensitivity, fullscreen toggle. Stored in `localStorage`.
2. **Sky color**: pick a nicer horizon (sky-blue top, lighter horizon). Use a fullscreen sky quad drawn before the world with `gl.depthFunc(gl.LEQUAL)`.
3. **Fog**: linear fog from 32 to 80 blocks, color matching the sky.
4. **Cursor re-centering**: when window blurs, release pointer lock.
5. **Resize handler**: canvas matches `devicePixelRatio` capped at 2.
6. **Splash text on first load**: "Generating world…" with a progress bar.
7. **README**: short notes on controls and how to run a static server.
8. **Version constant** in `main.js` displayed bottom-right of the HUD.

Done when: I open the game and don't notice anything obviously wrong. The settings persist. The world looks clean at the default distance.

---

## Final scope check (post-Phase 18)

- [x] WebGL 2.0 custom renderer with hand-written shaders and procedural texture atlas
- [x] Procedural Perlin-based terrain
- [x] Trees
- [x] First-person camera with pointer lock
- [x] Walk, sprint, jump, sneak, gravity, AABB collision
- [x] Block break and place via raycast
- [x] Hotbar of 9 block types, mouse wheel + number keys
- [x] Creative-style flight toggle
- [x] Single-player only
- [x] World persists across reloads via IndexedDB
- [x] One biome (plains-like)
- [x] 11 block types: grass, dirt, stone, cobblestone, sand, log, planks, leaves, glass, water, bedrock
- [x] 4×4 chunk render distance (configurable up to 8)
- [x] One sky color, one ambient light level
- [x] Block-break particles
- [x] Hand-swing animation
- [x] Settings persistence, fullscreen, sensitivity

Each phase is independently testable; the game is always playable between phases.
