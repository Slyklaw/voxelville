# Plan 05-01: Play/Work Slider

## Summary

Created a Play/Work slider system that integrates with AI task selection and build priorities.

## Key Files

- `src/ui/ui-state.ts` — Shared mutable state module with `sliderValue`, `buildPriority`, `setSliderValue()`, and `updateStats()`
- `src/ui/Slider.tsx` — React range input component positioned at bottom-center, updates `uiState.sliderValue` on change
- `src/simulation/ai-system.ts` — Added `computeSliderBonus()` function and updated `UTILITY_WEIGHTS` with 15% slider bonus weight
- `src/simulation/simulation-tick.ts` — Imports `uiState` for integration with AI system
- `src/App.tsx` — Imports and renders `Slider` component

## What Was Built

The slider gives player control over simulation bias without disrupting the Three.js render loop. When dragged, it immediately updates `uiState.sliderValue` (0-1), which triggers:
1. `buildPriority` recalculation: work buildings (office/store) get 0.7-1.3 multiplier, play buildings (park/partyhall) get inverse
2. AI task selection uses ±15% utility bonus: play tasks favored when slider is low, work tasks when high

## Technical Decisions

- Shared mutable object pattern (not React state) to avoid coupling React render with Three.js render
- Slider bonus is a separate utility weight (0.15) added to existing weights (needs: 0.35, personality: 0.25, proximity: 0.25)
- playTasks: shop, party, park get `(1 - slider) * 0.3 - 0.15` bonus
- workTasks: work, clean get `slider * 0.3 - 0.15` bonus
- Neutral tasks (eat, sleep, shower) unaffected by slider

## Verification

- TypeScript compiles with no errors
- Slider renders at bottom-center with "More Play" / "More Work" labels
