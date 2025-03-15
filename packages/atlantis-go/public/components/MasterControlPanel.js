/**
 * MasterControlPanel.js - Developer control panel for Atlantis Go
 * Provides development tools for debugging, navigation, and system monitoring
 * With modern Apple-inspired design
 */

class MasterControlPanel {
  /**
   * Create a MasterControlPanel component
   * @param {HTMLElement} container - Container element
   * @param {object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      defaultTab: 'console',
      captureConsole: true,
      showPerformance: true,
      position: { top: '20px', right: '20px' }
    }, options);
    
    this.visible = false;
    this.panel = null;
    this.tabs = {};
    this.activeTab = null;
    this.consoleBuffer = [];
    this.maxConsoleEntries = 100;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    // Initialize UI
    this.createUI();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Intercept console if enabled
    if (this.options.captureConsole) {
      this.interceptConsole();
    }
  }
  
  /**
   * Create the UI elements for the panel
   */
  createUI() {
    // Create main panel
    this.panel = document.createElement('div');
    this.panel.className = 'mcp-panel apple-glass';
    this.panel.style.display = 'none';
    
    // Add header with drag handle
    const header = document.createElement('div');
    header.className = 'mcp-header';
    
    const title = document.createElement('div');
    title.className = 'mcp-title';
    title.textContent = 'Master Control Panel';
    header.appendChild(title);
    
    const controls = document.createElement('div');
    controls.className = 'mcp-controls';
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'mcp-btn mcp-minimize';
    minimizeBtn.textContent = '_';
    minimizeBtn.title = 'Minimize';
    controls.appendChild(minimizeBtn);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mcp-btn mcp-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    controls.appendChild(closeBtn);
    
    header.appendChild(controls);
    this.panel.appendChild(header);
    
    // Tab navigation
    const tabNav = document.createElement('div');
    tabNav.className = 'mcp-tabs-nav';
    
    const tabLabels = [
      { id: 'console', label: 'Console', icon: '⌘' },
      { id: 'navigation', label: 'Navigation', icon: '⎋' },
      { id: 'server', label: 'Server', icon: '⚙' },
      { id: 'state', label: 'Game State', icon: '◉' },
      { id: 'performance', label: 'Performance', icon: '⚡' }
    ];
    
    tabLabels.forEach(tab => {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'mcp-tab-btn';
      tabBtn.dataset.tab = tab.id;
      tabBtn.innerHTML = `<span class="mcp-tab-icon">${tab.icon}</span><span class="mcp-tab-label">${tab.label}</span>`;
      tabNav.appendChild(tabBtn);
    });
    
    this.panel.appendChild(tabNav);
    
    // Tab content container
    const tabContent = document.createElement('div');
    tabContent.className = 'mcp-tabs-content';
    
    // Console tab
    const consoleTab = document.createElement('div');
    consoleTab.className = 'mcp-tab-content';
    consoleTab.dataset.tab = 'console';
    
    const consoleControls = document.createElement('div');
    consoleControls.className = 'mcp-console-controls';
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'mcp-btn';
    clearBtn.textContent = 'Clear';
    consoleControls.appendChild(clearBtn);
    
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'mcp-btn';
    pauseBtn.textContent = 'Pause';
    consoleControls.appendChild(pauseBtn);
    
    const searchInput = document.createElement('input');
    searchInput.className = 'apple-input mcp-search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'Filter logs...';
    consoleControls.appendChild(searchInput);
    
    consoleTab.appendChild(consoleControls);
    
    const consoleOutput = document.createElement('div');
    consoleOutput.className = 'mcp-console-output';
    consoleTab.appendChild(consoleOutput);
    
    this.tabs.console = {
      button: tabNav.querySelector('[data-tab="console"]'),
      content: consoleTab,
      output: consoleOutput,
      search: searchInput,
      isPaused: false,
      scrollLock: true
    };
    
    // Navigation tab
    const navTab = document.createElement('div');
    navTab.className = 'mcp-tab-content';
    navTab.dataset.tab = 'navigation';
    
    const navLinks = document.createElement('div');
    navLinks.className = 'mcp-nav-links';
    
    const pages = [
      { url: '/', label: 'Map Page', icon: '🗺️' },
      { url: '/test-powers.html', label: 'Test Powers', icon: '⚡' },
      { url: '/admin.html', label: 'Admin Panel', icon: '🔒' }
    ];
    
    pages.forEach(page => {
      const linkBtn = document.createElement('button');
      linkBtn.className = 'mcp-nav-btn';
      linkBtn.dataset.url = page.url;
      linkBtn.innerHTML = `<span class="mcp-nav-icon">${page.icon}</span>${page.label}`;
      navLinks.appendChild(linkBtn);
    });
    
    navTab.appendChild(navLinks);
    
    this.tabs.navigation = {
      button: tabNav.querySelector('[data-tab="navigation"]'),
      content: navTab
    };
    
    // Server tab
    const serverTab = document.createElement('div');
    serverTab.className = 'mcp-tab-content';
    serverTab.dataset.tab = 'server';
    
    const serverControls = document.createElement('div');
    serverControls.className = 'mcp-server-controls';
    
    const connectBtn = document.createElement('button');
    connectBtn.className = 'mcp-btn';
    connectBtn.id = 'mcp-connect-btn';
    connectBtn.textContent = 'Connect';
    serverControls.appendChild(connectBtn);
    
    const disconnectBtn = document.createElement('button');
    disconnectBtn.className = 'mcp-btn';
    disconnectBtn.id = 'mcp-disconnect-btn';
    disconnectBtn.textContent = 'Disconnect';
    serverControls.appendChild(disconnectBtn);
    
    const spawnPowersBtn = document.createElement('button');
    spawnPowersBtn.className = 'mcp-btn';
    spawnPowersBtn.id = 'mcp-spawn-powers-btn';
    spawnPowersBtn.textContent = 'Spawn Test Powers';
    serverControls.appendChild(spawnPowersBtn);
    
    serverTab.appendChild(serverControls);
    
    const serverStatus = document.createElement('div');
    serverStatus.className = 'mcp-server-status';
    
    // Status with pill style indicator
    const statusPill = document.createElement('div');
    statusPill.className = 'apple-pill error';
    statusPill.id = 'mcp-server-status';
    statusPill.textContent = 'Disconnected';
    
    serverStatus.innerHTML = '<div>Status: </div>';
    serverStatus.appendChild(statusPill);
    
    serverTab.appendChild(serverStatus);
    
    this.tabs.server = {
      button: tabNav.querySelector('[data-tab="server"]'),
      content: serverTab,
      status: serverStatus.querySelector('#mcp-server-status')
    };
    
    // Game State tab
    const stateTab = document.createElement('div');
    stateTab.className = 'mcp-tab-content';
    stateTab.dataset.tab = 'state';
    
    const stateControls = document.createElement('div');
    stateControls.className = 'mcp-state-controls';
    
    const refreshStateBtn = document.createElement('button');
    refreshStateBtn.className = 'mcp-btn';
    refreshStateBtn.textContent = 'Refresh';
    stateControls.appendChild(refreshStateBtn);
    
    // Apple-style toggle switch
    const autoRefreshLabel = document.createElement('label');
    autoRefreshLabel.className = 'apple-switch';
    autoRefreshLabel.innerHTML = `
      <input type="checkbox" id="mcp-auto-refresh">
      <span class="slider"></span>
      <span style="margin-left: 60px;">Auto-refresh</span>
    `;
    stateControls.appendChild(autoRefreshLabel);
    
    stateTab.appendChild(stateControls);
    
    const stateViewer = document.createElement('div');
    stateViewer.className = 'mcp-state-viewer';
    
    const stateTree = document.createElement('pre');
    stateTree.className = 'mcp-state-tree';
    stateViewer.appendChild(stateTree);
    
    stateTab.appendChild(stateViewer);
    
    this.tabs.state = {
      button: tabNav.querySelector('[data-tab="state"]'),
      content: stateTab,
      tree: stateTree,
      autoRefresh: autoRefreshLabel.querySelector('#mcp-auto-refresh'),
      refreshInterval: null
    };
    
    // Performance tab
    const perfTab = document.createElement('div');
    perfTab.className = 'mcp-tab-content';
    perfTab.dataset.tab = 'performance';
    
    const perfMetrics = document.createElement('div');
    perfMetrics.className = 'mcp-performance-metrics';
    
    // FPS metric
    const fpsMetric = document.createElement('div');
    fpsMetric.className = 'mcp-metric';
    
    const fpsLabel = document.createElement('div');
    fpsLabel.className = 'mcp-metric-label';
    fpsLabel.textContent = 'FPS';
    fpsMetric.appendChild(fpsLabel);
    
    const fpsValue = document.createElement('div');
    fpsValue.className = 'mcp-metric-value';
    fpsValue.id = 'mcp-metric-fps';
    fpsValue.textContent = '0';
    fpsMetric.appendChild(fpsValue);
    
    perfMetrics.appendChild(fpsMetric);
    
    // Memory metric
    const memoryMetric = document.createElement('div');
    memoryMetric.className = 'mcp-metric';
    
    const memoryLabel = document.createElement('div');
    memoryLabel.className = 'mcp-metric-label';
    memoryLabel.textContent = 'Memory';
    memoryMetric.appendChild(memoryLabel);
    
    const memoryValue = document.createElement('div');
    memoryValue.className = 'mcp-metric-value';
    memoryValue.id = 'mcp-metric-memory';
    memoryValue.textContent = '0 MB';
    memoryMetric.appendChild(memoryValue);
    
    perfMetrics.appendChild(memoryMetric);
    
    // Network metric
    const networkMetric = document.createElement('div');
    networkMetric.className = 'mcp-metric';
    
    const networkLabel = document.createElement('div');
    networkLabel.className = 'mcp-metric-label';
    networkLabel.textContent = 'Network Latency';
    networkMetric.appendChild(networkLabel);
    
    const networkValue = document.createElement('div');
    networkValue.className = 'mcp-metric-value';
    networkValue.id = 'mcp-metric-network';
    networkValue.textContent = '0 ms';
    networkMetric.appendChild(networkValue);
    
    perfMetrics.appendChild(networkMetric);
    
    // Entity count metric
    const entityMetric = document.createElement('div');
    entityMetric.className = 'mcp-metric';
    
    const entityLabel = document.createElement('div');
    entityLabel.className = 'mcp-metric-label';
    entityLabel.textContent = 'Entity Count';
    entityMetric.appendChild(entityLabel);
    
    const entityValue = document.createElement('div');
    entityValue.className = 'mcp-metric-value';
    entityValue.id = 'mcp-metric-entities';
    entityValue.textContent = '0';
    entityMetric.appendChild(entityValue);
    
    perfMetrics.appendChild(entityMetric);
    
    perfTab.appendChild(perfMetrics);
    
    this.tabs.performance = {
      button: tabNav.querySelector('[data-tab="performance"]'),
      content: perfTab,
      metrics: {
        fps: fpsValue,
        memory: memoryValue,
        network: networkValue,
        entities: entityValue
      },
      updateInterval: null
    };
    
    // Add content tabs to container
    tabContent.appendChild(consoleTab);
    tabContent.appendChild(navTab);
    tabContent.appendChild(serverTab);
    tabContent.appendChild(stateTab);
    tabContent.appendChild(perfTab);
    
    this.panel.appendChild(tabContent);
    
    // Add panel to container
    this.container.appendChild(this.panel);
    
    // Set initial position
    Object.assign(this.panel.style, {
      position: 'fixed',
      zIndex: 10000,
      top: this.options.position.top,
      right: this.options.position.right,
      width: '400px',
      height: '500px'
    });
  }
  
  /**
   * Set up event listeners for the panel
   */
  setupEventListeners() {
    // Tab switching
    const tabButtons = this.panel.querySelectorAll('.mcp-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
    
    // Close button
    const closeBtn = this.panel.querySelector('.mcp-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }
    
    // Minimize button
    const minimizeBtn = this.panel.querySelector('.mcp-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        this.toggleMinimize();
      });
    }
    
    // Console clear button
    const clearBtn = this.panel.querySelector('.mcp-console-controls button:first-child');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearConsole();
      });
    }
    
    // Console pause button
    const pauseBtn = this.panel.querySelector('.mcp-console-controls button:last-child');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.toggleConsolePause();
        pauseBtn.textContent = this.tabs.console.isPaused ? 'Resume' : 'Pause';
      });
    }
    
    // Navigation buttons
    const navButtons = this.panel.querySelectorAll('.mcp-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = btn.dataset.url;
      });
    });
    
    // Server control buttons
    const connectBtn = this.panel.querySelector('#mcp-connect-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        this.connectToServer();
      });
    }
    
    const disconnectBtn = this.panel.querySelector('#mcp-disconnect-btn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        this.disconnectFromServer();
      });
    }
    
    const spawnPowersBtn = this.panel.querySelector('#mcp-spawn-powers-btn');
    if (spawnPowersBtn) {
      spawnPowersBtn.addEventListener('click', () => {
        this.spawnTestPowers();
      });
    }
    
    // Game state tab
    if (this.tabs.state) {
      // Refresh button
      const refreshStateBtn = this.tabs.state.content.querySelector('.mcp-state-controls button');
      if (refreshStateBtn) {
        refreshStateBtn.addEventListener('click', () => {
          this.refreshGameState();
        });
      }
      
      // Auto-refresh checkbox
      const autoRefreshCheckbox = this.tabs.state.autoRefresh;
      if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', () => {
          if (autoRefreshCheckbox.checked) {
            this.startGameStateAutoRefresh();
          } else {
            this.stopGameStateAutoRefresh();
          }
        });
      }
      
      // Listen for tab switching to start/stop auto-refresh
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabId = btn.dataset.tab;
          if (tabId === 'state') {
            if (this.tabs.state.autoRefresh && this.tabs.state.autoRefresh.checked) {
              this.startGameStateAutoRefresh();
            } else {
              this.refreshGameState();
            }
          } else {
            this.stopGameStateAutoRefresh();
          }
        });
      });
    }
    
    // Performance tab
    if (this.tabs.performance) {
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabId = btn.dataset.tab;
          if (tabId === 'performance') {
            this.startPerformanceMonitoring();
          } else {
            this.stopPerformanceMonitoring();
          }
        });
      });
    }
    
    // Dragging
    const header = this.panel.querySelector('.mcp-header');
    if (header) {
      header.addEventListener('mousedown', this.startDrag.bind(this));
      document.addEventListener('mousemove', this.onDrag.bind(this));
      document.addEventListener('mouseup', this.stopDrag.bind(this));
    }
    
    // Global keyboard shortcut (Ctrl+M)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        this.toggle();
      }
    });
  }
  
  /**
   * Switch to a different tab
   * @param {string} tabId - ID of the tab to switch to
   */
  switchTab(tabId) {
    if (!this.tabs[tabId]) return;
    
    // Hide all tab content
    const tabContents = this.panel.querySelectorAll('.mcp-tab-content');
    tabContents.forEach(tab => {
      tab.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    const tabButtons = this.panel.querySelectorAll('.mcp-tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Show selected tab content and activate button
    this.tabs[tabId].content.style.display = 'block';
    this.tabs[tabId].button.classList.add('active');
    this.activeTab = tabId;
  }
  
  /**
   * Start dragging the panel
   * @param {MouseEvent} e - Mouse event
   */
  startDrag(e) {
    if (e.target.closest('.mcp-controls')) return;
    
    this.isDragging = true;
    const rect = this.panel.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    this.panel.style.cursor = 'grabbing';
    e.preventDefault();
  }
  
  /**
   * Handle panel dragging
   * @param {MouseEvent} e - Mouse event
   */
  onDrag(e) {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    // Keep panel within viewport
    const maxX = window.innerWidth - this.panel.offsetWidth;
    const maxY = window.innerHeight - this.panel.offsetHeight;
    
    this.panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    this.panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    this.panel.style.right = 'auto';
    this.panel.style.bottom = 'auto';
    
    e.preventDefault();
  }
  
  /**
   * Stop dragging the panel
   */
  stopDrag() {
    this.isDragging = false;
    this.panel.style.cursor = '';
  }
  
  /**
   * Toggle minimize state of the panel
   */
  toggleMinimize() {
    const content = this.panel.querySelector('.mcp-tabs-content');
    const tabNav = this.panel.querySelector('.mcp-tabs-nav');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      tabNav.style.display = 'flex';
      this.panel.style.height = '500px';
    } else {
      content.style.display = 'none';
      tabNav.style.display = 'none';
      this.panel.style.height = 'auto';
    }
  }
  
  /**
   * Intercept console methods to capture logs
   */
  interceptConsole() {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    const self = this;
    
    console.log = function() {
      self.addConsoleMessage('log', arguments);
      originalConsole.log.apply(console, arguments);
    };
    
    console.warn = function() {
      self.addConsoleMessage('warn', arguments);
      originalConsole.warn.apply(console, arguments);
    };
    
    console.error = function() {
      self.addConsoleMessage('error', arguments);
      originalConsole.error.apply(console, arguments);
    };
    
    console.info = function() {
      self.addConsoleMessage('info', arguments);
      originalConsole.info.apply(console, arguments);
    };
  }
  
  /**
   * Add a console message to the display
   * @param {string} type - Message type (log, warn, error, info)
   * @param {IArguments} args - Console arguments
   */
  addConsoleMessage(type, args) {
    if (this.tabs.console.isPaused) return;
    
    const formattedArgs = Array.from(args).map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    const entry = {
      type,
      message: formattedArgs,
      timestamp: new Date()
    };
    
    this.consoleBuffer.push(entry);
    
    // Limit buffer size
    if (this.consoleBuffer.length > this.maxConsoleEntries) {
      this.consoleBuffer.shift();
    }
    
    this.updateConsoleDisplay();
  }
  
  /**
   * Update the console output display
   */
  updateConsoleDisplay() {
    if (!this.tabs.console.output) return;
    
    const output = this.tabs.console.output;
    const searchTerm = this.tabs.console.search ? this.tabs.console.search.value.toLowerCase() : '';
    
    output.innerHTML = '';
    
    this.consoleBuffer.forEach(entry => {
      // Filter by search term if provided
      if (searchTerm && !entry.message.toLowerCase().includes(searchTerm)) {
        return;
      }
      
      const msgElement = document.createElement('div');
      msgElement.className = `mcp-console-entry mcp-${entry.type}`;
      
      const time = entry.timestamp.toTimeString().split(' ')[0];
      
      let messageContent = escapeHtml(entry.message);
      
      // Highlight JSON objects for better readability
      if (entry.message.trim().startsWith('{') || entry.message.trim().startsWith('[')) {
        try {
          const jsonObj = JSON.parse(entry.message);
          messageContent = this.formatJSON(jsonObj);
        } catch (e) {
          // Not valid JSON, use the escaped HTML
        }
      }
      
      msgElement.innerHTML = `
        <span class="mcp-time">${time}</span>
        <span class="mcp-${entry.type}-icon"></span>
        <span class="mcp-message">${messageContent}</span>
      `;
      
      output.appendChild(msgElement);
    });
    
    // Auto-scroll if not paused
    if (this.tabs.console.scrollLock) {
      output.scrollTop = output.scrollHeight;
    }
  }
  
  /**
   * Format JSON with syntax highlighting
   * @param {object} json - JSON object to format
   * @returns {string} - HTML formatted JSON
   */
  formatJSON(json) {
    const jsonString = JSON.stringify(json, null, 2);
    
    return jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
        match => {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
  }
  
  /**
   * Clear the console output
   */
  clearConsole() {
    this.consoleBuffer = [];
    if (this.tabs.console.output) {
      this.tabs.console.output.innerHTML = '';
    }
  }
  
  /**
   * Toggle console pause state
   */
  toggleConsolePause() {
    this.tabs.console.isPaused = !this.tabs.console.isPaused;
  }
  
  /**
   * Connect to the game server
   */
  connectToServer() {
    if (window.network) {
      window.network.connect().then(connected => {
        if (connected) {
          this.updateServerStatus('Connected');
        } else {
          this.updateServerStatus('Failed to connect');
        }
      });
    } else {
      console.error('Network module not available');
    }
  }
  
  /**
   * Disconnect from the game server
   */
  disconnectFromServer() {
    if (window.network && window.network.room) {
      window.network.disconnect();
      this.updateServerStatus('Disconnected');
    }
  }
  
  /**
   * Spawn test powers on the server
   */
  spawnTestPowers() {
    if (window.network && window.network.room) {
      try {
        window.network.room.send('admin:spawnPowers', {
          count: 5,
          nearPlayer: true,
          radius: 100
        });
        console.log('Requested server to spawn test powers');
      } catch (error) {
        console.error('Failed to spawn powers:', error);
      }
    } else {
      console.error('Cannot spawn powers: not connected to server');
    }
  }
  
  /**
   * Update server status display
   * @param {string} status - Current server status
   */
  updateServerStatus(status) {
    if (this.tabs.server && this.tabs.server.status) {
      this.tabs.server.status.textContent = status;
      
      // Update the status pill class based on the status
      if (status === 'Connected') {
        this.tabs.server.status.className = 'apple-pill success';
      } else if (status === 'Connecting...') {
        this.tabs.server.status.className = 'apple-pill warning';
      } else {
        this.tabs.server.status.className = 'apple-pill error';
      }
    }
  }
  
  /**
   * Show the panel
   */
  show() {
    if (this.panel) {
      this.panel.style.display = 'flex';
      this.visible = true;
      
      // Switch to default tab if none active
      if (!this.activeTab) {
        this.switchTab(this.options.defaultTab);
      }
    }
  }
  
  /**
   * Hide the panel
   */
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.visible = false;
    }
  }
  
  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Refresh the game state display
   */
  refreshGameState() {
    if (!this.tabs.state || !this.tabs.state.tree) return;
    
    try {
      let gameState = {};
      
      // Try to get state from different sources
      if (window.network && window.network.room && window.network.room.state) {
        gameState.roomState = this.formatState(window.network.room.state);
      }
      
      if (window.game && window.game.instance) {
        gameState.gameInstance = {
          scene: window.game.instance.scene.scenes.map(scene => scene.key),
          width: window.game.instance.scale.width,
          height: window.game.instance.scale.height
        };
      }
      
      if (window.app) {
        gameState.appState = {
          initialized: window.app.initialized
        };
      }
      
      // Format and display state
      this.tabs.state.tree.textContent = JSON.stringify(gameState, null, 2);
      
    } catch (error) {
      console.error('Error refreshing game state:', error);
      this.tabs.state.tree.textContent = `Error retrieving game state: ${error.message}`;
    }
  }
  
  /**
   * Format a state object for display
   * @param {object} state - State object to format
   * @returns {object} - Formatted state object
   */
  formatState(state) {
    if (!state) return null;
    
    try {
      // Handle Colyseus schema objects
      if (typeof state.toJSON === 'function') {
        return state.toJSON();
      }
      
      // Handle Map objects
      if (state instanceof Map) {
        const obj = {};
        state.forEach((value, key) => {
          obj[key] = this.formatState(value);
        });
        return obj;
      }
      
      // Handle arrays
      if (Array.isArray(state)) {
        return state.map(item => this.formatState(item));
      }
      
      // Handle plain objects
      if (typeof state === 'object' && state !== null) {
        const obj = {};
        Object.keys(state).forEach(key => {
          // Skip private properties and functions
          if (key.startsWith('_') || typeof state[key] === 'function') {
            return;
          }
          obj[key] = this.formatState(state[key]);
        });
        return obj;
      }
      
      // Return primitive values as is
      return state;
    } catch (error) {
      console.error('Error formatting state:', error);
      return `[Error: ${error.message}]`;
    }
  }
  
  /**
   * Start auto-refreshing game state
   */
  startGameStateAutoRefresh() {
    this.stopGameStateAutoRefresh();
    
    this.tabs.state.refreshInterval = setInterval(() => {
      this.refreshGameState();
    }, 1000); // Refresh every second
    
    this.refreshGameState(); // Refresh immediately
  }
  
  /**
   * Stop auto-refreshing game state
   */
  stopGameStateAutoRefresh() {
    if (this.tabs.state.refreshInterval) {
      clearInterval(this.tabs.state.refreshInterval);
      this.tabs.state.refreshInterval = null;
    }
  }
  
  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    this.stopPerformanceMonitoring();
    
    // Set initial values
    this.updatePerformanceMetrics();
    
    // Start interval for updates
    this.tabs.performance.updateInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }
  
  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring() {
    if (this.tabs.performance.updateInterval) {
      clearInterval(this.tabs.performance.updateInterval);
      this.tabs.performance.updateInterval = null;
    }
  }
  
  /**
   * Update performance metrics display
   */
  updatePerformanceMetrics() {
    const metrics = this.tabs.performance.metrics;
    
    // FPS
    if (metrics.fps && window.game && window.game.instance) {
      metrics.fps.textContent = Math.round(window.game.instance.loop.actualFps);
    }
    
    // Memory
    if (metrics.memory && window.performance && window.performance.memory) {
      const used = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
      const total = Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024));
      metrics.memory.textContent = `${used} / ${total} MB`;
    } else if (metrics.memory) {
      metrics.memory.textContent = 'Not available';
    }
    
    // Network latency
    if (metrics.network && window.network && window.network.latency) {
      metrics.network.textContent = `${window.network.latency} ms`;
    } else if (metrics.network) {
      metrics.network.textContent = 'Not connected';
    }
    
    // Entity count
    if (metrics.entities && window.network && window.network.room && window.network.room.state) {
      let count = 0;
      
      // Count players
      if (window.network.room.state.players) {
        count += window.network.room.state.players.size;
      }
      
      // Count powers
      if (window.network.room.state.powers) {
        count += window.network.room.state.powers.size;
      }
      
      // Count zones
      if (window.network.room.state.zones) {
        count += window.network.room.state.zones.size;
      }
      
      metrics.entities.textContent = count;
    } else if (metrics.entities) {
      metrics.entities.textContent = '0';
    }
  }
}

/**
 * Helper to escape HTML content
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Export the MasterControlPanel class
export { MasterControlPanel };
