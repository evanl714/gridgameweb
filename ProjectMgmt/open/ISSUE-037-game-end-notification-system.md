# ISSUE-037: Game End Logic and Notification System

**Status:** Open
**Created:** 2025-07-21
**Assignee:** Unassigned
**Priority:** High
**Labels:** bug, game-logic, notifications, modal, ui

## Description

Game is auto-ending after turn 5 with incorrect victory conditions, and the end game notification appears below the page footer instead of in a proper modal or notification system.

## Tasks

- [ ] Fix premature game ending after turn 5
- [ ] Investigate why game claims a base has been destroyed when it hasn't
- [ ] Implement proper modal system for game end notifications
- [ ] Design and create notification system for game events
- [ ] Ensure end game text displays prominently and correctly

## Subtasks

- [ ] [[ISSUE-037-game-end-notification-system-a]] - Debug turn 5 auto-end logic
- [ ] [[ISSUE-037-game-end-notification-system-b]] - Fix victory condition detection
- [ ] [[ISSUE-037-game-end-notification-system-c]] - Create modal component for notifications
- [ ] [[ISSUE-037-game-end-notification-system-d]] - Implement notification system architecture
- [ ] [[ISSUE-037-game-end-notification-system-e]] - Style and position modals correctly

## Related Issues

- [[ISSUE-032-critical-ui-blocking-bugs]]

## Relationships

- Related to: Victory conditions and game flow
- Implements: Proper user feedback system
- Blocks: Complete game experience

## Comments

### 2025-07-21 - System Note

Created from fixes.md review - game ending logic is critical for proper gameplay experience. Notification system is needed for overall UX improvement.