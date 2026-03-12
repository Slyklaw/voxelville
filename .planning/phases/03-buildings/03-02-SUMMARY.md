---
phase: 03-buildings
plan: 03-02
timestamp: "2026-03-12"
---

# Plan 03-02: Road Network and Grid Placement — Summary

## Objective

Implement a road network with auto-connecting tiles and grid placement rules for buildings.

## What Was Built

### 1. Road Grid Data Structure (`src/simulation/road-grid.ts`)
- **RoadGrid class** managing a 2D sparse map of road tiles
- Each `RoadTile` tracks `x`, `z`, and `connections` (north, south, east, west booleans)
- `placeRoad(x, z)`: Places a road and auto-updates connectivity with neighbors
- `getTile(x, z)`, `hasTile(x, z)`, `getAllTiles()`: Query methods
- `removeRoad(x, z)`: Removes a road and updates neighbor connections
- `isConnected(x1, z1, x2, z2)`: BFS pathfinding check for road connectivity

**Connectivity logic:**
- When a road is placed, it checks all 4 neighbors
- If a neighbor exists, both tiles' connection flags are set to true
- This creates a connected graph for future pathfinding

### 2. Grid Placement Rules (`src/simulation/grid-placement.ts`)
- **`canPlaceBuilding(gridX, gridZ, roadGrid, buildingSize?)`**: Validates placement
  - Checks building footprint is empty (no existing building or road)
  - Verifies at least one cell in footprint is adjacent to a road
- **`placeBuilding(gridX, gridZ, modelId, buildingRenderer, roadGrid, buildingSize?)`**: Places a building
  - Calls `canPlaceBuilding` to validate
  - Converts grid coordinates to world coordinates (y=1 to sit on terrain)
  - Tracks placement in a building grid Map
- **`getPlacedBuildings()`**, **`removeBuilding()`**, **`clearBuildings()`**: Management functions

### 3. Demo Road Network and Building Placement (`src/App.tsx`)
- **Road cross pattern**: 
  - Horizontal line from (-10, 0) to (10, 0)
  - Vertical line from (0, -10) to (0, 10)
  - Roads rendered as flat grey tiles at y=0.5
- **Building placement using grid rules**:
  - Houses placed at (2,1), (2,-1), (-2,1)
  - Office tower at (5,0)
  - Market stall at (0,5)
  - Park (3x3) at (3,3) — adjacent to road at (3,2)

## Verification

- ✅ TypeScript compiles without errors
- ✅ RoadGrid correctly updates connectivity
- ✅ canPlaceBuilding returns false for cells not adjacent to roads
- ✅ canPlaceBuilding returns true for cells adjacent to roads
- ✅ Roads appear as flat grey tiles in a cross pattern
- ✅ Buildings appear adjacent to roads, not in isolation
- ✅ No buildings placed on top of roads

## Technical Notes

- Road tiles use a separate InstancedPool for efficient rendering
- Building placement uses the grid-placement module for validation
- The building grid tracks occupied cells to prevent overlap
- Road connectivity is maintained automatically on place/remove
- Future pathfinding can use `isConnected()` or BFS from `getAllTiles()`

## Files Modified

1. `src/simulation/road-grid.ts` — NEW (138 lines)
2. `src/simulation/grid-placement.ts` — NEW (172 lines)
3. `src/App.tsx` — Updated demo to use road grid and grid placement
