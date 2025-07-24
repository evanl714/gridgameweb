/**
 * Resource Management System
 * Handles resource nodes, gathering, and energy management
 */

import { GAME_CONFIG, RESOURCE_CONFIG } from '../shared/constants.js';

export class ResourceManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.resourceNodes = this.initializeResourceNodes();
    this.gatheringCooldowns = new Map(); // Track gathering cooldowns per unit
  }

  /**
     * Initialize resource nodes on the game board
     */
  initializeResourceNodes() {
    return RESOURCE_CONFIG.NODE_POSITIONS.map((pos, index) => ({
      id: `node_${index + 1}`,
      x: pos.x,
      y: pos.y,
      value: RESOURCE_CONFIG.INITIAL_VALUE,
      maxValue: RESOURCE_CONFIG.INITIAL_VALUE,
      regenerationRate: 5 // 5 resources per turn regeneration
    }));
  }

  /**
     * Get resource node at specific position
     */
  getResourceNodeAt(x, y) {
    return this.resourceNodes.find(node => node.x === x && node.y === y);
  }

  /**
     * Get all resource nodes within range of a position
     */
  getResourceNodesInRange(x, y, range = 2) {
    return this.resourceNodes.filter(node => {
      const distance = Math.abs(node.x - x) + Math.abs(node.y - y);
      return distance <= range;
    });
  }

  /**
     * Attempt to gather resources with a unit
     */
  gatherResources(unitId) {
    const unit = this.gameState.units.get(unitId);
    if (!unit || unit.type !== 'worker' || !unit.canAct()) {
      return { success: false, reason: 'Unit cannot gather' };
    }

    // Check if we're in the resource phase
    if (this.gameState.currentPhase !== 'resource') {
      return {
        success: false,
        reason: `Can only gather during Resource phase. Current phase: ${this.gameState.currentPhase}`
      };
    }

    // Check cooldown
    if (this.gatheringCooldowns.has(unitId)) {
      const cooldownEnd = this.gatheringCooldowns.get(unitId);
      if (Date.now() < cooldownEnd) {
        return {
          success: false,
          reason: 'Unit is on gathering cooldown',
          cooldownRemaining: cooldownEnd - Date.now()
        };
      }
    }

    // Find nearby resource nodes
    const nearbyNodes = this.getResourceNodesInRange(
      unit.position.x,
      unit.position.y,
      1 // Workers need to be adjacent
    );

    if (nearbyNodes.length === 0) {
      return { success: false, reason: 'No resource nodes in range' };
    }

    // Find the best node with resources available
    const availableNode = nearbyNodes
      .filter(node => node.value > 0)
      .sort((a, b) => b.value - a.value)[0];

    if (!availableNode) {
      return { success: false, reason: 'No resources available at nearby nodes' };
    }

    // Calculate gathering amount (worker efficiency)
    const baseGatherAmount = 5;
    const gatherAmount = Math.min(baseGatherAmount, availableNode.value);

    // Remove resources from node
    availableNode.value -= gatherAmount;

    // Add resources to player
    const player = this.gameState.players.get(unit.playerId);
    player.addEnergy(gatherAmount);
    player.resourcesGathered += gatherAmount;

    // Use unit action
    unit.useAction();

    // Set gathering cooldown (3 seconds)
    this.gatheringCooldowns.set(unitId, Date.now() + 3000);

    // Emit event
    this.gameState.emit('resourcesGathered', {
      unitId: unitId,
      playerId: unit.playerId,
      amount: gatherAmount,
      nodeId: availableNode.id,
      nodePosition: { x: availableNode.x, y: availableNode.y },
      nodeValueRemaining: availableNode.value
    });

    return {
      success: true,
      amount: gatherAmount,
      nodeId: availableNode.id,
      nodeValueRemaining: availableNode.value
    };
  }

  /**
     * Regenerate resources at all nodes
     */
  regenerateResources() {
    let totalRegenerated = 0;

    this.resourceNodes.forEach(node => {
      if (node.value < node.maxValue) {
        const regenAmount = Math.min(
          node.regenerationRate,
          node.maxValue - node.value
        );
        node.value += regenAmount;
        totalRegenerated += regenAmount;

        if (regenAmount > 0) {
          this.gameState.emit('resourceNodeRegenerated', {
            nodeId: node.id,
            position: { x: node.x, y: node.y },
            regeneratedAmount: regenAmount,
            currentValue: node.value,
            maxValue: node.maxValue
          });
        }
      }
    });

    return totalRegenerated;
  }

  /**
     * Get resource gathering potential for a position
     */
  getGatheringPotential(x, y, unitType = 'worker') {
    if (unitType !== 'worker') {
      return 0; // Only workers can gather
    }

    const nearbyNodes = this.getResourceNodesInRange(x, y, 1);
    return nearbyNodes.reduce((total, node) => total + node.value, 0);
  }

  /**
     * Get optimal gathering positions around a resource node
     */
  getOptimalGatheringPositions(nodeId) {
    const node = this.resourceNodes.find(n => n.id === nodeId);
    if (!node) return [];

    const positions = [];
    const directions = [
      { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: -1 }, { x: -1, y: 1 },
      { x: 1, y: -1 }, { x: 1, y: 1 }
    ];

    directions.forEach(dir => {
      const x = node.x + dir.x;
      const y = node.y + dir.y;

      if (this.gameState.isValidPosition(x, y) &&
                this.gameState.isPositionEmpty(x, y)) {
        positions.push({
          x: x,
          y: y,
          potential: this.getGatheringPotential(x, y)
        });
      }
    });

    return positions.sort((a, b) => b.potential - a.potential);
  }

  /**
     * Check if unit can gather at current position
     */
  canGatherAtPosition(unitId) {
    const unit = this.gameState.units.get(unitId);
    if (!unit || unit.type !== 'worker') {
      return false;
    }

    const nearbyNodes = this.getResourceNodesInRange(
      unit.position.x,
      unit.position.y,
      1
    );

    return nearbyNodes.some(node => node.value > 0);
  }

  /**
     * Get all resource node information for UI
     */
  getResourceNodeInfo() {
    return this.resourceNodes.map(node => ({
      id: node.id,
      position: { x: node.x, y: node.y },
      value: node.value,
      maxValue: node.maxValue,
      regenerationRate: node.regenerationRate,
      efficiency: node.value / node.maxValue
    }));
  }

  /**
     * Calculate total resources available on map
     */
  getTotalResourcesAvailable() {
    return this.resourceNodes.reduce((total, node) => total + node.value, 0);
  }

  /**
     * Calculate player's resource income potential
     */
  calculatePlayerResourceIncome(playerId) {
    const playerUnits = this.gameState.getPlayerUnits(playerId);
    const workers = playerUnits.filter(unit => unit.type === 'worker');

    let totalIncome = 0;
    workers.forEach(worker => {
      totalIncome += this.getGatheringPotential(
        worker.position.x,
        worker.position.y
      );
    });

    return totalIncome;
  }

  /**
     * Get resource statistics for game state
     */
  getResourceStats() {
    const totalAvailable = this.getTotalResourcesAvailable();
    const maxPossible = this.resourceNodes.reduce((total, node) => total + node.maxValue, 0);

    return {
      totalAvailable: totalAvailable,
      maxPossible: maxPossible,
      efficiency: totalAvailable / maxPossible,
      nodeCount: this.resourceNodes.length,
      averageNodeValue: totalAvailable / this.resourceNodes.length,
      regenerationPerTurn: this.resourceNodes.reduce((total, node) => total + node.regenerationRate, 0)
    };
  }

  /**
     * Clear gathering cooldowns (called at turn start)
     */
  clearGatheringCooldowns() {
    this.gatheringCooldowns.clear();
  }

  /**
     * Serialize resource manager state
     */
  serialize() {
    return {
      resourceNodes: this.resourceNodes.map(node => ({...node})),
      gatheringCooldowns: Object.fromEntries(this.gatheringCooldowns)
    };
  }

  /**
     * Restore resource manager from serialized data
     */
  static deserialize(data, gameState) {
    const manager = new ResourceManager(gameState);
    manager.resourceNodes = data.resourceNodes.map(node => ({...node}));
    manager.gatheringCooldowns = new Map(Object.entries(data.gatheringCooldowns));
    return manager;
  }
}
