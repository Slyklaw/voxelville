# Phase 3: Buildings — Research for Planning

**Objective:** Research how to implement Phase 3: Buildings
**Phase requirement IDs:** REND-03
**Answer:** "What do I need to know to PLAN this phase well?"

---

## Executive Summary

Phase 3 introduces building models (houses, offices, stores, roads, parks, party halls, cleaning depots) into the voxel world. The research reveals that **building model definitions and grid placement are technically straightforward** given existing patterns, but the **road network auto-connect system** requires careful design to avoid over-engineering.

**Key finding:** Follow the exact same `CharacterRenderer` pattern (per-model-type `InstancedPool`) for buildings. The main challenge is the road network adjacency system, not the models themselves.

---

## 1. Building Model Definition Format

### Recommended Format (Based on Existing Pattern)

Follow the exact `CharacterModelDefinition` interface from `src/models/characters.ts`:

```typescript
// src/models/buildings.ts

export interface BuildingModelDefinition {
  id: string;                          // e.g., 'house_cottage', 'office_small'
  type: 'house' | 'office' | 'store' | 'road' | 'park' | 'partyhall' | 'cleaningdepot';
  category: 'residential' | 'commercial' | 'public' | 'infrastructure';
  size: [number, number, number];      // width, height, depth in voxels
  voxels: Array<{
    x: number;
    y: number;
    z: number;
    color: string;  // Material key, e.g., 'brick', 'roof', 'office'
  }>;
  occupancy?: number;                  // For houses/offices/stores
  footprint?: [number, number];        // Grid cells occupied (x, z)
}
```

### Why This Format Works

1. **Compatible with existing `getMaterial()` pattern** — color strings map directly to material keys
2. **Same voxel array structure as characters** — reuse parsing/logic
3. **InstancedPool-ready** — each model type can have its own pool per primary color
4. **Design.md already defines voxel layouts** — can translate directly to arrays

### Building Model Specifications (from design.md)

| Building | Size (W×H×D) | Footprint | Category | Occupancy | Primary Color |
|----------|--------------|-----------|----------|-----------|---------------|
| House A (Cottage) | 3×4×3 | 1×1 | Residential | 2-4 | brick |
| House B (Two-Storey) | 4×6×4 | 1×1 | Residential | 2-5 | brick |
| House C (Row House) | 5×5×2 | 1×1 | Residential | 1-3 | brick |
| Office A (Small) | 4×5×4 | 1×1 | Commercial | 4 | office |
| Office B (Tower) | 3×8×3 | 1×1 | Commercial | 6 | office |
| Store A (Corner) | 3×3×3 | 1×1 | Commercial | 2 | store |
| Store B (Stall) | 2×2×2 | 1×1 | Commercial | 1 | store |
| Road | 1×0×1 | 1×1 | Infrastructure | — | road |
| Park | 3×1×3 | 3×3 | Public | — | grass |
| Party Hall | 3×3×3 | 1×1 | Public | 12 | brick |
| Cleaning Depot | 2×2×2 | 1×1 | Public | 2 | stone |

### Material Palette Additions

Need to add to `src/engine/materials.ts`:
- `window` → `#272727` (dark for windows)
- `door` → `#8B4513` (saddlebrown)
- `awning` → `#E8C547` (store awning)
- `bunting` → `#4ECDC4` (party decorations)
- `tree-trunk` → `#8B4513`
- `tree-leaves` → `#228B22` (forest green)
- `flower-pink` → `#FF69B4`
- `flower-yellow` → `#FFD700`
- `flower-orange` → `#FF4500`
- `bench` → `#8B4513`

---

## 2. Grid Placement System Design

### Road Network Auto-Connect Strategy

**Recommendation:** Simple directional tileset approach, NOT procedural edge generation.

#### Road Tile Types

```
Road tiles are 1×1×0 (flat). Auto-connect based on adjacent road tiles:

  ┌───┐      ┌───┬───┐    ┌───┐
  │ R │      │ R │ R │    │   │
  └───┘      └───┴───┘    │ R │
   dead       horizontal   └───┘
   end        road         corner
  
  ┌───┬───┬───┐     ┌───┐
  │   │ R │   │     │   │
  │ R │ R │ R │     │ R │
  │   │ R │   │     │   │
  └───┴───┴───┘     └───┘
  intersection       T-junction
```

**Implementation approach:**

1. **Road tiles store connectivity bits:** `{ north: boolean, south: boolean, east: boolean, west: boolean }`
2. **When a road tile is placed:** Check 4 neighbors, update both self and neighbor connectivity
3. **Render:** Use a simple road tile mesh with edge markers (darker grey stripes) based on connectivity
4. **Pathfinding:** Roads form a graph — residents navigate along road edges

#### Road Grid Data Structure

```typescript
interface RoadTile {
  x: number;
  z: number;
  connections: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
}
```

### Adjacency Rules (Incremental — Avoid Pitfall 10)

**Layer 1 (Phase 3): Basic placement**
- Roads: Place anywhere on empty grid cells
- Buildings: Must be adjacent (4-directional) to at least one road tile
- No zoning, no density — just "can place here?"

**Layer 2 (Phase 5/6): Zoning** — Deferred
- Residential zones near other houses
- Commercial zones near roads
- Public zones near residential

**Layer 3 (Phase 6): Density** — Deferred
- Building levels (1-3) based on population density
- Upgrade houses from cottage → two-storey → row house

### Building Placement Algorithm

```
canPlaceBuilding(gridX, gridZ, buildingType, roadGrid):
  1. Check grid cell is empty (no existing building/road)
  2. Check building footprint fits (for parks: 3×3)
  3. Check at least one adjacent cell (N/S/E/W) is a road tile
  4. Return true/false
```

---

## 3. Building Type Categorization

### Categories for Future Simulation

| Category | Buildings | Simulation Role | Slider Affinity |
|----------|-----------|-----------------|-----------------|
| **Residential** | House A/B/C | Housing capacity, resident spawning | Neutral |
| **Commercial** | Office A/B, Store A/B | Workplace, worker assignment | More Work ↑ |
| **Public** | Park, Party Hall | Leisure, social needs | More Play ↑ |
| **Infrastructure** | Road, Cleaning Depot | Pathfinding, cleaning tasks | Neutral |

### Occupancy/Vacancy Tracking

Each building type tracks:
- `capacity`: Max residents/workers
- `occupancy`: Current residents/workers (array of entity IDs)
- `isVacant`: capacity > occupancy.length

This feeds into:
- Population growth (need housing vacancy)
- Worker assignment (need office/store vacancy)
- Task selection (residents target vacant buildings)

---

## 4. Integration with Existing InstancedPool Pipeline

### BuildingRenderer Pattern (Same as CharacterRenderer)

```typescript
// src/engine/building-renderer.ts

export class BuildingRenderer {
  private scene: THREE.Scene;
  private pools: Map<string, InstancedPool>;  // keyed by building ID
  private geometry: THREE.BoxGeometry;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = getVoxelGeometry();
    this.pools = new Map();
    
    // One pool per building model (like CharacterRenderer)
    for (const model of ALL_BUILDING_MODELS) {
      const primaryVoxel = model.voxels[0];
      const material = getMaterial(primaryVoxel.color);
      const pool = new InstancedPool(this.geometry, material, 100);
      this.scene.add(pool.meshInstance);
      this.pools.set(model.id, pool);
    }
  }
  
  addBuilding(modelId: string, gridPosition: THREE.Vector3): number { ... }
  updateBuilding(modelId: string, index: number, position: THREE.Vector3): void { ... }
  removeBuilding(modelId: string, index: number): void { ... }
  dispose(): void { ... }
}
```

### Key Difference from CharacterRenderer

Buildings are **static** — no animation offsets, no interpolation. Just position updates when placed/moved.

```typescript
// Simpler update — no animation state needed
updateBuildingInstance(modelId: string, index: number, position: THREE.Vector3): void {
  const pool = this.pools.get(modelId);
  if (!pool) return;
  
  dummy.position.copy(position);
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
  pool.meshInstance.setMatrixAt(index, dummy.matrix);
  pool.meshInstance.instanceMatrix.needsUpdate = true;
}
```

### Performance Considerations

| Concern | Approach | Budget |
|---------|----------|--------|
| Draw calls | 1 InstancedMesh per building type (not per voxel) | ≤ 20 draw calls for all buildings |
| Instance updates | Only on place/remove (not every frame) | ~0 GPU cost when static |
| Memory | Shared geometry/material per type | Same as characters |
| Max buildings | 100 per type (planning for 500 total) | 500 × avg 200 voxels = 100k voxels |

---

## 5. Pitfall Avoidance

### Pitfall 10: Over-Complex Building Placement Before Road Network Works

**Prevention strategy:**
1. **Phase 3 Plan 1:** Building models + BuildingRenderer (no placement logic)
2. **Phase 3 Plan 2:** Road grid + basic adjacency check + demo placement
3. **Defer:** Zoning, density, complex rules to later phases

**Verification gate:** Building appears on screen when placed adjacent to road. Nothing more.

### Pitfall 1: Per-Voxel Draw Calls

**Already solved** — InstancedPool pattern from Phase 2 handles this. Buildings follow same pattern.

### Pitfall 8: Memory Leaks from Undisposed Geometries

**Already solved** — Disposal registry pattern from Phase 1. BuildingRenderer must call `dispose()` on cleanup.

---

## 6. Implementation Order Recommendation

### Plan 1: Building Models & Renderer
**Goal:** Buildings render on screen (no placement logic)
1. Add material palette entries to `materials.ts`
2. Create `src/models/buildings.ts` with all building definitions
3. Create `src/engine/building-renderer.ts` following `CharacterRenderer` pattern
4. Demo: manually place 1 building of each type at hardcoded positions

**Quality gate:** All building types render correctly with proper colors

### Plan 2: Road Network & Grid Placement
**Goal:** Roads connect, buildings place adjacent to roads
1. Create `src/simulation/road-grid.ts` with road tile data structure
2. Implement road auto-connect logic (update connectivity on place)
3. Create `src/simulation/grid-placement.ts` with adjacency check
4. Integrate with `BuildingRenderer` for placement API
5. Demo: place roads in a pattern, place buildings adjacent to them

**Quality gate:** Roads connect visually, buildings only place adjacent to roads

---

## 7. Open Questions for Planner

1. **Road rendering:** Should roads be flat tiles (1×1×0) or have slight height variation? Design says flat.
2. **Park rendering:** Parks are 3×3 ground tiles with trees/benches — single model or composite?
3. **Building scale:** Characters are 1-3 voxels tall. Houses are 4-6 voxels tall. Scale ratio OK?
4. **Initial road network:** Auto-generate a starting road grid in world gen, or let AI mayor build it?
5. **Building removal:** Do buildings ever get removed? (Population decline, demolition) — or just add?

---

## 8. Quality Gate Checklist

- [x] Building model format compatible with existing InstancedPool and getMaterial() patterns
- [x] Grid placement rules that avoid Pitfall 10 (over-complex placement before road network works)
- [x] Road network auto-connect strategy defined (directional connectivity bits)
- [x] Performance considerations for many building instances (InstancedPool, static updates)

---

## 9. Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Model format | HIGH | Exact same pattern as characters, already validated |
| InstancedPool integration | HIGH | CharacterRenderer proves pattern works |
| Road network design | MEDIUM | Simple adjacency bits, but first time implementing auto-connect |
| Grid placement rules | HIGH | Incremental approach avoids complexity trap |
| Performance | HIGH | Static instances are cheaper than animated characters |

---

*Research for Phase 3: Buildings*
*Generated: 2026-03-11*
*Sources: design.md, existing codebase patterns (characters.ts, character-renderer.ts, instancing.ts, materials.ts), Pitfalls.md*