/**
 * Unit tests for Resource Management System
 */

import { ResourceManager } from '../public/resourceManager.js';
import { GameState } from '../public/gameState.js';

describe('ResourceManager', () => {
  let gameState;
  let resourceManager;

  beforeEach(() => {
    gameState = new GameState();
    resourceManager = new ResourceManager(gameState);
    
    // Mock Date.now for cooldown testing
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with correct resource nodes', () => {
    expect(resourceManager.resourceNodes).toHaveLength(9);
    
    // Check specific nodes
    const centerNode = resourceManager.getResourceNodeAt(12, 12);
    expect(centerNode).toBeTruthy();
    expect(centerNode.value).toBe(100);
    expect(centerNode.maxValue).toBe(100);
    expect(centerNode.regenerationRate).toBe(5);
    
    const cornerNode = resourceManager.getResourceNodeAt(4, 4);
    expect(cornerNode).toBeTruthy();
    expect(cornerNode.value).toBe(100);
  });

  test('should find resource nodes in range correctly', () => {
    const nodesInRange = resourceManager.getResourceNodesInRange(12, 12, 2);
    expect(nodesInRange.length).toBeGreaterThan(0);
    
    // Should include the center node
    expect(nodesInRange.some(node => node.x === 12 && node.y === 12)).toBe(true);
    
    const nodesOutOfRange = resourceManager.getResourceNodesInRange(0, 0, 1);
    expect(nodesOutOfRange).toHaveLength(0);
  });

  test('should successfully gather resources with worker', () => {
    // Create a worker adjacent to a resource node
    const worker = gameState.createUnit('worker', 1, 11, 12); // Next to center node
    const player = gameState.getCurrentPlayer();
    const initialEnergy = player.energy;
    
    const result = resourceManager.gatherResources(worker.id);
    
    expect(result.success).toBe(true);
    expect(result.amount).toBe(5); // Base gather amount
    expect(player.energy).toBe(initialEnergy + 5);
    expect(player.resourcesGathered).toBe(5);
    expect(worker.actionsUsed).toBe(1);
  });

  test('should not gather resources with non-worker units', () => {
    const scout = gameState.createUnit('scout', 1, 11, 12);
    
    const result = resourceManager.gatherResources(scout.id);
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Unit cannot gather');
  });

  test('should not gather when no resource nodes in range', () => {
    const worker = gameState.createUnit('worker', 1, 0, 0); // Far from any nodes
    
    const result = resourceManager.gatherResources(worker.id);
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('No resource nodes in range');
  });

  test('should not gather when unit has no actions left', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    worker.actionsUsed = worker.maxActions; // Use all actions
    
    const result = resourceManager.gatherResources(worker.id);
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Unit cannot gather');
  });

  test('should only allow gathering during Resource phase', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    
    // Test gathering during resource phase (should work)
    gameState.currentPhase = 'resource';
    const result1 = resourceManager.gatherResources(worker.id);
    expect(result1.success).toBe(true);
    
    // Reset worker actions for next test
    worker.resetActions();
    
    // Test gathering during action phase (should fail)
    gameState.currentPhase = 'action';
    const result2 = resourceManager.gatherResources(worker.id);
    expect(result2.success).toBe(false);
    expect(result2.reason).toBe('Can only gather during Resource phase. Current phase: action');
    
    // Test gathering during build phase (should fail)
    gameState.currentPhase = 'build';
    const result3 = resourceManager.gatherResources(worker.id);
    expect(result3.success).toBe(false);
    expect(result3.reason).toBe('Can only gather during Resource phase. Current phase: build');
  });

  test('should enforce gathering cooldown', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    
    // First gather should succeed
    const result1 = resourceManager.gatherResources(worker.id);
    expect(result1.success).toBe(true);
    
    // Reset unit actions for second attempt
    worker.resetActions();
    
    // Second gather should fail due to cooldown
    const result2 = resourceManager.gatherResources(worker.id);
    expect(result2.success).toBe(false);
    expect(result2.reason).toBe('Unit is on gathering cooldown');
    expect(result2.cooldownRemaining).toBeGreaterThan(0);
    
    // Advance time past cooldown
    Date.now.mockReturnValue(1004000); // 4 seconds later
    worker.resetActions();
    
    const result3 = resourceManager.gatherResources(worker.id);
    expect(result3.success).toBe(true);
  });

  test('should reduce resource node value when gathered', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    const centerNode = resourceManager.getResourceNodeAt(12, 12);
    const initialValue = centerNode.value;
    
    const result = resourceManager.gatherResources(worker.id);
    
    expect(result.success).toBe(true);
    expect(centerNode.value).toBe(initialValue - 5);
  });

  test('should not gather from depleted resource nodes', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    const centerNode = resourceManager.getResourceNodeAt(12, 12);
    centerNode.value = 0; // Deplete the node
    
    const result = resourceManager.gatherResources(worker.id);
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('No resources available at nearby nodes');
  });

  test('should regenerate resources correctly', () => {
    // Partially deplete some nodes
    const node1 = resourceManager.resourceNodes[0];
    const node2 = resourceManager.resourceNodes[4]; // Center node
    
    node1.value = 95; // Was 100, should regen 5
    node2.value = 95; // Was 100, should regen 5
    
    const totalRegenerated = resourceManager.regenerateResources();
    
    expect(totalRegenerated).toBe(10); // 5 + 5
    expect(node1.value).toBe(100);
    expect(node2.value).toBe(100);
  });

  test('should not regenerate beyond max value', () => {
    const node = resourceManager.resourceNodes[0];
    node.value = 98; // 2 below max of 100, regen rate is 5
    
    resourceManager.regenerateResources();
    
    expect(node.value).toBe(100); // Should cap at max, not go to 103
  });

  test('should calculate gathering potential correctly', () => {
    // Position adjacent to center node (value 100)
    const potential1 = resourceManager.getGatheringPotential(11, 12, 'worker');
    expect(potential1).toBe(100);
    
    // Position not near any nodes
    const potential2 = resourceManager.getGatheringPotential(0, 0, 'worker');
    expect(potential2).toBe(0);
    
    // Non-worker unit
    const potential3 = resourceManager.getGatheringPotential(11, 12, 'scout');
    expect(potential3).toBe(0);
  });

  test('should find optimal gathering positions', () => {
    const centerNode = resourceManager.resourceNodes.find(n => n.x === 12 && n.y === 12);
    const positions = resourceManager.getOptimalGatheringPositions(centerNode.id);
    
    expect(positions.length).toBeGreaterThan(0);
    expect(positions[0].potential).toBeGreaterThan(0);
    
    // Should be sorted by potential (highest first)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].potential).toBeLessThanOrEqual(positions[i - 1].potential);
    }
  });

  test('should check if unit can gather at position', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    const scout = gameState.createUnit('scout', 1, 0, 0);
    
    expect(resourceManager.canGatherAtPosition(worker.id)).toBe(true);
    expect(resourceManager.canGatherAtPosition(scout.id)).toBe(false);
  });

  test('should get resource node info for UI', () => {
    const nodeInfo = resourceManager.getResourceNodeInfo();
    
    expect(nodeInfo).toHaveLength(9);
    expect(nodeInfo[0]).toHaveProperty('id');
    expect(nodeInfo[0]).toHaveProperty('position');
    expect(nodeInfo[0]).toHaveProperty('value');
    expect(nodeInfo[0]).toHaveProperty('maxValue');
    expect(nodeInfo[0]).toHaveProperty('efficiency');
    
    expect(nodeInfo[0].efficiency).toBe(1); // Full resources = 100% efficiency
  });

  test('should calculate total resources available', () => {
    const total = resourceManager.getTotalResourcesAvailable();
    const expectedTotal = 100 * 9; // 9 nodes with 100 resources each
    expect(total).toBe(expectedTotal);
  });

  test('should calculate player resource income potential', () => {
    // Create workers at different positions
    gameState.createUnit('worker', 1, 11, 12); // Near center node
    gameState.createUnit('worker', 1, 4, 5); // Near corner node
    gameState.createUnit('scout', 1, 10, 10); // Scout doesn't count
    
    const income = resourceManager.calculatePlayerResourceIncome(1);
    expect(income).toBeGreaterThan(0);
    expect(income).toBe(100 + 100); // Center node + corner node values
  });

  test('should get resource statistics', () => {
    const stats = resourceManager.getResourceStats();
    
    expect(stats).toHaveProperty('totalAvailable');
    expect(stats).toHaveProperty('maxPossible');
    expect(stats).toHaveProperty('efficiency');
    expect(stats).toHaveProperty('nodeCount');
    expect(stats).toHaveProperty('averageNodeValue');
    expect(stats).toHaveProperty('regenerationPerTurn');
    
    expect(stats.nodeCount).toBe(9);
    expect(stats.efficiency).toBe(1); // Initially all nodes are full
  });

  test('should clear gathering cooldowns', () => {
    const worker = gameState.createUnit('worker', 1, 11, 12);
    
    // Trigger cooldown
    resourceManager.gatherResources(worker.id);
    expect(resourceManager.gatheringCooldowns.has(worker.id)).toBe(true);
    
    // Clear cooldowns
    resourceManager.clearGatheringCooldowns();
    expect(resourceManager.gatheringCooldowns.size).toBe(0);
  });

  test('should serialize and deserialize correctly', () => {
    // Modify some resource values
    resourceManager.resourceNodes[0].value = 10;
    const worker = gameState.createUnit('worker', 1, 11, 12);
    resourceManager.gatherResources(worker.id); // Add cooldown
    
    const serialized = resourceManager.serialize();
    const deserialized = ResourceManager.deserialize(serialized, gameState);
    
    expect(deserialized.resourceNodes[0].value).toBe(10);
    expect(deserialized.gatheringCooldowns.size).toBe(1);
    expect(deserialized.gatheringCooldowns.has(worker.id)).toBe(true);
  });

  test('should emit events when gathering and regenerating', () => {
    const gatherCallback = jest.fn();
    const regenCallback = jest.fn();
    
    gameState.on('resourcesGathered', gatherCallback);
    gameState.on('resourceNodeRegenerated', regenCallback);
    
    // Test gathering event
    const worker = gameState.createUnit('worker', 1, 11, 12);
    resourceManager.gatherResources(worker.id);
    
    expect(gatherCallback).toHaveBeenCalledWith(expect.objectContaining({
      unitId: worker.id,
      playerId: 1,
      amount: 5
    }));
    
    // Test regeneration event
    const node = resourceManager.resourceNodes[0];
    node.value = 95; // Partially deplete
    resourceManager.regenerateResources();
    
    expect(regenCallback).toHaveBeenCalledWith(expect.objectContaining({
      nodeId: node.id,
      regeneratedAmount: 5
    }));
  });
});