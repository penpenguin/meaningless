---

description: "Task list template for feature implementation"
---

# Tasks: Aquarium Editor & View Mode

**Input**: Design documents from `/home/user/repository/meaningless/specs/001-aquarium-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED - include unit tests for each user story using Vitest + jsdom.
E2E tests are only for critical flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test scaffolding

- [x] T001 Update Vitest to jsdom and add setupFiles in `vitest.config.ts`
- [x] T002 [P] Create DOM/localStorage test setup in `src/__tests__/setup.ts`
- [x] T003 [P] Add shared fixtures for AquariumState in `src/__tests__/fixtures/aquariumState.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define Aquarium state types in `src/types/aquarium.ts`
- [x] T005 Implement schema validation + migration helpers in `src/utils/stateSchema.ts`
- [x] T006 Implement state store (current state + subscribe/notify) in `src/utils/aquariumStore.ts`
- [x] T007 Implement localStorage persistence (save slots + autosave) in `src/utils/storage.ts`
- [x] T008 Implement species catalog and defaults in `src/utils/speciesCatalog.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 編集して鑑賞に戻る (Priority: P1) 🎯 MVP

**Goal**: Edit/Viewをシームレスに切替え、テーマと魚群を編集して鑑賞できる

**Independent Test**: Edit→View切替と、テーマ/魚群の変更反映が単独で確認できる

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Test view/edit mode transitions in `src/__tests__/viewEditMode.test.ts`
- [x] T010 [P] [US1] Test theme editing updates state + scene bridge in `src/__tests__/themeEditing.test.ts`
- [x] T011 [P] [US1] Test fish group add/remove/count changes in `src/__tests__/fishGroupsEditing.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement overlay container + mode toggle UI in `src/components/EditorOverlay.ts`
- [x] T013 [US1] Implement minimal View controls (Esc/アイコン復帰) in `src/components/ViewControls.ts`
- [x] T014 [US1] Implement Theme editor panel UI in `src/components/ThemeEditorPanel.ts`
- [x] T015 [US1] Implement Fish group editor panel UI in `src/components/FishGroupPanel.ts`
- [x] T016 [US1] Wire UI to state store + scene in `src/main.ts` and `src/utils/aquariumStore.ts`
- [x] T017 [US1] Apply theme + tuning to renderer in `src/components/AdvancedScene.ts` and `src/components/AdvancedFishSystem.ts`
- [x] T018 [US1] Update overlay styles for full-screen/transparent UI in `src/styles.css`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 保存して再現する (Priority: P2)

**Goal**: 名前付き保存・読込と編集終了時のオートセーブで再現可能にする

**Independent Test**: 保存→変更→読込と、編集終了時の自動保存が確認できる

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T019 [P] [US2] Test save slot CRUD in `src/__tests__/saveSlots.test.ts`
- [x] T020 [P] [US2] Test autosave on edit end in `src/__tests__/autosave.test.ts`

### Implementation for User Story 2

- [x] T021 [US2] Implement Save Manager panel UI in `src/components/SaveManagerPanel.ts`
- [x] T022 [US2] Implement save slot CRUD + autosave APIs in `src/utils/storage.ts`
- [x] T023 [US2] Wire autosave trigger on edit end in `src/main.ts`
- [x] T024 [US2] Add save error feedback UI in `src/components/Toast.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - JSONで移植する (Priority: P3)

**Goal**: JSONエクスポート/インポートで水槽を移植できる

**Independent Test**: エクスポート→インポートで同一状態が再現できる

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T025 [P] [US3] Test JSON export/import validity in `src/__tests__/jsonTransfer.test.ts`
- [x] T026 [P] [US3] Test migration fallback on unknown schema in `src/__tests__/migration.test.ts`

### Implementation for User Story 3

- [x] T027 [US3] Implement JSON serialization helpers in `src/utils/serialization.ts`
- [x] T028 [US3] Implement Import/Export panel UI in `src/components/ImportExportPanel.ts`
- [x] T029 [US3] Wire import/export to state + validation in `src/main.ts` and `src/utils/stateSchema.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T030 [P] Add performance degradation thresholds in `src/components/AdvancedScene.ts`
- [x] T031 [P] Add species fallback + missing asset warnings in `src/utils/speciesCatalog.ts`
- [x] T032 [P] Integrate settings (sound/motion) into state in `src/components/AudioManager.ts` and `src/main.ts`
- [x] T033 [P] Update user-facing docs for editor UI in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on storage/state utilities
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on schema/serialization utilities

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- State/types before UI wiring
- UI before scene integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks T002, T003 can run in parallel
- Foundational tasks T005, T006, T008 can run in parallel after T004
- Tests within each user story can run in parallel
- Different user stories can be worked on in parallel after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (tests are required):
Task: "Test view/edit mode transitions in src/__tests__/viewEditMode.test.ts"
Task: "Test theme editing updates state + scene bridge in src/__tests__/themeEditing.test.ts"
Task: "Test fish group add/remove/count changes in src/__tests__/fishGroupsEditing.test.ts"

# Launch UI tasks for User Story 1 together where safe:
Task: "Implement Theme editor panel UI in src/components/ThemeEditorPanel.ts"
Task: "Implement Fish group editor panel UI in src/components/FishGroupPanel.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Red)
- Implement minimal code to pass (Green) then refactor safely
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
