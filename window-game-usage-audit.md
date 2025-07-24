# Global State Usage Audit: `window.game` Dependencies

## Executive Summary

The codebase exhibits extensive reliance on the global `window.game` object, creating tight coupling throughout the application. This audit documents all instances of global state access and the patterns of usage that need to be addressed for better architectural modularity.

## Primary Global State Object

### `window.game` - Main Game Instance
- **Declaration**: `/Users/evanluchs/gridgameweb/public/game.js:79` and `570-571`
- **Purpose**: Makes the main Game class instance globally accessible
- **Impact**: Creates tight coupling across UI components, event handlers, and testing infrastructure

## Usage Patterns Identified

### 1. **Direct Event Handler Bindings in HTML**
**Location**: `/Users/evanluchs/gridgameweb/public/index.html`
```javascript
// Button event listeners - lines 620-625
document.getElementById('newGameBtn')?.addEventListener('click', async () => await window.game.newGame());
document.getElementById('nextPhaseBtn')?.addEventListener('click', () => window.game.nextPhase());
document.getElementById('gatherBtn')?.addEventListener('click', () => window.game.gatherResources());
document.getElementById('saveGameBtn')?.addEventListener('click', () => window.game.saveGame());
document.getElementById('resetBtn')?.addEventListener('click', () => window.game.resetGame());
document.getElementById('surrenderBtn')?.addEventListener('click', () => window.game.surrender());

// Grid cell click handling - line 557-558
if (window.game) {
    window.game.handleCellClick(x, y);
}

// Rendering calls - lines 630-631
if (window.game && window.game.render) {
    window.game.render();
}
```

### 2. **UI Component Dependencies**
**Location**: `/Users/evanluchs/gridgameweb/public/ui/victoryScreen.js`
```javascript
// Inline onclick handlers - line 100
<button class="play-again-btn" onclick="(async () => await window.game.newGame())()">

// Event handler methods - lines 197-198
if (window.game) {
  (async () => await window.game.newGame())();
}
```

### 3. **Fallback Pattern in Controllers**
**Location**: `/Users/evanluchs/gridgameweb/public/js/controllers/InputController.js`
```javascript
// Constructor fallback - line 15
this.gameActions = gameActions || new GameActions(window.game); // Fallback for backward compatibility
```

### 4. **Testing Infrastructure Dependencies**
**Locations**: Multiple test files
```javascript
// Basic functionality tests
await page.waitForFunction(() => window.game !== undefined);
const gameExists = !!window.game;

// State inspection in tests
currentPlayer: window.game ? window.game.gameState?.currentPlayer : null

// Method patching for debugging
const originalNewGame = window.game.newGame.bind(window.game);
window.game.newGame = function () { /* patched logic */ };
```

### 5. **Adapter/Compatibility Code**
**Location**: `/Users/evanluchs/gridgameweb/debug-response.html`
```javascript
// Monkey-patching for legacy compatibility - lines 592-779
if (window.game && window.game.gameState && window.game.uiManager) {
    // Override render method
    window.game.render = function() { /* custom logic */ };
    // Add helper methods
    window.game.getUnitSymbol = function(unitType) { /* implementation */ };
}
```

## Secondary Global State Objects

### `window.selectedUnitType`
- **Location**: `/Users/evanluchs/gridgameweb/public/index.html:544`
- **Purpose**: Stores currently selected unit type for building
- **Usage**: UI state management for build panel interactions

### `window.turnTransitionDebug`
- **Location**: `/Users/evanluchs/gridgameweb/public/ui/turnTransition.js:201`
- **Purpose**: Debug utilities for turn transition system
- **Usage**: Development and debugging helpers

### `window.gameInstance` (Legacy)
- **Location**: Various test files
- **Purpose**: Alternative reference to game instance in some contexts
- **Usage**: Testing scenarios and legacy compatibility

## Component Dependencies on Global State

### High-Coupling Components
1. **HTML Event Handlers** - Direct `window.game` method calls
2. **Victory Screen UI** - Embedded onclick handlers and event methods
3. **Grid Cell Click Handlers** - Direct method delegation
4. **Test Infrastructure** - State inspection and method patching

### Moderate-Coupling Components
1. **Input Controller** - Uses fallback pattern with abstraction layer
2. **Turn Transition Debug** - Isolated debug utilities
3. **Build Panel State** - Uses separate global for UI state

### Low-Coupling Components
1. **GameActions Interface** - Provides abstraction layer
2. **Modern UI Components** - Use dependency injection patterns

## Architectural Impact Analysis

### Problems Created
1. **Tight Coupling**: Components cannot be instantiated or tested independently
2. **Global Namespace Pollution**: Multiple objects in global scope
3. **Initialization Dependencies**: Components must wait for global state setup
4. **Testing Complexity**: Tests require global state mocking and patching
5. **Module System Conflicts**: Global access bypasses ES6 module dependencies

### Current Mitigation Efforts
1. **GameActions Interface**: Provides abstraction layer for some interactions
2. **Dependency Injection**: Some newer components use constructor injection
3. **Fallback Patterns**: Graceful degradation when global state unavailable

## Migration Strategy Recommendations

### Phase 1: Critical Path Isolation
- Replace direct HTML event handler bindings with event delegation
- Extract inline onclick handlers from UI components
- Implement proper dependency injection in Victory Screen

### Phase 2: Interface Standardization
- Expand GameActions interface to cover all game interactions
- Replace remaining direct `window.game` calls with interface usage
- Standardize component initialization patterns

### Phase 3: Global State Elimination
- Remove `window.game` assignment from Game constructor
- Implement proper service locator or dependency injection container
- Update test infrastructure to use controlled instances

### Phase 4: Testing Infrastructure Modernization
- Replace global state patching with proper mocking frameworks
- Implement component-level testing without global dependencies
- Create integration test helpers that don't rely on global state

## Files Requiring Modification

### High Priority
- `/Users/evanluchs/gridgameweb/public/index.html` - 9 direct usages
- `/Users/evanluchs/gridgameweb/public/ui/victoryScreen.js` - 3 direct usages
- `/Users/evanluchs/gridgameweb/public/game.js` - Global assignment source

### Medium Priority
- `/Users/evanluchs/gridgameweb/public/js/controllers/InputController.js` - Fallback pattern
- Test files - Multiple global state dependencies

### Low Priority
- Debug and development utilities
- Legacy compatibility code (can be deprecated)

## Conclusion

The extensive use of `window.game` throughout the codebase represents the largest architectural debt in the system. While some modern components use better patterns, the core interaction systems still rely heavily on global state access. A systematic migration following the recommended phases would significantly improve code maintainability, testability, and modularity.

The existing GameActions interface provides a good foundation for this migration, but needs to be expanded and consistently applied across all components that currently access global state directly.