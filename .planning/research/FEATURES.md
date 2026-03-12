# Feature Landscape

**Domain:** Browser-based voxel city builder (autonomous simulation)
**Researched:** 2026-03-11
**Confidence:** MEDIUM

## Table Stakes

Features users expect in a city builder. Missing these = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 3D voxel rendering | Core visual identity of genre | HIGH | InstancedMesh batching, cartoon shader |
| Building placement | City builder definition | MEDIUM | Grid-based, auto-connect roads |
| Camera controls | User must navigate the world | LOW | Isometric orbit, zoom |
| Resident simulation | City feels alive through citizens | HIGH | Needs system, task selection |
| Population growth | City evolves over time | MEDIUM | Happiness threshold, housing vacancy |
| Pathfinding | Residents move logically | MEDIUM | A* on road grid, 4-directional |
| Roads | Connect buildings, enable movement | LOW | Flat tiles, auto-connect edges |
| Basic needs | Residents feel human | LOW | Hunger, energy, social, hygiene decay |
| UI/HUD overlay | Player sees city state | LOW | Population count, happiness meter |
| World generation | Starting state for simulation | MEDIUM | Deterministic seeded RNG |
| Pause/Resume | Standard game control | LOW | Tick loop control |

## Differentiators

Features that set VoxelVille apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Play/Work slider (sole control) | Unique zen-like autonomy, "living diorama" | MEDIUM | Weighted task selection (+30% bonus) |
| Fully autonomous simulation | No micromanagement, pure observation | HIGH | Utility-based AI with personality |
| Cartoon voxel aesthetic | Visual charm, distinct from realistic builders | HIGH | Per-face color, rounded bevels, pastel palette |
| Deterministic seeded worlds | Shareable, reproducible cities | LOW | xoshiro128** PRNG |
| Single-screen scope | Zero overwhelm, always see the city | LOW | No scrolling/zooming to hidden areas |
| Personality-driven AI | Emergent behavior, not scripted | MEDIUM | playfulness + diligence per resident |
| Character variety | Visual diversity without complexity | LOW | 5 male, 5 female, 8 child variants |
| Building auto-construction | AI mayor logic, player remains observer | MEDIUM | Population demands trigger placement |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Manual building placement | Breaks "living diorama" autonomy | Auto-construction based on population |
| Resource management / economy | Adds micromanagement, reduces zen | Slider is only control |
| Combat / disasters | Stressful, breaks peaceful vibe | Defer to post-launch if ever |
| Save/load system | Not needed for demo experience | Seeded worlds are shareable |
| Multiplayer | Scope creep, client-side only | Single-player, static GitHub Pages |
| Weather / seasons | Cosmetic polish, defer | Post-launch expansion |
| Sound effects | Visual experience first | Post-launch expansion |
| Mobile app | Web-first, responsive later | Browser tab only for v1 |
| Complex zoning | Adds micromanagement | Auto-place based on demand |
| Day/night cycle | Visual complexity without gameplay value | Static lighting with cartoon shader |
| Destructible buildings | Stressful, breaks peaceful vibe | Permanent city growth |

## Feature Dependencies

```
[World Generation]
    └──requires──> [Voxel Rendering]

[Voxel Rendering]
    └──requires──> [InstancedMesh batching]

[Resident Simulation]
    ├──requires──> [Needs System]
    ├──requires──> [AI Task Selection]
    ├──requires──> [Pathfinding]
    └──requires──> [Voxel Rendering]

[Play/Work Slider]
    └──requires──> [AI Task Selection]

[Population Growth]
    ├──requires──> [Resident Simulation]
    ├──requires──> [Building Placement]
    └──requires──> [Needs System]

[Building Placement]
    └──requires──> [Voxel Rendering]

[Pathfinding]
    └──requires──> [Road Grid]

[Character Animation]
    └──requires──> [Voxel Rendering]

[HUD Overlay]
    └──requires──> [Resident Simulation]

[UI Slider]
    └──requires──> [AI Task Selection]
```

### Dependency Notes

- **Resident Simulation requires AI Task Selection:** Without utility scoring, residents have no autonomous behavior
- **Play/Work Slider requires AI Task Selection:** Slider only works by modifying task utility scores
- **Population Growth requires Resident Simulation:** New residents need home/job assignment logic
- **Building Auto-Construction requires Population Growth:** Demand triggers placement, not manual input
- **Voxel Rendering requires InstancedMesh:** Thousands of cubes need batching for 60fps

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Voxel renderer with cartoon shader — visual foundation
- [ ] Play/Work slider — core player interaction
- [ ] Resident AI with needs system — autonomous behavior
- [ ] Basic building types (houses, roads, offices, stores) — city structure
- [ ] Population growth — city evolves
- [ ] HUD overlay — player sees state
- [ ] Isometric camera — navigate the world
- [ ] Seeded world generation — deterministic, shareable

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Party halls — social life dimension
- [ ] Parks — leisure space
- [ ] Cleaning depots — maintenance system
- [ ] Character animations (walk, work, party, clean) — visual polish
- [ ] Character variety (18 variants) — visual diversity
- [ ] Building variants (3 houses, 2 offices, 2 stores) — architectural variety

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Sound effects — ambient city sounds
- [ ] Seasons/weather — visual changes
- [ ] Natural disasters — slider nudges rebuild
- [ ] Screenshot/GIF export — shareability
- [ ] Minimap — navigation aid

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Voxel rendering (cartoon) | HIGH | HIGH | P1 |
| Play/Work slider | HIGH | MEDIUM | P1 |
| Resident AI + needs | HIGH | HIGH | P1 |
| Population growth | HIGH | MEDIUM | P1 |
| Basic buildings + roads | HIGH | MEDIUM | P1 |
| Isometric camera | HIGH | LOW | P1 |
| HUD overlay | MEDIUM | LOW | P1 |
| World generation | HIGH | MEDIUM | P1 |
| Character animations | HIGH | HIGH | P2 |
| Building variants | MEDIUM | MEDIUM | P2 |
| Party halls + parks | MEDIUM | MEDIUM | P2 |
| Cleaning depots | LOW | LOW | P2 |
| Character variety | MEDIUM | LOW | P3 |
| Sound effects | MEDIUM | MEDIUM | P3 |
| Seasons/weather | LOW | HIGH | P3 |
| Minimap | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Simulopolis | VoxelHamlet | Our Approach |
|---------|-------------|-------------|--------------|
| Building placement | Manual (mayor) | Manual (player) | Auto-construction |
| Player control | Policies, taxes, zoning | Resource gathering, crafting | Single Play/Work slider |
| Citizen AI | Needs + personality | Task assignment | Utility-based with personality |
| Visual style | 2D sprites | Voxel (Unity) | Cartoon voxels (Three.js) |
| Platform | Desktop (C++) | Desktop (Unity) | Browser (TypeScript) |
| Scope | Full city management | Colony survival | Single-screen diorama |

## Sources

- [Simulopolis](https://github.com/pvigier/Simulopolis) — autonomous citizen AI reference
- [VoxelHamlet](https://github.com/michalusio/VoxelHamlet) — colony-builder structure
- [magical-voxel-3d-city-model](https://github.com/tarabaz/magical-voxel-3d-city-model) — voxel city asset conventions
- [Procedural_Smooth_Voxels](https://github.com/MrBean1512/Procedural_Smooth_Voxels) — technical voxel meshing patterns
- [Voxel Tycoon modding docs](https://docs.voxeltycoon.xyz/guides/content-mods/creating-your-first-building-mod/) — voxel asset size/coord conventions

---

*Feature research for: VoxelVille — browser-based autonomous voxel city builder*
*Researched: 2026-03-11*