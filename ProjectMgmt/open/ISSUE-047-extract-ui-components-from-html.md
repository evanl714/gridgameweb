# ISSUE-047: Extract UI Components from HTML

**Status:** Open
**Created:** 2025-07-24
**Assignee:** Unassigned
**Priority:** High
**Labels:** architecture, ui, refactoring, modularity

## Description

Move all event listeners and UI logic from `index.html` to JavaScript modules to complete the modular architecture vision. Currently, UI-related event listeners are embedded in HTML (lines 531-578) which reduces maintainability and prevents proper component-based architecture.

**Current Issues:**
- Event handlers mixed in HTML file
- UI logic scattered between HTML and JavaScript modules
- Incomplete separation between HTML structure and behavior
- Reduces testability of UI components

**Evidence:**
- `public/index.html:531-578` - DOMContentLoaded listener contains UI logic
- Unit card selection functionality in HTML
- Game board event handling in HTML file
- Mixed architecture prevents clean testing

## Tasks

- [ ] Move all event listeners from `index.html` to JavaScript modules
- [ ] Create dedicated UI component classes
- [ ] Implement proper component lifecycle management
- [ ] Update `UIStateManager` to manage components, not DOM IDs
- [ ] Create component-based UI architecture
- [ ] Establish clean separation between HTML structure and behavior

## Subtasks

- [ ] [[ISSUE-047-extract-ui-components-from-html-a]] - Audit all JavaScript in index.html
- [ ] [[ISSUE-047-extract-ui-components-from-html-b]] - Design component-based UI architecture
- [ ] [[ISSUE-047-extract-ui-components-from-html-c]] - Create BuildPanel component class
- [ ] [[ISSUE-047-extract-ui-components-from-html-d]] - Create GameBoard component class
- [ ] [[ISSUE-047-extract-ui-components-from-html-e]] - Create ControlPanel component class
- [ ] [[ISSUE-047-extract-ui-components-from-html-f]] - Move all event listeners to components
- [ ] [[ISSUE-047-extract-ui-components-from-html-g]] - Update UIStateManager for component management
- [ ] [[ISSUE-047-extract-ui-components-from-html-h]] - Implement component lifecycle management

## Related Issues

- [[ISSUE-044-complete-rendering-architecture-migration]]
- [[ISSUE-045-eliminate-global-state-dependencies]]

## Relationships

- Depends on: [[ISSUE-044-complete-rendering-architecture-migration]]
- Depends on: [[ISSUE-045-eliminate-global-state-dependencies]]

## Comments

### 2025-07-24 - Code Audit Analysis

Identified mixed inline JavaScript and modular architecture as technical debt. Currently, DOMContentLoaded listener in HTML contains UI logic including unit card selection and game board event handling. This prevents clean component-based architecture and reduces testability.

**Success Criteria:**
- Zero JavaScript in HTML files
- Component-based UI architecture
- Clean separation between HTML structure and behavior
- Improved testability

**Effort Estimate:** 1-2 weeks  
**Business Value:** High (Enables component testing and maintainability)

## Implementation Log

<!-- Auto-generated log of actual development work performed by the LLM -->