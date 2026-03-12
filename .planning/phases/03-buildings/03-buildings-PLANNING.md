# Phase 3: Buildings - Planning Summary

**Phase:** 03-buildings  
**Status:** Planned  
**Plans:** 2  
**Waves:** 2  

## Wave Structure

| Wave | Plans | Autonomous |
|------|-------|------------|
| 1 | 03-01 | yes |
| 2 | 03-02 | yes |

## Plans

### 03-01: Building Model Definitions and Renderer

**Objective:** Define building model structures and create a BuildingRenderer to render them in the scene.

**Tasks:**
1. Define building model types (src/models/buildings.ts)
2. Add building materials (src/engine/materials.ts)
3. Create BuildingRenderer (src/engine/building-renderer.ts)
4. Demo placement in main.tsx (src/main.tsx)

**Dependencies:** None (Wave 1)

**Requirements:** REND-03

### 03-02: Road Network and Grid Placement

**Objective:** Implement a road network with auto-connecting tiles and grid placement rules for buildings.

**Tasks:**
1. Road grid data structure (src/simulation/road-grid.ts)
2. Grid placement rules (src/simulation/grid-placement.ts)
3. Integrate with BuildingRenderer (src/engine/building-renderer.ts)
4. Demo road network and building placement (src/main.tsx)

**Dependencies:** 03-01 (Wave 2)

**Requirements:** REND-03

## Key Files Modified

- src/models/buildings.ts (new)
- src/engine/materials.ts (modify)
- src/engine/building-renderer.ts (new)
- src/simulation/road-grid.ts (new)
- src/simulation/grid-placement.ts (new)
- src/main.tsx (modify)

## Patterns Followed

- **Building model definitions:** Same `BuildingModelDefinition` interface as `CharacterModelDefinition` with voxel arrays.
- **BuildingRenderer:** Same `InstancedPool` per model type pattern as `CharacterRenderer`.
- **Road auto-connect:** Directional connectivity bits updated on placement.
- **Adjacency rules:** Simple "must be next to road" check, deferred zoning/density.

## Quality Gates

- [ ] Building models defined for all required types
- [ ] BuildingRenderer creates instanced meshes for each type
- [ ] Road tiles connect visually
- [ ] Buildings only place adjacent to roads
- [ ] Demo shows roads and buildings placed correctly

## Success Criteria

1. User can see various building types (houses, offices, stores, roads, parks, etc.) rendered in the world
2. User can see buildings placed in a grid pattern with roads connecting them
3. User can distinguish between different building types by their appearance
