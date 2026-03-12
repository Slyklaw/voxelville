---
phase: 02-characters
phase_number: 2
planning_date: 2026-03-11
total_plans: 2
total_waves: 2
requirements: [REND-02, REND-04, INFRA-02]
---

# Phase 2: Characters — Planning Summary

## Overview

Phase 2 adds animated voxel characters to the city builder. Characters are 1×3 voxel adults or 1×2 voxel children with 6 body parts (head, torso, 2 arms, 2 legs). Animation uses InstancedMesh pooling by character variant with simple transform offsets (Y-bob, rotation) rather than skeletal animation. The critical architectural decision is **separating simulation state from render state** with interpolation to avoid teleporting citizens between 4 ticks/sec simulation and 60fps rendering.

## Plan Structure

| Plan | Objective | Tasks | Waves | Autonomous |
|------|-----------|-------|-------|------------|
| 02-01 | Character model definitions and instancing pools | 3 | 1 | true |
| 02-02 | Animation system with state interpolation | 4 | 2 | true |

## Execution Order

Plans execute sequentially across two waves. Wave 1 (Plan 02-01) creates character model definitions and instancing pools. Wave 2 (Plan 02-02) builds the animation system on top of the character renderer created in Wave 1.

## Requirement Coverage

| Requirement | Plan | Description |
|-------------|------|-------------|
| REND-02 | 02-01 | Character models defined (5 male, 5 female, 8 child variants with hair/skin/clothing) |
| REND-04 | 02-02 | Character animation states (idle, walk, work, party, clean, sleep, build) with interpolation |
| INFRA-02 | 02-02 | Simulation/render state separation — residents interpolate position between 4 ticks/sec and 60fps renders |

## Phase Success Criteria

From ROADMAP.md:

1. **User can see multiple character models (male, female, child variants) in the world** ✓ (Plan 02-01)
2. **User can see characters transitioning between animation states (idle, walk, etc.)** ✓ (Plan 02-02)
3. **User can see characters moving smoothly without teleporting between simulation ticks** ✓ (Plan 02-02)

## Technical Architecture

### Character Models (Plan 02-01)
- 18 character variants: 5 male, 5 female, 8 child
- Each variant defined as voxel array with {x, y, z, color}
- Per-variant InstancedPool for batched rendering
- Max 50 instances per variant = 900 total capacity

### Animation System (Plan 02-02)
- Dual-state architecture: SimulationState (grid positions) + RenderState (interpolated)
- Linear interpolation between simulation ticks (250ms per tick)
- Animation offsets: Y-bob, rotation for walk/party/etc.
- 7 animation states: idle, walk, work, party, clean, sleep, build

## File Modification Map

| File | Plans | Notes |
|------|-------|-------|
| `src/engine/materials.ts` | 02-01 | Add character colors |
| `src/models/characters.ts` | 02-01 | New file: character model definitions |
| `src/engine/character-renderer.ts` | 02-01, 02-02 | New file: character management |
| `src/simulation/character-state.ts` | 02-02 | New file: sim/render state separation |

## Context References

- **Research Document:** `.planning/phases/02-characters/02-RESEARCH.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (REND-02, REND-04, INFRA-02)
- **Roadmap:** `.planning/ROADMAP.md` (Phase 2 section)
- **Existing Engine Code:**
  - `src/engine/instancing.ts` — InstancedPool class
  - `src/engine/materials.ts` — getMaterial() pattern
  - `src/engine/voxel-mesh.ts` — getVoxelGeometry()
  - `src/engine/renderer.ts` — RendererContext, render()
  - `src/simulation/world.ts` — World class, generate()
  - `src/utils/rng.ts` — SeededRNG

## Dependencies

- **Phase 1** (completed) provides: InstancedPool, getMaterial(), getVoxelGeometry(), renderer setup
- **Phase 2 internal:** Plan 02-02 depends on Plan 02-01 (CharacterRenderer created in Wave 1)

## Verification Strategy

### Automated Verification
- TypeScript compilation: `npx tsc --noEmit`
- Build check: `npm run build` (if exists) or `npx vite build`

### Manual Verification (Human Checkpoints)
- Visual inspection of character models in the browser
- Verify smooth movement without teleporting
- Verify animation state transitions

## Next Steps After Phase 2

Phase 2 enables:
- **Phase 3 (Buildings):** Building models use same instancing pattern
- **Phase 4 (Simulation):** Character states connect to AI behavior
- **Phase 5 (UI Controls):** Play/Work slider influences animation states

---

*Planning completed: 2026-03-11*
*Ready for execution: YES*
