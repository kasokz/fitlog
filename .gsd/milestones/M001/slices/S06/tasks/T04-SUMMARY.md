---
id: T04
parent: S06
milestone: M001
provides:
  - Drag-and-drop exercise reordering via @dnd-kit/svelte sortable with GripVertical handles
  - Haptic feedback (selectionChanged) on drag start
  - Distance-based activation constraint (8px) to prevent accidental drags during scroll
key_files:
  - apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte
  - apps/mobile/package.json
key_decisions:
  - Added @dnd-kit/dom as direct dependency for PointerActivationConstraints access (transitive dep not resolvable in pnpm strict mode)
  - Used PointerActivationConstraints.Distance (value: 8) as the uniform activation constraint — overrides PointerSensor defaults for consistent behavior across mouse and touch
  - Read final sortable order from manager.registry.draggables on dragend — the OptimisticSortingPlugin updates indices during drag, so we collect and sort by index to derive the new order
patterns_established:
  - "dnd-kit sortable pattern: createSortable({ id, index, group }) + {@attach sortable.attach} on container + {@attach sortable.attachHandle} on drag handle"
  - "Fire-and-forget haptic on DragDropProvider onDragStart callback"
observability_surfaces:
  - "[Haptics] selectionChanged() logged to console.debug on drag start (inherits from T01 haptics service)"
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Replace exercise reorder with dnd-kit sortable

**Replaced ChevronUp/ChevronDown reorder buttons with @dnd-kit/svelte drag-and-drop sortable using GripVertical handles and activation constraints.**

## What Happened

Installed `@dnd-kit/svelte` and `@dnd-kit/dom` in the mobile app. Rewrote `ExerciseAssignmentList.svelte` to replace the up/down chevron button approach with dnd-kit's `createSortable` primitive. Each assignment item gets a sortable instance keyed by `assignment.id` with `{@attach sortable.attach}` on the container and `{@attach sortable.attachHandle}` on a `GripVertical` icon that serves as the drag handle. 

Configured `PointerSensor` with a `PointerActivationConstraints.Distance({ value: 8 })` constraint to prevent accidental drags during scroll gestures. On `dragStart`, a `selectionChanged()` haptic fires (fire-and-forget). On `dragEnd`, if not canceled, the handler reads the final sortable indices from the manager's registry (updated by the built-in `OptimisticSortingPlugin` during drag) and calls `onreorder` with the new ID order.

## Verification

- `pnpm --filter mobile check` — exits with only pre-existing errors (10 in exercise.ts, test file, ExerciseForm.svelte); zero errors in ExerciseAssignmentList.svelte
- `grep 'createSortable' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — ✅ found import and usage
- `grep -c 'ChevronUp\|ChevronDown' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — ✅ returns 0
- `grep 'GripVertical' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — ✅ found import and usage
- `grep '@dnd-kit/svelte' apps/mobile/package.json` — ✅ `"@dnd-kit/svelte": "^0.3.2"`
- `grep '@attach' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — ✅ sortable.attach and sortable.attachHandle
- `grep 'selectionChanged' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — ✅ import and call in handleDragStart
- `grep 'Distance.*8' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — ✅ activation constraint configured

### Slice-level checks (this task):
- ✅ dnd-kit replaces chevron buttons in ExerciseAssignmentList
- ✅ Haptics service exists with exported functions
- ✅ Haptic calls wired into workout components (T03)
- ✅ Settings page with mode toggle (T01)
- ✅ BottomNav wired into layout (T02)
- ✅ Safe-area padding applied (T02)
- ✅ Key count: 236 (> 230)
- Remaining: iOS/Android project scaffolding, build check (future tasks)

## Diagnostics

- Console: `[Haptics] selectionChanged()` logged on drag start via haptics service debug logging
- Build: dnd-kit import errors surface at build time via `pnpm check`; `{@attach}` directive requires Svelte 5.29+
- Inspect sortable setup: `grep 'createSortable' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte`

## Deviations

- Added `@dnd-kit/dom` as a direct dependency (not in original plan) because `PointerActivationConstraints` is only exported from `@dnd-kit/dom`, and pnpm strict mode doesn't allow importing transitive dependencies.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — Rewritten from chevron buttons to dnd-kit sortable with GripVertical handles, activation constraints, and haptic feedback
- `apps/mobile/package.json` — Added `@dnd-kit/svelte` and `@dnd-kit/dom` dependencies
- `pnpm-lock.yaml` — Updated lockfile
