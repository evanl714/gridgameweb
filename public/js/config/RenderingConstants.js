/**
 * RenderingConstants - Centralized rendering configuration
 * Eliminates magic numbers scattered throughout rendering code
 */

export const RENDERING_CONSTANTS = {
  // Size multipliers for various elements
  RESOURCE_NODE_RADIUS_FACTOR: 0.3,
  BASE_SIZE_FACTOR: 0.8,
  UNIT_RADIUS_FACTOR: 0.3,
  UNIT_SELECTION_RADIUS_FACTOR: 0.4,

  // Alpha/opacity values
  RESOURCE_NODE_MIN_ALPHA: 0.3,
  RESOURCE_NODE_ALPHA_RANGE: 0.7, // Added to min_alpha for efficiency scaling
  GRID_LINE_ALPHA: 0.8,
  GRID_BORDER_ALPHA: 0.6,

  // Line widths
  SELECTION_BORDER_WIDTH: 3,
  UNIT_STROKE_WIDTH: 2,
  BASE_STROKE_WIDTH: 2,
  MOVEMENT_BORDER_WIDTH: 2,
  MOVEMENT_PREVIEW_BORDER_WIDTH: 3,
  UNIT_SELECTION_BORDER_WIDTH: 3,
  GRID_LINE_WIDTH: 0.5,
  GRID_BORDER_WIDTH: 1,

  // Font configurations
  MOVEMENT_COST_FONT: '12px Arial',
  MOVEMENT_PREVIEW_FONT: '14px Arial',
  RESOURCE_VALUE_FONT: '12px Arial',
  UNIT_FONT: '16px Arial',
  BASE_FONT: '16px Arial',

  // Grid pattern
  GRID_LIGHT_DARK_OFFSET: 1, // Offset for light squares pattern
  GRID_ACCENT_PADDING: 2, // Padding for accent squares (1px on each side)
  GRID_BORDER_INTERVAL: 5, // Enhanced border every N cells

  // Resource node highlight
  RESOURCE_HIGHLIGHT_COLOR: 'rgba(255, 215, 0, 0.3)',
  RESOURCE_NODE_BASE_COLOR: 'rgba(50, 205, 50, {alpha})', // {alpha} will be replaced
  RESOURCE_GATHERABLE_BORDER: '#FFD700',
  RESOURCE_NORMAL_BORDER: '#228B22',

  // Unit colors
  UNIT_TEXT_COLOR: '#FFFFFF',
  BASE_TEXT_COLOR: '#FFFFFF',
  RESOURCE_VALUE_TEXT_COLOR: '#000000',

  // DOM element styling
  DOM_ELEMENT_Z_INDICES: {
    RESOURCE_DISPLAY: 3,
    BASE_DISPLAY: 4,
    UNIT_DISPLAY: 5,
    UNIT_SELECTION_RING: 6,
    MOVEMENT_COST_INDICATOR: 10,
    RESOURCE_VALUE: 11
  },

  // DOM element sizing
  DOM_RESOURCE_ICON_SIZE: '20px',
  DOM_BASE_ICON_SIZE: '20px',
  DOM_UNIT_FONT_SIZE: '16px',
  DOM_SELECTION_RING_SIZE: '24px',
  DOM_COST_INDICATOR_FONT_SIZE: '10px',
  DOM_RESOURCE_VALUE_FONT_SIZE: '8px',

  // DOM styling templates
  DOM_COST_INDICATOR_STYLE: `
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 10px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 1px 3px;
    border-radius: 2px;
    z-index: 10;
  `,

  DOM_RESOURCE_VALUE_STYLE: `
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 1px 2px;
    border-radius: 2px;
    z-index: 11;
  `,

  DOM_CENTERED_ELEMENT_STYLE: `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `
};

/**
 * Helper function to get resource node color with specific alpha
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
export function getResourceNodeColor(alpha) {
  return RENDERING_CONSTANTS.RESOURCE_NODE_BASE_COLOR.replace('{alpha}', alpha);
}

/**
 * Helper function to calculate resource node alpha based on efficiency
 * @param {number} efficiency - Efficiency value (0-1)
 * @returns {number} Alpha value
 */
export function calculateResourceNodeAlpha(efficiency) {
  return RENDERING_CONSTANTS.RESOURCE_NODE_MIN_ALPHA +
         (efficiency * RENDERING_CONSTANTS.RESOURCE_NODE_ALPHA_RANGE);
}
