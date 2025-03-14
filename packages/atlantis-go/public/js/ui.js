/**
 * UI Module
 * Handles all UI-related functionality
 */
import { DEBUG_MODE } from './constants.js';
import { network } from './network.js';

class UIManager {
  constructor() {
    this.statusPanel = null;
    this.connectionStatus = null;
    this.playerCount = null;
    this.powerCount = null;
    this.zoneInfo = null;
    this.virtueMetrics = null;
    this.reconnectButton = null;
    this.powerDetailsModal = null;
    this.currentPower = null;
    this.debug = null;
    this.miniMap = null;
    this.miniMapPlayer = null;
    this.miniMapViewport = null;
  }

  /**
   * Initialize UI elements
   */
  initialize() {
    // Main UI elements
    this.statusPanel = document.getElementById('status-panel');
    this.connectionStatus = document.getElementById('connection-status');
    this.playerCount = document.getElementById('player-count');
    this.powerCount = document.getElementById('power-count');
    this.zoneInfo = document.getElementById('zone-info');
    this.reconnectButton = document.getElementById('btn-reconnect');
    
    // Virtue metrics
    this.virtueMetrics = {
      wisdom: {
        progress: document.getElementById('wisdom-progress'),
        value: document.getElementById('wisdom-value')
      },
      courage: {
        progress: document.getElementById('courage-progress'),
        value: document.getElementById('courage-value')
      },
      temperance: {
        progress: document.getElementById('temperance-progress'),
        value: document.getElementById('temperance-value')
      },
      justice: {
        progress: document.getElementById('justice-progress'),
        value: document.getElementById('justice-value')
      }
    };
    
    // Power details modal
    this.powerDetailsModal = document.getElementById('power-details');
    
    // Mini-map
    this.miniMap = document.getElementById('mini-map');
    this.miniMapPlayer = document.getElementById('mini-map-player');
    this.miniMapViewport = document.getElementById('mini-map-viewport');
    
    // Debug panel
    this.debug = document.getElementById('debug');
    
    // Set up button event listeners
    this._setupButtonListeners();
  }

  /**
   * Update connection status
   * @param {boolean} connected - Connection status
   * @param {string} message - Status message
   */
  updateConnectionStatus(connected, message = '') {
    if (connected) {
      this.connectionStatus.textContent = 'Connected!';
      this.connectionStatus.style.color = 'green';
      this.reconnectButton.style.display = 'none';
    } else {
      this.connectionStatus.textContent = message || 'Disconnected!';
      this.connectionStatus.style.color = 'red';
      this.reconnectButton.style.display = 'block';
    }
  }

  /**
   * Update player count
   * @param {number} count - Player count
   */
  updatePlayerCount(count) {
    this.playerCount.textContent = `Players: ${count}`;
  }

  /**
   * Update power count
   * @param {number} count - Power count
   */
  updatePowerCount(count) {
    this.powerCount.textContent = `Powers: ${count}`;
  }

  /**
   * Update zone info
   * @param {string} name - Zone name
   * @param {string} type - Zone type
   */
  updateZoneInfo(name, type) {
    if (name) {
      this.zoneInfo.textContent = `Zone: ${name} (${type})`;
    } else {
      this.zoneInfo.textContent = 'Zone: None';
    }
  }

  /**
   * Update virtue metrics
   * @param {Object} virtues - Virtue values
   */
  updateVirtueMetrics(virtues) {
    // Guard clause: if virtueMetrics isn't initialized, do nothing
    if (!this.virtueMetrics) {
      console.warn('Virtue metrics UI elements not initialized');
      return;
    }
    
    const metrics = virtues || {
      wisdom: Math.floor(Math.random() * 30),
      courage: Math.floor(Math.random() * 30),
      temperance: Math.floor(Math.random() * 30),
      justice: Math.floor(Math.random() * 30)
    };
    
    for (const virtue in metrics) {
      // Check if this virtue exists in our UI and has the necessary DOM elements
      if (this.virtueMetrics[virtue] && 
          this.virtueMetrics[virtue].progress && 
          this.virtueMetrics[virtue].value) {
        
        // Update progress bar
        this.virtueMetrics[virtue].progress.style.width = `${metrics[virtue]}%`;
        
        // Update text value
        this.virtueMetrics[virtue].value.textContent = metrics[virtue];
      }
    }
  }

  /**
   * Show power details
   * @param {Object} power - Power details
   */
  showPowerDetails(power) {
    this.currentPower = power;
    
    const nameElem = document.getElementById('power-name');
    const descElem = document.getElementById('power-description');
    const statsElem = document.getElementById('power-stats');
    const challengeElem = document.getElementById('power-challenge');
    
    nameElem.textContent = power.name || `${power.type} Power`;
    descElem.textContent = power.description || `A ${power.rarity} power of ${power.type}.`;
    
    // Display power stats
    statsElem.innerHTML = `
      <div><strong>Type:</strong> ${power.type || 'Unknown'}</div>
      <div><strong>Rarity:</strong> ${power.rarity || 'Common'}</div>
      <div><strong>Matrix Quadrant:</strong> ${power.matrixQuadrant || 'Unknown'}</div>
    `;
    
    // Display challenge info
    if (power.captureChallenge) {
      let challengeHTML = `<div><strong>Challenge:</strong> `;
      
      if (power.captureChallenge.type === 'reflection') {
        challengeHTML += `<p>${power.captureChallenge.question}</p>
          <textarea id="challenge-response" rows="3" style="width: 100%; margin-top: 5px;" placeholder="Your thoughtful response..."></textarea>`;
      } else if (power.captureChallenge.type === 'choice') {
        challengeHTML += `<p>${power.captureChallenge.scenario}</p>`;
        power.captureChallenge.options.forEach((option, index) => {
          challengeHTML += `<div>
            <input type="radio" name="choice" id="choice${index}" value="${index}">
            <label for="choice${index}">${option}</label>
          </div>`;
        });
      } else {
        challengeHTML += `<p>Focus your mind to capture this power.</p>`;
      }
      
      challengeHTML += `</div>`;
      challengeElem.innerHTML = challengeHTML;
    } else {
      // Default challenge
      challengeElem.innerHTML = `
        <div><strong>Challenge:</strong></div>
        <p>What virtue does this power represent to you, and why?</p>
        <textarea id="challenge-response" rows="3" style="width: 100%; margin-top: 5px;" placeholder="Your thoughtful response..."></textarea>
      `;
    }
    
    this.powerDetailsModal.style.display = 'block';
  }

  /**
   * Close power details modal
   */
  closePowerDetails() {
    this.powerDetailsModal.style.display = 'none';
    this.currentPower = null;
  }

  /**
   * Capture current power
   */
  capturePower() {
    if (!this.currentPower) return;
    
    let response = {};
    
    if (this.currentPower.captureChallenge) {
      if (this.currentPower.captureChallenge.type === 'reflection') {
        response.text = document.getElementById('challenge-response').value;
      } else if (this.currentPower.captureChallenge.type === 'choice') {
        const selected = document.querySelector('input[name="choice"]:checked');
        response.choiceIndex = selected ? parseInt(selected.value) : -1;
      }
    } else {
      response.text = document.getElementById('challenge-response').value;
    }
    
    network.capturePower(this.currentPower.id, response);
    this.closePowerDetails();
  }

  /**
   * Update mini-map
   * @param {number} playerX - Player X coordinate
   * @param {number} playerY - Player Y coordinate
   * @param {number} viewportOffsetX - Viewport X offset
   * @param {number} viewportOffsetY - Viewport Y offset
   */
  updateMiniMap(playerX, playerY, viewportOffsetX, viewportOffsetY) {
    // Map world coordinates to mini-map
    const miniMapScale = 0.005; // Reduced scale factor for mini-map
    const miniMapWidth = this.miniMap.offsetWidth;
    const miniMapHeight = this.miniMap.offsetHeight;
    
    // Center coordinates on mini-map
    const miniMapCenterX = miniMapWidth / 2;
    const miniMapCenterY = miniMapHeight / 2;
    
    // Calculate player position on mini-map
    const miniMapPlayerX = miniMapCenterX + (playerX * miniMapScale);
    const miniMapPlayerY = miniMapCenterY + (playerY * miniMapScale);
    
    // Update player marker position
    this.miniMapPlayer.style.left = `${miniMapPlayerX}px`;
    this.miniMapPlayer.style.top = `${miniMapPlayerY}px`;
    
    // Calculate viewport rectangle on mini-map
    const viewportWidth = window.innerWidth * miniMapScale / 0.2; // Adjusted for scale
    const viewportHeight = window.innerHeight * miniMapScale / 0.2;
    
    // Position viewport rectangle based on panning offset
    const viewportX = miniMapCenterX - ((viewportOffsetX * miniMapScale) / 0.2);
    const viewportY = miniMapCenterY - ((viewportOffsetY * miniMapScale) / 0.2);
    
    // Ensure viewport stays within mini-map
    const boundedViewportX = Math.max(0, Math.min(miniMapWidth - viewportWidth, viewportX - viewportWidth/2));
    const boundedViewportY = Math.max(0, Math.min(miniMapHeight - viewportHeight, viewportY - viewportHeight/2));
    
    this.miniMapViewport.style.left = `${boundedViewportX}px`;
    this.miniMapViewport.style.top = `${boundedViewportY}px`;
    this.miniMapViewport.style.width = `${Math.min(viewportWidth, miniMapWidth)}px`;
    this.miniMapViewport.style.height = `${Math.min(viewportHeight, miniMapHeight)}px`;
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {boolean} isError - Whether this is an error message
   */
  log(message, isError = false) {
    if (!DEBUG_MODE && !isError) return;
    
    const msgElem = document.createElement('div');
    msgElem.textContent = message;
    
    if (isError) {
      msgElem.style.color = 'red';
    }
    
    this.debug.appendChild(msgElem);
    
    // Trim if too many messages
    while (this.debug.children.length > 10) {
      this.debug.removeChild(this.debug.firstChild);
    }
    
    // Scroll to bottom
    this.debug.scrollTop = this.debug.scrollHeight;
  }

  /**
   * Set up button event listeners
   * @private
   */
  _setupButtonListeners() {
    // Power details modal buttons
    document.getElementById('btn-capture-power').addEventListener('click', () => {
      this.capturePower();
    });
    
    document.getElementById('btn-close-power').addEventListener('click', () => {
      this.closePowerDetails();
    });
    
    // Reconnect button
    this.reconnectButton.addEventListener('click', async () => {
      this.reconnectButton.style.display = 'none';
      this.connectionStatus.textContent = 'Reconnecting...';
      this.connectionStatus.style.color = 'orange';
      
      await network.connect();
    });
  }
}

// Export singleton instance
export const ui = new UIManager(); 