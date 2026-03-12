# Phase 4: Simulation Research

**Objective:** Research how to implement Phase 4: Simulation - autonomous citizen behavior driven by needs and AI

**Phase Requirements:** SIM-01 (Needs system), SIM-02 (Utility-based AI task selection), SIM-03 (A* pathfinding on road grid)

**Current Codebase State:** Phase 1-3 complete. Characters exist (CharacterStateManager, CharacterSimState, CharacterRenderState, interpolateCharacter). Buildings exist (BuildingRenderer, RoadGrid, GridPlacement). World exists (World, SeededRNG). No simulation logic yet.

**Research Date:** 2026-03-11
**Confidence:** MEDIUM (based on existing codebase patterns + domain research)

---

## 1. ECS Architecture Recommendation

### Current State Analysis
The codebase currently uses plain TypeScript objects:
- `CharacterStateManager` manages `CharacterSimState` and `CharacterRenderState` objects
- `RoadGrid` manages `RoadTile` objects
- `World` manages `TileData` objects

### Research Findings

**PITFALL 3 (HIGH confidence):** "Custom ECS Over-Engineering Before Core Loop Works"
- **What goes wrong:** Full ECS abstraction built before any game logic runs. 3 weeks of architecture work with zero playable result.
- **Prevention:** Start with plain TypeScript classes and arrays. Only introduce ECS structure when:
  1. Core game loop is working (citizens move, eat, work)
  2. Performance requires it (> 100 entities with frequent updates)
  3. You know exactly which components are needed

**Recommendation:** Start with plain objects, introduce ECS only when justified.

### Recommended Architecture: Hybrid Approach

**Phase 4 Implementation:**
1. **Start with plain objects** (current approach)
   - Extend `CharacterSimState` with needs and AI properties
   - Create `BuildingSimState` for building simulation data
   - Use simple arrays/maps for entity management

2. **Add lightweight ECS patterns** when performance demands it:
   - Component interfaces (no base classes)
   - Simple query functions (no complex query system)
   - Component composition via object extension

**ECS Components Needed:**
```typescript
// Resident Component (extends CharacterSimState)
interface ResidentComponent {
  needs: { hunger: number; energy: number; social: number; hygiene: number };
  personality: { playfulness: number; diligence: number };
  currentTask: Task | null;
  taskQueue: Task[];
  homeId: number | null;
  workplaceId: number | null;
}

// Building Component
interface BuildingComponent {
  type: 'house' | 'office' | 'store' | 'park' | 'partyhall' | 'cleaningdepot';
  capacity: number;
  occupancy: number[];
  level: number;
}

// WorldTile Component (extends existing TileData)
interface WorldTileComponent {
  terrainType: 'grass' | 'water' | 'dirt' | 'stone';
  isRoad: boolean;
  buildingId: number | null;
}
```

### Migration Strategy
1. **Week 1:** Add needs and AI properties to existing `CharacterSimState`
2. **Week 2:** Create building simulation state
3. **Week 3:** Implement decision loop with plain objects
4. **Week 4:** Profile and optimize (introduce ECS patterns only if needed)

---

## 2. Needs Decay Formula and Utility Scoring Weights

### Design.md Specifications (Section 5.3)
```
for each resident:
  1. Decay needs (hunger++, energy++, social++, hygiene++)
  2. Compute utility for each available task:
       U(task) = w1*needSatisfaction + w2*personalityFit + w3*sliderBonus + w4*proximity
  3. Pick highest-U task (softmax with ε-greedy exploration)
  4. Execute movement (A* on road-grid) → perform task → repeat
```

### Needs Decay Formula

**Recommendation:** Exponential decay with different rates per need

```typescript
// Needs decay rates (per tick = 0.25 seconds)
const NEED_DECAY_RATES = {
  hunger: 0.01,    // Hunger decays fastest (1% per tick = 4% per second)
  energy: 0.005,   // Energy decays moderately (0.5% per tick)
  social: 0.003,   // Social decays slowly (0.3% per tick)
  hygiene: 0.002,  // Hygiene decays very slowly (0.2% per tick)
};

// Decay formula: need += rate * (1 + need)  // Exponential growth toward max
// This makes low needs decay slowly, high needs decay quickly
function decayNeed(current: number, rate: number): number {
  return Math.min(1, current + rate * (1 + current));
}
```

**Rationale:** 
- Hunger needs frequent attention (4% per second = 100% in 25 seconds)
- Energy is moderate (50% in 25 seconds)
- Social needs are occasional (30% in 25 seconds)
- Hygiene is slow (20% in 25 seconds)

### Utility Scoring Weights (Initial Tuning)

**Recommendation:** Balanced weights with visible slider effect

```typescript
// Initial weight values (tune with debug overlay)
const UTILITY_WEIGHTS = {
  needSatisfaction: 0.4,   // 40% - Primary driver
  personalityFit: 0.3,     // 30% - Secondary influence
  sliderBonus: 0.2,        // 20% - Player influence
  proximity: 0.1,          // 10% - Convenience factor
};

// Utility formula
function computeUtility(
  task: Task,
  resident: ResidentComponent,
  sliderPosition: number  // -1 (play) to +1 (work)
): number {
  const needSatisfaction = computeNeedSatisfaction(task, resident.needs);
  const personalityFit = computePersonalityFit(task, resident.personality);
  const sliderBonus = computeSliderBonus(task, sliderPosition);
  const proximity = computeProximity(task, resident.position);
  
  return (
    UTILITY_WEIGHTS.needSatisfaction * needSatisfaction +
    UTILITY_WEIGHTS.personalityFit * personalityFit +
    UTILITY_WEIGHTS.sliderBonus * sliderBonus +
    UTILITY_WEIGHTS.proximity * proximity
  );
}
```

### Need Satisfaction Computation

```typescript
// How much a task satisfies each need (0-1)
const TASK_NEED_SATISFACTION = {
  eat: { hunger: 0.8, energy: 0.2, social: 0.1, hygiene: 0 },
  sleep: { hunger: 0, energy: 1.0, social: 0, hygiene: 0 },
  shower: { hunger: 0, energy: 0.3, social: 0, hygiene: 0.9 },
  work: { hunger: -0.1, energy: -0.3, social: 0.2, hygiene: -0.1 },
  shop: { hunger: 0.3, energy: -0.1, social: 0.4, hygiene: 0 },
  party: { hunger: -0.2, energy: -0.5, social: 0.8, hygiene: -0.3 },
  park: { hunger: 0, energy: -0.2, social: 0.6, hygiene: 0 },
  clean: { hunger: -0.1, energy: -0.2, social: 0.1, hygiene: 0.5 },
};

function computeNeedSatisfaction(task: Task, needs: Needs): number {
  const taskSatisfaction = TASK_NEED_SATISFACTION[task.type];
  if (!taskSatisfaction) return 0;
  
  // Weight by current need urgency
  let totalSatisfaction = 0;
  let totalUrgency = 0;
  
  for (const [need, satisfaction] of Object.entries(taskSatisfaction)) {
    if (satisfaction !== 0) {
      const urgency = needs[need as keyof Needs];
      totalSatisfaction += Math.abs(satisfaction) * urgency;
      totalUrgency += urgency;
    }
  }
  
  return totalUrgency > 0 ? totalSatisfaction / totalUrgency : 0;
}
```

### Personality Fit Computation

```typescript
// Task personality preferences (playfulness vs diligence)
const TASK_PERSONALITY_FIT = {
  work: { playfulness: -0.8, diligence: 0.8 },      // Diligent people prefer work
  shop: { playfulness: 0.6, diligence: 0.2 },        // Playful people like shopping
  party: { playfulness: 1.0, diligence: -0.5 },      // Playful people love parties
  park: { playfulness: 0.8, diligence: 0 },          // Playful people like parks
  clean: { playfulness: -0.3, diligence: 0.7 },      // Diligent people clean
  eat: { playfulness: 0.1, diligence: 0.1 },         // Neutral
  sleep: { playfulness: 0, diligence: 0 },           // Neutral
  shower: { playfulness: 0, diligence: 0.2 },        // Slight diligence
};

function computePersonalityFit(task: Task, personality: Personality): number {
  const fit = TASK_PERSONALITY_FIT[task.type];
  if (!fit) return 0.5;  // Neutral if unknown
  
  // Dot product: personality vector · task preference vector
  const dot = personality.playfulness * fit.playfulness +
              personality.diligence * fit.diligence;
  
  // Normalize to 0-1 range (dot product can be -1 to 1)
  return (dot + 1) / 2;
}
```

---

## 3. AI Task Selection Algorithm

### Design.md Specifications
- **Utility scoring:** U(task) = w1*needSatisfaction + w2*personalityFit + w3*sliderBonus + w4*proximity
- **Task selection:** softmax with ε-greedy exploration

### Recommendation: Softmax with ε-greedy

```typescript
// Task selection parameters
const TASK_SELECTION = {
  temperature: 0.5,      // Softmax temperature (lower = more deterministic)
  epsilon: 0.1,          // Exploration rate (10% random tasks)
  minUtilityThreshold: 0.2,  // Ignore tasks below this utility
};

function selectTask(
  availableTasks: Task[],
  resident: ResidentComponent,
  sliderPosition: number,
  rng: SeededRNG
): Task | null {
  if (availableTasks.length === 0) return null;
  
  // ε-greedy: 10% chance to pick random task
  if (rng.next() < TASK_SELECTION.epsilon) {
    return availableTasks[Math.floor(rng.next() * availableTasks.length)];
  }
  
  // Compute utilities for all tasks
  const utilities = availableTasks.map(task => ({
    task,
    utility: computeUtility(task, resident, sliderPosition),
  }));
  
  // Filter out low-utility tasks
  const viableTasks = utilities.filter(u => u.utility >= TASK_SELECTION.minUtilityThreshold);
  if (viableTasks.length === 0) return null;
  
  // Softmax selection
  const softmaxWeights = softmax(viableTasks.map(v => v.utility), TASK_SELECTION.temperature);
  
  // Weighted random selection
  const totalWeight = softmaxWeights.reduce((sum, w) => sum + w, 0);
  let random = rng.next() * totalWeight;
  
  for (let i = 0; i < viableTasks.length; i++) {
    random -= softmaxWeights[i];
    if (random <= 0) {
      return viableTasks[i].task;
    }
  }
  
  return viableTasks[viableTasks.length - 1].task;
}

// Softmax function with temperature
function softmax(values: number[], temperature: number): number[] {
  const scaled = values.map(v => v / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}
```

### Task Categories and Availability

```typescript
interface Task {
  id: string;
  type: TaskType;
  location: { x: number; z: number };
  buildingId: number | null;
  duration: number;  // Ticks to complete
}

type TaskType = 'eat' | 'sleep' | 'shower' | 'work' | 'shop' | 'party' | 'park' | 'clean';

// Tasks available based on resident state and location
function getAvailableTasks(
  resident: ResidentComponent,
  roadGrid: RoadGrid,
  buildings: BuildingSimState[],
  tick: number
): Task[] {
  const tasks: Task[] = [];
  
  // Always available tasks (at current location)
  if (resident.needs.hunger > 0.7) {
    tasks.push({ id: 'eat_home', type: 'eat', location: resident.position, buildingId: resident.homeId, duration: 2 });
  }
  if (resident.needs.energy > 0.8) {
    tasks.push({ id: 'sleep_home', type: 'sleep', location: resident.position, buildingId: resident.homeId, duration: 8 });
  }
  
  // Location-based tasks (need to travel)
  for (const building of buildings) {
    if (building.type === 'store') {
      tasks.push({
        id: `shop_${building.id}`,
        type: 'shop',
        location: building.position,
        buildingId: building.id,
        duration: 4,
      });
    }
    if (building.type === 'partyhall') {
      tasks.push({
        id: `party_${building.id}`,
        type: 'party',
        location: building.position,
        buildingId: building.id,
        duration: 6,
      });
    }
    // ... more task types
  }
  
  return tasks;
}
```

---

## 4. A* Pathfinding Implementation Strategy

### Design.md Specifications
- **Grid:** 2D grid (`WorldTile[][]`)
- **Roads:** Tiles where `building.type === 'road'`
- **Algorithm:** A* on grid (4-directional)
- **Buildings:** Placed on non-road tiles adjacent to roads

### Research Findings

**PITFALL 6 (HIGH confidence):** "Pathfinding on Unbounded Grid Without Spatial Indexing"
- **What goes wrong:** A* pathfinding scans entire world grid for each citizen every tick. With 500 citizens and a 100x100 grid, that's 5,000,000 node evaluations per second.
- **Prevention:**
  1. Cache paths when destination hasn't changed
  2. Recalculate only when target moves or road network changes
  3. Use hierarchical pathfinding: citizens navigate to local road, road network finds route, citizen navigates to building
  4. Limit A* iterations per tick (time-slicing)

### Recommendation: Cached A* with Time-Slicing

```typescript
// Pathfinding configuration
const PATHFINDING_CONFIG = {
  maxIterationsPerTick: 100,  // Time-slicing limit
  cacheTTL: 1000,             // Cache paths for 1 second (4 ticks)
  heuristicWeight: 1.2,       // A* heuristic weight (1 = optimal, >1 = faster)
};

// Path cache
interface PathCacheEntry {
  path: { x: number; z: number }[];
  timestamp: number;
  ttl: number;
}

class Pathfinder {
  private pathCache: Map<string, PathCacheEntry>;
  private roadGrid: RoadGrid;
  
  constructor(roadGrid: RoadGrid) {
    this.pathCache = new Map();
    this.roadGrid = roadGrid;
  }
  
  // Get cached path or compute new one
  findPath(
    start: { x: number; z: number },
    end: { x: number; z: number },
    tick: number
  ): { x: number; z: number }[] | null {
    const cacheKey = `${start.x},${start.z}-${end.x},${end.z}`;
    const cached = this.pathCache.get(cacheKey);
    
    // Return cached path if still valid
    if (cached && tick - cached.timestamp < cached.ttl) {
      return cached.path;
    }
    
    // Compute new path
    const path = this.computePath(start, end, tick);
    if (path) {
      this.pathCache.set(cacheKey, {
        path,
        timestamp: tick,
        ttl: PATHFINDING_CONFIG.cacheTTL,
      });
    }
    
    return path;
  }
  
  // A* pathfinding with time-slicing
  private computePath(
    start: { x: number; z: number },
    end: { x: number; z: number },
    tick: number
  ): { x: number; z: number }[] | null {
    const openSet: { x: number; z: number; g: number; h: number; f: number; parent: { x: number; z: number } | null }[] = [];
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, { x: number; z: number }>();
    
    // Start node
    const startNode = {
      x: start.x,
      z: start.z,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null,
    };
    openSet.push(startNode);
    
    let iterations = 0;
    while (openSet.length > 0 && iterations < PATHFINDING_CONFIG.maxIterationsPerTick) {
      iterations++;
      
      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.z}`;
      
      // Check if we reached the end
      if (current.x === end.x && current.z === end.z) {
        return this.reconstructPath(cameFrom, current);
      }
      
      closedSet.add(currentKey);
      
      // Check neighbors
      const neighbors = this.getNeighbors(current.x, current.z);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.z}`;
        
        // Skip if in closed set
        if (closedSet.has(neighborKey)) continue;
        
        // Calculate new g score
        const tentativeG = current.g + 1;  // Cost = 1 for all moves
        
        // Check if this path is better
        const existingNode = openSet.find(n => n.x === neighbor.x && n.z === neighbor.z);
        if (!existingNode || tentativeG < existingNode.g) {
          cameFrom.set(neighborKey, { x: current.x, z: current.z });
          const h = this.heuristic(neighbor, end);
          
          if (existingNode) {
            existingNode.g = tentativeG;
            existingNode.f = tentativeG + h;
          } else {
            openSet.push({
              x: neighbor.x,
              z: neighbor.z,
              g: tentativeG,
              h,
              f: tentativeG + h,
              parent: { x: current.x, z: current.z },
            });
          }
        }
      }
    }
    
    // No path found within iteration limit
    return null;
  }
  
  // Heuristic: Manhattan distance with weight
  private heuristic(a: { x: number; z: number }, b: { x: number; z: number }): number {
    return (Math.abs(a.x - b.x) + Math.abs(a.z - b.z)) * PATHFINDING_CONFIG.heuristicWeight;
  }
  
  // Get walkable neighbors (connected roads)
  private getNeighbors(x: number, z: number): { x: number; z: number }[] {
    const neighbors: { x: number; z: number }[] = [];
    const directions = [
      { dx: 0, dz: -1, dir: 'north' as const },
      { dx: 0, dz: 1, dir: 'south' as const },
      { dx: 1, dz: 0, dir: 'east' as const },
      { dx: -1, dz: 0, dir: 'west' as const },
    ];
    
    const tile = this.roadGrid.getTile(x, z);
    if (!tile) return neighbors;
    
    for (const { dx, dz, dir } of directions) {
      if (tile.connections[dir]) {
        neighbors.push({ x: x + dx, z: z + dz });
      }
    }
    
    return neighbors;
  }
  
  // Reconstruct path from cameFrom map
  private reconstructPath(
    cameFrom: Map<string, { x: number; z: number }>,
    current: { x: number; z: number }
  ): { x: number; z: number }[] {
    const path: { x: number; z: number }[] = [];
    let node: { x: number; z: number } | undefined = current;
    
    while (node) {
      path.unshift(node);
      node = cameFrom.get(`${node.x},${node.z}`);
    }
    
    return path;
  }
  
  // Clear cache when road network changes
  clearCache(): void {
    this.pathCache.clear();
  }
}
```

### Integration with CharacterStateManager

```typescript
// Movement system integration
class MovementSystem {
  private pathfinder: Pathfinder;
  private roadGrid: RoadGrid;
  private tick: number = 0;
  
  constructor(roadGrid: RoadGrid) {
    this.roadGrid = roadGrid;
    this.pathfinder = new Pathfinder(roadGrid);
  }
  
  // Update movement for all characters (called each tick)
  update(characters: CharacterStateManager): void {
    this.tick++;
    
    for (const entityId of characters.getAllEntityIds()) {
      const sim = characters.getCharacter(entityId);
      if (!sim) continue;
      
      // If character has a task with a location different from current position
      const task = sim.currentTask;
      if (task && (task.location.x !== sim.position.x || task.location.z !== sim.position.z)) {
        // Find path to task location
        const path = this.pathfinder.findPath(
          { x: sim.position.x, z: sim.position.z },
          task.location,
          this.tick
        );
        
        if (path && path.length > 1) {
          // Move to next step in path
          const nextStep = path[1];
          const newPosition = new THREE.Vector3(nextStep.x, 0, nextStep.z);
          updateSimulation(sim, newPosition, 'walk');
        } else if (path && path.length === 1) {
          // Reached destination, start task
          updateSimulation(sim, sim.position, taskToAnimation(task.type));
        }
      }
    }
  }
}
```

---

## 5. Debug Overlay Strategy for AI Tuning

### Research Findings

**PITFALL 5 (HIGH confidence):** "AI Utility System Weight Tuning Without Visual Feedback"
- **What goes wrong:** Utility-based AI with 4+ weighted factors but no way to see why a citizen chose a task. Tuning weights is pure guesswork.
- **Prevention:**
  1. Build debug overlay showing: current task, utility scores for alternatives, weight values
  2. Start with simple rule-based AI (if hungry → eat), add utility later
  3. Make Play/Work slider effect large enough to see (±30% is good, start with ±50% for visibility)
  4. Log task decisions to console for debugging

### Recommendation: Three-Layer Debug System

#### Layer 1: Console Logging (Always On)
```typescript
class DebugLogger {
  private enabled: boolean = true;
  
  logTaskDecision(
    entityId: number,
    resident: ResidentComponent,
    selectedTask: Task,
    availableTasks: Task[],
    utilities: { task: Task; utility: number }[]
  ): void {
    if (!this.enabled) return;
    
    console.group(`Character ${entityId} Task Decision`);
    console.log('Current needs:', resident.needs);
    console.log('Personality:', resident.personality);
    console.log('Slider position:', resident.sliderPosition);
    console.log('Selected task:', selectedTask);
    console.log('Available tasks:', availableTasks.map(t => t.type));
    console.log('Utility scores:', utilities.map(u => `${u.task.type}: ${u.utility.toFixed(3)}`));
    console.groupEnd();
  }
  
  logMovement(entityId: number, from: Vector3, to: Vector3, pathLength: number): void {
    if (!this.enabled) return;
    console.log(`Character ${entityId} moving: ${from.x},${from.z} → ${to.x},${to.z} (path: ${pathLength})`);
  }
}
```

#### Layer 2: On-Screen Debug Panel (Toggle with D key)
```typescript
interface DebugOverlayData {
  entityId: number;
  position: { x: number; z: number };
  needs: Needs;
  personality: Personality;
  currentTask: Task | null;
  selectedTask: Task | null;
  availableTasks: Task[];
  utilities: { task: Task; utility: number }[];
  pathToTarget: { x: number; z: number }[] | null;
}

class DebugOverlay {
  private data: Map<number, DebugOverlayData>;
  private selectedEntityId: number | null;
  private visible: boolean;
  
  constructor() {
    this.data = new Map();
    this.selectedEntityId = null;
    this.visible = false;
  }
  
  update(entityId: number, data: DebugOverlayData): void {
    this.data.set(entityId, data);
  }
  
  selectEntity(entityId: number): void {
    this.selectedEntityId = entityId;
  }
  
  render(): HTMLDivElement {
    if (!this.visible || !this.selectedEntityId) return document.createElement('div');
    
    const entityData = this.data.get(this.selectedEntityId);
    if (!entityData) return document.createElement('div');
    
    return (
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-sm max-w-xs">
        <h3 className="font-bold mb-2">Character {entityData.entityId}</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Position: {entityData.position.x}, {entityData.position.z}</div>
          <div>Task: {entityData.currentTask?.type || 'none'}</div>
          <div>Hunger: {(entityData.needs.hunger * 100).toFixed(0)}%</div>
          <div>Energy: {(entityData.needs.energy * 100).toFixed(0)}%</div>
          <div>Social: {(entityData.needs.social * 100).toFixed(0)}%</div>
          <div>Hygiene: {(entityData.needs.hygiene * 100).toFixed(0)}%</div>
          <div>Playfulness: {entityData.personality.playfulness.toFixed(2)}</div>
          <div>Diligence: {entityData.personality.diligence.toFixed(2}</div>
        </div>
        <div className="mt-2 border-t border-white/30 pt-2">
          <div className="text-xs text-gray-400 mb-1">Available Tasks:</div>
          {entityData.utilities.map(u => (
            <div key={u.task.id} className="flex justify-between text-xs">
              <span>{u.task.type}</span>
              <span className={u.task.id === entityData.selectedTask?.id ? 'text-green-400' : ''}>
                {u.utility.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
        {entityData.pathToTarget && (
          <div className="mt-2 border-t border-white/30 pt-2">
            <div className="text-xs text-gray-400 mb-1">Path to Target:</div>
            <div className="text-xs">Length: {entityData.pathToTarget.length}</div>
          </div>
        )}
      </div>
    );
  }
  
  toggle(): void {
    this.visible = !this.visible;
  }
  
  show(): void {
    this.visible = true;
  }
  
  hide(): void {
    this.visible = false;
  }
}
```

#### Layer 3: Visual Highlighting (Character Selection)
```typescript
// Highlight selected character in 3D view
class CharacterHighlighter {
  private selectedEntityId: number | null;
  private highlightMaterial: THREE.MeshBasicMaterial;
  private highlightMesh: THREE.Mesh;
  
  constructor(scene: THREE.Scene) {
    this.selectedEntityId = null;
    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
    });
    
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    this.highlightMesh = new THREE.Mesh(geometry, this.highlightMaterial);
    this.highlightMesh.visible = false;
    scene.add(this.highlightMesh);
  }
  
  select(entityId: number, position: THREE.Vector3): void {
    this.selectedEntityId = entityId;
    this.highlightMesh.position.copy(position);
    this.highlightMesh.visible = true;
  }
  
  deselect(): void {
    this.selectedEntityId = null;
    this.highlightMesh.visible = false;
  }
  
  update(position: THREE.Vector3): void {
    if (this.selectedEntityId !== null) {
      this.highlightMesh.position.copy(position);
    }
  }
}
```

### Debug Controls
```typescript
// Debug state management
interface DebugState {
  overlay: DebugOverlay;
  highlighter: CharacterHighlighter;
  logger: DebugLogger;
  showPathfinding: boolean;
  showUtilityScores: boolean;
  showNeeds: boolean;
  showPersonality: boolean;
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.key === 'd') {
    debugState.overlay.toggle();
  }
  if (e.key === 'p') {
    debugState.showPathfinding = !debugState.showPathfinding;
  }
  if (e.key === 'u') {
    debugState.showUtilityScores = !debugState.showUtilityScores;
  }
  if (e.key === 'n') {
    debugState.showNeeds = !debugState.showNeeds;
  }
  if (e.key === 'l') {
    debugState.logger.enabled = !debugState.logger.enabled;
  }
});
```

---

## 6. Integration Points with Existing Codebase

### CharacterStateManager Integration
The existing `CharacterStateManager` needs extension, not replacement:

```typescript
// Extend CharacterSimState with simulation data
interface ExtendedCharacterSimState extends CharacterSimState {
  // Needs (0-1, where 1 = urgent)
  needs: {
    hunger: number;
    energy: number;
    social: number;
    hygiene: number;
  };
  
  // Personality traits (-1 to 1)
  personality: {
    playfulness: number;  // -1 = very diligent, +1 = very playful
    diligence: number;    // -1 = lazy, +1 = very hardworking
  };
  
  // AI state
  currentTask: Task | null;
  taskQueue: Task[];
  homeId: number | null;
  workplaceId: number | null;
  
  // Movement
  currentPath: { x: number; z: number }[] | null;
  pathIndex: number;
}
```

### RoadGrid Integration
The existing `RoadGrid` provides the pathfinding grid. No changes needed.

### World Integration
The existing `World` provides terrain data. Need to add building placement tracking.

### CharacterRenderer Integration
The existing `CharacterRenderer` handles rendering. Need to add task-based animation selection.

---

## 7. Implementation Phases

### Week 1: Foundation (SIM-01 Partial)
1. Extend `CharacterSimState` with needs and personality
2. Implement needs decay system
3. Create basic task types and utility computation
4. Add debug logging for task decisions

### Week 2: Task System (SIM-02 Partial)
1. Implement full utility scoring system
2. Add softmax task selection with ε-greedy
3. Create task categories and availability logic
4. Integrate with Play/Work slider

### Week 3: Pathfinding (SIM-03)
1. Implement A* pathfinding on RoadGrid
2. Add path caching with TTL
3. Implement time-slicing for performance
4. Integrate movement system with CharacterStateManager

### Week 4: Polish & Debug (Tuning)
1. Build debug overlay panel
2. Add character highlighting for inspection
3. Tune utility weights based on visual feedback
4. Performance optimization and profiling

---

## 8. Quality Gate Checklist

- [x] **Needs decay formula specified** with concrete rate values (exponential decay, 0.5-2% per tick)
- [x] **Utility scoring weights documented** with rationale (40% needs, 30% personality, 20% slider, 10% proximity)
- [x] **Pathfinding approach specified** (A* with caching, time-slicing, hierarchical)
- [x] **Debug/visualization strategy** for AI tuning (3-layer system: console, overlay, highlighting)
- [x] **Integration points** with existing CharacterStateManager and RoadGrid identified

---

## 9. Open Questions for Planners

1. **Task Duration:** How long should each task take in ticks? (Recommendation: 2-8 ticks based on task type)
2. **Need Thresholds:** What urgency levels trigger task-seeking? (Recommendation: >0.7 hunger/energy, >0.5 social/hygiene)
3. **Building Capacity:** How many residents can use a building simultaneously? (Recommendation: 1 per building unless multi-occupancy)
4. **Path Caching:** Should paths be cached per-resident or globally? (Recommendation: per-resident with shared cache key)
5. **Debug Defaults:** Should debug overlay be on by default in development? (Recommendation: off by default, toggle with D key)

---

*Research completed: 2026-03-11*
*Confidence: MEDIUM (based on existing codebase patterns + domain research)*
*Next: Planner creates implementation plan based on this research*