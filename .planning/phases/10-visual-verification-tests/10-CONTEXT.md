# Phase 10: Visual Verification Tests - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Write comprehensive tests to identify rendering bugs where voxel models appear scrambled or have wrong colors. 20 test requirements (VIZ-01 through VIZ-20) covering model definitions, materials, renderers, positioning, and pipeline integration.

This phase identifies bugs only. Bug fixes happen in gap-closure plans after verification.

</domain>

<decisions>
## Implementation Decisions

### Test organization
- 5 test files grouped by category: `models.test.ts`, `materials.test.ts`, `renderers.test.ts`, `positioning.test.ts`, `pipeline.test.ts`
- Each file contains 4-5 related test cases
- Allows running subsets: `vitest models` during development

### Bug detection method
- Standard vitest assertions (throw on failure) for pass/fail
- Diagnostic artifacts on failure: write `.planning/debug/phase-10/diagnostic-{test-name}.json` with expected vs actual values
- Tests continue running after failures (don't halt on first failure)
- Aggregate results into `10-VERIFICATION.md`

### Remediation strategy
- Tests identify bugs only, do NOT auto-fix
- All failures documented in `10-VERIFICATION.md` with:
  - Requirement ID (VIZ-XX)
  - What failed
  - Expected vs actual values
  - Suggested fix location
- User runs gap-closure cycle after: `/gsd-plan-phase 10 --gaps` → `/gsd-execute-phase 10 --gaps-only`

### Visual verification scope
- Structural/positional correctness ONLY (programmatic validation)
- NOT pixel-level rendering comparison (too brittle)
- Tests verify data correctness: voxel counts, positions, colors in memory, instance creation
- Does NOT test actual GPU output or visual artifacts

### Claude's Discretion
- Exact test assertion style within each file
- Diagnostic artifact format/structure
- Which assertions to combine vs keep separate

</decisions>

<specifics>
## Specific Ideas

- Tests should catch the bugs described in requirements: scrambled voxels, wrong colors, missing geometry, misaligned positions
- Diagnostic artifacts useful for debugging why something failed (expected vs actual)
- This phase purpose is identification; resolution happens in gap-closure plans

</specifics>

<deferred>
## Deferred Ideas

- Pixel-level rendering tests (screenshot comparison) — too brittle for current tech stack
- E2E visual regression testing — consider for future milestone
- Auto-fix attempts for rendering bugs — risk of incorrect patches

</deferred>

---

*Phase: 10-visual-verification-tests*
*Context gathered: 2026-03-13*
