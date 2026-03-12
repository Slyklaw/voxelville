# VoxelVille

## What This Is

VoxelVille is a single-screen, browser-based city builder where a cartoony voxel city runs autonomously. Residents make their own decisions — going to work, shopping, partying, raising children — all without player input. The player's only control is a Play/Work slider that nudges residents between productivity and leisure. Think of it as a living diorama that breathes on its own.

## Core Value

A city that lives without you. The joy is watching it happen — citizens bustling to jobs, kids chasing each other, parties erupting on rooftops. If the autonomous simulation doesn't feel alive, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Full ECS simulation with needs system (hunger, energy, social, hygiene)
- [ ] Utility-based AI task selection with personality and slider weighting
- [ ] Play/Work slider that nudges task selection and build priority
- [ ] Population growth with housing/job assignment
- [ ] Building types: houses (3 variants), offices (2), stores (2), roads, parks, party halls, cleaning depots
- [ ] Character types: adult male (5 variants), adult female (5), child (8)
- [ ] Animation states: idle, walk, work, party, clean, sleep, build
- [ ] Three.js rendering with instanced mesh batching and cartoon shader
- [ ] Isometric orbit camera
- [ ] HUD overlay showing population and happiness
- [ ] Deterministic seeded world generation

### Out of Scope

- Multiplayer / online features — v1 is single-player, client-side only
- Sound effects — visual experience first, audio later
- Seasons / weather — cosmetic polish, defer to post-launch
- Mobile app — web-first, responsive later
- Save/load — not needed for demo experience

## Context

- Detailed design plan exists at `design.md` covering tech stack, art direction, simulation design, building models, character models, project structure, and milestones
- Tech stack: TypeScript + Three.js + React + Vite + Tailwind CSS
- ECS architecture with utility-based AI for autonomous citizen behavior
- MagicaVoxel `.vox` files for assets, converted to Three.js mesh at load time
- Performance targets: 60fps, ≤500 residents, ≤100k voxels rendered

## Constraints

- **Tech stack**: TypeScript strict mode, Three.js rendering, React UI — per design.md
- **Platform**: GitHub Pages — static site, no server, all logic client-side
- **Performance**: 60fps with 500 residents, ≤100k voxels, ≤5ms simulation tick
- **Asset pipeline**: MagicaVoxel → .vox → TypeScript voxel-array converter

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser-based (not Unity/Godot) | Zero install friction, runs in a tab | — Pending |
| Custom ECS over existing lib | Lightweight simulation, full control over component layout | — Pending |
| Custom VoxelMeshBuilder | Cartoony cubes need per-face color and rounded edges | — Pending |
| Utility-based AI (not FSM) | More emergent behavior, slider integration via weighted scoring | — Pending |
| GitHub Pages deployment | Free static hosting, easy to share playable demo | — Pending |

---
*Last updated: 2026-03-11 after initialization*
