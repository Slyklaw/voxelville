# VoxelVille Milestones

## v1.0 — Core Simulation (2026-03-11)

**Goal:** Ship a functional autonomous city simulator with all core systems.

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 1 | Engine Foundation | 3 | ✓ Complete |
| 2 | Characters | 2 | ✓ Complete |
| 3 | Buildings | 2 | ✓ Complete |
| 4 | Simulation | 3 | ✓ Complete |
| 5 | UI Controls | 2 | ✓ Complete |
| 6 | Population Growth | 2 | ✓ Complete |

**Requirements shipped:** 17/17
**Total plans:** 14

### What shipped:
- Three.js renderer with InstancedMesh batching (60fps, 500+ voxels)
- 18 character models (5 male, 5 female, 8 child) with 7 animation states
- 13 building types (houses, offices, stores, roads, parks, party halls, depots)
- Autonomous simulation: needs system, utility-based AI, A* pathfinding
- Play/Work slider with ±15% weight bonus
- HUD showing population and happiness
- Population growth with auto-construction
- Deterministic seeded world generation

---

## v1.1 — Visual Polish (Shipped: 2026-03-14)

**Goal:** Fix rendering pipeline so buildings, characters, and terrain render correctly with proper colors and cartoon aesthetic.

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 7 | Per-Instance Coloring | 1 | ✓ Complete |
| 8 | Cartoon Shader | 1 | ✓ Complete |
| 9 | Positioning & Terrain | 1 | ✓ Complete |
| 10 | Visual Verification Tests | 2 | ✓ Complete |

**Requirements shipped:** 8/8 (VIS-01 through VIS-08)
**Total plans:** 5
**Timeline:** 3 days (2026-03-11 → 2026-03-13)
**Files changed:** 33 files, +2,497 / -112 lines

### What shipped:
- Per-instance voxel coloring via InstancedMesh.setColorAt()
- Neutral white base material with per-voxel color assignment
- BuildingRenderer and CharacterRenderer reworked for multi-color models
- OutlineRenderer class with back-face technique (black outlines)
- Two-pass rendering: outlines first, then main meshes
- Terrain noise bug fixed (removed rng.next() from noise calculation)
- Deterministic terrain generation (smooth, no random holes)
- Terrain-aware building/character positioning (getTerrainHeight())
- Visual verification test suite: 130 tests covering models, materials, renderers
- Building positioning fix: getMaxTerrainHeightInArea() for footprint-based placement

### Key accomplishments:
1. **Per-Instance Coloring** — Buildings/characters render with distinct wall, roof, window, door, hair, skin, clothing colors
2. **Cartoon Outline Shader** — Back-face render pass creates black outlines around every voxel
3. **Terrain & Positioning Fix** — Fixed terrain noise bug, buildings/characters spawn on surface not buried
4. **Visual Verification Test Suite** — 130 tests covering all building/character models
5. **Building Position Bug Fix** — getMaxTerrainHeightInArea() prevents voxels below terrain

### Archive:
- Milestone roadmap: `.planning/milestones/v1.1-ROADMAP.md`
- Milestone requirements: `.planning/milestones/v1.1-REQUIREMENTS.md`
- Phase directories: `.planning/milestones/v1.1-phases/`

---

## Total Project (v1.0 + v1.1)

**Total requirements:** 25 (17 core + 8 visual polish)
**Total phases:** 10
**Total plans:** 19

---

