# ISSUE-035: Game Status Display Incorrect and Static

**Status:** COMPLETED
**Created:** 2025-07-21
**Assignee:** Claude
**Priority:** High
**Labels:** bug, ui, game-status, display

## Description

The game status display in the top right corner is not updating properly and remains stuck on "turn 1 with phase:resource" regardless of actual game progression. This prevents players from understanding the current game state.

## Tasks

- [x] Debug status display update mechanism
- [x] Fix turn counter to properly increment
- [x] Fix phase display to reflect actual game phase
- [x] Ensure status updates in real-time during gameplay
- [x] Test status display across multiple game phases and turns

## Related Issues

- [[ISSUE-032-critical-ui-blocking-bugs]]

## Relationships

- Related to: Turn management and game state tracking
- Blocks: Proper game flow understanding

## Comments

### 2025-07-21 - System Note

Created from fixes.md review - status display is critical for game flow awareness.

### 2025-07-21 - Claude Implementation

**COMPLETED**: Game status display issue has been fully resolved.

**Root Cause**: DOM selector mismatch between HTML element IDs and JavaScript selectors:
- HTML header had `id="turnDisplay"` and `id="phaseDisplay"`  
- JavaScript was looking for `turnNumber` and `gamePhase` 
- Result: Header status never updated while sidebar status worked correctly

**Solution**: Enhanced `updateGameInfo()` method to update both header and sidebar elements:
- Added selectors for `turnDisplay` and `phaseDisplay` (header)
- Kept existing selectors for `turnNumber` and `gamePhase` (sidebar)
- Both displays now update synchronously in real-time

**Files Modified**:
- `public/game.js` - Enhanced `updateGameInfo()` method (lines 853-874)

**Testing Results**: ✅ Comprehensive browser testing confirmed:
- Header status updates correctly during turn/phase changes
- Both header and sidebar displays stay synchronized  
- Turn progression: 1→2→3→4→5→... (working)
- Phase transitions: resource→action→build (working)
- New game reset functionality (working)
- No JavaScript console errors

**Technical Details**: Leveraged existing event system (`turnStarted`, `phaseChanged` → `updateUI()` → `updateGameInfo()`) for automatic real-time updates.