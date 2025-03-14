/**
 * Main Application Module
 * Coordinates all other modules and initializes the application
 */
import { DEBUG_MODE, ZONE_TYPES } from './constants.js';
import { network } from './network.js';
import { ui } from './ui.js';
import { game } from './game.js';

class Application {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing Atlantis Go world map with debug mode:', DEBUG_MODE);
    
    // Initialize UI first
    console.log('Initializing UI...');
    ui.initialize();
    
    // Set up network event handlers
    console.log('Setting up network handlers...');
    this._setupNetworkHandlers();
    
    // Connect to the server
    console.log('Attempting to connect to server...');
    const connected = await network.connect();
    
    if (!connected) {
      console.error('Failed to connect to server');
      ui.log('Failed to connect to server. Please check if the server is running.', true);
      return false;
    }
    
    console.log('Successfully connected to server');
    
    // Initialize the Phaser game
    console.log('Initializing Phaser game...');
    game.initialize();
    
    this.initialized = true;
    console.log('Application fully initialized');
    return true;
  }

  /**
   * Set up network event handlers
   * @private
   */
  _setupNetworkHandlers() {
    // Connection events
    network.on('onConnect', () => {
      console.log('Network event: onConnect');
      ui.updateConnectionStatus(true);
      ui.log('Connected to server');
    });
    
    network.on('onDisconnect', (code) => {
      console.log('Network event: onDisconnect with code', code);
      ui.updateConnectionStatus(false);
      ui.log('Disconnected from server', true);
    });
    
    network.on('onError', (message) => {
      console.error('Network event: onError', message);
      ui.updateConnectionStatus(false, `Error: ${message}`);
      ui.log(`Error: ${message}`, true);
    });
    
    // World visibility
    network.on('onStateChange', (state) => {
      console.log('Network event: onStateChange', state ? 'State received' : 'Null state');
    });
    
    network.on('onWorldVisible', (message) => {
      console.log('Network event: onWorldVisible', message);
      ui.updatePlayerCount(message.players);
      ui.updatePowerCount(message.powers);
      ui.log(`Visibility radius: ${message.visibilityRadius}m`);
    });
    
    // Zone events
    network.on('onZoneEntered', (message) => {
      console.log('Network event: onZoneEntered', message);
      ui.updateZoneInfo(message.zoneName, message.zoneType);
      ui.log(`Entered zone: ${message.zoneName}`);
    });
    
    network.on('onZoneExited', (message) => {
      console.log('Network event: onZoneExited', message);
      ui.updateZoneInfo(null, null);
      ui.log(`Exited zone: ${message.zoneName || 'unknown'}`);
    });
    
    // Power events
    network.on('onPowerCaptured', (message) => {
      console.log('Network event: onPowerCaptured', message);
      ui.log(`Captured power: ${message.powerName}!`);
    });
  }
}

// Export singleton instance
export const app = new Application();

// Initialize the application when the page loads
window.addEventListener('load', () => {
  console.log('Window loaded, initializing application...');
  app.initialize();
}); 