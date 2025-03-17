/**
 * WorldManager.js
 * Central manager for Atlantis Go game world components
 * Handles initialization and integration of all subsystems
 */

import { ExperienceEngine } from './ExperienceEngine.js';

export class WorldManager {
  constructor(room) {
    if (!room) {
      throw new Error('Room instance is required for WorldManager');
    }
    
    this.room = room;
    this.playerState = null;
    this.experienceEngine = null;
    this.gameContainer = null;
    this.uiContainer = null;
    this.initialized = false;
    this.isDisposed = false;
    this.lastUpdateTime = 0;
    this.debugMode = false;
    
    // Bind methods
    this.update = this.update.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the world manager and all subsystems
   */
  async initialize() {
    try {
      console.log('Initializing WorldManager...');
      
      // Create UI containers
      this.createUIContainers();
      
      // Initialize player state
      await this.initializePlayerState();
      
      // Initialize subsystems
      await this.initializeSubsystems();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('WorldManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WorldManager:', error);
      throw error;
    }
  }

  /**
   * Initialize player state
   */
  async initializePlayerState() {
    try {
      if (!this.room.state) {
        throw new Error('Room state is not available');
      }

      // Wait for player state to be available (max 5 seconds)
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5 seconds
      
      while (attempts < maxAttempts) {
        const playerState = this.room.state.players.get(this.room.sessionId);
        if (playerState) {
          this.playerState = playerState;
          console.log('Player state initialized:', this.playerState);
          return;
        }
        
        console.log('Waiting for player state...');
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      throw new Error('Timeout waiting for player state');
    } catch (error) {
      console.error('Failed to initialize player state:', error);
      throw error;
    }
  }

  /**
   * Initialize all game subsystems
   */
  async initializeSubsystems() {
    try {
      console.log('Initializing subsystems...');

      // Initialize ExperienceEngine
      this.experienceEngine = new ExperienceEngine(this.room);
      await this.experienceEngine.initialize();

      console.log('Subsystems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize subsystems:', error);
      throw error;
    }
  }

  /**
   * Create UI containers for the game
   */
  createUIContainers() {
    // Create main game container if it doesn't exist
    this.gameContainer = document.getElementById('game-container');
    if (!this.gameContainer) {
      this.gameContainer = document.createElement('div');
      this.gameContainer.id = 'game-container';
      document.body.appendChild(this.gameContainer);
    }

    // Show the game container
    this.gameContainer.style.display = 'block';

    // Create UI container for overlays and HUD
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'ui-container';
    this.gameContainer.appendChild(this.uiContainer);

    // Hide the login container
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
      loginContainer.style.display = 'none';
    }

    // Add basic game UI elements
    this.uiContainer.innerHTML = `
      <div class="game-header">
        <div class="player-info">
          <span class="player-name">${this.playerState?.username || 'Player'}</span>
          <span class="player-position">Position: (0, 0)</span>
        </div>
        <div class="game-controls">
          <button class="btn btn-primary" id="btn-spawn-powers">Spawn Test Powers</button>
          <button class="btn btn-secondary" id="btn-check-powers">Check Powers</button>
        </div>
      </div>
      <div class="game-content">
        <div class="game-map">
          <div class="map-container">
            <!-- Map will be rendered here -->
          </div>
        </div>
        <div class="game-sidebar">
          <div class="powers-list" id="powers-list">
            <!-- Powers will be listed here -->
          </div>
        </div>
      </div>
    `;

    // Add basic game styles
    const style = document.createElement('style');
    style.textContent = `
      .game-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 1000;
      }

      .player-info {
        display: flex;
        gap: 1rem;
      }

      .game-controls {
        display: flex;
        gap: 0.5rem;
      }

      .game-content {
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
      }

      .game-map {
        flex: 1;
        background: #1a1a1a;
        position: relative;
      }

      .map-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }

      .game-sidebar {
        width: 300px;
        background: #2a2a2a;
        padding: 1rem;
        overflow-y: auto;
      }

      .powers-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
      }

      .btn-primary {
        background: #4c6ef5;
        color: white;
      }

      .btn-secondary {
        background: #2d3b66;
        color: white;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners for the game
   */
  setupEventListeners() {
    // Listen for room state changes
    this.room.state.listen("players", (playerMap) => {
      this.handlePlayerStateUpdate(playerMap);
    });

    // Window events
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('beforeunload', this.cleanup);

    console.log('Event listeners set up');
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Handle window resize events
  }

  /**
   * Update game state
   */
  update(deltaTime) {
    if (!this.initialized) {
      return;
    }

    try {
      // Update game state
      if (this.playerState) {
        // Update player position, animations, etc.
      }

      // Update UI elements
      this.updateUI();

    } catch (error) {
      console.error('Error in update loop:', error);
    }
  }

  updateUI() {
    // Update UI elements based on current game state
  }

  handlePlayerStateUpdate(playerMap) {
    if (playerMap && this.room.sessionId) {
      const updatedPlayerState = playerMap.get(this.room.sessionId);
      if (updatedPlayerState) {
        this.playerState = updatedPlayerState;
      }
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.isDisposed) return;

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.cleanup);

    // Clean up subsystems
    if (this.experienceEngine) {
      // Add cleanup logic for ExperienceEngine if needed
    }
    
    // Remove UI elements
    if (this.uiContainer) {
      this.uiContainer.remove();
    }
    if (this.gameContainer) {
      this.gameContainer.remove();
    }

    this.isDisposed = true;
    console.log('WorldManager cleaned up');
  }
} 