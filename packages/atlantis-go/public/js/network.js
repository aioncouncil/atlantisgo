/**
 * Network Module
 * Handles all communication with the Colyseus server
 * Optimized version with better connection handling and performance
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
    
    // Connection management
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.autoReconnect = true;
    this.reconnectTimerId = null;
    
    // Message batching and throttling
    this.messageQueue = [];
    this.processingQueue = false;
    this.lastMessageTime = 0;
    this.minMessageInterval = 50; // ms between messages
    this.messageProcessTimerId = null;
    
    // Network statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesReceived: 0,
      bytesSent: 0,
      lastLatency: 0,
      averageLatency: 0,
      latencyMeasurements: 0
    };
    
    // Start the message queue processor
    this._startMessageProcessor();
  }

  /**
   * Connect to the Colyseus server
   * @param {Object} initialPosition - Initial position {x, y}
   * @returns {Promise<boolean>} - Connection success
   */
  async connect(initialPosition = { x: 0, y: 0 }) {
    try {
      // Cancel any reconnect timer
      if (this.reconnectTimerId) {
        clearTimeout(this.reconnectTimerId);
        this.reconnectTimerId = null;
      }
      
      // Create Colyseus client if it doesn't exist
      if (!this.client) {
        this.client = new Colyseus.Client('ws://localhost:3000');
      }
      
      // Join the world room with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let error = null;
      
      while (retryCount < maxRetries) {
        try {
          if (DEBUG_MODE) {
            console.log(`Connection attempt ${retryCount + 1}/${maxRetries}`);
          }
          
          // Generate a more reliable username
          const username = `Player_${Math.floor(Math.random() * 10000)}`;
          
          // Try to join the room
          this.room = await this.client.joinOrCreate('world', {
            username: username,
            position: initialPosition,
            timestamp: Date.now() // Help with uniqueness
          });
          
          // Reset reconnect attempts on successful connection
          this.reconnectAttempts = 0;
          this.connected = true;
          
          // Set up event listeners
          this._setupListeners();
          
          if (this.callbacks.onConnect) {
            this.callbacks.onConnect();
          }
          
          // Start sending ping messages to measure latency
          this._startPingInterval();
          
          if (DEBUG_MODE) {
            console.log('Connected to Colyseus server successfully');
          }
          
          return true;
        } catch (attemptError) {
          error = attemptError;
          retryCount++;
          
          if (retryCount < maxRetries) {
            if (DEBUG_MODE) {
              console.warn(`Connection attempt failed, retrying (${retryCount}/${maxRetries})...`);
            }
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we got here, all retries failed
      console.error("Connection error after retries:", error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error.message || "Failed to connect after multiple attempts");
      }
      
      // Schedule reconnect if enabled
      this._scheduleReconnect();
      
      return false;
    } catch (error) {
      console.error("Critical connection error:", error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error.message || "Unknown connection error");
      }
      
      // Schedule reconnect if enabled
      this._scheduleReconnect();
      
      return false;
    }
  }

  /**
   * Schedule a reconnection attempt
   * @private
   */
  _scheduleReconnect() {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (DEBUG_MODE) {
        console.log(`Auto-reconnect disabled or max attempts (${this.maxReconnectAttempts}) reached`);
      }
      return;
    }
    
    // Exponential backoff
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
    
    if (DEBUG_MODE) {
      console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    }
    
    this.reconnectTimerId = setTimeout(() => {
      if (!this.connected) {
        if (DEBUG_MODE) {
          console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        }
        this.reconnectAttempts++;
        this.connect();
      }
    }, delay);
  }

  /**
   * Start sending ping messages to measure latency
   * @private
   */
  _startPingInterval() {
    // Clear any existing interval
    if (this._pingIntervalId) {
      clearInterval(this._pingIntervalId);
    }
    
    // Send ping every 10 seconds
    this._pingIntervalId = setInterval(() => {
      if (this.connected && this.room) {
        const pingTime = Date.now();
        
        this.room.send('ping', { time: pingTime });
        
        // Set up timeout to handle missing pong
        const pongTimeoutId = setTimeout(() => {
          // If we don't get a pong in 5 seconds, consider connection unstable
          if (DEBUG_MODE) {
            console.warn('No pong received within timeout, connection may be unstable');
          }
        }, 5000);
        
        // Store the timeout ID so we can clear it when we get the pong
        this._currentPongTimeoutId = pongTimeoutId;
      }
    }, 10000);
  }

  /**
   * Start message queue processor
   * @private
   */
  _startMessageProcessor() {
    // Process messages in the queue every 50ms
    this.messageProcessTimerId = setInterval(() => {
      this._processMessageQueue();
    }, 50);
  }

  /**
   * Process message queue
   * @private
   */
  _processMessageQueue() {
    if (!this.connected || !this.room || this.processingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    try {
      // Process up to 5 messages per batch
      const messagesToProcess = Math.min(5, this.messageQueue.length);
      
      for (let i = 0; i < messagesToProcess; i++) {
        const { type, data } = this.messageQueue.shift();
        
        // Throttle messages to avoid flooding the server
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;
        
        if (timeSinceLastMessage < this.minMessageInterval) {
          // Wait a bit before sending the next message
          const delay = this.minMessageInterval - timeSinceLastMessage;
          setTimeout(() => {
            this._sendMessage(type, data);
          }, delay);
        } else {
          // Send immediately
          this._sendMessage(type, data);
        }
        
        this.lastMessageTime = now;
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Send a message directly to the server
   * @private
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  _sendMessage(type, data) {
    if (!this.connected || !this.room) return;
    
    try {
      // Estimate message size for statistics
      const estimatedSize = JSON.stringify(data).length;
      
      // Send the message
      this.room.send(type, data);
      
      // Update statistics
      this.stats.messagesSent++;
      this.stats.bytesSent += estimatedSize;
      
    } catch (error) {
      console.error(`Error sending message (${type}):`, error);
    }
  }

  /**
   * Set up event listeners for the room
   * @private
   */
  _setupListeners() {
    if (!this.room) return;

    // Listen for state changes - use patches for better performance
    this.room.onStateChange.once((state) => {
      // First state sync is complete
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });
    
    // Use patches for subsequent updates for better performance
    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });
    
    // Handle world visibility updates
    this.room.onMessage('world:visible', (message) => {
      // Update statistics
      this.stats.messagesReceived++;
      this.stats.bytesReceived += JSON.stringify(message).length;
      
      if (this.callbacks.onWorldVisible) {
        this.callbacks.onWorldVisible(message);
      }
    });
    
    // Handle zone entry
    this.room.onMessage('zone:entered', (message) => {
      this.stats.messagesReceived++;
      
      if (this.callbacks.onZoneEntered) {
        this.callbacks.onZoneEntered(message);
      }
    });
    
    // Handle zone exit
    this.room.onMessage('zone:exited', (message) => {
      this.stats.messagesReceived++;
      
      if (this.callbacks.onZoneExited) {
        this.callbacks.onZoneExited(message);
      }
    });
    
    // Handle power details
    this.room.onMessage('power:details', (message) => {
      this.stats.messagesReceived++;
      
      if (this.callbacks.onPowerDetails) {
        this.callbacks.onPowerDetails(message);
      }
    });
    
    // Handle power captured
    this.room.onMessage('power:captured', (message) => {
      this.stats.messagesReceived++;
      
      if (this.callbacks.onPowerCaptured) {
        this.callbacks.onPowerCaptured(message);
      }
    });
    
    // Handle pong messages for latency calculation
    this.room.onMessage('pong', (message) => {
      if (message && message.time) {
        const latency = Date.now() - message.time;
        
        // Update latency statistics
        this.stats.lastLatency = latency;
        this.stats.latencyMeasurements++;
        
        // Calculate running average
        this.stats.averageLatency = 
          (this.stats.averageLatency * (this.stats.latencyMeasurements - 1) + latency) / 
          this.stats.latencyMeasurements;
        
        // Clear pong timeout
        if (this._currentPongTimeoutId) {
          clearTimeout(this._currentPongTimeoutId);
          this._currentPongTimeoutId = null;
        }
        
        if (DEBUG_MODE && this.stats.latencyMeasurements % 5 === 0) {
          console.log(`Network latency: ${latency}ms (avg: ${Math.round(this.stats.averageLatency)}ms)`);
        }
      }
    });
    
    // Handle room errors
    this.room.onError((code, message) => {
      console.error(`Room error (${code}):`, message);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(message);
      }
    });
    
    // Handle disconnection
    this.room.onLeave((code) => {
      this.connected = false;
      
      // Clear intervals
      if (this._pingIntervalId) {
        clearInterval(this._pingIntervalId);
        this._pingIntervalId = null;
      }
      
      if (this._currentPongTimeoutId) {
        clearTimeout(this._currentPongTimeoutId);
        this._currentPongTimeoutId = null;
      }
      
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect(code);
      }
      
      // Schedule reconnect if not a normal closure
      if (code !== 1000 && code !== 1001) {
        this._scheduleReconnect();
      }
    });
  }

  /**
   * Send a movement command to the server
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  sendMovement(x, y) {
    // Queue the message instead of sending directly
    this.messageQueue.push({
      type: 'move',
      data: {
        x: x,
        y: y,
        state: 'moving'
      }
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
    this.messageQueue.push({
      type: 'power:details',
      data: { powerId }
    });
    
    if (DEBUG_MODE) {
      console.log(`Requested details for power ${powerId}`);
    }
  }

  /**
   * Interact with a power
   * @param {string} powerId - ID of the power to interact with
   */
  interactWithPower(powerId) {
    // These are important messages, send immediately
    if (this.connected && this.room) {
      this.room.send('power:interact', { powerId });
      this.stats.messagesSent++;
    }
  }

  /**
   * Capture a power
   * @param {string} powerId - ID of the power to capture
   * @param {Object} challengeResponse - Response to the capture challenge
   */
  capturePower(powerId, challengeResponse) {
    // These are important messages, send immediately
    if (this.connected && this.room) {
      this.room.send('power:capture', {
        powerId,
        challengeResponse
      });
      this.stats.messagesSent++;
    }
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
    // Cancel reconnect attempts
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    
    // Cancel message processor
    if (this.messageProcessTimerId) {
      clearInterval(this.messageProcessTimerId);
      this.messageProcessTimerId = null;
    }
    
    // Cancel ping interval
    if (this._pingIntervalId) {
      clearInterval(this._pingIntervalId);
      this._pingIntervalId = null;
    }
    
    // Leave room
    if (this.room) {
      this.room.leave();
    }
    
    this.connected = false;
    this.room = null;
    
    // Clear message queue
    this.messageQueue = [];
  }

  /**
   * Get the current player's session ID
   * @returns {string|null} - Session ID
   */
  getSessionId() {
    return this.room ? this.room.sessionId : null;
  }
  
  /**
   * Get network statistics
   * @returns {Object} - Network statistics
   */
  getNetworkStats() {
    return { ...this.stats };
  }
}

// Export singleton instance
export const network = new NetworkManager(); 