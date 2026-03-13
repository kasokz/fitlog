---
estimated_steps: 5
estimated_files: 3
---

# T04: Replace exercise reorder with dnd-kit sortable

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Upgrade exercise assignment reordering from up/down chevron buttons to drag-and-drop using `@dnd-kit/svelte` sortable. This fulfills D020 which explicitly deferred dnd-kit integration to S06. The `{@attach}` directive pattern from Svelte 5.29+ is used. A GripVertical drag handle replaces the ChevronUp/ChevronDown buttons. Activation constraints prevent accidental drags during scroll.

## Steps

1. Install `@dnd-kit/svelte` — Run `pnpm --filter @repo/mobile add @dnd-kit/svelte` from the repo root.
2. Rewrite `src/lib/components/programs/ExerciseAssignmentList.svelte` — Remove `ChevronUp`, `ChevronDown` imports and `handleMoveUp`/`handleMoveDown` functions. Import `DragDropProvider` and `createSortable` from `@dnd-kit/svelte` and `@dnd-kit/svelte/sortable`. Import `GripVertical` from `@lucide/svelte`. For each assignment in the `{#each}` block, call `createSortable({ id: assignment.id, index, group: 'assignments' })` and use `{@attach sortable.attach}` on the item container and `{@attach sortable.attachHandle}` on the GripVertical icon. Add `selectionChanged()` haptic on drag start via `onDragStart` callback on `DragDropProvider`.
3. Handle sort end — In the `onDragEnd` callback on `DragDropProvider`, extract the new order of assignment IDs from the sortable items and call `onreorder(orderedIds)`. Check `event.canceled` to skip if drag was cancelled.
4. Configure activation constraints — Add `PointerSensor` with `activationConstraint: { distance: 8 }` to the `DragDropProvider` sensors to prevent drag from triggering during normal scroll gestures.
5. Verify build — Run `pnpm --filter @repo/mobile check` to ensure no type errors with the new dnd-kit imports and `{@attach}` directive usage.

## Must-Haves

- [ ] `@dnd-kit/svelte` installed in `apps/mobile/package.json`
- [ ] `ExerciseAssignmentList.svelte` uses `createSortable` and `{@attach}` for drag-and-drop
- [ ] `ChevronUp`/`ChevronDown` buttons removed entirely
- [ ] Drag handle (GripVertical) visible on each assignment item
- [ ] Activation constraint prevents drag during scroll (distance ≥ 8px)
- [ ] `onreorder` callback fires with correct new order after drag end
- [ ] Haptic feedback on drag start (`selectionChanged()`)

## Verification

- `pnpm --filter @repo/mobile check` exits 0
- `grep 'createSortable' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` finds import
- `grep -c 'ChevronUp\|ChevronDown' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` returns 0
- `grep 'GripVertical' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` finds import
- `grep '@dnd-kit/svelte' apps/mobile/package.json` confirms dependency

## Observability Impact

- Signals added/changed: Haptic `selectionChanged()` on drag start (inherits debug log from T01 service)
- How a future agent inspects this: Check ExerciseAssignmentList.svelte for dnd-kit imports; grep for `createSortable` pattern
- Failure state exposed: If `{@attach}` directive is not supported by the build toolchain, errors surface at build time via `pnpm check`

## Inputs

- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — Current component with ChevronUp/ChevronDown reorder
- `references/dnd-kit/packages/svelte/README.md` — dnd-kit Svelte adapter docs
- `references/dnd-kit/packages/svelte/src/sortable/createSortable.svelte.ts` — createSortable API
- `apps/mobile/src/lib/services/haptics.ts` — Haptics service from T01
- D020 — Decision mandating dnd-kit upgrade in S06

## Expected Output

- `apps/mobile/package.json` — Updated with `@dnd-kit/svelte` dependency
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — Rewritten with dnd-kit sortable, GripVertical handles, no ChevronUp/ChevronDown
