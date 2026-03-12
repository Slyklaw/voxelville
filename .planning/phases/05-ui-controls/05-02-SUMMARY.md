# Plan 05-02: HUD Overlay

## Summary

Created a HUD overlay showing real-time population count and happiness meter with color-coded bar.

## Key Files

- `src/ui/ui-state.ts` — `updateStats(population, happiness)` method for simulation to write stats (created in plan 05-01, reused)
- `src/ui/Hud.tsx` — React component with 100ms polling from `uiState`, displays population and happiness bar
- `src/simulation/simulation-tick.ts` — Added stats update every 4 ticks (1 second), calculates average happiness from character needs
- `src/App.tsx` — Imports and renders `Hud` component

## What Was Built

HUD overlay in top-right corner with:
1. Population count (bold number from `uiState.population`)
2. Happiness meter (colored bar: green >70%, yellow >40%, red ≤40%, percentage label)

The simulation calculates happiness as inverse of average need decay across all characters, updated every 4 ticks (1 second). HUD polls `uiState` every 100ms for smooth updates without coupling to simulation loop.

## Technical Decisions

- Polling pattern (100ms) instead of React context to avoid render cascade during simulation ticks
- Happiness calculation: average of `(1 - need)` across all characters' 4 needs
- `uiState.updateStats()` clamps happiness to 0-1 range
- Color transitions use Tailwind transition-all duration-300 for smooth bar changes

## Verification

- TypeScript compiles with no errors
- HUD renders in top-right with population count and happiness bar
