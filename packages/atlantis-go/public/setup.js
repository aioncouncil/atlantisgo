/**
 * setup.js
 * Main initialization script for Atlantis Go
 * Handles client-side setup and world initialization
 */

import { WorldManager } from './components/WorldManager.js';

// Create Colyseus client
const client = new Colyseus.Client("ws://localhost:3000");

// Track current game room
let currentRoom = null;
let worldManager = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000; // 2 seconds

// Initialize the game
window.addEventListener('load', () => {
  console.log('🌍 Initializing Atlantis Go Game...');
  
  // Check if a previous connection exists in sessionStorage
  const sessionId = sessionStorage.getItem('sessionId');
  const roomId = sessionStorage.getItem('roomId');
  
  if (sessionId && roomId) {
    // Attempt to reconnect
    console.log(`Attempting to reconnect to session ${sessionId} in room ${roomId}`);
    connectToServer(roomId, sessionId);
  }
  
  // Setup connection listeners
  setupConnectionListeners();
  
  // Handle visibility change for reconnection
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

/**
 * Handle page visibility changes
 */
function handleVisibilityChange() {
  if (!document.hidden && currentRoom && !currentRoom.connection.isOpen) {
    console.log('Page visible, connection closed - attempting to reconnect...');
    reconnectAttempts = 0;
    attemptReconnect();
  }
}

/**
 * Attempt to reconnect to the server
 */
async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached');
    showError('Connection lost. Please refresh the page.');
    return;
  }
  
  const reconnectionToken = sessionStorage.getItem('reconnectionToken');
  
  if (!reconnectionToken) {
    console.error('No reconnection token found');
    showError('Connection lost. Please refresh the page.');
    return;
  }
  
  try {
    reconnectAttempts++;
    await connectToServer('world', null, localStorage.getItem('username'));
    reconnectAttempts = 0; // Reset on successful connection
  } catch (error) {
    console.error(`Reconnection attempt ${reconnectAttempts} failed:`, error);
    setTimeout(attemptReconnect, RECONNECT_DELAY);
  }
}

/**
 * Show error message to user
 */
function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  } else {
    console.error('Error:', message);
  }
}

/**
 * Setup connection button listeners
 */
function setupConnectionListeners() {
  const connectBtn = document.getElementById('connect-btn');
  const usernameInput = document.getElementById('username');
  
  if (!connectBtn || !usernameInput) {
    console.error('Required UI elements not found');
    return;
  }
  
  // Enable Enter key to connect
  usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && usernameInput.checkValidity()) {
      connect();
    }
  });
  
  // Auto-fill username from localStorage if available
  const savedUsername = localStorage.getItem('username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
  }
  
  // Real-time validation feedback
  usernameInput.addEventListener('input', () => {
    connectBtn.disabled = !usernameInput.checkValidity();
  });
  
  // Add click handler
  connectBtn.addEventListener('click', () => {
    connect();
  });

  // Initial validation check
  connectBtn.disabled = !usernameInput.checkValidity();
}

/**
 * Connect to Colyseus server
 */
async function connect() {
  console.log('Connect function called');
  const usernameInput = document.getElementById('username');
  const connectBtn = document.getElementById('connect-btn');
  
  if (!usernameInput || !connectBtn) {
    console.error('UI elements not found:', { usernameInput: !!usernameInput, connectBtn: !!connectBtn });
    showError('UI elements not found');
    return;
  }
  
  const username = usernameInput.value.trim();
  console.log('Attempting to connect with username:', username);
  
  if (!usernameInput.checkValidity()) {
    console.warn('Invalid username:', username);
    showError('Please enter a valid username (3-20 characters, letters, numbers, - and _)');
    return;
  }
  
  // Store username
  localStorage.setItem('username', username);
  
  // Show loading state
  connectBtn.textContent = 'Connecting...';
  connectBtn.disabled = true;
  connectBtn.classList.add('loading');
  
  try {
    console.log('Initiating server connection...');
    // Connect to default room
    await connectToServer('world', null, username);
    console.log('Connection successful!');
  } catch (error) {
    console.error('Connection failed:', error);
    // Error handling is done in connectToServer
    connectBtn.textContent = 'Connect to World';
    connectBtn.disabled = false;
    connectBtn.classList.remove('loading');
  }
}

/**
 * Connect to Colyseus server
 */
async function connectToServer(roomName = 'world', sessionId = null, username = null) {
  try {
    console.log('Attempting to connect to Colyseus server...', {
      roomName,
      sessionId,
      username,
      serverUrl: client.endpoint
    });
    
    // Ensure we have a username
    if (!username) {
      username = localStorage.getItem('username');
      if (!username) {
        throw new Error('No username provided');
      }
    }
    
    // Try to reconnect or join a new room
    if (sessionId) {
      console.log('Attempting to reconnect with session:', sessionId);
      // Get the reconnection token from the previous session
      const reconnectionToken = sessionStorage.getItem('reconnectionToken');
      if (reconnectionToken) {
        try {
          currentRoom = await client.reconnect(reconnectionToken);
          console.log('Reconnected to existing session!');
        } catch (error) {
          console.log('Reconnection failed, creating new session:', error);
          // Clear invalid token
          sessionStorage.removeItem('reconnectionToken');
          // Fall back to creating new session
          currentRoom = await client.joinOrCreate('world', { username });
        }
      } else {
        // If no reconnection token, create new session
        console.log('No reconnection token found, creating new session');
        currentRoom = await client.joinOrCreate('world', { username });
      }
    } else {
      console.log('Attempting to join or create room with username:', username);
      currentRoom = await client.joinOrCreate('world', { username });
      console.log('Connected to new session!');
    }
    
    // Save session details and reconnection token
    sessionStorage.setItem('sessionId', currentRoom.sessionId);
    sessionStorage.setItem('roomId', currentRoom.id);
    sessionStorage.setItem('reconnectionToken', currentRoom.reconnectionToken);
    
    // Setup room event handlers
    setupRoomEventHandlers(currentRoom);
    
    // Initialize game after connection
    await initGame(currentRoom);
    
  } catch (error) {
    console.error('Failed to connect:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      endpoint: client.endpoint
    });
    
    // Show error with more details
    let errorMessage = 'Failed to connect: ';
    if (error.code) {
      errorMessage += `[Code ${error.code}] `;
    }
    errorMessage += error.message || 'Unknown error occurred';
    showError(errorMessage);
    
    // Clear session storage in case of connection error
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('reconnectionToken');
    
    throw error; // Re-throw for reconnection handling
  }
}

/**
 * Setup room event handlers
 */
function setupRoomEventHandlers(gameRoom) {
  gameRoom.onLeave((code) => {
    console.log('Left room:', code);
    if (code > 1000) {
      // Abnormal closure, attempt to reconnect
      reconnectAttempts = 0;
      attemptReconnect();
    }
  });
  
  gameRoom.onError((code, message) => {
    console.error('Room error:', code, message);
    showError(`Game error: ${message}`);
  });
  
  // Listen for server shutdown message
  gameRoom.onMessage('shutdown', (message) => {
    showError(message.message);
  });
}

/**
 * Initialize game after successful connection
 */
async function initGame(gameRoom) {
  try {
    console.log('Initializing game with room:', gameRoom.sessionId);
    
    // Create and initialize world manager
    worldManager = new WorldManager(gameRoom);
    await worldManager.initialize();
    
    console.log('Game initialized successfully');
    
    // Hide login, show game
    const loginContainer = document.getElementById('login-container');
    const gameContainer = document.getElementById('game-container');
    
    if (loginContainer) {
      loginContainer.style.display = 'none';
      console.log('Login container hidden');
    }
    if (gameContainer) {
      gameContainer.style.display = 'block';
      console.log('Game container shown');
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
    showError('Failed to initialize game: ' + error.message);
    throw error; // Re-throw to trigger error handling in connect function
  }
}

/**
 * Game loop
 */
let lastTime = performance.now();
function gameLoop(currentTime) {
  // Calculate delta time
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Update world manager if initialized
  if (worldManager) {
    worldManager.update(deltaTime);
  }
  
  // Continue loop
  requestAnimationFrame(gameLoop);
}

// Export for potential use in other modules
export { currentRoom, worldManager }; 

// Make connect function globally available
window.connect = connect; 