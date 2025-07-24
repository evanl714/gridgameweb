# ISSUE-045: Eliminate Global State Dependencies

**Status:** Open
**Created:** 2025-07-24
**Assignee:** Unassigned
**Priority:** High
**Labels:** architecture, refactoring, dependency-injection, modularity

## Description

Over-reliance on `window.game` global object undermines modular architecture benefits and creates tight coupling throughout the application. Components are tightly coupled to specific DOM structure and testing becomes complex due to global dependencies.

**Impact Assessment:**
- Data flow is difficult to trace and debug
- Components are tightly coupled to specific DOM structure
- Testing becomes complex due to global dependencies
- Prevents clean dependency injection patterns

**Evidence:**
- `public/js/controllers/InputController.js:15` - Fallback to `window.game`
- `public/js/managers/UIStateManager.js` - 20+ hardcoded DOM element references
- Direct DOM queries with hardcoded IDs throughout codebase

## Tasks

- [ ] Replace `window.game` global access with constructor injection
- [ ] Create dedicated `GameStateManager` class
- [ ] Create dedicated `TurnManager` class
- [ ] Implement proper service container/locator pattern
- [ ] Update all components to receive dependencies via constructor
- [ ] Refactor UIStateManager to component-based architecture
- [ ] Leverage existing Observer pattern for state communication

## Subtasks

- [ ] [[ISSUE-045-eliminate-global-state-dependencies-a]] - Audit all window.game references
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-b]] - Design dependency injection architecture
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-c]] - Create GameStateManager class
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-d]] - Create TurnManager class
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-e]] - Implement service container pattern
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-f]] - Refactor InputController for DI
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-g]] - Refactor UIStateManager architecture
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-h]] - Update all component constructors
- [ ] [[ISSUE-045-eliminate-global-state-dependencies-i]] - Implement state communication via Observer pattern

## Related Issues

- [[ISSUE-044-complete-rendering-architecture-migration]]
- [[ISSUE-047-extract-ui-components-from-html]]

## Relationships

- Depends on: [[ISSUE-044-complete-rendering-architecture-migration]]
- Blocks: [[ISSUE-047-extract-ui-components-from-html]]

## Comments

### 2025-07-24 - Code Audit Analysis

Global state dependencies identified as major architectural concern. Current UIStateManager directly queries DOM with hardcoded IDs, creating brittle coupling. Need to move to proper dependency injection pattern to enable testing and modularity.

**Success Criteria:**
- No global variables for application state
- Clean dependency graphs
- Improved testability with mock injection
- Better separation of concerns

**Effort Estimate:** 4-5 sprints  
**Business Value:** High (Enables testing, modularity, scalability)

## Implementation Log

<!-- Auto-generated log of actual development work performed by the LLM -->