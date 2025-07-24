# ISSUE-036: Unit Building and Base Positioning Issues

**Status:** Partially Resolved - 2 Critical Issues Remaining  
**Created:** 2025-07-21
**Updated:** 2025-07-21
**Assignee:** Claude
**Priority:** Critical
**Labels:** bug, gameplay, units, bases, positioning, dom-manipulation

## Description

Multiple critical gameplay issues related to unit building and base positioning that break core game mechanics and balance.

**⚠️ REMAINING CRITICAL ISSUES:**
1. **Grid becomes non-interactive after Turn 3** - Game unplayable beyond turn 3
2. **Turn counter increments by 2 instead of 1** - Display/progression issue

## Tasks

- [x] Move player bases to correct positions: 1,23 and 23,1 ✅ **COMPLETED**
- [x] Fix unit building - currently only works near one base, not both ✅ **COMPLETED** 
- [x] Test unit building functionality at both base locations ✅ **COMPLETED**
- [x] Verify base positioning doesn't affect other game mechanics ✅ **COMPLETED**
- [x] Ensure both players have equal building capabilities ✅ **COMPLETED**
- [x] Fix victory screen positioning issues ✅ **COMPLETED**
- [x] Remove broken Turn 5 arbitrary game ending ✅ **COMPLETED**
- [x] Fix grid disappearing during turn transitions ✅ **COMPLETED**
- [ ] **🚨 CRITICAL: Fix grid becoming non-interactive after Turn 3**
- [ ] **Fix turn counter double-increment issue**

## ✅ Completed Subtasks

- [x] [[ISSUE-036-unit-building-base-positioning-a]] - Investigate current base positioning logic ✅ **COMPLETED**
- [x] [[ISSUE-036-unit-building-base-positioning-b]] - Fix unit building range/detection for both bases ✅ **COMPLETED**
- [x] [[ISSUE-036-unit-building-base-positioning-c]] - Update base coordinates to 1,23 and 23,1 ✅ **COMPLETED**
- [x] [[ISSUE-036-unit-building-base-positioning-d]] - Test gameplay balance with new positions ✅ **COMPLETED**

## 🚨 Critical Remaining Issues

### Issue 1: Grid Becomes Non-Interactive After Turn 3
**Status:** Active Investigation  
**Priority:** Critical (Game Breaking)

**Problem:** After advancing to Turn 3, the game grid loses all interactivity. Grid cells change from clickable elements with references (`[ref=e168]`) to generic nested elements, making the game unplayable.

**Root Cause Analysis:**
- ✅ **Not a rendering issue** - `renderToGrid()` function is not being called during the problematic turn transition
- ✅ **Not an attribute preservation issue** - Grid preservation fix had no effect
- 🔍 **Likely cause:** DOM structure replacement by unknown system (multiple game instances, UI component interference, or complete board regeneration)

**Technical Evidence:**
- Turn 1: Grid shows as `generic [ref=e168] [cursor=pointer]: "100"`
- Turn 3+: Grid shows as `generic: { generic: { generic: "100" } }`
- Console shows no `renderToGrid` debug messages during problematic transition
- Grid adapter initialization logs appear but don't prevent the issue

### Issue 2: Turn Counter Double-Increment  
**Status:** Partially Debugged  
**Priority:** Medium (Cosmetic/Display Issue)

**Problem:** Turn counter jumps by 2 instead of 1 (Turn 1 → Turn 3 → Turn 5)

**Root Cause Analysis:**
- ✅ **Removed duplicate event listeners** from game.js and index.html
- ✅ **Fixed race conditions** in turnManager flag reset logic  
- ✅ **Added proper cleanup** for multiple TurnManager instances
- 🔍 **Mysterious UI system** still triggers turn endings, bypassing all explicit event listeners

**Technical Evidence:**
- Console shows double "Turn ended" events per button click
- Added explicit event listener with debug logging - never appears in console
- Turn transition deduplication system activates, suggesting known issue
- All identified duplicate calling mechanisms have been eliminated

## Related Issues

- [[ISSUE-032-critical-ui-blocking-bugs]]

## Relationships

- Blocks: Game playability beyond Turn 3 (Critical)
- Related to: Core game mechanics, DOM manipulation, event handling

## Comments

### 2025-07-21 - System Note
Created from fixes.md review - these are fundamental gameplay mechanics that must work correctly.

### 2025-07-21 - Investigation Update
Extensive debugging revealed two distinct critical issues. Successfully resolved all original base positioning and UI issues. Remaining issues require deeper architectural investigation of DOM manipulation and event systems.