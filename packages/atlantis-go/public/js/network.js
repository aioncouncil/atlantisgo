/**
 * Network Module
 * Handles all communication with the Colyseus server
 */
import { DEBUG_MODE } from './constants.js';

class NetworkManager {
  constructor() {
    this.client = null;
    this.room = null;
    this.connected = false;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onError: null,
      onStateChange: null,
      onWorldVisible: null,
      onZoneEntered: null,
      onZoneExited: null,
      onPowerDetails: null,
      onPowerCaptured: null
    };
  }

  /**
   * Connect to the Colyseus server
   * @param {Object} initialPosition - Initial position {x, y}
   * @returns {Promise<boolean>} - Connection success
   */
  async connect(initialPosition = { x: 0, y: 0 }) {
    try {
      // Create Colyseus client
      this.client = new Colyseus.Client('ws://localhost:3000');
      
      // Join the world room
      this.room = await this.client.joinOrCreate('world', {
        username: `Player_${Math.floor(Math.random() * 1000)}`,
        position: initialPosition
      });
      
      this.connected = true;
      this._setupListeners();
      
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
      
      if (DEBUG_MODE) {
        console.log('Connected to Colyseus server');
      }
      
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error.message);
      }
      
      return false;
    }
  }

  /**
   * Set up event listeners for the room
   * @private
   */
  _setupListeners() {
    if (!this.room) return;

    // Listen for state changes
    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });
    
    // Handle world visibility updates
    this.room.onMessage('world:visible', (message) => {
      if (this.callbacks.onWorldVisible) {
        this.callbacks.onWorldVisible(message);
      }
    });
    
    // Handle zone entry
    this.room.onMessage('zone:entered', (message) => {
      if (this.callbacks.onZoneEntered) {
        this.callbacks.onZoneEntered(message);
      }
    });
    
    // Handle zone exit
    this.room.onMessage('zone:exited', (message) => {
      if (this.callbacks.onZoneExited) {
        this.callbacks.onZoneExited(message);
      }
    });
    
    // Handle power details
    this.room.onMessage('power:details', (message) => {
      if (this.callbacks.onPowerDetails) {
        this.callbacks.onPowerDetails(message);
      }
    });
    
    // Handle power captured
    this.room.onMessage('power:captured', (message) => {
      if (this.callbacks.onPowerCaptured) {
        this.callbacks.onPowerCaptured(message);
      }
    });
    
    // Handle room errors
    this.room.onError((code, message) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(message);
      }
    });
    
    // Handle disconnection
    this.room.onLeave((code) => {
      this.connected = false;
      
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect(code);
      }
    });
  }

  /**
   * Send a movement command to the server
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  sendMovement(x, y) {
    if (!this.room || !this.connected) return;
    
    this.room.send('move', {
      x: x,
      y: y,
      state: 'moving'
    });
  }

  /**
   * Send player movement to the server (Phaser-compatible)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  sendPlayerMovement(x, y) {
    this.sendMovement(x, y);
    
    if (DEBUG_MODE) {
      console.log(`Player moved to (${x}, ${y})`);
    }
  }

  /**
   * Request power details from the server
   * @param {string} powerId - ID of the power to get details for
   */
  requestPowerDetails(powerId) {
    if (!this.room || !this.connected) return;
    
    this.room.send('power:details', { powerId });
    
    if (DEBUG_MODE) {
      console.log(`Requested details for power ${powerId}`);
    }
  }

  /**
   * Interact with a power
   * @param {string} powerId - ID of the power to interact with
   */
  interactWithPower(powerId) {
    if (!this.room || !this.connected) return;
    
    this.room.send('power:interact', { powerId });
  }

  /**
   * Capture a power
   * @param {string} powerId - ID of the power to capture
   * @param {Object} challengeResponse - Response to the capture challenge
   */
  capturePower(powerId, challengeResponse) {
    if (!this.room || !this.connected) return;
    
    this.room.send('power:capture', {
      powerId,
      challengeResponse
    });
  }

  /**
   * Register a callback function
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    } else {
      console.warn(`Unknown event: ${event}`);
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.room) {
      this.room.leave();
    }
    
    this.connected = false;
    this.room = null;
  }

  /**
   * Get the current player's session ID
   * @returns {string|null} - Session ID
   */
  getSessionId() {
    return this.room ? this.room.sessionId : null;
  }
}

// Export singleton instance
export const network = new NetworkManager(); 