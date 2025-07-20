# ISSUE-032: Critical UI Blocking Bugs

**Status:** Open
**Created:** 2025-07-20
**Assignee:** evanl714
**Priority:** High
**Labels:** bug, critical, ui, game-breaking, player-journey

## Description

During comprehensive player journey testing using Playwright MCP tools, critical bugs were discovered that make the game completely unplayable despite having functional individual components. These bugs prevent the actual 5-turn strategic gameplay scenario from being completed.

## Critical Bugs Found

### 1. Turn Transition Overlay Permanently Blocks UI
- **Symptom**: After clicking "End Turn", the turn transition overlay appears but never disappears
- **Impact**: All game interactions become impossible - no clicks register on grid or buttons
- **Files Affected**: `public/ui/turnTransition.js`, related UI overlay management
- **Player Journey Impact**: Game becomes unplayable after first turn completion

### 2. Unit Building JavaScript Errors
- **Symptom**: `buildPanel.show is not a function` error occurs during unit building attempts
- **Impact**: Players cannot build units in Build phase despite UI appearing functional
- **Files Affected**: `public/ui/buildPanelSidebar.js`, unit building system
- **Player Journey Impact**: Core gameplay loop broken - no unit construction possible

### 3. Beautiful UI Masking Broken Functionality  
- **Symptom**: All individual UI components appear functional and pass basic tests
- **Impact**: Superficial testing passes while actual gameplay fails completely
- **Root Cause**: Disconnect between canvas-based game logic and new grid UI implementation

## Tasks

- [ ] Fix turn transition overlay not clearing after turn completion
- [ ] Resolve `buildPanel.show is not a function` error in unit building
- [ ] Investigate canvas/grid UI integration issues
- [ ] Restore 5-turn player journey functionality
- [ ] Add integration tests that catch real gameplay bugs
- [ ] Verify turn management system works with UI overlays
- [ ] Test complete player journey from start to turn 5

## Discovery Context

These bugs were found during real player journey testing using Playwright MCP tools after user feedback: "you're only saying the tests pass because you dumbed down the tests and didn't use playwright mcp. test the PLAYER'S JOURNEY not independent functions."

The discovery revealed that while beautiful UI components exist and individual functions work, the actual integrated gameplay experience is completely broken.

## Related Issues

- [[ISSUE-031-ui-redesign-fix-chess-com-implementation]] - UI redesign that may have introduced these integration issues

## Relationships

- Blocks: All gameplay testing and validation
- Critical for: Player journey completion and game playability
- Related to: Canvas/grid UI integration architecture

## Comments

### 2025-07-20 - evanl714

Discovered through real Playwright MCP testing that the game is completely unplayable despite having beautiful UI components. The turn transition overlay blocks all interactions after the first turn, and unit building fails with JavaScript errors. This represents a critical disconnect between UI appearance and actual functionality.

Priority: CRITICAL - Game is essentially non-functional for actual players despite passing superficial component tests.

## Implementation Log

<!-- This section will be populated when development work begins on fixing these critical bugs -->