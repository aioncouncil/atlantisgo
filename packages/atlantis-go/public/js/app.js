/**
 * Main Application Module
 * Coordinates all other modules and initializes the application
 */
import { DEBUG_MODE, ZONE_TYPES } from './constants.js';
import { network } from './network.js';
import { ui } from './ui.js';
import { game } from './game.js';
import { PowerCollection } from '../components/PowerCollection.js';
import { MasterControlPanel } from '../components/MasterControlPanel.js';

class Application {
  constructor() {
    this.initialized = false;
    this.powerCollection = null;
    this.masterControlPanel = null;
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

    // Initialize PowerCollection component
    console.log('Initializing Power Collection...');
    this._setupPowerCollection();
    
    // Initialize Master Control Panel for development
    if (DEBUG_MODE) {
      console.log('Initializing Master Control Panel...');
      this._setupMasterControlPanel();
    }
    
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
      
      // Update MCP server status if available
      if (this.masterControlPanel) {
        this.masterControlPanel.updateServerStatus('Connected');
      }
    });
    
    network.on('onDisconnect', (code) => {
      console.log('Network event: onDisconnect with code', code);
      ui.updateConnectionStatus(false);
      ui.log('Disconnected from server', true);
      
      // Update MCP server status if available
      if (this.masterControlPanel) {
        this.masterControlPanel.updateServerStatus('Disconnected');
      }
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
      
      // Update power collection if initialized
      if (this.powerCollection) {
        this.powerCollection.updatePowers();
      }
    });
    
    network.on('onPowerDetails', (message) => {
      console.log('Network event: onPowerDetails', message);
      ui.showPowerDetails(message.power);
    });
  }

  /**
   * Initialize and set up the PowerCollection component
   * @private
   */
  _setupPowerCollection() {
    // Create power collection component
    const container = document.body;
    this.powerCollection = new PowerCollection(container, network.room);
    
    // Ensure it's completely hidden initially
    this.powerCollection.hide();
    
    // Set up the power collection button
    const powerCollectionButton = document.getElementById('btn-power-collection');
    if (powerCollectionButton) {
      powerCollectionButton.addEventListener('click', () => {
        if (this.powerCollection) {
          if (this.powerCollection.visible) {
            this.powerCollection.hide();
          } else {
            this.powerCollection.show();
          }
        }
      });
    }
  }
  
  /**
   * Initialize and set up the MasterControlPanel component
   * @private
   */
  _setupMasterControlPanel() {
    // Load CSS for MCP
    this._loadMcpStyles();
    
    // Create master control panel component
    const container = document.body;
    this.masterControlPanel = new MasterControlPanel(container, {
      defaultTab: 'console',
      captureConsole: true,
      showPerformance: true,
      position: { top: '20px', right: '20px' }
    });
    
    // Inform user about the shortcut
    ui.log('Developer tools available (Ctrl+M to toggle)', false);
    
    // Update server status
    if (network && network.room) {
      this.masterControlPanel.updateServerStatus('Connected');
    } else {
      this.masterControlPanel.updateServerStatus('Disconnected');
    }
  }
  
  /**
   * Load CSS for Master Control Panel
   * @private
   */
  _loadMcpStyles() {
    // Load Apple design system styles first
    const appleStyleLink = document.createElement('link');
    appleStyleLink.rel = 'stylesheet';
    appleStyleLink.type = 'text/css';
    appleStyleLink.href = './css/apple-style.css';
    document.head.appendChild(appleStyleLink);
    
    // Then load MCP specific styles
    const mcpStyleLink = document.createElement('link');
    mcpStyleLink.rel = 'stylesheet';
    mcpStyleLink.type = 'text/css';
    mcpStyleLink.href = './components/MasterControlPanel.css';
    document.head.appendChild(mcpStyleLink);
  }
}

// Export singleton instance
export const app = new Application();

// Initialize the application when the page loads
window.addEventListener('load', () => {
  console.log('Window loaded, initializing application...');
  app.initialize();
}); 