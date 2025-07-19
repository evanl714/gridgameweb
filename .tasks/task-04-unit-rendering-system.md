# Task 04: Unit Rendering System

**Priority:** High  
**Estimated Time:** 4-5 hours  
**Dependencies:** Task 03

## Overview

Implement visual rendering for all unit types using Unicode characters. Create a clean, accessible visual system that clearly distinguishes unit types and ownership.

## Subtasks

### 4.1 Unit Visual Design

- [ ] Implement Unicode character rendering for units
  - Worker: ♦ (Diamond)
  - Scout: ♙ (Pawn)
  - Infantry: ♗ (Bishop)
  - Heavy: ♖ (Rook)
- [ ] Add player color coding (Blue #4169e1, Red #dc143c)
- [ ] Create unit sizing and positioning system

### 4.2 Unit Rendering Engine

- [ ] Create unit draw function with position mapping
- [ ] Implement unit layer rendering (above grid)
- [ ] Add unit animation support structure
- [ ] Create unit selection visual feedback

### 4.3 Unit Information Display

- [ ] Add HP indicators for damaged units
- [ ] Implement unit tooltips on hover
- [ ] Create unit statistics overlay
- [ ] Add unit movement range preview

### 4.4 Performance Optimization

- [ ] Implement dirty rectangle rendering
- [ ] Add unit sprite caching
- [ ] Optimize redraw cycles
- [ ] Handle high unit count scenarios

### 4.5 Accessibility Features

- [ ] Add high contrast mode support
- [ ] Implement screen reader compatibility
- [ ] Create keyboard navigation support
- [ ] Add colorblind-friendly indicators

## Acceptance Criteria

- All unit types render clearly with correct Unicode characters
- Player colors are distinct and accessible
- Unit HP and status information is visible
- Rendering performance is smooth with 50+ units
- Units are clearly distinguishable from grid and resources

## Notes

Prioritize clarity and performance. The visual system should support future unit additions.
