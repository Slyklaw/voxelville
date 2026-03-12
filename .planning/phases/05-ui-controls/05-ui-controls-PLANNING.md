# Phase 5: UI Controls — Planning Summary

**Phase:** 05-ui-controls
**Plans:** 2 in 1 wave
**Requirements:** UI-01, UI-02, GROW-03

## Wave Structure

| Wave | Plans | Autonomous |
|------|-------|------------|
| 1 | 05-01, 05-02 | yes, yes |

## Plans Created

| Plan | Objective | Tasks | Files |
|------|-----------|-------|-------|
| 05-01 | Play/Work slider with AI integration | 5 | ui-state.ts, Slider.tsx, ai-system.ts, simulation-tick.ts, App.tsx |
| 05-02 | HUD overlay with population/happiness | 4 | ui-state.ts, Hud.tsx, simulation-tick.ts, App.tsx |

## Key Design Decisions

1. **Shared mutable object pattern** (ui-state.ts) — zero dependencies, avoids React re-renders of canvas ref
2. **100ms debounced polling** for HUD — imperceptible to users, batches simulation updates
3. **Slider bonus mechanism** — ±15% utility bonus (0.3 * slider - 0.15 range) for play/work task categories
4. **Build priority multipliers** — 0.7 to 1.3 range, offices/stores favored at slider=1, parks/partyhalls at slider=0

## Dependency Analysis

Both plans are **independent** (no shared files with conflicts). Both modify `ui-state.ts` and `App.tsx` but add different components/values, so they can run in parallel if the executor handles merge conflicts.

**Conflict mitigation:** If plans run sequentially, 05-01 creates `ui-state.ts` first with slider/population/happiness/buildPriority fields. Plan 05-02 will verify these exist and proceed.

## Must-Haves for Goal-Backward Verification

**Observable truths:**
1. Slider renders in bottom-center, draggable 0-1 range
2. Dragging slider updates task selection (more play tasks at 0, more work at 1)
3. Population count displayed in top-right HUD
4. Happiness meter shows color-coded bar (green/yellow/red)
5. HUD updates every 100ms from simulation

**Critical artifacts:**
- `src/ui/ui-state.ts` — shared state bridge
- `src/ui/Slider.tsx` — player control input
- `src/ui/Hud.tsx` — city statistics display
- `src/simulation/ai-system.ts` — `computeSliderBonus()` function

**Key links:**
- Slider → uiState → AI utility scoring (slider bonus)
- Simulation → uiState → HUD polling (stats display)
- uiState.buildPriority → future Growth system (GROW-03)

## Next Steps

Execute: `/gsd-execute-phase 05-ui-controls`

<sub>`/clear` first - fresh context window</sub>
