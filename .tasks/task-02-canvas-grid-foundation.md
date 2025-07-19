# Task 02: Canvas Grid Foundation

**Priority:** High  
**Estimated Time:** 4-6 hours  
**Dependencies:** Task 01  

## Overview
Create the core 25x25 grid rendering system using HTML5 Canvas. Implement the chess-like visual design with alternating light/dark squares.

## Subtasks

### 2.1 Canvas Setup
- [ ] Add HTML5 canvas element to index.html
- [ ] Set canvas dimensions and responsive behavior
- [ ] Initialize 2D rendering context in game.js
- [ ] Add window resize handling

### 2.2 Grid Rendering System
- [ ] Implement 25x25 grid calculation
- [ ] Create alternating light/dark square pattern
- [ ] Add coordinate system (0-24 for both x and y)
- [ ] Implement pixel-to-grid coordinate conversion

### 2.3 Visual Styling
- [ ] Apply color scheme from design spec
- [ ] Add grid lines for clarity
- [ ] Implement hover effects for squares
- [ ] Add selection highlighting system

### 2.4 Resource Node Placement
- [ ] Add 9 resource nodes in symmetric pattern
- [ ] Render resource nodes with green color (#32cd32)
- [ ] Display resource values (100 each initially)
- [ ] Add visual indicators for resource depletion

### 2.5 Mouse Interaction
- [ ] Implement click-to-coordinate mapping
- [ ] Add hover state tracking
- [ ] Create square selection system
- [ ] Add basic click feedback

## Acceptance Criteria
- 25x25 grid renders correctly with alternating colors
- Resource nodes appear in correct symmetric positions
- Mouse clicks accurately map to grid coordinates
- Grid is responsive and centers properly
- Hover effects provide clear visual feedback

## Notes
Focus on clean, performant rendering. The grid will be redrawn frequently during gameplay.