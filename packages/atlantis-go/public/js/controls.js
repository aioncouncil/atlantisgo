/**
 * Controls Module
 * Handles user input for movement and interaction
 */
import { MOVE_STEP, MIN_OFFSET, MAX_OFFSET } from './constants.js';
import { network } from './network.js';
import { entities } from './entities.js';
import { ui } from './ui.js';

class ControlsManager {
  constructor() {
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.controlButtons = {
      north: null,
      south: null,
      east: null,
      west: null,
      zoomIn: null,
      zoomOut: null
    };
  }

  /**
   * Initialize controls
   */
  initialize() {
    // Direction buttons
    this.controlButtons.north = document.getElementById('btn-north');
    this.controlButtons.south = document.getElementById('btn-south');
    this.controlButtons.east = document.getElementById('btn-east');
    this.controlButtons.west = document.getElementById('btn-west');
    
    // Zoom buttons
    this.controlButtons.zoomIn = document.getElementById('btn-zoom-in');
    this.controlButtons.zoomOut = document.getElementById('btn-zoom-out');
    
    // Set up button listeners
    this._setupButtonListeners();
    
    // Set up map panning
    this._setupPanning();
  }

  /**
   * Set up button listeners
   * @private
   */
  _setupButtonListeners() {
    // Direction buttons
    this.controlButtons.north.addEventListener('click', () => this.movePlayer(0, -MOVE_STEP));
    this.controlButtons.south.addEventListener('click', () => this.movePlayer(0, MOVE_STEP));
    this.controlButtons.east.addEventListener('click', () => this.movePlayer(MOVE_STEP, 0));
    this.controlButtons.west.addEventListener('click', () => this.movePlayer(-MOVE_STEP, 0));
    
    // Zoom buttons
    this.controlButtons.zoomIn.addEventListener('click', () => this.zoom(1.2));
    this.controlButtons.zoomOut.addEventListener('click', () => this.zoom(0.8));
  }

  /**
   * Set up map panning
   * @private
   */
  _setupPanning() {
    const mapContainer = document.getElementById('map-container');
    
    // Mouse events
    mapContainer.addEventListener('mousedown', (e) => {
      // Only start panning if not clicking on a UI element, power, player, etc.
      if (e.target === mapContainer || e.target.id === 'map-container') {
        this.isPanning = true;
        mapContainer.classList.add('panning');
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        e.preventDefault();
      }
    }, { passive: false });
    
    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        
        // Apply bounds to the viewport offset
        const newOffsetX = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, entities.viewportOffsetX + dx));
        const newOffsetY = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, entities.viewportOffsetY + dy));
        
        // Update viewport offset
        entities.setViewportOffset(newOffsetX, newOffsetY);
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        // Update entities with new offset
        entities.updateAllEntities();
        
        // Update mini-map
        ui.updateMiniMap(
          entities.playerPosition.x,
          entities.playerPosition.y,
          entities.viewportOffsetX,
          entities.viewportOffsetY
        );
      }
    }, { passive: false });
    
    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        mapContainer.classList.remove('panning');
      }
    });
    
    // Touch events for mobile
    mapContainer.addEventListener('touchstart', (e) => {
      if (e.target === mapContainer || e.target.id === 'map-container') {
        this.isPanning = true;
        mapContainer.classList.add('panning');
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        e.preventDefault();
      }
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
      if (this.isPanning) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        
        // Apply bounds to the viewport offset
        const newOffsetX = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, entities.viewportOffsetX + dx));
        const newOffsetY = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, entities.viewportOffsetY + dy));
        
        // Update viewport offset
        entities.setViewportOffset(newOffsetX, newOffsetY);
        
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        
        // Update entities with new offset
        entities.updateAllEntities();
        
        // Update mini-map
        ui.updateMiniMap(
          entities.playerPosition.x,
          entities.playerPosition.y,
          entities.viewportOffsetX,
          entities.viewportOffsetY
        );
        
        e.preventDefault();
      }
    }, { passive: false });
    
    window.addEventListener('touchend', () => {
      if (this.isPanning) {
        this.isPanning = false;
        mapContainer.classList.remove('panning');
      }
    });
  }

  /**
   * Move the player
   * @param {number} dx - Change in X
   * @param {number} dy - Change in Y
   */
  movePlayer(dx, dy) {
    const newX = entities.playerPosition.x + dx;
    const newY = entities.playerPosition.y + dy;
    
    // Update player position locally
    entities.updatePlayerPosition(newX, newY);
    
    // Send movement to server
    network.sendMovement(newX, newY);
    
    // Update player entity
    const sessionId = network.getSessionId();
    if (sessionId) {
      entities.updateEntity('player', sessionId, newX, newY, { isCurrentPlayer: true });
    }
    
    // Update mini-map
    ui.updateMiniMap(
      entities.playerPosition.x,
      entities.playerPosition.y,
      entities.viewportOffsetX,
      entities.viewportOffsetY
    );
  }

  /**
   * Zoom the map
   * @param {number} factor - Zoom factor
   */
  zoom(factor) {
    // Simpler approach: just move the player a bit
    if (factor > 1) {
      // Zoom in - move north
      this.movePlayer(0, -MOVE_STEP * 5);
    } else {
      // Zoom out - move south
      this.movePlayer(0, MOVE_STEP * 5);
    }
  }
}

// Export singleton instance
export const controls = new ControlsManager(); 