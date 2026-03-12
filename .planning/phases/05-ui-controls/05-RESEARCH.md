# Phase 5: UI Controls Research

**Phase:** 5 of 6 (UI Controls)  
**Requirements:** UI-01, UI-02, GROW-03  
**Researched:** 2026-03-11  
**Overall confidence:** HIGH

## Executive Summary

Phase 5 integrates player control (Play/Work slider) and city feedback (HUD stats) into the existing simulation without disrupting the Three.js render loop. The design follows React-controlled component patterns with debounced state updates to prevent canvas re-renders. The slider applies a ±30% weight bonus to AI utility scoring for task-category tasks, and influences build priority for GROW-03. The HUD displays population count and happiness meter with 100ms debouncing.

## Architecture Overview

### Component Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                   React UI Layer                         │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ Slider.tsx  │  │   Hud.tsx   │  ← React refs only   │
│  └──────┬──────┘  └──────┬──────┘                       │
│         │                │                               │
│         ▼                ▼                               │
│  ┌──────────────────────────────────┐                    │
│  │       ui-state.ts (shared)       │                    │
│  │  - sliderValue: 0..1            │                    │
│  │  - population: number           │                    │
│  │  - happiness: 0..1              │                    │
│  │  - updateDebounced()            │                    │
│  └──────────────┬───────────────────┘                    │
│                 │                                        │
└─────────────────┼────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│              Simulation Layer                             │
│  ┌──────────────────────────────────┐                    │
│  │     simulation-tick.ts          │                    │
│  │  - reads uiState.sliderValue   │                    │
│  │  - applies weight bonus in     │                    │
│  │    ai-system.ts                │                    │
│  │  - applies build priority     │                    │
│  │    in growth-system.ts        │                    │
│  └──────────────────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User drags slider** → React state updates → `uiState.setSliderValue()`
2. **Debounced write** (100ms) → shared `uiState` object → simulation reads on next tick
3. **Simulation tick** (250ms) → reads slider → applies weight bonus → tasks selected
4. **HUD reads** from `uiState` (updated by simulation) → debounced React re-render (100ms)

**Critical:** React UI never triggers Three.js re-render. Canvas ref is mounted once in `main.tsx` and never touched by React updates.

## 1. Slider Component Design (UI-01)

### Requirements Addressed
- **UI-01**: Play/Work slider — React-controlled range input, ±30% weight bonus to task selection

### Component Specification

```typescript
// src/ui/Slider.tsx
import { useState, useCallback } from 'react';
import { uiState } from './ui-state';

interface SliderProps {
  initialValue?: number;  // 0..1, default 0.5
}

export function Slider({ initialValue = 0.5 }: SliderProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    uiState.setSliderValue(newValue);
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                    bg-white/90 backdrop-blur-sm rounded-lg px-6 py-3 shadow-lg
                    w-80">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>More Play</span>
        <span>More Work</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                   accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>◄── Leisure</span>
        <span>Productivity ──►</span>
      </div>
    </div>
  );
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `useState` for local display | Debounce simulation writes, immediate UI feedback |
| `uiState.setSliderValue()` | Shared state without React re-render of canvas |
| 0..1 range | Normalized, easier to apply as percentage bonus |
| step=0.01 | 100 discrete positions, smooth feel |
| Bottom-center overlay | Non-intrusive, doesn't block city view |

## 2. HUD Component Design (UI-02)

### Requirements Addressed
- **UI-02**: HUD overlay — population count, happiness meter, debounced updates (100ms)

### Component Specification

```typescript
// src/ui/Hud.tsx
import { useState, useEffect } from 'react';
import { uiState } from './ui-state';

export function Hud() {
  const [population, setPopulation] = useState(0);
  const [happiness, setHappiness] = useState(0);

  // Debounced update from simulation state (100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setPopulation(uiState.population);
      setHappiness(uiState.happiness);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const happinessPercent = Math.round(happiness * 100);
  const happinessColor = happiness > 0.7 ? 'bg-green-400' : 
                         happiness > 0.4 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm 
                    rounded-lg px-4 py-3 shadow-lg min-w-40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Population</span>
        <span className="text-sm font-bold text-gray-900">{population}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Happiness</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${happinessColor} transition-all duration-300`}
              style={{ width: `${happinessPercent}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8">{happinessPercent}%</span>
        </div>
      </div>
    </div>
  );
}
```

### HUD Debouncing Strategy

| Concern | Solution | Rationale |
|---------|----------|-----------|
| Prevent React re-renders every 250ms simulation tick | 100ms polling interval | Batches multiple simulation updates |
| Prevent canvas interference | Polling only reads from shared state | Never writes to Three.js objects |
| Responsive feel | 100ms is imperceptible to users | 10 updates/sec vs 4 simulation ticks/sec |
| Memory leaks | `clearInterval` in cleanup | Standard React cleanup pattern |

## 3. Shared State Module (ui-state.ts)

### Interface Definition

```typescript
// src/ui/ui-state.ts
/**
 * Shared UI state between React components and simulation.
 * This object is read/written by both layers but never triggers
 * Three.js re-renders. React components poll via setInterval.
 */
export const uiState = {
  // Player input (written by Slider, read by simulation)
  sliderValue: 0.5,
  
  // Simulation output (written by simulation, read by Hud)
  population: 0,
  happiness: 0,
  
  // Builder for new residents (written by slider effect, read by growth)
  buildPriority: {
    office: 1.0,
    store: 1.0,
    park: 1.0,
    partyhall: 1.0,
  },
  
  /**
   * Update slider value with debounced effect on build priority
   * @param value 0..1 where 0=More Play, 1=More Work
   */
  setSliderValue(value: number): void {
    this.sliderValue = Math.max(0, Math.min(1, value));
    
    // Apply ±30% bonus to build priority
    // slider=0 (more play): park/partyhall = 1.3, office/store = 0.7
    // slider=1 (more work): office/store = 1.3, park/partyhall = 0.7
    const playBonus = 1 - this.sliderValue;  // 0..1
    const workBonus = this.sliderValue;      // 0..1
    
    this.buildPriority.office = 0.7 + (0.6 * workBonus);    // 0.7..1.3
    this.buildPriority.store = 0.7 + (0.6 * workBonus);     // 0.7..1.3
    this.buildPriority.park = 0.7 + (0.6 * playBonus);      // 0.7..1.3
    this.buildPriority.partyhall = 0.7 + (0.6 * playBonus); // 0.7..1.3
  },
  
  /**
   * Update simulation stats (called by simulation loop)
   * @param population Number of residents
   * @param happiness Average need satisfaction 0..1
   */
  updateStats(population: number, happiness: number): void {
    this.population = population;
    this.happiness = Math.max(0, Math.min(1, happiness));
  },
};
```

### Why Shared Object Pattern?

| Pattern | Pros | Cons | Our Choice |
|---------|------|------|------------|
| Shared mutable object | Simple, no deps, fast | Not "React-way" | ✓ Selected |
| Zustand/Jotai | Proper state management | Extra dependency | ✗ Overkill |
| Context API | React-idiomatic | Triggers canvas re-render | ✗ Blocks |
| Redux/MobX | Scalable | Massive overhead | ✗ Overkill |

**Rationale:** We only need 3 values shared between 2 layers. A simple mutable object with polling is minimal, zero-dependency, and avoids triggering React's reconciliation on the canvas ref.

## 4. Slider Weight Bonus Mechanism (AI Integration)

### Requirements Addressed
- **UI-01**: Slider applies ±30% weight bonus to task-category utility scores

### Modification to ai-system.ts

Current utility formula:
```typescript
U(task) = w1*needSatisfaction + w2*personalityFit + w3*proximity
```

Modified formula with slider bonus:
```typescript
U(task) = w1*needSatisfaction + w2*personalityFit + w3*proximity + w4*sliderBonus
```

Where `w4 = 0.3` and `sliderBonus` is computed as:

```typescript
// New function in ai-system.ts
import { uiState } from '../ui/ui-state';

/**
 * Compute slider bonus for a task category
 * @param taskType The task being evaluated
 * @returns Bonus between -0.15 and +0.15 (±15% of total utility)
 */
export function computeSliderBonus(taskType: TaskType): number {
  const slider = uiState.sliderValue; // 0 = More Play, 1 = More Work
  
  // Categorize tasks
  const playTasks: TaskType[] = ['shop', 'party', 'park'];
  const workTasks: TaskType[] = ['work', 'clean'];
  const neutralTasks: TaskType[] = ['eat', 'sleep', 'shower'];
  
  if (playTasks.includes(taskType)) {
    // More Play = higher bonus, More Work = lower bonus
    return (1 - slider) * 0.3 - 0.15;  // -0.15..+0.15
  } else if (workTasks.includes(taskType)) {
    // More Work = higher bonus, More Play = lower bonus
    return slider * 0.3 - 0.15;  // -0.15..+0.15
  } else {
    // Neutral tasks: no slider bonus
    return 0;
  }
}
```

### Updated Utility Weights

```typescript
export const UTILITY_WEIGHTS = {
  needSatisfaction: 0.35,  // Reduced from 0.4
  personalityFit: 0.25,    // Reduced from 0.3
  proximity: 0.25,         // Reduced from 0.3
  sliderBonus: 0.15,       // NEW: slider influence
};  // Total = 1.0
```

### Updated computeUtility function

```typescript
export function computeUtility(
  task: Task,
  resident: CharacterSimState,
): number {
  const needScore = computeNeedSatisfaction(task.type, resident.needs);
  const personalityScore = computePersonalityFit(task.type, resident.personality);
  const proximityScore = computeProximityScore(resident.position, task.location);
  const sliderScore = computeSliderBonus(task.type);

  return (
    UTILITY_WEIGHTS.needSatisfaction * needScore +
    UTILITY_WEIGHTS.personalityFit * personalityScore +
    UTILITY_WEIGHTS.proximity * proximityScore +
    UTILITY_WEIGHTS.sliderBonus * sliderScore
  );
}
```

### Effect on Task Selection

| Slider Position | Play Tasks | Work Tasks | Neutral Tasks |
|----------------|------------|------------|---------------|
| 0.0 (More Play) | +0.15 bonus | -0.15 penalty | No change |
| 0.5 (Center) | No change | No change | No change |
| 1.0 (More Work) | -0.15 penalty | +0.15 bonus | No change |

**Result:** With ε-greedy exploration (10%), residents still choose varied tasks but are nudged 30% toward their slider preference.

## 5. Build Priority Integration (GROW-03)

### Requirements Addressed
- **GROW-03**: Play/Work slider influences build priority — more Work = faster offices/stores, more Play = faster parks/party halls

### Growth System Integration

The growth system (`growth-system.ts` to be created in Phase 6) will read `uiState.buildPriority` when deciding which building to construct next.

### Proposed Growth System Interface

```typescript
// src/simulation/growth-system.ts (to be created in Phase 6)
import { uiState } from '../ui/ui-state';

interface BuildingDemand {
  type: 'house' | 'office' | 'store' | 'park' | 'partyhall';
  urgency: number;  // 0..1
  priority: number; // From buildPriority
}

/**
 * Compute building demand based on population needs and slider
 * @param population Current resident count
 * @param housingVacancy Number of empty house slots
 * @param jobVacancy Number of empty office/store slots
 * @returns Sorted list of building demands
 */
export function computeBuildingDemand(
  population: number,
  housingVacancy: number,
  jobVacancy: number,
): BuildingDemand[] {
  const demands: BuildingDemand[] = [];
  
  // Housing always needed if vacancy < 2
  if (housingVacancy < 2) {
    demands.push({
      type: 'house',
      urgency: 1.0 - (housingVacancy / 2),
      priority: 1.0,  // Houses unaffected by slider
    });
  }
  
  // Offices and stores affected by slider
  if (jobVacancy < population * 0.3) {
    demands.push({
      type: 'office',
      urgency: 0.8,
      priority: uiState.buildPriority.office,  // 0.7..1.3
    });
    demands.push({
      type: 'store',
      urgency: 0.7,
      priority: uiState.buildPriority.store,   // 0.7..1.3
    });
  }
  
  // Leisure buildings affected by slider
  const leisureDemand = 1 - uiState.sliderValue;  // Higher when More Play
  if (leisureDemand > 0.3) {
    demands.push({
      type: 'park',
      urgency: 0.5 * leisureDemand,
      priority: uiState.buildPriority.park,     // 0.7..1.3
    });
    demands.push({
      type: 'partyhall',
      urgency: 0.4 * leisureDemand,
      priority: uiState.buildPriority.partyhall, // 0.7..1.3
    });
  }
  
  // Sort by urgency * priority (highest first)
  return demands.sort((a, b) => 
    (b.urgency * b.priority) - (a.urgency * a.priority)
  );
}
```

### Build Priority Effect

| Slider | Office Priority | Store Priority | Park Priority | Party Priority |
|--------|----------------|----------------|---------------|----------------|
| 0.0 | 0.7 | 0.7 | 1.3 | 1.3 |
| 0.5 | 1.0 | 1.0 | 1.0 | 1.0 |
| 1.0 | 1.3 | 1.3 | 0.7 | 0.7 |

**Result:** When More Work, offices/stores are constructed 30% faster (higher priority). When More Play, parks/party halls are constructed 30% faster.

## 6. Canvas Overlay Pattern

### Requirements Addressed
- Canvas ref mounting (already validated in Phase 1)
- React UI overlay without re-render interference

### Existing Architecture (validated in Phase 1)

From `main.tsx:5-7`:
```typescript
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
```

From `App.tsx:178-186`:
```typescript
return (
  <div className="w-full h-screen relative">
    <canvas ref={canvasRef} className="block w-full h-full" />
    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
      <h1 className="text-xl font-bold text-gray-800">VoxelVille</h1>
      <p className="text-sm text-gray-600">Drag to orbit · Scroll to zoom</p>
    </div>
  </div>
);
```

### Overlay Pattern

```
┌──────────────────────────────────────┐
│ .w-full.h-screen.relative           │ ← Container
│ ┌──────────────────────────────────┐ │
│ │          <canvas>                │ │ ← z-index: 0 (default)
│ │  (Three.js rendering)           │ │
│ └──────────────────────────────────┘ │
│ ┌────────────┐      ┌────────────┐  │
│ │  Title     │      │    Hud     │  │ ← z-index: 10
│ │  (top-left)│      │(top-right) │  │
│ └────────────┘      └────────────┘  │
│      ┌────────────────────┐          │
│      │    Slider          │          │ ← z-index: 10
│      │   (bottom-center)  │          │
│      └────────────────────┘          │
└──────────────────────────────────────┘
```

### CSS Classes for Overlay

All UI overlays use Tailwind CSS classes already configured in the project:
- `absolute` — positioned relative to container
- `bg-white/80 backdrop-blur-sm` — frosted glass effect
- `rounded-lg px-4 py-2 shadow-lg` — card styling
- `z-10` — above canvas (implicit via DOM order)

**No z-index conflicts** because canvas has no z-index and overlays come after in DOM.

## 7. Integration with SimulationLoop

### SimulationLoop Modification

The existing `SimulationLoop` class in `simulation-tick.ts` needs to:
1. Read slider value from `uiState` for utility scoring
2. Update population/happiness stats in `uiState` for HUD

```typescript
// Modified tick() in simulation-tick.ts

private tick(): void {
  this.tickCount++;

  // 1. Decay needs for all characters
  for (const entityId of this.stateManager.getAllEntityIds()) {
    const sim = this.stateManager.getCharacter(entityId);
    if (!sim) continue;

    sim.needs = decayNeeds(sim.needs);

    // 2. Task selection (if no current task)
    if (!sim.currentTask) {
      const availableTasks = getAvailableTasks(sim, this.buildings);
      const selectedTask = selectTask(availableTasks, sim, this.rng);
      // ... existing task selection code
    }
  }

  // 3. Movement update
  if (this.movementSystem) {
    this.movementSystem.update();
  }

  // NEW: 4. Update HUD stats (every 4 ticks = 1 second)
  if (this.tickCount % 4 === 0) {
    const population = this.stateManager.characterCount;
    
    // Calculate average happiness (inverse of average needs)
    let totalNeedScore = 0;
    let count = 0;
    for (const entityId of this.stateManager.getAllEntityIds()) {
      const sim = this.stateManager.getCharacter(entityId);
      if (sim) {
        const avgNeed = (sim.needs.hunger + sim.needs.energy + 
                        sim.needs.social + sim.needs.hygiene) / 4;
        totalNeedScore += 1 - avgNeed;  // Higher = happier
        count++;
      }
    }
    const happiness = count > 0 ? totalNeedScore / count : 0;
    
    uiState.updateStats(population, happiness);
  }
}
```

## 8. React UI Integration (App.tsx Modification)

### Updated App Component

```typescript
// Modified App.tsx
import { Slider } from './ui/Slider';
import { Hud } from './ui/Hud';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ... existing Three.js initialization code (unchanged) ...
  }, []);

  return (
    <div className="w-full h-screen relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Existing title overlay */}
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm 
                      rounded-lg px-4 py-2 shadow-lg">
        <h1 className="text-xl font-bold text-gray-800">VoxelVille</h1>
        <p className="text-sm text-gray-600">Drag to orbit · Scroll to zoom</p>
      </div>
      
      {/* NEW: Play/Work slider */}
      <Slider initialValue={0.5} />
      
      {/* NEW: HUD stats overlay */}
      <Hud />
    </div>
  );
}
```

## 9. Testing Strategy

### Unit Tests

| Component | Test | Expected |
|-----------|------|----------|
| `computeSliderBonus('party', slider=0)` | Returns +0.15 | Play tasks get bonus when More Play |
| `computeSliderBonus('work', slider=1)` | Returns +0.15 | Work tasks get bonus when More Work |
| `computeSliderBonus('eat', slider=0.5)` | Returns 0 | Neutral tasks unaffected |
| `uiState.setSliderValue(0.8)` | buildPriority.office = 1.18 | Work buildings prioritized |
| `computeBuildingDemand(pop=10, housing=3)` | Returns sorted demands | Housing demand highest |

### Integration Tests

| Test | Setup | Assertion |
|------|-------|-----------|
| Slider → AI utility | Set slider to 0.0, run 10 ticks | More park/party tasks selected |
| HUD debouncing | Update population 10x rapidly | React re-renders at most 10/sec |
| Canvas non-interference | Update slider 100x | Three.js render loop unaffected |

## 10. Performance Considerations

| Concern | Solution | Impact |
|---------|----------|--------|
| React re-renders from slider | `useState` only updates Slider component | ~1 component re-render per drag |
| HUD polling overhead | 100ms interval, simple state read | Negligible (<0.1ms per tick) |
| Simulation reads slider | Direct object property access | O(1), no allocation |
| Build priority calculation | Math.max/min only | Microseconds |

## 11. Pitfall Mitigations

### Pitfall 1: Slider Triggers Canvas Re-render
**Risk:** React state change in Slider causes App re-render, which re-mounts canvas ref.

**Mitigation:** Slider is a leaf component. State change only updates Slider's own DOM. Canvas ref is in App's useEffect with empty deps `[]`, so it never re-runs.

### Pitfall 2: HUD Update Rate Causes Jank
**Risk:** 100ms polling causes visible stutter if UI thread is busy.

**Mitigation:** HUD reads are trivial (2 property reads + setState). 100ms is well within frame budget. If issues arise, increase to 250ms (matching simulation tick rate).

### Pitfall 3: Slider Value Not Available on First Tick
**Risk:** Simulation tick runs before React mounts slider, `uiState.sliderValue` is 0.

**Mitigation:** Default value is 0.5 (center). Simulation can safely read undefined as 0.5.

### Pitfall 4: Build Priority Cascades Incorrectly
**Risk:** Slider at extreme (0 or 1) causes all buildings of one type to be ignored.

**Mitigation:** Priority range is 0.7..1.3, not 0..2. Even at extreme, buildings are still considered (urgency drives selection).

## 12. Implementation Order

| Step | Files | Description |
|------|-------|-------------|
| 1 | `src/ui/ui-state.ts` | Create shared state module |
| 2 | `src/ui/Slider.tsx` | Create slider component |
| 3 | `src/ui/Hud.tsx` | Create HUD component |
| 4 | `src/simulation/ai-system.ts` | Add `computeSliderBonus()`, update weights |
| 5 | `src/simulation/simulation-tick.ts` | Add HUD stats update, import uiState |
| 6 | `src/App.tsx` | Integrate Slider and Hud components |

## Sources

- **Existing Codebase:** Analysis of `ai-system.ts:11-15` (utility weights), `character-state.ts:261-365` (CharacterStateManager), `simulation-tick.ts:76-129` (tick loop)
- **Design Spec:** `design.md:73-88` (Play/Work Slider), `design.md:112-118` (Task Categories), `design.md:583-591` (Population Growth)
- **Requirements:** `REQUIREMENTS.md:29-30` (UI-01, UI-02), `REQUIREMENTS.md:25` (GROW-03)
- **Project State:** `STATE.md:86-93` (Phase 4 accomplishments, current position)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| React slider integration | HIGH | Existing canvas ref pattern validated in Phase 1 |
| Shared state pattern | HIGH | Simple mutable object, zero deps |
| AI weight bonus mechanism | HIGH | Current weights well-documented, addition straightforward |
| Build priority integration | MEDIUM | Growth system not yet created, interface speculative |
| HUD debouncing strategy | HIGH | Standard polling pattern, 100ms well-established |

## Open Questions

1. **Happiness calculation:** Should happiness be `(1 - avgNeed)` or use a weighted formula? Current spec says "average need satisfaction" — needs clarification.
2. **Slider visual feedback:** Should slider thumb change color based on position? Design spec doesn't specify, but would enhance UX.
3. **Initial slider value:** Design says "default: centre (50/50)" — confirm with user if this should be persisted or always default.
