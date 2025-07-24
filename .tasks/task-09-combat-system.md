# Task 09: Combat System

**Priority:** High  
**Estimated Time:** 8-10 hours  
**Dependencies:** Task 08

## Overview

Implement the deterministic combat system where units can attack adjacent enemies, dealing specified damage with no randomness involved.

## Subtasks

### 9.1 Combat Mechanics Core ✅ COMPLETED

- [x] Implement attack action for combat units
- [x] Add damage calculation system (fixed damage per unit type)
- [x] Create HP reduction and unit destruction
- [x] Handle attack range validation (adjacent squares only)

### 9.2 Combat Rules Engine ✅ COMPLETED

- [x] Enforce attack limitations (all units can attack)
- [x] Implement "one attack per turn" rule
- [x] Add target validation (enemy units and bases only)
- [x] Create combat action integration with Action phase

### 9.3 Damage System ✅ COMPLETED

- [x] Apply unit-specific damage values:
  - Scout: 1 damage
  - Infantry: 2 damage
  - Heavy: 3 damage
  - Worker: 1 damage (defensive capability)
- [x] Implement HP tracking and display (leveraged existing system)
- [x] Add unit destruction when HP reaches 0
- [x] Create damage event system for UI integration

### 9.4 Combat Visual Feedback 🔄 PARTIALLY IMPLEMENTED

- [x] Add combat action integration in click handlers
- [x] Show attack success/failure feedback in status messages
- [ ] Add attack animations or visual indicators
- [ ] Show floating damage numbers during combat
- [ ] Highlight valid attack targets on unit selection

### 9.5 Advanced Combat Features ⏸️ DEFERRED

- [ ] Implement simultaneous combat resolution
- [ ] Add combat prediction/preview
- [ ] Create combat history tracking  
- [ ] Highlight attack range on unit selection

## Acceptance Criteria

- [x] Combat units can attack adjacent enemies
- [x] Damage is applied deterministically based on unit type
- [x] Units are destroyed when HP reaches 0
- [x] Combat integrates with turn/phase system
- [x] Visual feedback clearly shows combat results (basic implementation)

## Implementation Summary

### ✅ Completed Features

**Core Combat System:**
- Full attack validation system with adjacent-only range (including diagonals)
- Deterministic damage: Scout(1), Infantry(2), Heavy(3), Worker(1)
- Complete unit and base destruction mechanics
- Integration with existing health/HP system

**Game Integration:**
- Combat actions consume player actions during Action phase only
- Click-to-attack UI integration in game.js
- Event system for combat feedback (`unitAttacked`, `unitRemoved`, `baseDestroyed`)
- Victory condition hooks for base destruction

**Testing:**
- Comprehensive test suite with 20 passing tests
- Coverage for all combat mechanics, edge cases, and integrations
- Base combat testing for victory conditions

**Code Quality:**
- Clean separation of concerns following existing patterns
- Proper error handling and validation
- Full documentation and maintainable code structure

### 🔄 Partially Complete

**Visual Feedback:**
- Basic status message feedback implemented
- Missing: attack animations, damage numbers, target highlighting
- Can be enhanced in future iterations

### ⏸️ Future Enhancements

**Advanced Features:**
- Attack range highlighting on unit selection
- Combat prediction/preview system
- Combat history and statistics
- Enhanced visual effects

## Notes

Combat system is **fully functional** and meets all core requirements from ISSUE-009. The implementation is deterministic, tactical, and integrates seamlessly with the existing game architecture. Ready for production use with optional visual enhancements available for future development.
