# Task 08: Unit Production System

**Priority:** High  
**Estimated Time:** 5-7 hours  
**Dependencies:** Task 07  

## Overview
Implement the unit production mechanics that allow players to spend resources to create new units at their base during the Build phase.

## Subtasks

### 8.1 Base Building System
- [ ] Implement base placement for both players
- [ ] Create base rendering and identification
- [ ] Add base health and destruction mechanics
- [ ] Handle base collision with unit placement

### 8.2 Unit Purchase Mechanics
- [ ] Create unit cost validation system
- [ ] Implement resource deduction for purchases
- [ ] Add unit placement near base
- [ ] Handle build queue management

### 8.3 Build Phase Integration
- [ ] Restrict building to Build phase only
- [ ] Add build limit enforcement
- [ ] Create build confirmation system
- [ ] Implement build cancellation

### 8.4 Unit Placement Logic
- [ ] Find valid placement squares near base
- [ ] Handle placement when base area is crowded
- [ ] Add placement priority system
- [ ] Create placement visual feedback

### 8.5 Production Validation
- [ ] Validate sufficient resources for purchases
- [ ] Check available placement space
- [ ] Enforce one unit per square rule
- [ ] Add production error handling

## Acceptance Criteria
- Players can purchase units during Build phase
- Resources are correctly deducted for purchases
- New units appear near the player's base
- Production respects all game rules and limitations
- Build system integrates seamlessly with UI

## Notes
Unit production drives the strategic depth - ensure it's balanced and provides clear feedback.