# ISSUE-010: Victory Conditions & Game End

**Status:** Open
**Created:** 2025-07-18
**Assignee:** Unassigned
**Priority:** High
**Labels:** victory, game-end, phase-1

## Description
Implement the victory condition system that detects when a player wins by destroying the enemy base, handles forfeit scenarios, and manages game end states.

**Time Estimate:** 4-6 hours
**Dependencies:** [[ISSUE-009-combat-system]]
**Task Reference:** [[task-10-victory-conditions]]

## Tasks
- [ ] Implement primary victory condition (base destruction)
- [ ] Add secondary victory conditions (forfeit, surrender)
- [ ] Create game end handling system
- [ ] Build victory detection system
- [ ] Design end game interface

## Subtasks
- [ ] [[ISSUE-010-victory-conditions-a]] - Primary victory condition
- [ ] [[ISSUE-010-victory-conditions-b]] - Secondary victory conditions
- [ ] [[ISSUE-010-victory-conditions-c]] - Game end handling
- [ ] [[ISSUE-010-victory-conditions-d]] - Victory detection system
- [ ] [[ISSUE-010-victory-conditions-e]] - End game interface

## Related Issues
- Depends on: [[ISSUE-009-combat-system]]
- Completes: Phase 1 Core Game Foundation

## Relationships
- Implements: [[task-10-victory-conditions]] from .tasks

## Acceptance Criteria
- Game correctly detects base destruction as victory
- Victory is declared immediately when conditions are met
- All game actions are disabled after game end
- Players receive clear victory/defeat feedback
- Game can be restarted after completion

## Comments
### 2025-07-18 - System Note
Victory detection must be immediate and unambiguous. The end game experience should be satisfying.