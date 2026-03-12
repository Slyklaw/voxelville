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

## v1.1 — Visual Polish (2026-03-12)

**Goal:** Fix rendering pipeline so buildings, characters, and terrain render correctly with proper colors and cartoon aesthetic.

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 7 | Per-Instance Coloring | 1 | ✓ Complete |
| 8 | Cartoon Shader | 1 | ✓ Complete |
| 9 | Positioning & Terrain | 1 | ✓ Complete |

**Requirements shipped:** 8/8
**Total plans:** 3

### What shipped:
- Per-instance voxel coloring via InstancedMesh.setColorAt()
- Neutral white base material with per-voxel color assignment
- BuildingRenderer and CharacterRenderer reworked for multi-color models
- OutlineRenderer class with back-face technique (black outlines)
- Two-pass rendering: outlines first, then main meshes
- Terrain noise bug fixed (removed rng.next() from noise calculation)
- Deterministic terrain generation (smooth, no random holes)
- Terrain-aware building/character positioning (getTerrainHeight())

---

## Total Project (v1.0 + v1.1)

**Total requirements:** 25 (17 core + 8 visual polish)
**Total phases:** 9
**Total plans:** 17

---

## v1.2 — Visual Verification & Tests (in progress)

**Goal:** Write comprehensive tests to identify and fix rendering issues where voxel models appear scrambled/wrong colors in viewport.

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 10 | Visual Verification Tests | TBD | ○ Not started |

**Requirements:** 20 VIZ requirements
**Target:** Identify why models in screenshot show wrong colors, scrambled appearance
