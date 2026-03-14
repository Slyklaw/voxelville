---
phase: 08-cartoon-shader
plan: 01
subsystem: visual
tags: [outline, cartoon-shader, instanced-mesh, rendering]
dependency_graph:
  requires: []
  provides: [outline-rendering]
  affects: [renderer, app-rendering]
tech_stack:
  added: []
  patterns: [back-face-outline, two-pass-rendering]
key_files:
  created:
    - src/engine/outline-renderer.ts
  modified:
    - src/engine/renderer.ts
    - src/App.tsx
decisions: []
metrics:
  duration: "8min"
  completed_date: 2026-03-12
---

# Phase 8 Plan 01: Outline Renderer Summary

## One-Liner

Back-face outline technique for voxel cartoon aesthetic — InstancedMesh outlines via scaled silhouette pass

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create OutlineRenderer for back-face outline pass | `8d1b0e6` | src/engine/outline-renderer.ts |
| 2 | Wire outline rendering into renderer and App | `b83b89e` | src/engine/renderer.ts, src/App.tsx |

## Implementation Details

### OutlineRenderer (src/engine/outline-renderer.ts)

- Wraps an InstancedMesh with a black `MeshBasicMaterial` using `side: THREE.BackSide`
- `update()` copies instance matrices from source mesh, scaling each 8% larger (1.08x)
- `render()` temporarily adds outline mesh to scene, renders, then removes (clean depth pass)
- `dispose()` cleans up material and mesh resources

### Renderer Integration (src/engine/renderer.ts)

- Added `MeshWithOutline` interface pairing mesh with its outline renderer
- `createOutlineFor()` factory function creates outline pair from InstancedMesh
- `renderWithOutlines()` executes two-pass rendering:
  1. Outline pass: updates and renders all outline meshes (black silhouettes)
  2. Main pass: renders normal scene with lit materials on top

### App Wiring (src/App.tsx)

- Outline pairs created for all terrain pools, building meshes, and character meshes
- Animation loop switched from `render(ctx)` to `renderWithOutlines(ctx, outlinePairs)`
- Cleanup disposes all outline meshes

## Success Criteria Verification

- ✅ OutlineRenderer class created with update() and render() methods
- ✅ renderer.ts exports createOutlineFor() and renderWithOutlines()
- ✅ main/App.tsx creates outline pairs for terrain, building, and character meshes
- ✅ Outline meshes properly disposed on cleanup
- ✅ TypeScript compiles without errors

## Visual Result

Black outlines now visible around each voxel cube. The back-face technique creates a silhouette border by rendering scaled-up back faces behind the normal geometry. Combined with existing flat-shaded Lambert materials (two-tone lighting), achieves cartoon/toy aesthetic.

## Self-Check: PASSED

- src/engine/outline-renderer.ts exists
- src/engine/renderer.ts contains MeshWithOutline, createOutlineFor, renderWithOutlines
- src/App.tsx uses renderWithOutlines
- Commits: 8d1b0e6, b83b89e
