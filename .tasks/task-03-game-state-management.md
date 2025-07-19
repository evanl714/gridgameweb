# Task 03: Game State Management

**Priority:** High  
**Estimated Time:** 6-8 hours  
**Dependencies:** Task 02  

## Overview
Implement the core game state system that tracks all game entities, turns, and phases. Create the foundation for all game logic.

## Subtasks

### 3.1 Game State Structure
- [ ] Define Player object structure (id, resources, units, base)
- [ ] Create Unit class with properties (type, position, hp, owner)
- [ ] Implement Board state management (units, resources, buildings)
- [ ] Add Turn management (currentPlayer, phase, turnNumber)

### 3.2 Unit Management System
- [ ] Create unit registry for tracking all units
- [ ] Implement unit placement/removal functions
- [ ] Add unit lookup by position
- [ ] Create unit validation system

### 3.3 Resource Management
- [ ] Track resource node states and depletion
- [ ] Implement player resource counters
- [ ] Add resource collection mechanics
- [ ] Create resource validation for purchases

### 3.4 Turn Phase System
- [ ] Implement 3-phase turn structure (Resource, Action, Build)
- [ ] Add phase transition logic
- [ ] Create turn validation system
- [ ] Add turn history tracking

### 3.5 Game State Persistence
- [ ] Implement state serialization/deserialization
- [ ] Add state validation functions
- [ ] Create state deep-copy functionality
- [ ] Add state rollback capability for invalid moves

## Acceptance Criteria
- Game state accurately represents all game entities
- Turn system correctly cycles through phases
- Resource tracking works for both players
- Unit management handles all CRUD operations
- State can be serialized and restored

## Notes
This is the foundation for all game logic - ensure it's robust and well-tested.