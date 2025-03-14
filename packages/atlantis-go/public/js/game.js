/**
 * Game configuration and initialization
 * Main entry point for the Phaser game
 */
import { WorldScene } from './scenes/WorldScene.js';
import { DEBUG_MODE, SCREEN } from './constants.js';

class Game {
  constructor() {
    this.game = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the Phaser game
   * @returns {Phaser.Game} The game instance
   */
  initialize() {
    if (this.initialized) return this.game;
    
    console.log('Initializing Phaser game...');
    
    // Configure the game
    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#000000',
      pixelArt: false,
      antialias: false,
      roundPixels: true,
      powerPreference: 'high-performance',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: DEBUG_MODE,
          gravity: { x: 0, y: 0 }
        }
      },
      scene: [WorldScene],
      // Add a fallback renderer if WebGL fails
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        transparent: false,
        clearBeforeRender: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance'
      }
    };
    
    // Create the game instance and handle creation
    try {
      console.log('Creating Phaser game with config:', { 
        width: config.width, 
        height: config.height,
        debugMode: DEBUG_MODE,
        renderer: config.type === Phaser.CANVAS ? 'Canvas' : 'WebGL'
      });
      
      this.game = new Phaser.Game(config);
      
      // Add event listeners for game startup
      this.game.events.once('ready', () => {
        console.log('Phaser game ready event fired');
      });
      
      this.game.events.once('boot', () => {
        console.log('Phaser game boot event fired');
      });
      
      this.game.events.on('step', () => {
        // This fires for each game step
        if (!this.initialized) {
          console.log('Phaser game first step');
          this.initialized = true;
        }
      });
      
      // Register a global reference to access in the console for debugging
      window.atlantisGame = this.game;
      
      // Handle window resize
      window.addEventListener('resize', () => {
        this.game.scale.resize(window.innerWidth, window.innerHeight);
        console.log(`Game resized to ${window.innerWidth} x ${window.innerHeight}`);
      });
      
      // Log game startup
      console.log('Game initialized successfully');
      
      this.initialized = true;
      return this.game;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this._createFallbackMessage('Failed to initialize game: ' + error.message);
      return null;
    }
  }
  
  /**
   * Creates a fallback message if the game fails to initialize
   * @private
   */
  _createFallbackMessage(errorMessage) {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    // Clear the container
    container.innerHTML = '';
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    errorDiv.style.color = 'red';
    errorDiv.style.borderRadius = '10px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.maxWidth = '80%';
    
    errorDiv.innerHTML = `
      <h2>Game Initialization Error</h2>
      <p>${errorMessage}</p>
      <p>Please try refreshing the page or using a different browser.</p>
      <button id="btn-retry" style="padding: 10px 20px; background: #333; color: white; border: 1px solid #666; border-radius: 5px; margin-top: 15px;">Retry</button>
      <button id="btn-fallback" style="padding: 10px 20px; background: #333; color: white; border: 1px solid #666; border-radius: 5px; margin-top: 15px; margin-left: 10px;">Use Fallback Renderer</button>
    `;
    
    container.appendChild(errorDiv);
    
    // Add retry button handler
    document.getElementById('btn-retry').addEventListener('click', () => {
      window.location.reload();
    });
    
    // Add fallback button handler
    document.getElementById('btn-fallback').addEventListener('click', () => {
      // Try again with Canvas renderer
      const config = {
        type: Phaser.CANVAS,
        parent: 'game-container',
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#000',
        pixelArt: false,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
          default: 'arcade',
          arcade: {
            debug: DEBUG_MODE,
            gravity: { x: 0, y: 0 }
          }
        },
        scene: [WorldScene]
      };
      
      container.innerHTML = '';
      this.game = new Phaser.Game(config);
      window.atlantisGame = this.game;
      this.initialized = true;
    });
  }
}

// Export singleton instance
export const game = new Game();

// For direct script loading in debug scenarios
if (typeof window !== 'undefined' && window.document) {
  console.log('Direct script loading detected');
  window.atlantisGame = game;
} 