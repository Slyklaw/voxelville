# Stack Recommendations

**Domain:** Browser-based voxel city builder  
**Researched:** 2026-03-11  
**Confidence:** HIGH (based on design.md tech stack decisions)

## Core Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Language** | TypeScript | strict mode | Type safety for large simulation codebase |
| **Rendering** | Three.js | ^0.162.0 | GPU-efficient voxel rendering, instanced mesh batching |
| **Voxel Engine** | Custom `VoxelMeshBuilder` | N/A | Cartoony cubes need per-face color, rounded-edge bevel shader — too custom for off-the-shelf voxel libs |
| **Simulation** | Custom ECS | N/A | Citizens, buildings, and world tiles are entities; components drive AI state machines |
| **AI / Behaviour** | Utility-based AI | N/A | Weighted needs system for autonomous task selection |
| **UI** | React | ^18.3.1 | Slider widget, HUD overlay, React-controlled UI |
| **Styling** | Tailwind CSS | ^3.4.15 | Utility-first styling for UI overlay |
| **Build tool** | Vite + @vitejs/plugin-react-swc | ^5.4.11 | Fast dev server, HMR, ESM-native |
| **Testing** | Vitest | ^2.1.8 | Unit tests for simulation, fast execution |
| **Package manager** | pnpm | ^9 | Deterministic installs, monorepo-ready |
| **Shader plugin** | vite-plugin-glsl | ^1.3.1 | Inline GLSL shaders for cartoon outline effect |
| **Asset pipeline** | Custom Node script (tsx) | N/A | .vox (MagicaVoxel) → .glb (Three.js) converter |
| **Deployment** | GitHub Pages + Cloudflare CDN | N/A | No server needed; all logic runs client-side |

## Why Not Unity / Godot?

The game must run in a **browser tab** with zero install friction. Three.js gives direct GPU access, a mature ecosystem, and fine-grained instancing control for thousands of voxel cubes. The simulation is lightweight enough to run entirely client-side.

## Key Dependency Rationale

| Package | Purpose | Why This Package |
|---------|---------|------------------|
| `three` | 3D rendering | InstancedMesh for thousands of voxel cubes, WebGL2 support |
| `react` + `react-dom` | UI overlay | Slider widget, HUD stats — minimal UI, React is overkill but already in design |
| `vite` + `@vitejs/plugin-react-swc` | Build tooling | Fast HMR, ESM-native, good Three.js integration |
| `tailwindcss` | Styling | Quick UI styling without CSS files |
| `vite-plugin-glsl` | Shader bundling | Enables inline GLSL for cartoon shader |
| `vitest` | Testing | Fast unit tests, Jest-compatible API |
| `tsx` | TypeScript execution | Run model converter script without compilation |

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| WebGPU (unstable API) | Browser support inconsistent; WebGL2 is sufficient for voxel rendering |
| React Three Fiber | Unnecessary abstraction for this simple rendering pipeline |
| Cannon.js / Ammo.js | No physics needed — citizens move on grid, no collisions |
| Socket.io / WebSocket | No multiplayer — client-side only |
| IndexedDB / LocalStorage | No save system for v1 — seeded worlds are shareable via URL |
| Tailwind UI component library | Keep UI minimal — just slider and HUD text |
| Sass / Less | Tailwind covers styling needs |
| Redux / Zustand | React state not needed for simulation; use plain JS objects |

## Asset Pipeline Detail

```
MagicaVoxel (.vox)
    → scripts/convert-vox.ts (Node + tsx)
    → TypeScript voxel-array modules (src/models/generated/)
    → VoxelMeshBuilder (engine/voxel-mesh.ts)
    → Three.js InstancedMesh
```

- Minimal .vox parser (bundled in converter script)
- Palette extraction from .vox file
- Coordinate transformation: voxel grid → Three.js world space
- Output: `VoxelDefinition = { size: [x,y,z], voxels: number[][][] }`

## Confidence Notes

- **Three.js ^0.162.0** — Latest stable as of 2025, check official releases for updates
- **React 18.3.1** — Current stable, no major breaking changes expected
- **Vite 5.4.11** — Current stable, good Three.js plugin ecosystem
- **pnpm 9** — Deterministic installs, recommended for game projects
- Custom ECS and VoxelMeshBuilder — Not off-the-shelf, but justified by specific requirements (per-face colors, rounded bevels, weighted utility AI)

---

*Stack research for: VoxelVille — browser-based autonomous voxel city builder*
*Researched: 2026-03-11*
