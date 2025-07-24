# ISSUE-039: Event Handler Architecture Conflicts

**Status:** Open  
**Created:** 2025-07-21  
**Assignee:** evanl714  
**Priority:** Critical  
**Labels:** bug, architecture, event-handling, turn-management, grid-rendering

## Description

Critical architectural conflicts in event handling systems causing two game-breaking issues:

1. **Turn Counter Double-Increment**: Counter jumps by 2 instead of 1 (Turn 1 → Turn 3 → Turn 5)
2. **Grid Non-Interactive After Turn 3**: Grid loses all click handlers and becomes unplayable

**Root Cause Analysis**: Four competing event handling systems for turn management and DOM event listener loss during grid re-rendering operations.

## Tasks

- [ ] Remove duplicate End Turn event handlers 
- [ ] Implement event delegation for grid cells
- [ ] Fix race condition in TurnManager.endTurn()
- [ ] Add proper cleanup in Game.newGame()
- [ ] Fix renderToGrid() DOM event preservation
- [ ] Remove unsanitized innerHTML usage
- [ ] Add comprehensive event handler tests

## Subtasks

- [ ] [[ISSUE-039-event-handler-architecture-conflicts-a]] - Remove competing End Turn handlers (index.html:768, uiManager.js:141)
- [ ] [[ISSUE-039-event-handler-architecture-conflicts-b]] - Implement event delegation for grid cell interactions
- [ ] [[ISSUE-039-event-handler-architecture-conflicts-c]] - Fix TurnManager race condition with proper flag management
- [ ] [[ISSUE-039-event-handler-architecture-conflicts-d]] - Add UIManager.destroy() cleanup in Game.newGame()
- [ ] [[ISSUE-039-event-handler-architecture-conflicts-e]] - Preserve DOM event listeners in renderToGrid()
- [ ] [[ISSUE-039-event-handler-architecture-conflicts-f]] - Replace innerHTML with textContent for security
- [ ] [[ISSUE-039-event-handler-architecture-conflicts-g]] - Add event handler lifecycle tests

## Critical Issues Found

### 🔴 CRITICAL: Multiple Competing End Turn Handlers
- **Location**: `game.js:122` (commented), `turnInterface.js:82` (primary), `index.html:768` (mystery), `uiManager.js:141` (keyboard)
- **Impact**: Cascade conflicts causing double turn increment
- **Fix**: Remove all except `turnInterface.js:82` as single source of truth

### 🔴 CRITICAL: Grid DOM Event Listener Loss
- **Location**: `index.html:615-741` - `renderToGrid()` function
- **Impact**: Grid becomes non-interactive after turn 3
- **Mechanism**: DOM reconstruction destroys event listeners
- **Fix**: Implement event delegation on parent container

### 🔴 CRITICAL: TurnManager Race Condition
- **Location**: `turnManager.js:67-72` - `endTurn()` method
- **Impact**: `endingTurn` flag has timing gaps allowing multiple executions
- **Fix**: Use try/finally block to ensure flag reset

### 🟠 HIGH: Memory Leaks
- **Location**: `game.js:812` - `setupGameEventListeners()` without cleanup
- **Impact**: Accumulating event listeners cause multiplied events
- **Fix**: Add cleanup before re-setup in `newGame()`

### 🟠 HIGH: UIManager Cleanup Issues  
- **Location**: `game.js:781-783` - Inconsistent `uiManager.destroy()` calls
- **Impact**: Component instances accumulate
- **Fix**: Ensure proper cleanup order with null checks

### 🟡 MEDIUM: Security Vulnerability
- **Location**: Multiple UI components using unsanitized `innerHTML`
- **Examples**: `game.js:902`, various UI files  
- **Risk**: Potential XSS if user-controlled content reaches these areas
- **Fix**: Replace with `textContent` where appropriate

## Technical Evidence

**Turn Counter Issue Evidence:**
```javascript
// COMPETING HANDLERS FOUND:
// 1. turnInterface.js:82 - Primary handler (KEEP)
// 2. index.html:768 - Mystery handler with debug that never executes (REMOVE)
// 3. uiManager.js:141 - Ctrl+Enter keyboard shortcut (REMOVE)
// 4. game.js:122 - Commented out but references remain (CLEAN UP)
```

**Grid Interactivity Evidence:**
```javascript
// DOM STRUCTURE CHANGE:
// Turn 1: Grid shows as `[ref=e168] [cursor=pointer]: "100"` (interactive)
// Turn 3+: Grid shows as `generic: { generic: { generic: "100" } }` (non-interactive)
// Cause: renderToGrid() recreates DOM elements, losing event listeners
```

## Implementation Strategy

1. **Phase 1**: Remove competing event handlers
   - Delete `index.html:768-773` event listener
   - Remove `uiManager.js:141-142` Ctrl+Enter handler
   - Clean up `game.js:122` references

2. **Phase 2**: Implement event delegation
   - Replace direct cell listeners with parent delegation
   - Ensure grid interactions survive DOM updates

3. **Phase 3**: Fix race conditions and cleanup
   - Add try/finally to `turnManager.endTurn()`
   - Implement proper `setupGameEventListeners()` cleanup
   - Ensure `uiManager.destroy()` is called consistently

## Related Issues

- [[ISSUE-036-unit-building-base-positioning]] - Originally reported these symptoms
- [[ISSUE-032-critical-ui-blocking-bugs]] - Related UI architectural issues

## Relationships

- Blocks: Game playability beyond Turn 3 (Critical)
- Related to: Core event handling architecture, DOM manipulation patterns
- Fixes: [[ISSUE-036-unit-building-base-positioning]] critical remaining issues

## Comments

### 2025-07-21 - evanl714

Created from comprehensive code review analysis. This issue consolidates the root causes of both critical gameplay problems identified in ISSUE-036. The problem is architectural - multiple systems competing for the same event handling responsibilities, combined with DOM manipulation that destroys event listeners.

Priority is critical as these issues make the game unplayable after turn 3. The fix strategy focuses on establishing single-source-of-truth for event handling and implementing delegation patterns that survive DOM updates.