# Requirements: VoxelVille

**Defined:** 2026-03-11
**Core Value:** A city that lives without you — watching citizens make autonomous decisions, parties erupting, the city growing, all without player micromanagement.

## v1 Requirements

### Rendering

- [x] **REND-01**: Three.js renders voxel cubes with InstancedMesh batching (thousands of cubes at 60fps)
- [ ] **REND-02**: Character models defined (5 male, 5 female, 8 child variants with hair/skin/clothing)
- [ ] **REND-03**: Building models defined (houses 3 variants, offices 2, stores 2, roads, parks, party halls, cleaning depots)
- [ ] **REND-04**: Character animation states (idle, walk, work, party, clean, sleep, build) with interpolation between simulation ticks

### Simulation

- [ ] **SIM-01**: Needs system — each resident has hunger, energy, social, hygiene that decay over time
- [ ] **SIM-02**: Utility-based AI task selection — residents score available tasks using needs, personality, proximity, and slider weighting
- [ ] **SIM-03**: A* pathfinding on road grid — residents navigate between buildings using road network

### Growth

- [ ] **GROW-01**: Population growth — new residents spawn when housing vacancy > 0 and city happiness exceeds threshold
- [ ] **GROW-02**: Auto-construction — buildings placed automatically when population demands (AI mayor logic)
- [ ] **GROW-03**: Play/Work slider influences build priority — more Work = faster offices/stores, more Play = faster parks/party halls

### UI

- [ ] **UI-01**: Play/Work slider — single React-controlled range input, only player input, applies ±30% weight bonus to task selection
- [ ] **UI-02**: HUD overlay — population count, happiness meter, updated debounced (every 100ms)
- [x] **UI-03**: Isometric orbit camera — navigate the city view

### Infrastructure

- [x] **INFRA-01**: Seeded deterministic world generation — same seed produces same terrain, same resident spawns
- [ ] **INFRA-02**: Simulation/render state separation — residents interpolate position between 4 ticks/sec and 60fps renders (no teleporting)
- [x] **INFRA-03**: React refs for Three.js canvas — React mounts canvas once, never re-renders it
- [x] **INFRA-04**: GPU memory disposal — shared geometry/material per model type, disposal registry for cleanup

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Visual Polish

- **POL-01**: Cartoon shader (flat color + outline) for toy-like aesthetic
- **POL-02**: Particle effects (construction puff, party confetti)
- **POL-03**: Sound effects (ambient city sounds, construction sounds)

### Content

- **CONT-01**: Building variants (3 house designs, 2 office designs, 2 store designs) — full models
- **CONT-02**: Character animation variety (all 7 states fully animated)
- **CONT-03**: Additional building types (more specialized)

### Features

- **FEAT-01**: Minimap navigation aid
- **FEAT-02**: Seasons / weather visual changes
- **FEAT-03**: Screenshot / GIF export for sharing
- **FEAT-04**: Save/load system

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
| REND-01 | Phase 1 | Pending |
| REND-02 | Phase 2 | Pending |
| REND-03 | Phase 3 | Pending |
| REND-04 | Phase 2 | Pending |
| SIM-01 | Phase 4 | Pending |
| SIM-02 | Phase 4 | Pending |
| SIM-03 | Phase 4 | Pending |
| GROW-01 | Phase 6 | Pending |
| GROW-02 | Phase 6 | Pending |
| GROW-03 | Phase 5 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

**Phase Distribution:**
- Phase 1 (Engine Foundation): 5 requirements (REND-01, UI-03, INFRA-01, INFRA-03, INFRA-04)
- Phase 2 (Characters): 3 requirements (REND-02, REND-04, INFRA-02)
- Phase 3 (Buildings): 1 requirement (REND-03)
- Phase 4 (Simulation): 3 requirements (SIM-01, SIM-02, SIM-03)
- Phase 5 (UI Controls): 3 requirements (UI-01, UI-02, GROW-03)
- Phase 6 (Population Growth): 2 requirements (GROW-01, GROW-02)

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after initial definition*
