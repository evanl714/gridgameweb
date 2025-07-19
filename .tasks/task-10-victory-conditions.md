# Task 10: Victory Conditions & Game End

**Priority:** High  
**Estimated Time:** 4-6 hours  
**Dependencies:** Task 09

## Overview

Implement the victory condition system that detects when a player wins by destroying the enemy base, handles forfeit scenarios, and manages game end states.

## Subtasks

### 10.1 Primary Victory Condition

- [ ] Detect when a base is destroyed (HP reaches 0)
- [ ] Declare winner when enemy base is eliminated
- [ ] Add immediate game end on base destruction
- [ ] Create victory announcement system

### 10.2 Secondary Victory Conditions

- [ ] Implement forfeit/surrender mechanism
- [ ] Handle player disconnect scenarios
- [ ] Add draw condition by mutual agreement
- [ ] Create stalemate detection system

### 10.3 Game End Handling

- [ ] Disable all game actions after victory
- [ ] Display victory/defeat messages
- [ ] Show final game statistics
- [ ] Add replay/restart options

### 10.4 Victory Detection System

- [ ] Monitor base HP continuously
- [ ] Check victory conditions after each action
- [ ] Validate victory state integrity
- [ ] Handle simultaneous base destruction

### 10.5 End Game Interface

- [ ] Create victory/defeat screen overlay
- [ ] Add game summary statistics
- [ ] Implement "Play Again" functionality
- [ ] Show match duration and turn count

## Acceptance Criteria

- Game correctly detects base destruction as victory
- Victory is declared immediately when conditions are met
- All game actions are disabled after game end
- Players receive clear victory/defeat feedback
- Game can be restarted after completion

## Notes

Victory detection must be immediate and unambiguous. The end game experience should be satisfying.
