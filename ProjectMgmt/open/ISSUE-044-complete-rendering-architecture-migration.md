# ISSUE-044: Complete Rendering Architecture Migration

**Status:** Open
**Created:** 2025-07-24
**Assignee:** Unassigned
**Priority:** Critical
**Labels:** architecture, technical-debt, rendering, strategy-pattern

## Description

The application is caught between two rendering paradigms with a large "adapter" script in `index.html` (lines 585-811) that monkey-patches the global `window.game` object to bridge legacy canvas-based rendering and modern DOM-based grid rendering. This incomplete architectural transition is the largest source of technical debt in the codebase.

**Root Cause:**
- Incomplete refactoring from canvas to grid rendering
- Clean `GameRenderer` Strategy pattern exists but isn't integrated
- Multiple deleted frontend files indicate abandoned migration

**Impact Assessment:**
- Makes rendering pipeline difficult to understand and debug
- New developers will be confused by multiple rendering paths
- Any rendering changes require modifying brittle adapter script
- Prevents leveraging the well-designed Strategy pattern

## Tasks

- [ ] Remove 200+ line inline adapter script from `public/index.html`
- [ ] Fully integrate existing `GameRenderer` Strategy pattern
- [ ] Update `InputController` and other components to use Strategy interface
- [ ] Ensure both canvas and grid rendering modes work through unified interface
- [ ] Update all rendering calls to use unified interface
- [ ] Test both rendering strategies thoroughly
- [ ] Clean up dead code related to old rendering approach

## Subtasks

- [ ] [[ISSUE-044-complete-rendering-architecture-migration-a]] - Analyze current adapter script functionality
- [ ] [[ISSUE-044-complete-rendering-architecture-migration-b]] - Integrate GameRenderer Strategy pattern fully
- [ ] [[ISSUE-044-complete-rendering-architecture-migration-c]] - Refactor InputController to use Strategy interface
- [ ] [[ISSUE-044-complete-rendering-architecture-migration-d]] - Remove inline adapter script from index.html
- [ ] [[ISSUE-044-complete-rendering-architecture-migration-e]] - Test and validate both rendering modes
- [ ] [[ISSUE-044-complete-rendering-architecture-migration-f]] - Clean up dead rendering code

## Related Issues

- [[ISSUE-040-critical-grid-rendering-failure]]
- [[ISSUE-045-eliminate-global-state-dependencies]]

## Relationships

- Blocks: [[ISSUE-045-eliminate-global-state-dependencies]]
- Blocks: [[ISSUE-047-extract-ui-components-from-html]]

## Comments

### 2025-07-24 - Code Audit Analysis

Found critical architectural debt: inline adapter script creates maintenance burden and prevents leveraging clean Strategy pattern architecture. This is identified as the single largest source of technical debt requiring immediate attention.

**Evidence from `public/index.html` lines 620-626:**
```html
<script>
// Override render method to use grid-only rendering
window.game.render = function() {
  try {
    this.renderToGrid();
  } catch (error) {
    console.error('Error in grid render:', error);
  }
};
</script>
```

**Success Criteria:**
- Single rendering pipeline through `GameRenderer`
- No inline JavaScript in HTML files
- Both rendering strategies functional
- Clean separation of concerns

**Effort Estimate:** 2-3 sprints  
**Business Value:** High (Enables future rendering enhancements)

## Implementation Log

<!-- Auto-generated log of actual development work performed by the LLM -->