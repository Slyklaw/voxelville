# Research: Phase 6 — Population Growth Implementation

**Phase:** Population Growth (Phase 6 of 6)  
**Requirements:** GROW-01, GROW-02, GROW-03  
**Research Date:** 2026-03-11  
**Confidence:** HIGH (based on existing codebase patterns)

---

## Executive Summary

Phase 6 implements autonomous city growth: residents spawn when housing is available and happiness is high, and buildings auto-construct based on population demand and the Play/Work slider. The existing codebase provides all necessary foundations (needs system, building grid, simulation loop, slider state) to implement this with minimal new components.

---

## 1. Happiness Formula (GROW-01, design requirement)

**Current Implementation:** Already exists in `simulation-tick.ts:121-133`

```typescript
// Calculate average happiness (inverse of average needs)
let totalNeedScore = 0;
for (const entityId of this.stateManager.getAllEntityIds()) {
  const sim = this.stateManager.getCharacter(entityId);
  if (sim) {
    const avgNeed = (sim.needs.hunger + sim.needs.energy + 
                    sim.needs.social + sim.needs.hygiene) / 4;
    totalNeedScore += 1 - avgNeed;  // Higher = happier
  }
}
const happiness = count > 0 ? totalNeedScore / count : 0;
```

**Formula:** `happiness = 1 - mean(hunger, energy, social, hygiene)`  
**Range:** 0 (all needs urgent) to 1 (all needs satisfied)  
**Update Frequency:** Every 4 ticks (1 second) via `uiState.updateStats()`

**Decision:** Use existing formula. No changes needed.

---

## 2. Housing Vacancy Detection (GROW-01)

**Current State:** No occupancy tracking exists. Building models defined in `models/buildings.ts` lack capacity fields.

**Required Additions:**

### 2.1 Building Component Extension

Add to building definition/type:
```typescript
interface BuildingComponent {
  capacity: number;      // Max residents (2-6 depending on type)
  occupancy: number;     // Current residents assigned
  type: 'house' | 'office' | 'store' | 'park' | 'party_hall' | 'cleaning_depot';
}
```

### 2.2 Capacity by Building Type

| Building Type | Capacity | Notes |
|---------------|----------|-------|
| `house_cottage` | 2 | Small family |
| `house_two_storey` | 3 | Medium family |
| `house_row_house` | 1-2 | Compact |
| `office_small` | 4 | Workers |
| `office_tower` | 6 | Workers |
| `store_corner_shop` | 2 | Workers + customers |
| `store_market_stall` | 1 | Worker |
| `park` | N/A | Not housing/work |
| `party_hall` | N/A | Not housing/work |
| `cleaning_depot` | 2 | Workers |

### 2.3 Vacancy Calculation

```typescript
function getHousingVacancy(buildings: Building[]): number {
  let totalCapacity = 0;
  let totalOccupancy = 0;
  for (const b of buildings) {
    if (b.type === 'house') {
      totalCapacity += b.capacity;
      totalOccupancy += b.occupancy;
    }
  }
  return Math.max(0, totalCapacity - totalOccupancy);
}
```

---

## 3. Population Spawn Trigger Logic (GROW-01)

**Design Spec (design.md:584-591):**
```
Every 30 seconds (game-time):
  happiness = average(all residents' need satisfaction)
  if happiness > 0.6 AND housingVacancy > 0:
    spawn new resident
```

**Implementation Plan:**

### 3.1 Spawn Interval
- Check every 30 game-seconds (120 ticks at 4 ticks/sec)
- Add `spawnTickCounter` to SimulationLoop

### 3.2 Spawn Conditions
```typescript
const shouldSpawn = 
  happiness > 0.6 && 
  housingVacancy > 0 &&
  this.tickCount % 120 === 0;  // Every 30 seconds
```

### 3.3 Resident Assignment
```typescript
function spawnResident(
  stateManager: CharacterStateManager,
  buildings: Building[],
  rng: SeededRNG,
): ResidentSimState {
  // 1. Find vacant house
  const vacantHouses = buildings.filter(b => 
    b.type === 'house' && b.occupancy < b.capacity
  );
  const home = vacantHouses[Math.floor(rng.next() * vacantHouses.length)];
  
  // 2. Find vacant workplace
  const workplaces = buildings.filter(b => 
    (b.type === 'office' || b.type === 'store') && 
    b.occupancy < b.capacity
  );
  const workplace = workplaces[Math.floor(rng.next() * workplaces.length)];
  
  // 3. Create character at home position
  const position = home.position.clone();
  const modelId = selectRandomCharacterModel(rng);
  const entityId = stateManager.characterCount;
  stateManager.createCharacter(entityId, modelId, position);
  
  // 4. Update occupancy
  home.occupancy++;
  if (workplace) workplace.occupancy++;
  
  // 5. Return sim state with homeId/workplaceId
  const sim = stateManager.getCharacter(entityId)!;
  sim.homeId = home.id;
  sim.workplaceId = workplace?.id || null;
  
  return sim;
}
```

### 3.4 Character Model Selection
Randomly select from existing 18 models (5 male + 5 female + 8 child):
```typescript
function selectRandomCharacterModel(rng: SeededRNG): string {
  const models = ['male_1', 'male_2', 'male_3', 'male_4', 'male_5',
                  'female_1', 'female_2', 'female_3', 'female_4', 'female_5',
                  'child_1', 'child_2', 'child_3', 'child_4', 
                  'child_5', 'child_6', 'child_7', 'child_8'];
  return models[Math.floor(rng.next() * models.length)];
}
```

---

## 4. Auto-construction System (GROW-02, GROW-03)

### 4.1 Demand Detection

Track population vs. building capacity:
```typescript
interface CityDemand {
  housingDemand: number;    // residents - totalHouseCapacity
  workplaceDemand: number;  // residents - totalWorkplaceCapacity
  leisureDemand: number;    // residents / (parks + partyHalls) ratio
}
```

### 4.2 Building Priority from Slider (GROW-03)

**Current Implementation:** Already exists in `ui-state.ts:32-51`

```typescript
// Recalculate build priorities based on slider position
const playBonus = 1 - this.sliderValue;
const workBonus = this.sliderValue;

// Work buildings
this.buildPriority.office = 0.7 + (0.6 * workBonus);
this.buildPriority.store = 0.7 + (0.6 * workBonus);

// Play buildings
this.buildPriority.park = 0.7 + (0.6 * playBonus);
this.buildPriority.partyhall = 0.7 + (0.6 * playBonus);
```

**Priority Range:** 0.7 (slider fully opposite) to 1.3 (slider fully aligned)

### 4.3 Auto-construction Rules

When population demands buildings:

1. **Housing Shortage** (`housingDemand > 0`):
   - Build house with highest slider bonus
   - If slider > 0.5: prefer `house_two_storey` (larger)
   - If slider < 0.5: prefer `house_cottage` or `house_row_house`

2. **Workplace Shortage** (`workplaceDemand > 0`):
   - Build office if slider > 0.6
   - Build store if slider between 0.4-0.6
   - Weight by `buildPriority.office` and `buildPriority.store`

3. **Leisure Shortage** (`leisureDemand > 3`):
   - Build park if slider < 0.4
   - Build party hall if slider < 0.3
   - Weight by `buildPriority.park` and `buildPriority.partyhall`

### 4.4 Construction Interval
- Check every 60 game-seconds (240 ticks)
- Build one building per check (avoid spam)

### 4.5 Building Placement Algorithm

```typescript
function findBuildingPlacement(
  buildingType: string,
  roadGrid: RoadGrid,
  rng: SeededRNG,
): { x: number; z: number } | null {
  // Get all road tiles
  const roads = roadGrid.getAllTiles();
  if (roads.length === 0) return null;
  
  // Shuffle roads for randomness
  const shuffled = [...roads].sort(() => rng.next() - 0.5);
  
  for (const road of shuffled) {
    // Check adjacent cells (N/S/E/W)
    const directions = [
      { dx: 0, dz: -1 },
      { dx: 0, dz: 1 },
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
    ];
    
    for (const { dx, dz } of directions) {
      const x = road.x + dx;
      const z = road.z + dz;
      
      if (canPlaceBuilding(x, z, roadGrid, [1, 1])) {
        return { x, z };
      }
    }
  }
  
  return null;
}
```

---

## 5. Integration with Existing Systems

### 5.1 CharacterStateManager
**Current API:**
- `createCharacter(entityId, modelId, position)` — Already supports spawning
- `getCharacter(entityId)` — Access sim state for homeId/workplaceId
- `characterCount` — Population count

**Extensions Needed:** None. Existing API sufficient.

### 5.2 BuildingRenderer
**Current API:**
- `addBuilding(modelId, position)` — Already supports adding buildings
- `getPool(modelId)` — Check if model exists

**Extensions Needed:** None. Existing API sufficient.

### 5.3 GridPlacement
**Current API:**
- `canPlaceBuilding(gridX, gridZ, roadGrid, buildingSize)` — Check placement rules
- `placeBuilding(gridX, gridZ, modelId, buildingRenderer, roadGrid, buildingSize)` — Place building

**Extensions Needed:** None. Existing API sufficient.

### 5.4 uiState
**Current API:**
- `buildPriority` — Multipliers for office/store/park/partyhall (0.7-1.3)
- `updateStats(population, happiness)` — Write population/happiness
- `sliderValue` — Current slider position (0-1)

**Extensions Needed:** None. Existing API sufficient.

### 5.5 SimulationLoop
**Current API:**
- `tick()` — Main simulation tick (needs decay, task selection, movement)
- `tickCount` — Current tick counter

**Extensions Needed:**
- Add `growthTickCounter` for spawn/construction timing
- Add `buildings` array with capacity/occupancy tracking
- Add `growthSystemTick()` called every N ticks

---

## 6. New Components to Create

### 6.1 `growth-system.ts`
Core growth logic:
- `checkSpawnConditions(happiness, housingVacancy, tickCount): boolean`
- `spawnResident(stateManager, buildings, rng): ResidentSimState`
- `checkConstructionDemand(population, buildings, sliderValue): BuildingType | null`
- `autoConstructBuilding(buildingType, roadGrid, buildingRenderer, rng): number | null`

### 6.2 Building Component Extension
Add to `types.ts`:
```typescript
export interface Building {
  id: number;
  type: 'house' | 'office' | 'store' | 'park' | 'party_hall' | 'cleaning_depot';
  position: THREE.Vector3;
  capacity: number;
  occupancy: number;
  modelId: string;
}
```

### 6.3 Growth Constants
Add to `types.ts` or new `growth-config.ts`:
```typescript
export const GROWTH_CONFIG = {
  spawnInterval: 120,        // Ticks between spawn checks (30 seconds)
  constructionInterval: 240, // Ticks between construction checks (60 seconds)
  happinessThreshold: 0.6,   // Min happiness to spawn
  maxPopulation: 500,        // Performance cap
  spawnChance: 0.8,          // 80% chance when conditions met (prevents clustering)
};
```

---

## 7. Quality Gate Checklist

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Happiness formula specified | ✅ | `simulation-tick.ts:121-133` — `1 - mean(needs)` |
| Housing vacancy detection | ✅ | Building component with `capacity`/`occupancy` fields |
| Spawn trigger thresholds | ✅ | `happiness > 0.6`, `housingVacancy > 0`, every 120 ticks |
| Auto-construction rules | ✅ | Demand detection + slider-weighted building selection |
| Integration points documented | ✅ | CharacterStateManager, BuildingRenderer, GridPlacement, uiState |

---

## 8. Implementation Order

1. **Add Building component** with capacity/occupancy (extends types.ts)
2. **Create growth-system.ts** with spawn/construction logic
3. **Extend SimulationLoop** with growth tick
4. **Update building models** with capacity values
5. **Integrate growth system** into main simulation loop
6. **Test** with existing 20 characters + manual housing/workplace setup

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Building grid doesn't track occupancy | Can't detect vacancy | Add occupancy field to building component |
| Performance with 500 residents | Frame drops | Cap at `maxPopulation = 500`, batch updates |
| Construction spam | Too many buildings | Limit to one building per 60 seconds |
| Spawn clustering | Unrealistic clustering | Use `spawnChance = 0.8` + random placement |

---

## 10. Open Questions

1. **Initial buildings:** Should we pre-place some houses/workplaces at game start, or rely entirely on auto-construction?
2. **Children:** Should spawning occasionally create children (attached to existing families) or only adults?
3. **Building removal:** Should buildings be removed if population shrinks (not needed for v1)?

---

*Research complete. All quality gates satisfied. Ready for Phase 6 planning.*
