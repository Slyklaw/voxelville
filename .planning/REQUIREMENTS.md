# Requirements: VoxelVille

**Defined:** 2026-03-11
**Core Value:** A city that lives without you — watching citizens make autonomous decisions, parties erupting, the city growing, all without player micromanagement.

## Current Milestone: v1.2 Visual Verification & Tests

**Goal:** Write comprehensive tests to identify and fix rendering issues where voxel models appear scrambled/wrong colors in the viewport.

## v1 Requirements (shipped in v1.0)

All 17 requirements from v1.0 are complete.

## v1.1 Requirements

Requirements for visual polish milestone. Each maps to roadmap phases.

### Coloring

- [x] **VIS-01**: Buildings render all voxels with correct colors (walls, roof, windows, doors)
- [x] **VIS-02**: Characters render all voxels with correct hair, skin, and clothing colors
- [x] **VIS-03**: InstancedMesh.setColorAt() used for per-instance coloring

### Shader

- [x] **VIS-04**: Cartoon outline shader via back-face render pass
- [x] **VIS-05**: Flat shading with two-step lighting (lit/shadow) per voxel face

### Positioning

- [x] **VIS-06**: Buildings placed on top of terrain surface, not embedded inside
- [x] **VIS-07**: Characters spawn standing on terrain surface

### Terrain

- [x] **VIS-08**: Smooth terrain generation without random per-tile holes

## v1.2 Requirements

Requirements for visual verification and testing milestone. These tests will identify rendering issues visible in the current viewport.

### Model Definition Tests

- [ ] **VIZ-01**: Each building model has the expected number of voxels matching its declared size
- [ ] **VIZ-02**: Each character model has 12 voxels (adults) or 9 voxels (children)
- [ ] **VIZ-03**: All voxel colors in models reference existing materials from materials.ts
- [ ] **VIZ-04**: House models have walls, roof, windows, and door voxels with distinct colors
- [ ] **VIZ-05**: Character models have hair (top row), skin (middle), clothing (bottom) with distinct colors

### Material Color Tests

- [ ] **VIZ-06**: getMaterial() returns valid material for every defined material name
- [ ] **VIZ-07**: Building materials (brick, roof, office, store, window, door) have correct hex colors
- [ ] **VIZ-08**: Character materials (skin-light, skin-dark, hair-*, clothing-*) have correct hex colors
- [ ] **VIZ-09**: materialToColor() returns correct THREE.Color for each material name

### Renderer Output Tests

- [ ] **VIZ-10**: BuildingRenderer.addBuilding() creates one instance per voxel in a model
- [ ] **VIZ-11**: BuildingRenderer.addBuilding() returns consistent first-instance index
- [ ] **VIZ-12**: CharacterRenderer.addCharacter() creates one instance per voxel in a model
- [ ] **VIZ-13**: InstancedMesh.setColorAt() is called for each voxel with the model's specified color

### Positioning Tests

- [ ] **VIZ-14**: Voxel world positions calculated correctly: base + voxel offset
- [ ] **VIZ-15**: getTerrainHeight() returns correct height for terrain columns
- [ ] **VIZ-16**: Buildings positioned at terrain height (y = terrainY, not buried)
- [ ] **VIZ-17**: Roads positioned at terrain height + 0.5 (slightly elevated)

### Rendering Pipeline Tests

- [ ] **VIZ-18**: OutlineRenderer creates outline meshes with 1.08× scale factor
- [ ] **VIZ-19**: Two-pass rendering (outlines, then main) produces correct draw order
- [ ] **VIZ-20**: InstancedPool properly updates mesh count when instances added

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Features

- **FEAT-01**: Minimap navigation aid
- **FEAT-02**: Seasons / weather visual changes
- **FEAT-03**: Screenshot / GIF export for sharing
- **FEAT-04**: Save/load system

### Content

- **CONT-01**: Building variants (3 house designs, 2 office designs, 2 store designs) — full models
- **CONT-02**: Character animation variety (all 7 states fully animated)
- **CONT-03**: Additional building types (more specialized)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiplayer / online | Client-side only, no server, v1 is single-player |
| Mobile app | Web-first, responsive design deferred |
| Combat / disasters | Breaks peaceful zen vibe |
| Resource management / economy | Adds micromanagement, reduces autonomy |
| Manual building placement | Breaks "living diorama" concept |
| Complex zoning rules | Auto-place based on demand |
| Day/night cycle | Visual complexity without gameplay value |
| Destructible buildings | Breaks peaceful growth concept |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 7 | Complete |
| VIS-02 | Phase 7 | Complete |
| VIS-03 | Phase 7 | Complete |
| VIS-04 | Phase 8 | Complete |
| VIS-05 | Phase 8 | Complete |
| VIS-06 | Phase 9 | Complete |
| VIS-07 | Phase 9 | Complete |
| VIS-08 | Phase 9 | Complete |
| VIZ-01 | Phase 10 | Pending |
| VIZ-02 | Phase 10 | Pending |
| VIZ-03 | Phase 10 | Pending |
| VIZ-04 | Phase 10 | Pending |
| VIZ-05 | Phase 10 | Pending |
| VIZ-06 | Phase 10 | Pending |
| VIZ-07 | Phase 10 | Pending |
| VIZ-08 | Phase 10 | Pending |
| VIZ-09 | Phase 10 | Pending |
| VIZ-10 | Phase 10 | Pending |
| VIZ-11 | Phase 10 | Pending |
| VIZ-12 | Phase 10 | Pending |
| VIZ-13 | Phase 10 | Pending |
| VIZ-14 | Phase 10 | Pending |
| VIZ-15 | Phase 10 | Pending |
| VIZ-16 | Phase 10 | Pending |
| VIZ-17 | Phase 10 | Pending |
| VIZ-18 | Phase 10 | Pending |
| VIZ-19 | Phase 10 | Pending |
| VIZ-20 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8 ✓
- v1.2 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 — v1.2 requirements added*
