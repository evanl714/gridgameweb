# ISSUE-035: Game Status Display Incorrect and Static

**Status:** Open
**Created:** 2025-07-21
**Assignee:** Unassigned
**Priority:** High
**Labels:** bug, ui, game-status, display

## Description

The game status display in the top right corner is not updating properly and remains stuck on "turn 1 with phase:resource" regardless of actual game progression. This prevents players from understanding the current game state.

## Tasks

- [ ] Debug status display update mechanism
- [ ] Fix turn counter to properly increment
- [ ] Fix phase display to reflect actual game phase
- [ ] Ensure status updates in real-time during gameplay
- [ ] Test status display across multiple game phases and turns

## Related Issues

- [[ISSUE-032-critical-ui-blocking-bugs]]

## Relationships

- Related to: Turn management and game state tracking
- Blocks: Proper game flow understanding

## Comments

### 2025-07-21 - System Note

Created from fixes.md review - status display is critical for game flow awareness.