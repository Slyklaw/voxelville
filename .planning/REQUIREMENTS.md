# Requirements: VoxelVille

**Defined:** 2026-03-11
**Core Value:** A city that lives without you — watching citizens make autonomous decisions, parties erupting, the city growing, all without player micromanagement.

## Current Milestone: v1.1 Visual Polish

**Goal:** Fix rendering pipeline so buildings, characters, and terrain render correctly with proper colors and cartoon aesthetic.

## v1 Requirements (shipped in v1.0)

All 17 requirements from v1.0 are complete.

## v1.1 Requirements

Requirements for visual polish milestone. Each maps to roadmap phases.

### Coloring

- [ ] **VIS-01**: Buildings render all voxels with correct colors (walls, roof, windows, doors)
- [ ] **VIS-02**: Characters render all voxels with correct hair, skin, and clothing colors
- [ ] **VIS-03**: InstancedMesh.setColorAt() used for per-instance coloring

### Shader

- [ ] **VIS-04**: Cartoon outline shader via back-face render pass
- [ ] **VIS-05**: Flat shading with two-step lighting (lit/shadow) per voxel face

### Positioning

- [x] **VIS-06**: Buildings placed on top of terrain surface, not embedded inside
- [x] **VIS-07**: Characters spawn standing on terrain surface

### Terrain

- [x] **VIS-08**: Smooth terrain generation without random per-tile holes

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
| VIS-01 | Phase 7 | Pending |
| VIS-02 | Phase 7 | Pending |
| VIS-03 | Phase 7 | Pending |
| VIS-04 | Phase 8 | Pending |
| VIS-05 | Phase 8 | Pending |
| VIS-06 | Phase 9 | Complete |
| VIS-07 | Phase 9 | Complete |
| VIS-08 | Phase 9 | Complete |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 — v1.1 requirements defined*
