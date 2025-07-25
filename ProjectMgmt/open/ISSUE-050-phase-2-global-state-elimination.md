# ISSUE-050: Phase 2 Global State Elimination - window.game Dependencies

**Status:** OPEN
**Created:** 2025-07-25
**Assignee:** Claude Code
**Priority:** TIER 1 - Strategic (10x multiplier effect)
**Labels:** architecture, refactoring, dependency-injection, global-state, phase-2
**Phase:** 2 - Architecture Foundation
**Estimated Effort:** 3 weeks
**Strategic Priority:** Keystone issue enabling all other architecture improvements

## Description

Phase 2 of global state elimination focused on eliminating the remaining `window.game` dependencies identified in the OODA cycle strategic analysis. While Phase 1 successfully created the ServiceContainer and dependency injection foundation, the core `window.game` object still serves as a global access point throughout the codebase, preventing true modular architecture.

**Strategic Context:**
This is identified as a TIER 1 priority with 10x multiplier effect because eliminating global state dependencies is the keystone issue that enables:
- True modular architecture
- Comprehensive testing capabilities
- Clean dependency graphs
- Service-oriented design patterns
- Multiplayer architecture foundation

## Product Requirements Definition (PRD)

### Functional Requirements
1. **Complete Global State Elimination**: Remove all `window.game` references from codebase (16 identified)
2. **Dependency Injection Migration**: All components receive dependencies via constructor
3. **Service Container Integration**: Universal adoption of ServiceContainer across all modules
4. **State Communication**: Event-driven communication replacing global access
5. **Backward Compatibility**: Maintain existing game functionality during migration

### Technical Requirements
1. **No Global Game Object**: Complete elimination of `window.game` assignments and access
2. **Constructor Injection**: All classes updated to receive dependencies via constructor
3. **Service Registration**: All services properly registered in ServiceContainer
4. **Observable Patterns**: State changes communicated via Observer pattern
5. **Testability**: All components mockable for unit testing

### Implementation Constraints
1. **Incremental Migration**: Phase approach to minimize system disruption
2. **Functionality Preservation**: No regression in existing game features
3. **Performance Maintenance**: No performance degradation during migration
4. **Service Bootstrap Integration**: Leverage existing ServiceBootstrap architecture

### Success Metrics
- [ ] Zero `window.game` references in codebase
- [ ] 100% constructor-based dependency injection
- [ ] Complete ServiceContainer integration
- [ ] All components unit testable with mocks
- [ ] Event-driven state communication implemented
- [ ] No functional regressions

## Strategic Analysis: window.game Dependencies

### Identified Dependencies (16 total)
1. **game.js initialization** - Main game object creation and assignment
2. **InputController fallback** - Backup access when DI fails
3. **UIStateManager references** - Direct global state access
4. **Event handlers** - Global game state access in event callbacks
5. **Rendering components** - Direct access to game state for rendering
6. **Component initialization** - Global access during component startup
7. **Debug utilities** - Development/debugging global access
8. **Save/Load system** - Global state persistence
9. **Victory condition checks** - Global state access for win detection
10. **Resource management** - Global access to resource state
11. **Turn management** - Global access to turn state
12. **Unit management** - Global access to unit collections
13. **Base management** - Global access to base state
14. **Grid interaction** - Global access for cell interactions
15. **Animation system** - Global access for animation state
16. **Statistics tracking** - Global access for game metrics

## Tasks

- [ ] Conduct comprehensive global state dependency audit
- [ ] Create dependency injection migration plan for each component
- [ ] Update ServiceContainer to support all identified services
- [ ] Refactor game.js to eliminate global assignment
- [ ] Migrate InputController to pure dependency injection
- [ ] Update UIStateManager for complete DI integration
- [ ] Implement event-driven state communication patterns
- [ ] Create unit test suite with dependency mocking
- [ ] Validate no functional regressions
- [ ] Document new architectural patterns

## Subtasks

- [ ] [[ISSUE-050-phase-2-global-state-elimination-a]] - Audit all window.game usage patterns
- [ ] [[ISSUE-050-phase-2-global-state-elimination-b]] - Design comprehensive dependency injection architecture
- [ ] [[ISSUE-050-phase-2-global-state-elimination-c]] - Refactor game.js initialization to eliminate global assignment
- [ ] [[ISSUE-050-phase-2-global-state-elimination-d]] - Migrate InputController to pure dependency injection
- [ ] [[ISSUE-050-phase-2-global-state-elimination-e]] - Update ServiceContainer for universal service support
- [ ] [[ISSUE-050-phase-2-global-state-elimination-f]] - Implement event-driven communication replacing global access
- [ ] [[ISSUE-050-phase-2-global-state-elimination-g]] - Create comprehensive test suite with dependency mocking
- [ ] [[ISSUE-050-phase-2-global-state-elimination-h]] - Validate functionality preservation and performance
- [ ] [[ISSUE-050-phase-2-global-state-elimination-i]] - Document architectural patterns and migration guide

## Related Issues

- [[ISSUE-044-complete-rendering-architecture-migration]] (COMPLETED)
- [[ISSUE-045-eliminate-global-state-dependencies]] (COMPLETED)
- [[ISSUE-051-phase-2-architecture-migration]]
- [[ISSUE-049-multiplayer-foundation-architecture]]

## Relationships

- Blocks: [[ISSUE-051-phase-2-architecture-migration]]
- Blocks: [[ISSUE-049-multiplayer-foundation-architecture]]
- Enables: All future modular architecture work

## Phase 2 Strategic Context

### OODA Cycle Decision Framework
- **OBSERVE**: 16 window.game dependencies identified as architecture bottleneck
- **ORIENT**: Global state prevents modular architecture, testing, and multiplayer
- **DECIDE**: TIER 1 priority with 10x multiplier effect - keystone issue
- **ACT**: Sequential implementation with dependency injection foundation

### Business Impact
- **Architecture Foundation**: Enables service-oriented design patterns
- **Testing Capability**: Comprehensive unit testing with dependency mocking
- **Multiplayer Readiness**: Clean state management required for real-time synchronization
- **Maintenance Velocity**: Modular components easier to understand and modify
- **Scalability**: Clear dependency graphs support system growth

## Implementation Strategy

### Phase A: Analysis and Planning (Week 1)
1. Complete dependency audit with usage pattern analysis
2. Design comprehensive service architecture
3. Create migration sequence to minimize risk
4. Establish testing framework for validation

### Phase B: Core Migration (Week 2)
1. Refactor game.js to eliminate global assignment
2. Migrate critical components (InputController, UIStateManager)
3. Update ServiceContainer for universal service support
4. Implement event-driven communication patterns

### Phase C: Validation and Testing (Week 3)
1. Create comprehensive test suite with dependency mocking
2. Validate functionality preservation across all game features
3. Performance testing to ensure no regressions
4. Documentation of new architectural patterns

## Risk Mitigation

### Technical Risks
- **Circular Dependencies**: ServiceContainer has circular dependency detection
- **Initialization Order**: Existing ServiceBootstrap manages dependency initialization
- **Performance Impact**: Minimal - dependency injection adds negligible overhead
- **Testing Complexity**: Comprehensive mocking framework to be implemented

### Mitigation Strategies
- **Incremental Migration**: Component-by-component migration with validation
- **Rollback Plan**: Git branches for each migration step
- **Feature Flags**: Temporary flags for migration validation
- **Comprehensive Testing**: Unit and integration tests for each component

## Comments

### 2025-07-25 - Phase 2 Strategic Planning

Phase 2 represents a critical architectural transformation that will establish the foundation for all future system improvements. The complete elimination of global state dependencies is identified as the keystone issue with 10x multiplier effect because it enables:

1. **True Modular Architecture**: Components with clear dependency boundaries
2. **Comprehensive Testing**: Unit testing with dependency mocking capabilities
3. **Service-Oriented Design**: Clean service layer with proper abstraction
4. **Multiplayer Foundation**: State management patterns required for real-time sync
5. **Development Velocity**: Easier component understanding and modification

**Success Criteria:**
- Zero global state dependencies
- 100% dependency injection adoption
- Complete testability with mocking
- No functional or performance regressions
- Foundation for Phase 3 architecture optimization

**Effort Estimate:** 3 weeks (120 hours)
**Business Value:** Strategic (10x multiplier - enables all future architecture work)

## Implementation Log

<!-- Auto-generated log of actual development work performed -->