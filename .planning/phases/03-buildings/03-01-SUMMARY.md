---
phase: 03-buildings
plan: 03-01
timestamp: "2026-03-11"
---

# Plan 03-01: Building Models and Renderer — Summary

## Objective

Define all building model structures and create a BuildingRenderer to render them in the scene.

## What Was Built

### 1. Building Model Definitions (`src/models/buildings.ts`)
- **13 building models** across 7 categories:
  - **Houses** (3 variants): cottage (3×4), two-storey (4×6), row house (2×5) with brick walls, roofs, windows, doors
  - **Offices** (2 variants): small (4×5), tower (3×8) with office colors and dark windows
  - **Stores** (2 variants): corner shop (3×3), market stall (2×2) with store colors and awnings
  - **Roads** (1 tile): flat 1×1 road tile
  - **Parks** (1 tile): 3×3 park with grass, tree (trunk + leaves), bench, and flowers
  - **Party Hall** (1): 3×3×3 with bright colors and bunting decorations
  - **Cleaning Depot** (1): 2×2×2 stone structure

- Helper functions for procedural generation:
  - `createHouseVoxels()` — walls, roof, windows, door
  - `createOfficeVoxels()` — walls with windows on all sides
  - `createStoreVoxels()` — walls with awning and storefront
  - `createParkVoxels()` — grass base with tree, bench, flowers
  - `createPartyHallVoxels()` — walls with decorative bunting
  - `createCleaningDepotVoxels()` — simple stone block

### 2. Building Materials (`src/engine/materials.ts`)
Added 12 new materials:
- Structural: window (0x272727), door (0x8B4513), awning (0xE8C547), bunting (0x4ECDC4)
- Nature: tree-trunk (0x8B4513), tree-leaves (0x228B22)
- Flowers: flower-pink (0xFF69B4), flower-yellow (0xFFD700), flower-orange (0xFF4500)
- Furniture: bench (0x8B4513)

### 3. Building Renderer (`src/engine/building-renderer.ts`)
- **BuildingRenderer class** following the CharacterRenderer pattern:
  - Per-model-type `InstancedPool` for efficient GPU instancing
  - `addBuilding(modelId, position)` — returns instance index
  - `updateBuilding(modelId, index, position)` — updates instance matrix
  - `getPool(modelId)` — returns InstancedPool for a model
  - `clear()` and `dispose()` methods for cleanup
  - `getMeshes()` — returns all InstancedMesh objects

- Uses `getVoxelGeometry()` for consistent voxel rendering
- Each pool sized for 20 instances (buildings are static, fewer instances needed than characters)

### 4. Demo Integration (`src/App.tsx`)
- Imported `BuildingRenderer` and integrated with existing scene
- Placed 5 buildings in demo layout:
  - Road tile at (0, 1, 0)
  - Cottage house at (2, 1, 0)
  - Small office at (-3, 1, 1)
  - Corner shop store at (1, 1, -2)
  - Park at (-1, 1, -1)
- Buildings offset to y=1 to sit on top of terrain
- Proper cleanup in unmount handler

## Verification

- ✅ TypeScript compiles without errors
- ✅ Building models defined with valid voxel arrays
- ✅ All materials return valid MeshLambertMaterial
- ✅ BuildingRenderer creates pools for all models
- ✅ Buildings appear on screen in demo layout
- ✅ Different building types visually distinguishable by color/shape

## Technical Notes

- Followed the exact same pattern as CharacterRenderer for consistency
- Buildings are static (no animation) — simpler than characters
- Pool capacity of 20 per building type is sufficient for demo; can be increased for larger cities
- Grid placement (Plan 03-02) will add road network and adjacency rules

## Files Modified

1. `src/models/buildings.ts` — NEW (169 lines)
2. `src/engine/materials.ts` — Added 12 building materials
3. `src/engine/building-renderer.ts` — NEW (84 lines)
4. `src/main.tsx` — No changes (entry point unchanged)
5. `src/App.tsx` — Added BuildingRenderer integration and demo buildings
