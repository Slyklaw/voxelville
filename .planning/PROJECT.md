# VoxelVille

## What This Is

VoxelVille is a single-screen, browser-based city builder where a cartoony voxel city runs autonomously. Residents make their own decisions — going to work, shopping, partying, raising children — all without player input. The player's only control is a Play/Work slider that nudges residents between productivity and leisure. Think of it as a living diorama that breathes on its own.

## Core Value

A city that lives without you. The joy is watching it happen — citizens bustling to jobs, kids chasing each other, parties erupting on rooftops. If the autonomous simulation doesn't feel alive, nothing else matters.

## Current State: v1.1 Shipped (2026-03-14)

VoxelVille v1.1 "Visual Polish" is complete. The game now renders with proper per-instance coloring, cartoon outlines, and correct terrain positioning.

**Shipped:**
- 10 phases, 19 plans, 25 requirements
- 4,917 LOC TypeScript
- 33 files changed (+2,497 / -112 lines)

**Next:** Planning v2.0 milestone — awaiting user direction on next focus area.

## Requirements

### Validated

- ✓ v1.0 Core Simulation — 17/17 requirements (Phases 1-6)
- ✓ v1.1 Visual Polish — 8/8 requirements (Phases 7-10)
  - ✓ VIS-01 through VIS-03: Per-instance coloring
  - ✓ VIS-04 through VIS-05: Cartoon shader
  - ✓ VIS-06 through VIS-08: Terrain positioning

### Active

- [ ] Define v2.0 requirements with `/gsd-new-milestone`

### Out of Scope

- Multiplayer / online features — v1 is single-player, client-side only
- Sound effects — visual experience first, audio later
- Seasons / weather — cosmetic polish, defer to post-launch
- Mobile app — web-first, responsive later
- Save/load — not needed for demo experience

## Context

- Tech stack: TypeScript + Three.js + React + Vite + Tailwind CSS
- ECS architecture with utility-based AI for autonomous citizen behavior
- MagicaVoxel `.vox` files for assets, converted to Three.js mesh at load time
- Performance: 60fps with 500+ voxels rendered
- **v1.1 shipped:** Per-instance coloring, cartoon outline shader, terrain positioning fix, visual verification test suite (130 tests)
- **Archived:** Milestone artifacts in `.planning/milestones/v1.1-ROADMAP.md`

## Constraints

- **Tech stack**: TypeScript strict mode, Three.js rendering, React UI
- **Platform**: GitHub Pages — static site, no server, all logic client-side
- **Performance**: 60fps with 500 residents, ≤100k voxels, ≤5ms simulation tick
- **Asset pipeline**: MagicaVoxel → .vox → TypeScript voxel-array converter

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser-based (Three.js) | Zero install friction, runs in a tab | ✓ Validated |
| InstancedMesh from day one | Thousands of cubes need batched draw calls | ✓ Validated — 60fps |
| Seeded deterministic RNG | Same seed = same world for sharing | ✓ Validated |
| Custom ECS over existing lib | Lightweight simulation, full control | ✓ Validated |
| Utility-based AI (not FSM) | More emergent behavior | ✓ Validated |
| Per-instance coloring | Multi-voxel models need correct colors | ✓ Shipped v1.1 |
| Cartoon outline shader | Back-face render pass for aesthetic | ✓ Shipped v1.1 |
| Terrain-aware positioning | Buildings must sit on terrain surface | ✓ Shipped v1.1 |

---
*Last updated: 2026-03-14 after v1.1 milestone completion*
