# Task 09: Combat System

**Priority:** High  
**Estimated Time:** 8-10 hours  
**Dependencies:** Task 08  

## Overview
Implement the deterministic combat system where units can attack adjacent enemies, dealing specified damage with no randomness involved.

## Subtasks

### 9.1 Combat Mechanics Core
- [ ] Implement attack action for combat units
- [ ] Add damage calculation system (fixed damage per unit type)
- [ ] Create HP reduction and unit destruction
- [ ] Handle attack range validation (adjacent squares only)

### 9.2 Combat Rules Engine
- [ ] Enforce attack limitations (Scout/Infantry/Heavy only)
- [ ] Implement "one attack per turn" rule
- [ ] Add target validation (enemy units only)
- [ ] Create combat action integration with Action phase

### 9.3 Damage System
- [ ] Apply unit-specific damage values:
  - Scout: 1 damage
  - Infantry: 2 damage  
  - Heavy: 3 damage
- [ ] Implement HP tracking and display
- [ ] Add unit destruction when HP reaches 0
- [ ] Create damage visualization

### 9.4 Combat Visual Feedback
- [ ] Add attack animations or indicators
- [ ] Show damage numbers during combat
- [ ] Highlight valid attack targets
- [ ] Create combat result feedback

### 9.5 Advanced Combat Features
- [ ] Implement simultaneous combat resolution
- [ ] Add combat prediction/preview
- [ ] Create combat history tracking
- [ ] Handle edge cases (surrounded units, etc.)

## Acceptance Criteria
- Combat units can attack adjacent enemies
- Damage is applied deterministically based on unit type
- Units are destroyed when HP reaches 0
- Combat integrates with turn/phase system
- Visual feedback clearly shows combat results

## Notes
Combat should feel tactical and predictable - no randomness allowed. Clear feedback is essential.