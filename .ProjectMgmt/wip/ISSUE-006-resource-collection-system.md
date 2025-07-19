# ISSUE-006: Resource Collection System

**Status:** WIP
**Created:** 2025-07-18
**Assignee:** Claude
**Priority:** High
**Labels:** resources, economy, phase-1

## Description
Implement the resource collection mechanics that allow Workers to gather resources from nodes and contribute to the player's resource pool.

**Time Estimate:** 4-6 hours
**Dependencies:** [[ISSUE-005-basic-movement-system]]
**Task Reference:** [[task-06-resource-collection-system]]

## Tasks
- [ ] Enable Workers to collect from adjacent resource nodes
- [ ] Implement resource node management and depletion
- [ ] Add player resource tracking system
- [ ] Create collection rules and validation
- [ ] Build visual feedback system for collection

## Subtasks
- [ ] [[ISSUE-006-resource-collection-system-a]] - Resource collection mechanics
- [ ] [[ISSUE-006-resource-collection-system-b]] - Resource node management
- [ ] [[ISSUE-006-resource-collection-system-c]] - Player resource tracking
- [ ] [[ISSUE-006-resource-collection-system-d]] - Collection rules & validation
- [ ] [[ISSUE-006-resource-collection-system-e]] - Visual feedback system

## Related Issues
- Depends on: [[ISSUE-005-basic-movement-system]]
- Blocks: [[ISSUE-007-ui-interface-system]]

## Relationships
- Implements: [[task-06-resource-collection-system]] from .tasks

## Acceptance Criteria
- Workers successfully collect resources from adjacent nodes
- Resource nodes deplete correctly from 100 to 0
- Player resource counters update accurately
- Collection only works during Resource phase
- Visual feedback clearly shows collection actions

## Comments
### 2025-07-18 - System Note
Resource collection rate: 10 resources per collection action
Resource collection is fundamental to the economic game loop.