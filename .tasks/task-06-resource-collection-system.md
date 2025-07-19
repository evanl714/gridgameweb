# Task 06: Resource Collection System

**Priority:** High  
**Estimated Time:** 4-6 hours  
**Dependencies:** Task 05  

## Overview
Implement the resource collection mechanics that allow Workers to gather resources from nodes and contribute to the player's resource pool.

## Subtasks

### 6.1 Resource Collection Mechanics
- [ ] Enable Workers to collect from adjacent resource nodes
- [ ] Implement automatic collection when Worker moves to resource
- [ ] Add resource node depletion (100 → 0)
- [ ] Create collection rate system (10 resources per collection)

### 6.2 Resource Node Management
- [ ] Track individual resource node states
- [ ] Implement node depletion visual changes
- [ ] Add "empty node" indicators
- [ ] Handle multiple workers on same node

### 6.3 Player Resource Tracking
- [ ] Update player resource pools in real-time
- [ ] Add resource collection animations
- [ ] Implement resource collection feedback
- [ ] Create resource collection history

### 6.4 Collection Rules & Validation
- [ ] Ensure only Workers can collect resources
- [ ] Validate collection actions during Resource phase
- [ ] Add collection range limitations
- [ ] Implement collection efficiency rules

### 6.5 Visual Feedback System
- [ ] Add collection animation effects
- [ ] Show resource transfer to player pool
- [ ] Highlight collectable resource nodes
- [ ] Display collection progress indicators

## Acceptance Criteria
- Workers successfully collect resources from adjacent nodes
- Resource nodes deplete correctly from 100 to 0
- Player resource counters update accurately
- Collection only works during Resource phase
- Visual feedback clearly shows collection actions

## Notes
Resource collection is fundamental to the economic game loop - ensure it's intuitive and satisfying.