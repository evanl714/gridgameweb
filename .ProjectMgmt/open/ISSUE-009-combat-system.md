# ISSUE-009: Combat System

**Status:** Open
**Created:** 2025-07-18
**Assignee:** Unassigned
**Priority:** High
**Labels:** combat, gameplay, phase-1

## Description

Implement the deterministic combat system where units can attack adjacent enemies, dealing specified damage with no randomness involved.

**Time Estimate:** 8-10 hours
**Dependencies:** [[ISSUE-008-unit-production-system]]
**Task Reference:** [[task-09-combat-system]]

## Tasks

- [ ] Implement core combat mechanics with damage calculation
- [ ] Create combat rules engine with attack limitations
- [ ] Build damage system with unit-specific values
- [ ] Add combat visual feedback and animations
- [ ] Implement advanced combat features

## Subtasks

- [ ] [[ISSUE-009-combat-system-a]] - Combat mechanics core
- [ ] [[ISSUE-009-combat-system-b]] - Combat rules engine
- [ ] [[ISSUE-009-combat-system-c]] - Damage system
- [ ] [[ISSUE-009-combat-system-d]] - Combat visual feedback
- [ ] [[ISSUE-009-combat-system-e]] - Advanced combat features

## Related Issues

- Depends on: [[ISSUE-008-unit-production-system]]
- Blocks: [[ISSUE-010-victory-conditions]]

## Relationships

- Implements: [[task-09-combat-system]] from .tasks

## Acceptance Criteria

- Combat units can attack adjacent enemies
- Damage is applied deterministically based on unit type
- Units are destroyed when HP reaches 0
- Combat integrates with turn/phase system
- Visual feedback clearly shows combat results

## Comments

### 2025-07-18 - System Note

Damage values: Scout: 1, Infantry: 2, Heavy: 3
Combat should feel tactical and predictable - no randomness allowed.
