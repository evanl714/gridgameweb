/**
 * DirtyRegionTracker - Optimizes rendering by tracking changed regions
 * Reduces unnecessary redraws by only updating modified areas
 */
export class DirtyRegionTracker {
  constructor(gridSize = 25, cellSize = 32) {
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.dirtyRegions = new Set();
    this.previousState = new Map();
    this.frameState = new Map();
    this.coalescingThreshold = 4; // Regions closer than this get merged
    this.maxDirtyRegions = 50; // Prevent memory issues
    
    // Performance tracking
    this.statistics = {
      totalFrames: 0,
      dirtyFrames: 0,
      regionsTracked: 0,
      coalescedRegions: 0,
      fullRepaints: 0
    };
  }

  /**
   * Mark a cell as dirty for the next render
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {string} reason - Reason for marking dirty (for debugging)
   */
  markCellDirty(x, y, reason = 'unknown') {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      return; // Out of bounds
    }

    const region = {
      x,
      y,
      width: 1,
      height: 1,
      reason,
      timestamp: Date.now()
    };

    this.addDirtyRegion(region);
  }

  /**
   * Mark a rectangular area as dirty
   * @param {number} x - Start X coordinate
   * @param {number} y - Start Y coordinate
   * @param {number} width - Width in cells
   * @param {number} height - Height in cells
   * @param {string} reason - Reason for marking dirty
   */
  markAreaDirty(x, y, width, height, reason = 'unknown') {
    const region = {
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.min(width, this.gridSize - x),
      height: Math.min(height, this.gridSize - y),
      reason,
      timestamp: Date.now()
    };

    if (region.width <= 0 || region.height <= 0) {
      return;
    }

    this.addDirtyRegion(region);
  }

  /**
   * Add a dirty region, potentially coalescing with existing regions
   */
  addDirtyRegion(newRegion) {
    // Check if we should coalesce with existing regions
    const coalescedRegion = this.tryCoalesceRegion(newRegion);
    
    if (coalescedRegion) {
      // Remove the regions that were coalesced
      this.dirtyRegions.delete(coalescedRegion.originalRegion);
      this.dirtyRegions.add(coalescedRegion);
      this.statistics.coalescedRegions++;
    } else {
      this.dirtyRegions.add(newRegion);
    }

    this.statistics.regionsTracked++;

    // Prevent memory issues by triggering full repaint if too many regions
    if (this.dirtyRegions.size > this.maxDirtyRegions) {
      this.markFullRepaint('too-many-regions');
    }
  }

  /**
   * Try to coalesce a new region with existing dirty regions
   */
  tryCoalesceRegion(newRegion) {
    for (const existingRegion of this.dirtyRegions) {
      if (this.shouldCoalesceRegions(newRegion, existingRegion)) {
        return {
          x: Math.min(newRegion.x, existingRegion.x),
          y: Math.min(newRegion.y, existingRegion.y),
          width: Math.max(
            newRegion.x + newRegion.width,
            existingRegion.x + existingRegion.width
          ) - Math.min(newRegion.x, existingRegion.x),
          height: Math.max(
            newRegion.y + newRegion.height,
            existingRegion.y + existingRegion.height
          ) - Math.min(newRegion.y, existingRegion.y),
          reason: `coalesced: ${newRegion.reason} + ${existingRegion.reason}`,
          timestamp: Date.now(),
          originalRegion: existingRegion
        };
      }
    }
    return null;
  }

  /**
   * Determine if two regions should be coalesced
   */
  shouldCoalesceRegions(region1, region2) {
    // Calculate distance between region centers
    const center1 = {
      x: region1.x + region1.width / 2,
      y: region1.y + region1.height / 2
    };
    const center2 = {
      x: region2.x + region2.width / 2,
      y: region2.y + region2.height / 2
    };

    const distance = Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + 
      Math.pow(center1.y - center2.y, 2)
    );

    return distance <= this.coalescingThreshold;
  }

  /**
   * Mark the entire grid for full repaint
   */
  markFullRepaint(reason = 'full-repaint') {
    this.dirtyRegions.clear();
    this.dirtyRegions.add({
      x: 0,
      y: 0,
      width: this.gridSize,
      height: this.gridSize,
      reason,
      timestamp: Date.now()
    });
    this.statistics.fullRepaints++;
  }

  /**
   * Track state changes for automatic dirty detection
   */
  updateCellState(x, y, newState) {
    const key = `${x},${y}`;
    const previousState = this.previousState.get(key);
    
    // Store current state for next frame comparison
    this.frameState.set(key, { ...newState, timestamp: Date.now() });

    // Check if state changed
    if (!previousState || !this.statesEqual(previousState, newState)) {
      this.markCellDirty(x, y, 'state-change');
      return true;
    }

    return false;
  }

  /**
   * Compare two cell states for equality
   */
  statesEqual(state1, state2) {
    // Simple deep comparison for common state properties
    const props = ['unit', 'base', 'resource', 'selected', 'hovered', 'highlighted'];
    
    for (const prop of props) {
      if (state1[prop] !== state2[prop]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all dirty regions for the current frame
   */
  getDirtyRegions() {
    return Array.from(this.dirtyRegions);
  }

  /**
   * Check if any regions are dirty
   */
  hasDirtyRegions() {
    return this.dirtyRegions.size > 0;
  }

  /**
   * Check if a specific cell is dirty
   */
  isCellDirty(x, y) {
    for (const region of this.dirtyRegions) {
      if (x >= region.x && 
          x < region.x + region.width &&
          y >= region.y && 
          y < region.y + region.height) {
        return true;
      }
    }
    return false;
  }

  /**
   * Complete the current frame and prepare for the next
   */
  commitFrame() {
    this.statistics.totalFrames++;
    
    if (this.dirtyRegions.size > 0) {
      this.statistics.dirtyFrames++;
    }

    // Move current frame state to previous state
    this.previousState = new Map(this.frameState);
    this.frameState.clear();
    
    // Clear dirty regions for next frame
    this.dirtyRegions.clear();
    
    // Prevent memory leaks by limiting state history
    if (this.previousState.size > 1000) {
      // Keep only the most recent 500 states
      const entries = Array.from(this.previousState.entries()).slice(-500);
      this.previousState = new Map(entries);
    }
  }

  /**
   * Get dirty regions converted to pixel coordinates
   */
  getDirtyPixelRegions() {
    return this.getDirtyRegions().map(region => ({
      x: region.x * this.cellSize,
      y: region.y * this.cellSize,
      width: region.width * this.cellSize,
      height: region.height * this.cellSize,
      reason: region.reason,
      timestamp: region.timestamp
    }));
  }

  /**
   * Optimize regions by merging overlapping ones
   */
  optimizeRegions() {
    const regions = Array.from(this.dirtyRegions);
    const optimized = [];

    for (let i = 0; i < regions.length; i++) {
      let currentRegion = regions[i];
      
      // Try to merge with subsequent regions
      for (let j = i + 1; j < regions.length; j++) {
        const otherRegion = regions[j];
        
        if (this.regionsOverlap(currentRegion, otherRegion) || 
            this.shouldCoalesceRegions(currentRegion, otherRegion)) {
          
          // Merge regions
          currentRegion = {
            x: Math.min(currentRegion.x, otherRegion.x),
            y: Math.min(currentRegion.y, otherRegion.y),
            width: Math.max(
              currentRegion.x + currentRegion.width,
              otherRegion.x + otherRegion.width
            ) - Math.min(currentRegion.x, otherRegion.x),
            height: Math.max(
              currentRegion.y + currentRegion.height,
              otherRegion.y + otherRegion.height
            ) - Math.min(currentRegion.y, otherRegion.y),
            reason: `merged: ${currentRegion.reason} + ${otherRegion.reason}`,
            timestamp: Date.now()
          };
          
          // Remove merged region
          regions.splice(j, 1);
          j--;
        }
      }
      
      optimized.push(currentRegion);
    }

    // Replace dirty regions with optimized ones
    this.dirtyRegions = new Set(optimized);
    return optimized;
  }

  /**
   * Check if two regions overlap
   */
  regionsOverlap(region1, region2) {
    return !(region1.x + region1.width <= region2.x ||
            region2.x + region2.width <= region1.x ||
            region1.y + region1.height <= region2.y ||
            region2.y + region2.height <= region1.y);
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    const dirtyRatio = this.statistics.totalFrames > 0 
      ? (this.statistics.dirtyFrames / this.statistics.totalFrames) * 100 
      : 0;

    return {
      ...this.statistics,
      currentDirtyRegions: this.dirtyRegions.size,
      dirtyFrameRatio: dirtyRatio,
      averageRegionsPerFrame: this.statistics.totalFrames > 0
        ? this.statistics.regionsTracked / this.statistics.totalFrames
        : 0
    };
  }

  /**
   * Reset all statistics
   */
  resetStatistics() {
    this.statistics = {
      totalFrames: 0,
      dirtyFrames: 0,
      regionsTracked: 0,
      coalescedRegions: 0,
      fullRepaints: 0
    };
  }

  /**
   * Debug method to visualize dirty regions
   */
  debugVisualize(ctx) {
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;

    for (const region of this.dirtyRegions) {
      const pixelRegion = {
        x: region.x * this.cellSize,
        y: region.y * this.cellSize,
        width: region.width * this.cellSize,
        height: region.height * this.cellSize
      };

      ctx.strokeRect(
        pixelRegion.x, 
        pixelRegion.y, 
        pixelRegion.width, 
        pixelRegion.height
      );
    }

    ctx.restore();
  }
}