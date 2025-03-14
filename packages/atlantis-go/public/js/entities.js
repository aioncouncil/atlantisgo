/**
 * Entity Manager Module
 * Handles the creation, updating, and removal of entities on the map
 */
import { ZONE_TYPES, ZONE_NAMES, DEBUG_MODE } from './constants.js';
import { ui } from './ui.js';

class EntityManager {
  constructor() {
    this.entities = {};
    this.playerPosition = { x: 0, y: 0 };
    this.viewportOffsetX = 0;
    this.viewportOffsetY = 0;
    this.scale = 5; // Fixed scaling factor that works (multiplied by world coordinates)
    
    // Calculate map center
    this.mapCenterX = window.innerWidth / 2;
    this.mapCenterY = window.innerHeight / 2;
  }

  /**
   * Update the player position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updatePlayerPosition(x, y) {
    this.playerPosition.x = x;
    this.playerPosition.y = y;
  }

  /**
   * Update the viewport offset
   * @param {number} dx - Change in X
   * @param {number} dy - Change in Y
   */
  updateViewportOffset(dx, dy) {
    this.viewportOffsetX += dx;
    this.viewportOffsetY += dy;
  }

  /**
   * Set the viewport offset
   * @param {number} x - X offset
   * @param {number} y - Y offset
   */
  setViewportOffset(x, y) {
    this.viewportOffsetX = x;
    this.viewportOffsetY = y;
  }

  /**
   * Get current viewport offset
   * @returns {Object} - Viewport offset {x, y}
   */
  getViewportOffset() {
    return {
      x: this.viewportOffsetX,
      y: this.viewportOffsetY
    };
  }

  /**
   * Update an entity on the map
   * @param {string} type - Entity type ('player', 'power', 'zone')
   * @param {string} id - Entity ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} data - Additional entity data
   */
  updateEntity(type, id, x, y, data = {}) {
    const entityId = `${type}-${id}`;
    let element = this.entities[entityId];
    
    // Create element if it doesn't exist
    if (!element) {
      element = document.createElement('div');
      element.id = entityId;
      element.className = `entity ${type}`;
      
      // Set up type-specific properties
      if (type === 'player' && data.isCurrentPlayer) {
        element.classList.add('my-player');
      }
      
      // Set up power-specific properties
      if (type === 'power') {
        this._setupPowerElement(element, id, data);
      }
      
      // Set up zone-specific properties
      if (type === 'zone') {
        this._setupZoneElement(element, id, data);
      }
      
      document.getElementById('map-container').appendChild(element);
      this.entities[entityId] = element;
    }
    
    // Position the element with current scale and viewport offset
    const screenX = this.mapCenterX + (x * this.scale) + this.viewportOffsetX;
    const screenY = this.mapCenterY + (y * this.scale) + this.viewportOffsetY;
    
    element.style.left = `${screenX}px`;
    element.style.top = `${screenY}px`;
    
    // Update power-specific properties
    if (type === 'power') {
      this._updatePowerElement(element, data);
    }
    
    // Update zone-specific properties (radius)
    if (type === 'zone' && data.radius) {
      this._updateZoneElement(element, data);
    }
  }

  /**
   * Update a zone entity
   * @param {string} id - Zone ID
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} radius - Zone radius
   * @param {string} type - Zone type
   */
  updateZone(id, x, y, radius, type = 'default') {
    const data = {
      radius,
      zoneType: type,
      zoneName: ZONE_NAMES[id] || id
    };
    
    this.updateEntity('zone', id, x, y, data);
  }

  /**
   * Remove an entity from the map
   * @param {string} type - Entity type
   * @param {string} id - Entity ID
   */
  removeEntity(type, id) {
    const entityId = `${type}-${id}`;
    const element = this.entities[entityId];
    
    if (element) {
      element.remove();
      delete this.entities[entityId];
    }
  }

  /**
   * Update all entities based on current viewport offset
   */
  updateAllEntities() {
    for (const entityId in this.entities) {
      const element = this.entities[entityId];
      const [type, id] = entityId.split('-');
      
      // Skip if there's no position data stored in the element
      if (!element.dataset.x || !element.dataset.y) continue;
      
      const x = parseFloat(element.dataset.x);
      const y = parseFloat(element.dataset.y);
      
      // Position the element with current scale and viewport offset
      const screenX = this.mapCenterX + (x * this.scale) + this.viewportOffsetX;
      const screenY = this.mapCenterY + (y * this.scale) + this.viewportOffsetY;
      
      element.style.left = `${screenX}px`;
      element.style.top = `${screenY}px`;
    }
  }

  /**
   * Create test entities for debugging
   */
  createTestEntities() {
    // Create test zone
    this.updateZone('test_zone', 0, 0, 50, 'hub');
    
    // Create test powers
    const powerTypes = ['Wisdom', 'Courage', 'Temperance', 'Justice'];
    const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      
      this.updateEntity('power', `test_power_${i}`, x, y, { type, rarity });
    }
  }

  /**
   * Set up a power element
   * @private
   * @param {HTMLElement} element - Power element
   * @param {string} id - Power ID
   * @param {Object} data - Power data
   */
  _setupPowerElement(element, id, data) {
    // Add power type and rarity classes
    if (data.type) {
      element.classList.add(`power-${data.type}`);
    }
    
    if (data.rarity) {
      element.classList.add(`power-${data.rarity}`);
    }
    
    // Add data attributes for position tracking
    element.dataset.type = data.type || 'Unknown';
    element.dataset.rarity = data.rarity || 'Common';
    
    // Add click handler for power interaction
    element.addEventListener('click', () => {
      ui.showPowerDetails({
        id: id,
        name: `${data.type || 'Unknown'} Power`,
        type: data.type || 'Unknown',
        rarity: data.rarity || 'Common',
        description: `A ${data.rarity || 'common'} power of ${data.type || 'unknown'} virtue.`
      });
    });
  }

  /**
   * Update a power element
   * @private
   * @param {HTMLElement} element - Power element
   * @param {Object} data - Power data
   */
  _updatePowerElement(element, data) {
    // Update classes
    if (data.type) {
      element.classList.remove('power-Wisdom', 'power-Courage', 'power-Temperance', 'power-Justice');
      element.classList.add(`power-${data.type}`);
    }
    
    if (data.rarity) {
      element.classList.remove('power-Common', 'power-Uncommon', 'power-Rare', 'power-Epic', 'power-Legendary');
      element.classList.add(`power-${data.rarity}`);
    }
    
    // Update data attributes
    if (data.type) element.dataset.type = data.type;
    if (data.rarity) element.dataset.rarity = data.rarity;
  }

  /**
   * Set up a zone element
   * @private
   * @param {HTMLElement} element - Zone element
   * @param {string} id - Zone ID
   * @param {Object} data - Zone data
   */
  _setupZoneElement(element, id, data) {
    element.classList.add(`zone-${data.zoneType || 'default'}`);
    
    // Add label
    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = data.zoneName || id;
    element.appendChild(label);
  }

  /**
   * Update a zone element
   * @private
   * @param {HTMLElement} element - Zone element
   * @param {Object} data - Zone data
   */
  _updateZoneElement(element, data) {
    const screenRadius = data.radius * 10; // Make zones larger for visibility
    
    element.style.width = `${screenRadius * 2}px`;
    element.style.height = `${screenRadius * 2}px`;
    
    // Update zone type class
    if (data.zoneType) {
      element.className = `entity zone zone-${data.zoneType}`;
    }
    
    // Update zone label
    if (data.zoneName) {
      const label = element.querySelector('.zone-label');
      if (label) {
        label.textContent = data.zoneName;
      }
    }
  }
}

// Export singleton instance
export const entities = new EntityManager(); 