---
phase: 07-per-instance-coloring
plan: 01
subsystem: rendering
tags: [threejs, instancing, per-instance-coloring, voxel-rendering]

# Dependency graph
requires:
  - phase: 03-buildings
    provides: Building model definitions with multi-color voxels
  - phase: 02-characters
    provides: Character model definitions with multi-color voxels
provides:
  - BuildingRenderer with per-instance coloring (walls, roof, windows, doors)
  - CharacterRenderer with per-instance coloring (hair, skin, clothing)
affects: [08-cartoon-shader, 09-positioning-fixes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Neutral white material + setColorAt() per-voxel coloring pattern"
    - "Pool sizing: model.voxels.length * maxInstances for capacity"

key-files:
  created: []
  modified:
    - src/engine/building-renderer.ts
    - src/engine/character-renderer.ts

key-decisions:
  - "Use neutral white MeshLambertMaterial as pool base, color each voxel via setColorAt()"
  - "Pool capacity = voxels per model × max instances (10 for buildings, 50 for characters)"
  - "materialToColor() helper converts material names to THREE.Color for setColorAt()"
  - "Update methods update ALL voxel instances for a building/character, not just one"

patterns-established:
  - "Per-instance coloring: neutral material + setColorAt() for multi-color voxel models"

requirements-completed:
  - VIS-01
  - VIS-02
  - VIS-03

# Metrics
duration: 8min
completed: 2026-03-11
---

# Phase 7 Plan 1: Per-Instance Coloring Summary

**BuildingRenderer and CharacterRenderer now render multi-voxel models with correct per-voxel colors using InstancedMesh.setColorAt() with neutral base materials**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-11T12:00:00Z
- **Completed:** 2026-03-11T12:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- BuildingRenderer creates neutral white material pools sized for all voxels per building
- BuildingRenderer.addBuilding() adds all voxels with per-voxel colors via setColorAt()
- CharacterRenderer creates neutral white material pools sized for all voxels per character
- CharacterRenderer.addCharacter() adds all voxels with per-voxel colors via setColorAt()
- updateCharacterInstance() updates all voxel instances with animation offsets
- Both renderers preserve backward compatibility with existing callers

## Task Commits

Each task was committed atomically:

1. **Task 1: Rework BuildingRenderer for per-instance coloring** - `cb79f4f` (feat)
2. **Task 2: Rework CharacterRenderer for per-instance coloring** - `f747602` (feat)

## Files Created/Modified
- `src/engine/building-renderer.ts` - Per-instance coloring with neutral material + setColorAt()
- `src/engine/character-renderer.ts` - Per-instance coloring with neutral material + setColorAt()

## Decisions Made
- Use neutral white MeshLambertMaterial as pool base, color each voxel individually via setColorAt()
- Pool capacity calculation: model.voxels.length * maxInstances (10 for buildings, 50 for characters)
- Helper function materialToColor() for converting material names to THREE.Color
- All update methods update ALL voxel instances for a building/character (not just one)
- updateCharacterWithRotation kept for API compatibility (unused externally)

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0
**Impact on plan:** No deviations needed.

## Issues Encountered
- None - plan was straightforward to implement

## Next Phase Readiness
- Both renderers now support per-instance coloring
- Buildings will render with distinct wall/roof/window/door colors
- Characters will render with distinct hair/skin/clothing colors
- Ready for phase 8 (cartoon shader) and phase 9 (positioning fixes)

---
*Phase: 07-per-instance-coloring*
*Completed: 2026-03-11*
