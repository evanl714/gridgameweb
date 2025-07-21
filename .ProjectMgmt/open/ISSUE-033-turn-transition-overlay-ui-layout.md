# ISSUE-033: Turn Transition Overlay UI Layout Issues

**Status:** Open
**Created:** 2025-07-20
**Assignee:** evanl714
**Priority:** High
**Labels:** bug, ui, overlay, user-experience, blocking

## Description

The turn transition overlay system has critical UI layout issues that make the game difficult to use:

1. **Persistent Overlay**: Turn transition overlay reappears and blocks user interaction even after being dismissed
2. **Layout Breaking**: Overlay appears at the bottom of the page instead of as a proper modal overlay
3. **Manual Intervention Required**: Players must manually force-hide the overlay to continue playing
4. **Poor User Experience**: The overlay disrupts the game flow and confuses players

**Current Impact**: Game is technically functional (unit building works), but requires manual overlay dismissal to be playable.

**Root Cause**: The turn transition overlay system has improper positioning, timing, and lifecycle management.

## Tasks

- [ ] Fix turn transition overlay positioning to be a proper centered modal
- [ ] Prevent overlay from reappearing after being dismissed
- [ ] Implement proper overlay lifecycle management
- [ ] Ensure overlay doesn't break page layout when visible
- [ ] Test overlay behavior across different game phases
- [ ] Add proper z-index management for overlay stacking

## Related Issues

- [[ISSUE-032-critical-ui-blocking-bugs]] - Parent issue that was partially resolved
- [[ISSUE-031-ui-redesign-fix-chess-com-implementation]] - UI system that may affect overlay behavior

## Relationships

- Blocks: Game usability and user experience
- Related to: [[ISSUE-032-critical-ui-blocking-bugs]] (overlay was one of the blocking issues)

## Comments

### 2025-07-20 - evanl714

Found through Playwright testing that while unit building functionality works correctly, the turn transition overlay continuously reappears and blocks interaction. The overlay shows proper content but is positioned incorrectly and cannot be permanently dismissed.

Key symptoms observed:
- Overlay appears at bottom of page instead of centered
- "Start Turn" and "Show Game State" buttons don't permanently dismiss overlay
- Manual JavaScript intervention required: `document.querySelector('.turn-transition-overlay').style.display = 'none'`
- Once manually hidden, game functionality works perfectly (confirmed unit building success)

## Implementation Log

<!-- Auto-generated log of actual development work performed by the LLM -->