# ISSUE-006: Resource Collection System

**Status:** Closed
**Created:** 2025-07-18
**Completed:** 2025-07-19
**Assignee:** Claude
**Priority:** High
**Labels:** resources, economy, phase-1

## Description
Implement the resource collection mechanics that allow Workers to gather resources from nodes and contribute to the player's resource pool.

**Time Estimate:** 4-6 hours
**Dependencies:** [[ISSUE-005-basic-movement-system]]
**Task Reference:** [[task-06-resource-collection-system]]

## Tasks
- [✓] Enable Workers to collect from adjacent resource nodes
- [✓] Implement resource node management and depletion
- [✓] Add player resource tracking system
- [✓] Create collection rules and validation
- [✓] Build visual feedback system for collection

## Subtasks
- [✓] [[ISSUE-006-resource-collection-system-a]] - Resource collection mechanics
- [✓] [[ISSUE-006-resource-collection-system-b]] - Resource node management
- [✓] [[ISSUE-006-resource-collection-system-c]] - Player resource tracking
- [✓] [[ISSUE-006-resource-collection-system-d]] - Collection rules & validation
- [✓] [[ISSUE-006-resource-collection-system-e]] - Visual feedback system

## Related Issues
- Depends on: [[ISSUE-005-basic-movement-system]]
- Blocks: [[ISSUE-007-ui-interface-system]]

## Relationships
- Implements: [[task-06-resource-collection-system]] from .tasks

## Acceptance Criteria
- [✓] Workers successfully collect resources from adjacent nodes
- [✓] Resource nodes deplete correctly from 100 to 0
- [✓] Player resource counters update accurately
- [✓] Collection only works during Resource phase
- [✓] Visual feedback clearly shows collection actions

## Product Requirements Definition (PRD)

### Core Functionality
- **Worker-Only Collection**: Only Worker units can gather resources from nodes
- **Adjacency Requirement**: Workers must be within 1 grid space of resource nodes
- **Phase Restriction**: Resource collection only available during "Resource" phase
- **Collection Rate**: 5 resources per collection action (configurable)
- **Resource Depletion**: Nodes start at 100 resources and deplete to 0
- **Action Consumption**: Gathering consumes unit actions (1 action per gather)
- **Cooldown System**: 3-second cooldown between gathering attempts

### User Interface
- **Gather Button**: Dynamic button with contextual text and enable/disable states
- **Keyboard Shortcut**: 'G' key for quick resource gathering
- **Visual Feedback**: Gold highlighting for gatherable resource nodes
- **Status Display**: Real-time resource counters and phase indicators
- **Selection Feedback**: Clear indication of selected worker capabilities

### Technical Implementation
- **Resource Manager**: Centralized system for resource node management
- **Event System**: Resource gathering and regeneration events for UI updates
- **State Persistence**: Save/load support for resource node states
- **Performance**: Efficient adjacency calculations using Manhattan distance
- **Testing**: Comprehensive unit test coverage (22 tests)

### Game Balance
- **Regeneration**: Resource nodes regenerate 5 resources per turn
- **Node Distribution**: 9 symmetrically placed nodes on 25x25 grid
- **Economic Integration**: Resources feed into player energy system
- **Strategic Depth**: Positioning workers near multiple nodes for efficiency

## Comments
### 2025-07-18 - System Note
Resource collection rate: 5 resources per collection action (updated from 10)
Resource collection is fundamental to the economic game loop.

### 2025-07-19 - Implementation Completed
All acceptance criteria met and tested. System ready for integration with UI interface system (ISSUE-007).