# VoxelVille — Product Design Plan

## 1. Vision & Concept

**VoxelVille** is a single-screen, browser-based city builder where a cartoony voxel city runs on its own. The player's sole input is a **Play/Work slider** that nudge-residents between productivity and leisure. Think of it as a living diorama: houses spring up, citizens bustle to jobs, kids chase each other, parties erupt on rooftops, and the whole city breathes — all autonomously.

The aesthetic is inspired by the blocky-but-polished style seen in projects like [magical-voxel-3d-city-model](https://github.com/tarabaz/magical-voxel-3d-city-model) — low-poly, pastel-coloured voxels with a toy-like charm — blended with the "almost-real" voxel smoothness explored in [MrBean1512/Procedural_Smooth_Voxels](https://github.com/MrBean1512/Procedural_Smooth_Voxels).

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Language** | TypeScript (strict mode) | Type safety for large simulation codebase |
| **Rendering** | Three.js (`^0.162.0`) with custom InstancedMesh batching | GPU-efficient rendering of thousands of voxel cubes per frame |
| **Voxel Engine** | Custom `VoxelMeshBuilder` on top of `@types/three` | Cartoony cubes need per-face color, rounded-edge bevel shader — too custom for off-the-shelf voxel libs |
| **Simulation** | Custom ECS (Entity-Component-System) | Citizens, buildings, and world tiles are entities; components drive AI state machines |
| **AI / Behaviour** | Utility-based AI with weighted needs (inspired by [Simulopolis](https://github.com/pvigier/Simulopolis)'s autonomous-agent citizens) | Residents self-select tasks each tick based on personality, needs, and the Play/Work slider |
| **UI** | React 18 + Tailwind CSS | Slider widget, HUD overlay, minimap |
| **Build tool** | Vite 5 + SWC | Fast dev server, HMR, ESM-native |
| **Testing** | Vitest + Playwright | Unit tests for simulation, visual regression for rendering |
| **Package manager** | pnpm 9 | Deterministic installs, monorepo-ready |
| **Asset pipeline** | Custom Node script: `.vox` (MagicaVoxel) → `.glb` (Three.js) | Design models in MagicaVoxel, export programmatically |
| **Deployment** | GitHub Pages (static) + Cloudflare CDN | No server needed; all logic runs client-side |

### Why not Unity / Godot?

The game must run in a **browser tab** with zero install friction. Three.js gives direct GPU access, a mature ecosystem, and fine-grained instancing control for thousands of voxel cubes. The simulation is lightweight enough to run entirely client-side.

---

## 3. Art Direction — Cartoony Voxel Style

### 3.1 Colour Palette

| Swatch | Hex | Use |
|---|---|---|
| `Sky` | `#87CEEB` | Background gradient |
| `Grass` | `#7EC850` | Ground tiles |
| `Road` | `#6B6B6B` | Street surfaces |
| `Brick` | `#C85A3A` | House walls |
| `Roof` | `#4A6FA5` | House roofs |
| `Office` | `#9BB8D3` | Office buildings |
| `Store` | `#E8C547` | Shop fronts |
| `Skin-light` | `#FFDAB9` | Characters |
| `Skin-dark` | `#C68642` | Characters |
| `Hair-brown` | `#5C3A21` | Characters |
| `Hair-black` | `#1A1A1A` | Characters |
| `Hair-blond` | `#F0D078` | Characters |
| `Hair-red` | `#B7410E` | Characters |
| `Clothing` | Pastel variants | Residents wear randomised pastel clothing |

All colours sit in a pastel register. Shadows are achieved via vertex-colour darkening rather than real-time shadows (performance + style).

### 3.2 Modelling Conventions

Inspired by [Voxel Tycoon's building guidelines](https://docs.voxeltycoon.xyz/guides/content-mods/creating-your-first-building-mod/):

- Every voxel = **1 metre** (game unit).
- Buildings ≤ **5 × 5 × 10 m** (except landmark structures).
- **Single mesh** per building on export; no loose parts.
- Coordinate origin at ground-plane centre, main facade along the **+Z** axis.
- Windows use dark colour `#272727`.
- Each model is **≤ 512 voxels** for buildings, **≤ 128 voxels** for characters.

### 3.3 Character Scale

Characters are **1 voxel wide × 2 voxels tall** (child) or **1 × 3 voxels** (adult). Arms add 1 voxel on each side. The head is 1 × 1 × 1 cube sitting atop the body stack. This keeps them readable but tiny against buildings.

---

## 4. Core Mechanic — The Play/Work Slider

```
[◄── MORE PLAY ──────────── MORE WORK ──►]
         ┌─────────────────────────┐
         │  ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  │  ← draggable thumb
         └─────────────────────────┘
```

- **Default position**: centre (50/50).
- **More Play** (left): residents prefer leisure — shopping, parties, parks, playgrounds, "play" tasks.
- **More Work** (right): residents prefer productivity — offices, shops, construction, cleaning.
- The slider does **not** override needs; it applies a **weight bonus** (±30 %) to task-category utility scores.
- The slider also affects **build priority**: more Work → faster office/store construction; more Play → faster park/party-hall construction.
- UI: a single React-controlled `<input type="range">` overlaying the bottom of the canvas.

---

## 5. Simulation Design

### 5.1 Entity-Component-System Overview

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

### 5.2 Task Categories

| Category | Tasks | Slider Affinity |
|---|---|---|
| **Work** | GoToWork, OperateOffice, OperateStore, Construct, CleanStreet | More Work ↑ |
| **Play** | GoToShop, GoToPark, AttendParty, Socialise, PlayAtPlayground | More Play ↑ |
| **Needs** | Eat, Sleep, Shower, Rest | Neutral |
| **Life** | Mate (at party or home), RaiseChild | Slight Play bias |

### 5.3 Decision Loop (per tick, ~4 times/sec)

```
for each resident:
  1. Decay needs (hunger++, energy++, social++, hygiene++)
  2. Compute utility for each available task:
       U(task) = w1*needSatisfaction + w2*personalityFit + w3*sliderBonus + w4*proximity
  3. Pick highest-U task (softmax with ε-greedy exploration)
  4. Execute movement (A* on road-grid) → perform task → repeat
```

### 5.4 Growth System

- New residents arrive when **housing vacancy > 0** and city happiness > threshold.
- New residents pick a **home** (vacancy) and a **workplace** (vacancy or nearest available).
- Buildings auto-construct when population demands it (AI mayor logic, inspired by [Simulopolis](https://github.com/pvigier/Simulopolis)'s autonomous-city concept).

---

## 6. Building Model Designs

All models are designed in **MagicaVoxel**, exported as `.vox`, and converted to Three.js InstancedMesh at load time.

### 6.1 House (3 variants)

**House A — Small Cottage** (3 × 3 × 4 voxels)
```
Layer 0 (ground):  [Brick][Brick][Brick]
                    [Brick][Door ][Brick]
                    [Brick][Brick][Brick]

Layer 1:           [Brick][Window][Brick]
                    [Brick][Brick ][Brick]
                    [Brick][Window][Brick]

Layer 2:           [Brick][Brick][Brick]
                    [Brick][Window][Brick]
                    [Brick][Brick][Brick]

Layer 3 (roof):    [Roof ][Roof ][Roof ]
                    [Roof ][Roof ][Roof ]
                    [Roof ][Roof ][Roof ]

                    Colour: Walls = #C85A3A, Roof = #4A6FA5
                    Occupancy: 2 adults + 0-2 children
```

**House B — Two-Storey** (4 × 4 × 6 voxels)
```
Ground: Brick walls, single door, two windows.
1st floor: Two windows per side.
2nd floor: Attic, dormer window.
Roof: Pitched, #8B4513 (saddlebrown).
Occupancy: 2-3 adults + 0-3 children.
```

**House C — Row House** (2 × 5 × 5 voxels)
```
Narrow and deep. Shared wall style.
Flat roof with slight parapet.
Occupancy: 1-2 adults + 0-1 child.
```

### 6.2 Road (1 tile = 1 × 1 × 0 voxels, flat)

```
Single flat tile: [Road] colour #6B6B6B.
Roads auto-connect: adjacent road tiles share edge lines
(darker grey stripes at boundaries).
Width: 1 voxel. Length: infinite (grid-aligned).
```

### 6.3 Office (2 variants)

**Office A — Small** (4 × 4 × 5 voxels)
```
Ground: Glass front (light blue #ADD8E6), brick sides.
Floors 1-3: Rows of dark windows #272727.
Flat roof, grey #808080.
Capacity: 4 workers.
```

**Office B — Tower** (3 × 3 × 8 voxels)
```
Tall, narrow. Repeating window pattern every 2 layers.
Antenna on top (1 voxel stick + red #FF0000 tip).
Capacity: 6 workers.
```

### 6.4 Store (2 variants)

**Store A — Corner Shop** (3 × 3 × 3 voxels)
```
Large display window (glass) on front face.
Awning stripe (#E8C547 and white alternating).
Sign board on roof edge.
Capacity: 2 workers, customers enter/exit.
```

**Store B — Market Stall** (2 × 2 × 2 voxels, open-front)
```
Wood frame (#8B4513), coloured produce boxes on counter.
Roof: fabric awning (red/white stripes).
Capacity: 1 worker.
```

### 6.5 Park (3 × 3 tile, ground-level)
```
[Grass] with [Tree] (1 trunk voxel + 3×3 leaf canopy of #228B22).
[Grass] with [Bench] (2-voxel bench).
[Grass] with [Flower] (single bright voxel: #FF69B4, #FFD700, #FF4500).
No walls. Open tile.
```

### 6.6 Party Hall (3 × 3 × 3 voxels)
```
Bright colours: walls #FF6B6B, roof #FFD93D.
Decorations: bunting (single coloured voxels along roof edge alternating #4ECDC4, #FF6B6B, #FFD93D).
Large open door.
Inside: dance floor tile (chequerboard).
Capacity: 12 residents socialise/dance.
```

### 6.7 Cleaning Depot (2 × 2 × 2 voxels)
```
Functional grey/green. Broom icon (yellow voxels on wall).
2 workers assigned to "CleanStreet" task.
```

---

## 7. Character Model Designs

All characters share a common skeleton: **head, torso, left-arm, right-arm, left-leg, right-leg** — each one voxel. Animation is via per-frame instanced-mesh transforms (position offset + slight rotation) rather than skeletal animation.

### 7.1 Adult Male (1 × 3 body + head = 4 voxels tall, 3 wide with arms)

```
        [Head ]                    Skin: #FFDAB9 or #C68642
       [Torso ]                    Hair: random from {#1A1A1A, #5C3A21, #B7410E, #F0D078}
      [L ][R ][L ][R ]            Clothing torso: random pastel {#5B9BD5, #70AD47, #ED7D31, #FFC000}
     [Leg][Leg][Leg][Leg]          Clothing legs: dark pastel {#3B3B3B, #2E4057, #4A3728}
```

**Variations:**
| ID | Hair | Skin | Clothing Torso |
|---|---|---|---|
| M1 | Black `#1A1A1A` | Light `#FFDAB9` | Blue `#5B9BD5` |
| M2 | Brown `#5C3A21` | Dark `#C68642` | Green `#70AD47` |
| M3 | Red `#B7410E` | Light `#FFDAB9` | Orange `#ED7D31` |
| M4 | Blond `#F0D078` | Light `#FFDAB9` | Yellow `#FFC000` |
| M5 | Black `#1A1A1A` | Dark `#C68642` | Red `#FF6B6B` |

### 7.2 Adult Female (same dimensions, hair voxel sits on top, skirt represented by wider hip voxel)

```
        [Head ]
       [Torso ]                    Skirt: hip voxel is 2-wide (extra voxel on right)
      [L ][R ][L ][R ]            Clothing: different pastel palette
     [Leg][Leg][Leg][Leg]
```

**Variations:**
| ID | Hair | Skin | Clothing Torso |
|---|---|---|---|
| F1 | Black `#1A1A1A` | Light `#FFDAB9` | Pink `#FF6B9D` |
| F2 | Brown `#5C3A21` | Dark `#C68642` | Teal `#4ECDC4` |
| F3 | Blond `#F0D078` | Light `#FFDAB9` | Lavender `#B19CD9` |
| F4 | Red `#B7410E` | Dark `#C68642` | Coral `#FF7F7F` |
| F5 | Black `#1A1A1A` | Light `#FFDAB9` | Mint `#98D8AA` |

### 7.3 Child (1 × 2 body + head = 3 voxels tall)

```
        [Head ]                    Proportionally larger head (1 × 1 × 1 = same as adult)
       [Torso ]                    Shorter body
      [L ][R ][L ][R ]            Bright, playful clothing colours
     [Leg][Leg][Leg][Leg]
```

**Variations:** 8 combos of hair/skin/clothing (same palette as adults, brighter clothing).

### 7.4 Animation States

| State | Animation | Duration |
|---|---|---|
| Idle | Subtle Y-bob (±0.05 voxel) | 1.2 s loop |
| Walk | Leg alternation + arm swing + Y-bob | 0.5 s per step |
| Work | Arm up-down + torso lean forward | 1.0 s loop |
| Party | Rapid Y-bounce + arm wave | 0.4 s loop |
| Clean | Arm sweep side-to-side | 0.8 s loop |
| Sleep | Lying flat (rotated 90° on Z) | static |
| Build | Arm raise + voxel "pop" particle | 0.6 s loop |

---

## 8. Project Structure

```
voxelville/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── favicon.svg
├── src/
│   ├── main.ts                  # Entry point — bootstrap Three.js, React, simulation
│   ├── engine/
│   │   ├── renderer.ts          # Three.js setup, camera, resize
│   │   ├── voxel-mesh.ts        # VoxelMeshBuilder — cube geometry, instancing
│   │   ├── instancing.ts        # InstancedMesh pool manager
│   │   ├── materials.ts         # Cartoon shader (flat color + outline)
│   │   └── camera.ts            # Isometric-style orbit camera
│   ├── simulation/
│   │   ├── world.ts             # World grid, tiles, chunk streaming
│   │   ├── entity.ts            # ECS: Entity, Component, System base
│   │   ├── components/
│   │   │   ├── resident.ts      # Resident component + AI needs
│   │   │   ├── building.ts      # Building component
│   │   │   └── position.ts      # Grid position component
│   │   ├── systems/
│   │   │   ├── ai-system.ts     # Task selection, utility scoring
│   │   │   ├── movement-system.ts # A* pathfinding on road grid
│   │   │   ├── needs-system.ts  # Need decay and satisfaction
│   │   │   ├── growth-system.ts # Population growth, building placement
│   │   │   └── animation-system.ts # Idle/walk/work/party animation
│   │   └── config.ts            # Tuning constants (tick rate, rates, weights)
│   ├── models/
│   │   ├── buildings.ts         # Building model definitions (voxel arrays)
│   │   ├── characters.ts        # Character model definitions
│   │   └── converter.ts         # .vox → voxel-array parser
│   ├── ui/
│   │   ├── App.tsx              # React root
│   │   ├── Slider.tsx           # Play/Work slider component
│   │   ├── Hud.tsx              # Stats overlay (population, happiness)
│   │   └── index.css            # Tailwind directives
│   └── utils/
│       ├── rng.ts               # Seeded RNG for deterministic world
│       ├── grid.ts              # 2D grid helpers
│       └── math.ts              # Lerp, clamp, smoothstep
├── assets/
│   ├── models/                  # .vox source files (MagicaVoxel)
│   │   ├── house_a.vox
│   │   ├── house_b.vox
│   │   ├── house_c.vox
│   │   ├── office_a.vox
│   │   ├── office_b.vox
│   │   ├── store_a.vox
│   │   ├── store_b.vox
│   │   ├── park.vox
│   │   ├── party_hall.vox
│   │   ├── cleaning_depot.vox
│   │   ├── road.vox
│   │   ├── char_male_1.vox … char_male_5.vox
│   │   ├── char_female_1.vox … char_female_5.vox
│   │   └── char_child_1.vox … char_child_8.vox
│   └── textures/                # (minimal — mostly vertex-colour)
│       └── palette.png          # 64×64 colour lookup (Voxel Tycoon style)
├── scripts/
│   └── convert-vox.ts           # Node script: .vox → TypeScript voxel-array modules
├── tests/
│   ├── ai.test.ts
│   ├── growth.test.ts
│   └── renderer.test.ts
└── README.md
```

---

## 9. Dependencies

```jsonc
// package.json
{
  "name": "voxelville",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "convert-models": "tsx scripts/convert-vox.ts",
    "lint": "eslint src/"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.162.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.162.0",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "@typescript-eslint/parser": "^8.15.0",
    "@vitejs/plugin-react-swc": "^3.7.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.15.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vite-plugin-glsl": "^1.3.1",
    "vitest": "^2.1.8"
  }
}
```

### Key Dependency Notes

| Package | Purpose |
|---|---|
| `three` | 3D rendering — InstancedMesh for thousands of voxel cubes |
| `@types/three` | TypeScript definitions |
| `react` + `react-dom` | UI overlay (slider, HUD) |
| `vite` + `@vitejs/plugin-react-swc` | Dev server with fast HMR |
| `tailwindcss` | Utility-first styling for UI overlay |
| `vite-plugin-glsl` | Inline GLSL shaders for cartoon outline effect |
| `vitest` | Unit testing |
| `tsx` | Run TypeScript scripts (model converter) directly |
| `autoprefixer` + `postcss` | CSS processing for Tailwind |

---

## 10. Setup & Run Instructions

### 10.1 Prerequisites

- **Node.js** ≥ 18.17
- **pnpm** ≥ 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **MagicaVoxel** (free) — for editing `.vox` asset files (optional for devs who only touch code)

### 10.2 Clone & Install

```bash
# Clone the repository
git clone https://github.com/<your-org>/voxelville.git
cd voxelville

# Install all dependencies
pnpm install
```

### 10.3 Convert Voxel Assets

The `.vox` files in `assets/models/` must be converted to TypeScript modules that define voxel arrays (coloured integer grids).

```bash
# Run the conversion script
pnpm convert-models
# → Generates src/models/generated/*.ts from assets/models/*.vox
```

The converter script (`scripts/convert-vox.ts`) does the following:
1. Reads each `.vox` file using a minimal VOX-parser (bundled, no extra dep).
2. Extracts the voxel grid + palette.
3. Emits a TypeScript file exporting `const model: VoxelDefinition = { size: [x,y,z], voxels: [...] }`.

### 10.4 Start Development Server

```bash
pnpm dev
# → Vite dev server starts at http://localhost:5173
# → Open in browser — the city auto-generates and simulates
```

**Hot Module Replacement** is active: edit any `.ts`/`.tsx` file and see changes instantly.

### 10.5 Run Tests

```bash
pnpm test
# → Vitest runs all tests in tests/
# → Coverage report in terminal
```

### 10.6 Build for Production

```bash
pnpm build
# → Compiles TypeScript, bundles with Vite
# → Output in dist/ directory
# → Deploy dist/ to any static host (GitHub Pages, Netlify, Cloudflare Pages)
```

### 10.7 Lint

```bash
pnpm lint
# → ESLint with TypeScript rules
```

---

## 11. Architecture Deep-Dives

### 11.1 Rendering Pipeline

```
┌──────────────────────────────────────────────┐
│                   main.ts                    │
│  1. Create Three.js renderer (WebGL2)        │
│  2. Create orthographic camera (isometric)   │
│  3. Init InstancedMesh pools per model-type  │
│  4. Start simulation loop (requestAnimFrame) │
│  5. Mount React UI root                      │
└──────────────┬───────────────────────────────┘
               │
       ┌───────▼────────┐
       │  Simulation    │  (4 ticks/sec via setInterval)
       │  tick()        │
       └───────┬────────┘
               │ writes component data
       ┌───────▼────────┐
       │ Render System  │  (every frame via rAF)
       │ - Update inst. │
       │   transforms   │
       │ - Apply anims  │
       │ - Draw scene   │
       └────────────────┘
```

Each voxel cube is a **1×1×1 unit box**. A building model is a collection of offset cubes. For a house with 200 voxels, we use one `InstancedMesh` with 200 instances. Updates each frame are just `setMatrixAt()` calls — extremely cheap.

### 11.2 Cartoon Shader (Outline)

A custom `ShaderMaterial` gives the cartoony look:

```glsl
// Vertex shader (simplified)
varying vec3 vNormal;
varying vec3 vWorldPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
}

// Fragment shader
uniform vec3 uColor;
varying vec3 vNormal;
void main() {
  // Flat lighting: two-step (lit / shadow)
  float light = dot(vNormal, normalize(vec3(1.0, 2.0, 1.5)));
  vec3 color = uColor * (light > 0.0 ? 1.0 : 0.7);
  gl_FragColor = vec4(color, 1.0);
}
```

A second **back-face** render pass with a thick black outline gives the comic-book border effect.

### 11.3 Road Grid & Pathfinding

The world is a **2D grid** (`WorldTile[][]`). Roads are tiles where `building.type === 'road'`. Pathfinding uses a simple **A\*** on this grid (4-directional). Buildings are placed on non-road tiles adjacent to roads (like city-block zoning).

### 11.4 Population Growth Algorithm

```
Every 30 seconds (game-time):
  happiness = average(all residents' need satisfaction)
  if happiness > 0.6 AND housingVacancy > 0:
    spawn new resident
    assign home (random vacant house)
    assign workplace (random vacant office/store)
```

### 11.5 Seeding & Determinism

A seeded PRNG (`src/utils/rng.ts`, xoshiro128**) ensures:
- Same seed → same initial terrain, same resident spawns.
- Slider changes are the only non-deterministic input.

---

## 12. Development Milestones

| Phase | Scope | Est. Duration |
|---|---|---|
| **M0 — Scaffolding** | Vite + Three.js + React project setup, camera, grid | 1 week |
| **M1 — Voxel Renderer** | InstancedMesh pipeline, cartoon shader, model converter | 2 weeks |
| **M2 — Characters** | 5 male, 5 female, 8 child models; walk/idle animation | 2 weeks |
| **M3 — Buildings** | All building models; placement on grid | 1 week |
| **M4 — Simulation Core** | ECS, needs system, AI task selection | 3 weeks |
| **M5 — Play/Work Slider** | Slider UI, weight bonus integration | 1 week |
| **M6 — Population Growth** | Auto-spawn residents, assign homes/jobs | 1 week |
| **M7 — Polish** | Sound effects, particles (construction, party confetti), minimap, stats | 2 weeks |
| **M8 — Deploy** | GitHub Pages deployment, performance pass | 1 week |

**Total estimated: ~14 weeks** (solo developer) or **~8 weeks** (2-person team).

---

## 13. Performance Budget

| Metric | Target | Strategy |
|---|---|---|
| Frame rate | ≥ 60 fps | InstancedMesh, no per-voxel draw calls |
| Residents on screen | ≤ 500 | Pool + LOD culling |
| Total voxels rendered | ≤ 100 000 | Merge static building meshes |
| Simulation tick | ≤ 5 ms | ECS with dirty-component batching |
| Initial load | ≤ 3 s | Vite code-split, lazy model loading |
| Memory | ≤ 256 MB | Typed arrays, no per-vertex garbage |

---

## 14. Future Considerations (Post-Launch)

- **Seasons** — visual changes (snow voxels, autumn tree colours).
- **Weather** — rain particle system, fog.
- **Natural disasters** — fire voxels, flood tiles (slider nudges toward "work" to rebuild).
- **Export/share** — screenshot camera, GIF recording of city timelapse.
- **Sound** — procedural ambient city sounds (chatter, traffic, music from party halls).

---

*This plan draws on voxel city-building patterns from [tarabaz/magical-voxel-3d-city-model](https://github.com/tarabaz/magical-voxel-3d-city-model), autonomous citizen AI concepts from [pvigier/Simulopolis](https://github.com/pvigier/Simulopolis), colony-builder structure from [michalusio/VoxelHamlet](https://github.com/michalusio/VoxelHamlet), voxel asset conventions from [Voxel Tycoon modding docs](https://docs.voxeltycoon.xyz/guides/content-mods/creating-your-first-building-mod/), and technical voxel-engine notes from [MrBean1512/Procedural_Smooth_Voxels](https://github.com/MrBean1512/Procedural_Smooth_Voxels).*

*Initial prompt: Create a product design plan for a CityBuilding web-game titled "VoxelVille". Specify what tech stack to use. Style should be cartoony voxel cube models. The only user input will be a slider that goes from "More Play" to "More Work", almost like the game plays itself. There should be a variety of residents going about their self-selected tasks like work, play, build, clean, shopping, parties, mating, etc. The Play/Work slider will nudge the residents to select slightly different tasks. Design a few models of Houses, Roads, Offices, Stores, etc. Design a few models of Males and Females, Adults and Children. Include details on how to setup the source code project, install dependencies, run the game, etc.*
