/**
 * PowerCollection.js - Component for displaying a player's collection of powers.
 * Optimized version with virtual scrolling and improved performance
 */
class PowerCollection {
  /**
   * Create a PowerCollection component
   * @param {HTMLElement} container - Container element
   * @param {Room} room - Colyseus room instance
   */
  constructor(container, room) {
    this.container = container;
    this.room = room;
    this.powers = [];
    this.visible = false;
    this.panel = null;
    this.content = null;
    this.closeButton = null;
    this.powersCountElement = null;
    this.playerRankElement = null;
    this.playerXpElement = null;
    
    // Virtual scrolling properties
    this.visibleItems = [];
    this.itemHeight = 120; // Estimated height of each power item
    this.visibleItemCount = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.scrollTimeout = null;
    this.isLoading = false;
    
    console.log('PowerCollection: Initializing');
    
    // Create UI elements
    this.createUI();
    
    // Apply styles
    this.applyStyles();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Create UI elements
   */
  createUI() {
    try {
      console.log('PowerCollection: Creating UI');
      
      // Create panel
      this.panel = document.createElement('div');
      this.panel.className = 'power-collection-panel';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'power-collection-header';
      
      // Create title
      const title = document.createElement('h2');
      title.textContent = 'Power Collection';
      header.appendChild(title);
      
      // Create close button
      this.closeButton = document.createElement('button');
      this.closeButton.className = 'power-collection-close';
      this.closeButton.textContent = '×';
      header.appendChild(this.closeButton);
      
      // Add header to panel
      this.panel.appendChild(header);
      
      // Create stats section
      const stats = document.createElement('div');
      stats.className = 'power-collection-stats';
      
      // Create powers count
      const powersCountContainer = document.createElement('div');
      powersCountContainer.className = 'stat-item';
      const powersCountLabel = document.createElement('span');
      powersCountLabel.className = 'stat-label';
      powersCountLabel.textContent = 'Powers:';
      this.powersCountElement = document.createElement('span');
      this.powersCountElement.className = 'stat-value';
      this.powersCountElement.textContent = '0';
      powersCountContainer.appendChild(powersCountLabel);
      powersCountContainer.appendChild(this.powersCountElement);
      stats.appendChild(powersCountContainer);
      
      // Create rank
      const rankContainer = document.createElement('div');
      rankContainer.className = 'stat-item';
      const rankLabel = document.createElement('span');
      rankLabel.className = 'stat-label';
      rankLabel.textContent = 'Rank:';
      this.playerRankElement = document.createElement('span');
      this.playerRankElement.className = 'stat-value';
      this.playerRankElement.textContent = '1';
      rankContainer.appendChild(rankLabel);
      rankContainer.appendChild(this.playerRankElement);
      stats.appendChild(rankContainer);
      
      // Create XP
      const xpContainer = document.createElement('div');
      xpContainer.className = 'stat-item';
      const xpLabel = document.createElement('span');
      xpLabel.className = 'stat-label';
      xpLabel.textContent = 'XP:';
      this.playerXpElement = document.createElement('span');
      this.playerXpElement.className = 'stat-value';
      this.playerXpElement.textContent = '0';
      xpContainer.appendChild(xpLabel);
      xpContainer.appendChild(this.playerXpElement);
      stats.appendChild(xpContainer);
      
      // Create loading indicator
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'loading-indicator';
      this.loadingIndicator.textContent = 'Loading powers...';
      this.loadingIndicator.style.display = 'none';
      
      // Add stats to panel
      this.panel.appendChild(stats);
      
      // Create content container with virtual scrolling support
      this.content = document.createElement('div');
      this.content.className = 'power-collection-content';
      
      // Create virtual scroll container
      this.virtualScroller = document.createElement('div');
      this.virtualScroller.className = 'virtual-scroller';
      this.content.appendChild(this.virtualScroller);
      
      // Create spacer elements for virtual scrolling
      this.topSpacer = document.createElement('div');
      this.topSpacer.className = 'spacer top-spacer';
      this.virtualScroller.appendChild(this.topSpacer);
      
      // Create item container
      this.itemContainer = document.createElement('div');
      this.itemContainer.className = 'item-container';
      this.virtualScroller.appendChild(this.itemContainer);
      
      // Create bottom spacer
      this.bottomSpacer = document.createElement('div');
      this.bottomSpacer.className = 'spacer bottom-spacer';
      this.virtualScroller.appendChild(this.bottomSpacer);
      
      // Add content to panel
      this.panel.appendChild(this.content);
      
      // Add loading indicator
      this.panel.appendChild(this.loadingIndicator);
      
      // Add panel to container
      this.container.appendChild(this.panel);
      
      // Explicitly hide panel initially with display:none and visibility:hidden
      this.panel.style.display = 'none';
      this.panel.style.visibility = 'hidden';
      
    } catch (error) {
      console.error('PowerCollection: Error creating UI:', error);
    }
  }
  
  /**
   * Apply CSS styles
   */
  applyStyles() {
    try {
      // Panel styles
      Object.assign(this.panel.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: '600px',
        maxHeight: '80vh',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: '1000'
      });
      
      // Header styles
      const header = this.panel.querySelector('.power-collection-header');
      if (header) {
        Object.assign(header.style, {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 20px',
          borderBottom: '1px solid #eee',
          backgroundColor: '#4a90e2',
          color: 'white'
        });
      }
      
      // Close button styles
      if (this.closeButton) {
        Object.assign(this.closeButton.style, {
          background: 'none',
          border: 'none',
          fontSize: '28px',
          fontWeight: 'bold',
          color: 'white',
          cursor: 'pointer',
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0',
          margin: '0',
          transition: 'transform 0.2s ease'
        });
      }
      
      // Stats section styles
      const stats = this.panel.querySelector('.power-collection-stats');
      if (stats) {
        Object.assign(stats.style, {
          display: 'flex',
          justifyContent: 'space-around',
          padding: '15px 20px',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f9f9f9'
        });
      }
      
      // Content styles - optimize for hardware acceleration
      if (this.content) {
        Object.assign(this.content.style, {
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: '1',
          padding: '0',
          position: 'relative',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          transform: 'translateZ(0)', // Hardware acceleration
          willChange: 'scroll-position' // Hint for optimizing animations
        });
      }
      
      // Virtual scroller styles
      if (this.virtualScroller) {
        Object.assign(this.virtualScroller.style, {
          position: 'relative',
          width: '100%'
        });
      }
      
      // Item container styles
      if (this.itemContainer) {
        Object.assign(this.itemContainer.style, {
          padding: '10px 20px'
        });
      }
      
      // Loading indicator styles
      if (this.loadingIndicator) {
        Object.assign(this.loadingIndicator.style, {
          padding: '15px',
          textAlign: 'center',
          color: '#666',
          borderTop: '1px solid #eee',
          backgroundColor: '#f9f9f9'
        });
      }
      
    } catch (error) {
      console.error('PowerCollection: Error applying styles:', error);
    }
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    try {
      // Close button
      if (this.closeButton) {
        this.closeButton.addEventListener('click', () => {
          this.hide();
        });
        
        // Add hover effect
        this.closeButton.addEventListener('mouseover', () => {
          this.closeButton.style.transform = 'scale(1.1)';
        });
        
        this.closeButton.addEventListener('mouseout', () => {
          this.closeButton.style.transform = 'scale(1)';
        });
      }
      
      // Scroll listener for virtual scrolling
      if (this.content) {
        this.content.addEventListener('scroll', this.handleScroll.bind(this));
      }
      
      // Listen for power capture results if room is available
      if (this.room) {
        this.room.onMessage('powerCaptureResult', (message) => {
          try {
            console.log('PowerCollection: Received power capture result:', message);
            if (message.success) {
              // Update powers after successful capture
              this.updatePowers();
            }
          } catch (error) {
            console.error('PowerCollection: Error handling capture result:', error);
          }
        });
      }
      
      // Window resize event
      window.addEventListener('resize', this.handleResize.bind(this));
      
    } catch (error) {
      console.error('PowerCollection: Error setting up event listeners:', error);
    }
  }
  
  /**
   * Handle scroll events for virtual scrolling
   */
  handleScroll() {
    // Throttle scroll events for better performance
    if (this.scrollTimeout) {
      return;
    }
    
    this.scrollTimeout = setTimeout(() => {
      this.updateVisibleItems();
      this.scrollTimeout = null;
    }, 20);
  }
  
  /**
   * Handle window resize events
   */
  handleResize() {
    // Recalculate visible items when window size changes
    if (this.visible) {
      setTimeout(() => {
        this.calculateVisibleItemCount();
        this.updateVisibleItems();
      }, 200);
    }
  }
  
  /**
   * Calculate how many items can be visible at once
   */
  calculateVisibleItemCount() {
    if (!this.content) return;
    
    const contentHeight = this.content.clientHeight;
    this.visibleItemCount = Math.ceil(contentHeight / this.itemHeight) + 2; // Add buffer
  }
  
  /**
   * Update which items are visible in the virtual scroll
   */
  updateVisibleItems() {
    if (!this.content || !this.powers || this.powers.length === 0) return;
    
    const scrollTop = this.content.scrollTop;
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(this.powers.length - 1, startIndex + this.visibleItemCount);
    
    // If the visible range hasn't changed, don't update
    if (startIndex === this.startIndex && endIndex === this.endIndex) {
      return;
    }
    
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    
    // Update spacer heights
    this.topSpacer.style.height = `${startIndex * this.itemHeight}px`;
    this.bottomSpacer.style.height = `${(this.powers.length - endIndex - 1) * this.itemHeight}px`;
    
    // Remove all existing items
    while (this.itemContainer.firstChild) {
      this.itemContainer.removeChild(this.itemContainer.firstChild);
    }
    
    // Add only the visible items
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < this.powers.length) {
        const powerElement = this.createPowerElement(this.powers[i]);
        this.itemContainer.appendChild(powerElement);
      }
    }
  }
  
  /**
   * Update the power collection from the current state
   */
  updatePowers() {
    if (this.isLoading) return;
    this.isLoading = true;
    
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
    
    console.log('PowerCollection: updatePowers called');
    
    try {
      if (!this.room) {
        throw new Error('Room not available');
      }
      
      if (!this.room.state) {
        throw new Error('Room state not available');
      }
      
      if (!this.room.state.players) {
        throw new Error('Players collection not available in room state');
      }
      
      // Get current player
      const sessionId = this.room.sessionId;
      const player = this.room.state.players.get(sessionId);
      
      if (!player) {
        throw new Error('Current player not found in room state');
      }
      
      // Get powers from player
      if (!player.powers) {
        console.warn('PowerCollection: Player has no powers collection');
        this.powers = [];
      } else {
        // Convert Map to Array
        const powerIds = Array.from(player.powers.keys());
        console.log(`PowerCollection: Found ${powerIds.length} power IDs`);
        
        // Create power objects
        this.powers = powerIds.map(powerId => {
          return {
            id: powerId,
            name: this.getPowerNameById(powerId) || 'Unknown Power'
          };
        });
      }
      
      // Sort powers alphabetically for consistent ordering
      this.powers.sort((a, b) => a.name.localeCompare(b.name));
      
      // Update stats
      this.updateStats(player);
      
      // Calculate how many items can be visible
      this.calculateVisibleItemCount();
      
      console.log(`PowerCollection: Prepared ${this.powers.length} powers for display`);
      
      // Update visible items
      this.startIndex = 0;
      this.endIndex = 0;
      setTimeout(() => {
        this.updateVisibleItems();
        
        // Hide loading indicator
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
        
        this.isLoading = false;
      }, 50);
      
    } catch (error) {
      console.error('PowerCollection: Error updating powers:', error);
      this.isLoading = false;
      
      // Hide loading indicator
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'none';
      }
    }
  }
  
  /**
   * Get power name by ID from state powers
   */
  getPowerNameById(powerId) {
    try {
      if (this.room && this.room.state && this.room.state.powers) {
        const power = this.room.state.powers.get(powerId);
        if (power) {
          return power.name;
        }
      }
      
      return null;
    } catch (error) {
      console.error('PowerCollection: Error getting power name:', error);
      return null;
    }
  }
  
  /**
   * Update player stats display
   */
  updateStats(player) {
    try {
      // Update powers count
      if (this.powersCountElement) {
        const powerCount = this.powers.length;
        this.powersCountElement.textContent = powerCount.toString();
      }
      
      // Update rank
      if (this.playerRankElement && player.rank) {
        this.playerRankElement.textContent = player.rank.toString();
      }
      
      // Update XP
      if (this.playerXpElement && player.xp) {
        this.playerXpElement.textContent = player.xp.toString();
      }
    } catch (error) {
      console.error('PowerCollection: Error updating stats:', error);
    }
  }
  
  /**
   * Create a power element with improved performance
   */
  createPowerElement(power) {
    try {
      const powerItem = document.createElement('div');
      powerItem.className = 'power-item';
      powerItem.setAttribute('data-id', power.id);
      
      // Use innerHTML for faster rendering of complex elements
      powerItem.innerHTML = `
        <div class="power-header">
          <div class="power-icon">${power.name.charAt(0)}</div>
          <div class="power-name">${power.name}</div>
        </div>
        <div class="power-description">
          An arcane power from the depths of Atlantis.
        </div>
      `;
      
      // Add event listeners
      powerItem.addEventListener('click', () => {
        try {
          if (this.room) {
            this.room.send('power:details', { powerId: power.id });
          }
        } catch (error) {
          console.error('PowerCollection: Error sending power details request:', error);
        }
      });
      
      // Style the power item
      Object.assign(powerItem.style, {
        padding: '15px',
        marginBottom: '10px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      });
      
      // Add hover effects using event listeners
      powerItem.addEventListener('mouseover', () => {
        powerItem.style.transform = 'translateY(-2px)';
        powerItem.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      });
      
      powerItem.addEventListener('mouseout', () => {
        powerItem.style.transform = 'translateY(0)';
        powerItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      });
      
      return powerItem;
    } catch (error) {
      console.error('PowerCollection: Error creating power element:', error);
      
      // Return a fallback element
      const fallback = document.createElement('div');
      fallback.textContent = power ? power.name : 'Unknown Power';
      fallback.style.padding = '10px';
      return fallback;
    }
  }
  
  /**
   * Show the power collection
   */
  show() {
    if (this.panel) {
      // First set visibility to visible, then display to flex for proper animation
      this.panel.style.visibility = 'visible';
      this.panel.style.display = 'flex';
      this.visible = true;
      
      // Update powers
      this.updatePowers();
    }
  }
  
  /**
   * Hide the power collection
   */
  hide() {
    if (this.panel) {
      // First set display to none, then visibility to hidden
      this.panel.style.display = 'none';
      this.panel.style.visibility = 'hidden';
      this.visible = false;
    }
  }
  
  /**
   * Toggle the power collection visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

export { PowerCollection }; 