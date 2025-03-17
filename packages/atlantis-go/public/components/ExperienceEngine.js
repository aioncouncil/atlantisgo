/**
 * ExperienceEngine.js
 * Component for handling experiences in Atlantis Go
 * Follows Apple-style futuristic design
 */

export class ExperienceEngine {
  constructor(room) {
    if (!room) {
      throw new Error('Room instance is required for ExperienceEngine');
    }

    this.room = room;
    this.experiences = new Map();
    this.currentInstance = null;
    this.activeInstances = new Map();
    this.minimized = true;
    this.filterType = "all";
    this.notificationCount = 0;
    
    // UI references
    this.containerEl = null;
    this.indicatorEl = null;
    this.listEl = null;
    this.detailEl = null;
    this.raidEl = null;
  }

  /**
   * Initialize the experience engine
   */
  async initialize() {
    try {
      console.log('Initializing ExperienceEngine...');
      
      // Create and insert UI
      this.createUI();
      
      // Setup event listeners
      this.setupEventListeners();

      console.log('ExperienceEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ExperienceEngine:', error);
      throw error;
    }
  }

  /**
   * Create the UI for the Experience Engine
   */
  createUI() {
    // Add the CSS link if it doesn't exist
    if (!document.querySelector('link[href="css/experience.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/experience.css';
      document.head.appendChild(link);
    }
    
    // Create minimized indicator
    this.indicatorEl = document.createElement('div');
    this.indicatorEl.className = 'experience-indicator';
    this.indicatorEl.innerHTML = `
      <div class="experience-indicator-icon">⚡</div>
    `;
    
    // Create main container (initially hidden)
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'experience-container';
    this.containerEl.style.display = 'none';
    
    // Initialize with the experience list view
    this.showExperienceList();
    
    // Add to document
    document.body.appendChild(this.indicatorEl);
    document.body.appendChild(this.containerEl);
  }
  
  /**
   * Setup event listeners for server and UI events
   */
  setupEventListeners() {
    // Indicator click - show/hide experience container
    this.indicatorEl.addEventListener('click', () => {
      this.toggleContainer();
    });
    
    // Server events
    this.room.onMessage("experienceJoined", (message) => {
      this.handleExperienceJoined(message);
    });
    
    this.room.onMessage("experienceStarted", (message) => {
      this.handleExperienceStarted(message);
    });
    
    this.room.onMessage("experiencePhaseChanged", (message) => {
      this.handleExperiencePhaseChanged(message);
    });
    
    this.room.onMessage("experienceEnded", (message) => {
      this.handleExperienceEnded(message);
    });
    
    this.room.onMessage("experienceParticipantLeft", (message) => {
      this.handleExperienceParticipantLeft(message);
    });
    
    this.room.onMessage("experienceLeft", (message) => {
      this.handleExperienceLeft(message);
    });
    
    this.room.onMessage("experienceError", (message) => {
      this.showToast("Error", message.error, "error");
    });
    
    // Listen for state changes from the server
    this.room.state.listen("experiences", (experienceMap) => {
      this.updateExperiences(experienceMap);
    });
    
    this.room.state.listen("experienceInstances", (instanceMap) => {
      this.updateExperienceInstances(instanceMap);
    });
  }
  
  /**
   * Show/hide the experience container
   */
  toggleContainer() {
    this.minimized = !this.minimized;
    
    if (this.minimized) {
      this.containerEl.style.display = 'none';
      this.indicatorEl.style.display = 'flex';
    } else {
      this.containerEl.style.display = 'block';
      this.indicatorEl.style.display = 'none';
      this.updateNotificationCount(0); // Clear notifications when opened
    }
  }
  
  /**
   * Update the notification count badge
   */
  updateNotificationCount(count) {
    this.notificationCount = count;
    
    // Remove existing badge if present
    const existingBadge = this.indicatorEl.querySelector('.experience-indicator-badge');
    if (existingBadge) {
      this.indicatorEl.removeChild(existingBadge);
    }
    
    // Add new badge if count > 0
    if (count > 0) {
      const badge = document.createElement('div');
      badge.className = 'experience-indicator-badge';
      badge.textContent = count > 9 ? '9+' : count;
      this.indicatorEl.appendChild(badge);
    }
  }
  
  /**
   * Show a toast notification
   */
  showToast(title, message, type = "") {
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `experience-toast ${type}`;
    toastEl.innerHTML = `
      <div class="experience-toast-header">
        <h3 class="experience-toast-title">${title}</h3>
        <button class="experience-toast-close">✕</button>
      </div>
      <p class="experience-toast-message">${message}</p>
    `;
    
    // Add to document
    document.body.appendChild(toastEl);
    
    // Setup close button
    const closeBtn = toastEl.querySelector('.experience-toast-close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(toastEl);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        document.body.removeChild(toastEl);
      }
    }, 5000);
    
    // Increment notification count if container is minimized
    if (this.minimized) {
      this.updateNotificationCount(this.notificationCount + 1);
    }
  }
  
  /**
   * Show experience list
   */
  showExperienceList() {
    // Clear container content
    this.containerEl.innerHTML = `
      <div class="experience-header">
        <div>
          <h2 class="experience-title">Experiences</h2>
          <p class="experience-subtitle">Discover new adventures</p>
        </div>
        <button class="experience-close-btn" id="experience-close">✕</button>
      </div>
      
      <div class="experience-filter-bar">
        <button class="experience-filter-button active" data-type="all">All</button>
        <button class="experience-filter-button" data-type="Quest">Quests</button>
        <button class="experience-filter-button" data-type="Challenge">Challenges</button>
        <button class="experience-filter-button" data-type="Collaboration">Collaborations</button>
        <button class="experience-filter-button" data-type="Innovation">Innovations</button>
        <button class="experience-filter-button" data-type="Reflection">Reflections</button>
        <button class="experience-filter-button" data-type="active">My Activities</button>
      </div>
      
      <div id="experience-list"></div>
    `;
    
    // Store reference to list element
    this.listEl = this.containerEl.querySelector('#experience-list');
    
    // Populate list with experiences
    this.populateExperienceList();
    
    // Setup event listeners
    const closeBtn = this.containerEl.querySelector('#experience-close');
    closeBtn.addEventListener('click', () => {
      this.toggleContainer();
    });
    
    // Filter buttons
    const filterButtons = this.containerEl.querySelectorAll('.experience-filter-button');
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update filter and refresh list
        this.filterType = button.getAttribute('data-type');
        this.populateExperienceList();
      });
    });
  }
  
  /**
   * Populate experience list based on current filter
   */
  populateExperienceList() {
    // Clear list
    this.listEl.innerHTML = '';
    
    // Show loading state if no experiences are loaded yet
    if (this.experiences.size === 0) {
      this.listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 24px; margin-bottom: 16px;">🎮</div>
          <p>Loading experiences...</p>
          <p style="color: var(--experience-text-tertiary); font-size: 14px;">Please wait while we fetch available experiences.</p>
        </div>
      `;
      return;
    }
    
    // Get filtered experiences
    let filteredExperiences = [];
    
    if (this.filterType === 'active') {
      // Show active instances
      this.activeInstances.forEach(instance => {
        const experience = this.experiences.get(instance.experienceId);
        if (experience) {
          filteredExperiences.push({
            experience,
            instance
          });
        }
      });
      
      // Show active instances
      if (filteredExperiences.length === 0) {
        this.listEl.innerHTML = `
          <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 24px; margin-bottom: 16px;">📋</div>
            <p>No Active Experiences</p>
            <p style="color: var(--experience-text-tertiary); font-size: 14px;">Try joining one from the other categories!</p>
          </div>
        `;
        return;
      }
      
      // Render active instances
      filteredExperiences.forEach(({experience, instance}) => {
        if (!experience || typeof experience !== 'object') {
          console.warn('Invalid experience object:', experience);
          return;
        }

        const type = experience.type || 'Unknown';
        const card = document.createElement('div');
        card.className = `experience-card ${type.toLowerCase()}`;
        card.innerHTML = `
          <div class="experience-card-header">
            <h3 class="experience-card-title">${experience.name || 'Untitled Experience'}</h3>
            <span class="experience-card-type">${type}</span>
          </div>
          <div class="experience-card-description">${experience.description || 'No description available.'}</div>
          <div class="experience-card-meta">
            <span>Status: ${instance?.status || 'Unknown'}</span>
            <span>Phase: ${(instance?.currentPhase || 0) + 1}/${experience.phases?.length || 1}</span>
          </div>
        `;
        
        card.addEventListener('click', () => {
          this.showExperienceDetail(experience, instance);
        });
        
        this.listEl.appendChild(card);
      });
      
    } else {
      // Filter by type or show all
      this.experiences.forEach(experience => {
        if (this.filterType === 'all' || experience.type === this.filterType) {
          filteredExperiences.push({experience});
        }
      });
      
      // Show message if no experiences found
      if (filteredExperiences.length === 0) {
        this.listEl.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p>No experiences found.</p>
            <p style="color: var(--experience-text-tertiary); font-size: 14px;">Try changing your filter or exploring different areas.</p>
          </div>
        `;
        return;
      }
      
      // Render experiences
      filteredExperiences.forEach(({experience}) => {
        if (!experience || typeof experience !== 'object') {
          console.warn('Invalid experience object:', experience);
          return;
        }

        const type = experience.type || 'Unknown';
        const card = document.createElement('div');
        card.className = `experience-card ${type.toLowerCase()}`;
        card.innerHTML = `
          <div class="experience-card-header">
            <h3 class="experience-card-title">${experience.name || 'Untitled Experience'}</h3>
            <span class="experience-card-type">${type}</span>
          </div>
          <div class="experience-card-description">${experience.description || 'No description available.'}</div>
          <div class="experience-card-meta">
            <span>Difficulty: ${experience.difficulty || 0}/100</span>
            <span>Duration: ~${experience.estimatedDuration || 0} min</span>
          </div>
        `;
        
        card.addEventListener('click', () => {
          this.showExperienceDetail(experience);
        });
        
        this.listEl.appendChild(card);
      });
    }
  }
  
  /**
   * Show experience detail
   */
  showExperienceDetail(experience, instance = null) {
    // Clear container content
    this.containerEl.innerHTML = `
      <div class="experience-header">
        <div>
          <h2 class="experience-title">${experience.name}</h2>
          <p class="experience-subtitle">${experience.type}</p>
        </div>
        <button class="experience-close-btn" id="experience-back">←</button>
      </div>
      
      <div id="experience-detail">
        <p class="experience-card-description">${experience.description}</p>
        
        <div class="experience-rewards">
          <h3 class="experience-rewards-title">Rewards</h3>
          <div class="experience-rewards-grid">
            <div class="experience-reward-item">
              <div class="experience-reward-icon">✨</div>
              <div>
                <div class="experience-reward-value">${experience.xpReward}</div>
                <div class="experience-reward-label">XP</div>
              </div>
            </div>
            <div class="experience-reward-item">
              <div class="experience-reward-icon">💰</div>
              <div>
                <div class="experience-reward-value">${experience.coinsReward}</div>
                <div class="experience-reward-label">Coins</div>
              </div>
            </div>
          </div>
        </div>
        
        ${this.renderExperiencePhases(experience, instance)}
        
        ${this.renderExperienceRequirements(experience)}
        
        ${instance ? this.renderParticipantList(instance) : ''}
        
        <div class="experience-actions">
          ${instance ? this.renderInstanceActions(instance, experience) : `
            <button class="experience-btn" id="experience-join">Join Experience</button>
          `}
        </div>
      </div>
    `;
    
    // Store reference to detail element
    this.detailEl = this.containerEl.querySelector('#experience-detail');
    
    // Setup event listeners
    const backBtn = this.containerEl.querySelector('#experience-back');
    backBtn.addEventListener('click', () => {
      this.showExperienceList();
    });
    
    if (!instance) {
      // Join button
      const joinBtn = this.containerEl.querySelector('#experience-join');
      joinBtn.addEventListener('click', () => {
        this.joinExperience(experience.id);
      });
    } else {
      // Instance action buttons
      const completeBtn = this.containerEl.querySelector('#experience-complete-phase');
      if (completeBtn) {
        completeBtn.addEventListener('click', () => {
          this.completeExperiencePhase(instance.id, instance.currentPhase);
        });
      }
      
      const leaveBtn = this.containerEl.querySelector('#experience-leave');
      if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
          this.leaveExperience(instance.id);
        });
      }
    }
  }
  
  /**
   * Render experience phases
   */
  renderExperiencePhases(experience, instance = null) {
    if (!experience.phases || experience.phases.length === 0) {
      return '';
    }
    
    let currentPhase = 0;
    let status = 'Scheduled';
    
    if (instance) {
      currentPhase = instance.currentPhase;
      status = instance.status;
    }
    
    let phasesHtml = '<div class="experience-phases">';
    
    // Add progress bar if instance exists
    if (instance) {
      const progress = Math.round((currentPhase / experience.phases.length) * 100);
      phasesHtml += `
        <div class="experience-progress">
          <div class="experience-progress-bar" style="width: ${progress}%"></div>
        </div>
      `;
    }
    
    // Only show current phase if in an instance, otherwise show all
    const phasesToShow = instance ? [experience.phases[currentPhase]] : experience.phases;
    const startIndex = instance ? currentPhase : 0;
    
    phasesToShow.forEach((phase, index) => {
      const phaseIndex = startIndex + index;
      const isActive = instance && phaseIndex === currentPhase;
      
      phasesHtml += `
        <div class="experience-phase">
          <div class="experience-phase-header">
            <h3 class="experience-phase-title">Phase ${phaseIndex + 1}: ${phase.name}</h3>
            <span class="experience-phase-time">${phase.duration} min</span>
          </div>
          <p class="experience-phase-description">${phase.description}</p>
          
          <ul class="experience-task-list">
            ${phase.tasks.map(task => `
              <li class="experience-task-item">${task}</li>
            `).join('')}
          </ul>
        </div>
      `;
    });
    
    phasesHtml += '</div>';
    return phasesHtml;
  }
  
  /**
   * Render experience requirements
   */
  renderExperienceRequirements(experience) {
    let html = `
      <div class="experience-requirements" style="margin-top: 16px; padding: 16px; background: var(--experience-bg-light); border-radius: var(--experience-border-radius);">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Requirements</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Minimum Rank: ${experience.minimumRank}</li>
          <li>Players: ${experience.minPlayers} - ${experience.maxPlayers}</li>
    `;
    
    if (experience.requiredPowers && experience.requiredPowers.length > 0) {
      html += `<li>Required Powers: ${experience.requiredPowers.length}</li>`;
    }
    
    html += `
        </ul>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Render participant list
   */
  renderParticipantList(instance) {
    if (!instance.participants || Object.keys(instance.participants).length === 0) {
      return '';
    }
    
    let html = `
      <div class="experience-participants">
        <h3 class="experience-participants-title">Participants (${Object.keys(instance.participants).length})</h3>
        <div class="experience-participants-list">
    `;
    
    // Add each participant
    Object.values(instance.participants).forEach(participant => {
      // Get initial for avatar
      const initial = participant.userId.charAt(0).toUpperCase();
      
      html += `
        <div class="experience-participant">
          <div class="experience-participant-avatar">${initial}</div>
          <span>${participant.userId}</span>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Render instance action buttons
   */
  renderInstanceActions(instance, experience) {
    const isCompleted = instance.status === 'Completed';
    const isFailed = instance.status === 'Failed';
    const isPending = instance.status === 'Scheduled';
    const isInProgress = instance.status === 'InProgress';
    
    if (isCompleted || isFailed) {
      return `
        <div style="text-align: center; margin-bottom: 10px;">
          <h3 style="margin-bottom: 5px;">${isCompleted ? 'Experience Completed!' : 'Experience Failed'}</h3>
          <p style="color: var(--experience-text-secondary);">
            ${isCompleted ? 'Congratulations on completing the experience!' : 'Better luck next time!'}
          </p>
        </div>
        <button class="experience-btn experience-btn-secondary" id="experience-leave">Return to List</button>
      `;
    }
    
    if (isPending) {
      return `
        <div style="text-align: center; margin-bottom: 10px;">
          <h3 style="margin-bottom: 5px;">Waiting to Start</h3>
          <p style="color: var(--experience-text-secondary);">
            Waiting for more participants...
          </p>
        </div>
        <button class="experience-btn experience-btn-danger" id="experience-leave">Leave Experience</button>
      `;
    }
    
    // In progress - show complete phase button
    if (isInProgress) {
      const currentPhase = experience.phases[instance.currentPhase];
      return `
        <button class="experience-btn experience-btn-success" id="experience-complete-phase">
          Complete: ${currentPhase.name}
        </button>
        <button class="experience-btn experience-btn-danger" id="experience-leave" style="margin-top: 8px;">
          Leave Experience
        </button>
      `;
    }
    
    return '';
  }
  
  /**
   * Show zone raid interface
   */
  showZoneRaid(zone, raid) {
    // Clear container content
    this.containerEl.innerHTML = `
      <div class="experience-header">
        <div>
          <h2 class="experience-title">Zone Raid</h2>
          <p class="experience-subtitle">${zone.name}</p>
        </div>
        <button class="experience-close-btn" id="raid-back">←</button>
      </div>
      
      <div class="zone-raid-container">
        <div class="zone-raid-map">
          <div style="text-align: center; color: var(--experience-text-secondary);">
            <div style="font-size: 24px;">🗺️</div>
            <div>Zone Map</div>
          </div>
        </div>
        
        <div class="zone-raid-team">
          <h3 class="zone-raid-team-name">Attackers</h3>
          <div class="zone-raid-team-score">${raid?.attackerScore || 0}</div>
        </div>
        
        <div class="zone-raid-vs">VS</div>
        
        <div class="zone-raid-team">
          <h3 class="zone-raid-team-name">Defenders</h3>
          <div class="zone-raid-team-score">${raid?.defenderScore || 0}</div>
        </div>
        
        <div class="zone-raid-status ${raid?.status === 'active' ? 'active' : ''}">
          ${raid?.status === 'active' ? 'Raid in Progress' : 'Raid Scheduled'}
        </div>
        
        <div class="zone-raid-timer">
          ${this.formatTime(raid?.timeRemaining || 600)}
        </div>
        
        <div class="zone-raid-actions">
          <button class="zone-raid-action-btn">
            <div class="zone-raid-action-icon">⚔️</div>
            <div class="zone-raid-action-label">Attack</div>
          </button>
          <button class="zone-raid-action-btn">
            <div class="zone-raid-action-icon">🛡️</div>
            <div class="zone-raid-action-label">Defend</div>
          </button>
          <button class="zone-raid-action-btn">
            <div class="zone-raid-action-icon">📊</div>
            <div class="zone-raid-action-label">Strategy</div>
          </button>
          <button class="zone-raid-action-btn">
            <div class="zone-raid-action-icon">👥</div>
            <div class="zone-raid-action-label">Team</div>
          </button>
        </div>
      </div>
    `;
    
    // Store reference to raid element
    this.raidEl = this.containerEl.querySelector('.zone-raid-container');
    
    // Setup event listeners
    const backBtn = this.containerEl.querySelector('#raid-back');
    backBtn.addEventListener('click', () => {
      this.showExperienceList();
    });
    
    // Action buttons
    const actionButtons = this.containerEl.querySelectorAll('.zone-raid-action-btn');
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.showToast('Coming Soon', 'This feature is not yet implemented', 'warning');
      });
    });
  }
  
  /**
   * Format time as mm:ss
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Update experiences from server state
   */
  updateExperiences(experienceMap) {
    try {
      // Clear existing experiences
      this.experiences.clear();

      // Parse and store new experiences
      experienceMap.forEach((experienceStr, id) => {
        try {
          const experience = JSON.parse(experienceStr);
          if (experience && typeof experience === 'object') {
            // Ensure required fields have default values
            experience.id = experience.id || id;
            experience.type = experience.type || 'Unknown';
            experience.name = experience.name || 'Untitled Experience';
            experience.description = experience.description || 'No description available.';
            experience.difficulty = experience.difficulty || 0;
            experience.estimatedDuration = experience.estimatedDuration || 0;
            experience.phases = experience.phases || [];
            
            this.experiences.set(id, experience);
          }
        } catch (e) {
          console.warn(`Failed to parse experience ${id}:`, e);
        }
      });

      // Refresh UI if visible
      if (!this.minimized && this.listEl) {
        this.populateExperienceList();
      }
    } catch (error) {
      console.error('Error updating experiences:', error);
    }
  }
  
  /**
   * Update experience instances from room state
   */
  updateExperienceInstances(instanceMap) {
    // Convert to Map for easier access
    if (instanceMap) {
      // Remember previous size to check for notifications
      const prevSize = this.activeInstances.size;
      
      // Find instances this player is participating in
      this.activeInstances = new Map();
      
      Object.entries(instanceMap).forEach(([id, instance]) => {
        // Ensure instance and participants exist
        if (instance && instance.participants && instance.participants.has) {
          // Check if current player is a participant
          if (instance.participants.has(this.room.sessionId)) {
            this.activeInstances.set(id, instance);
          }
        } else {
          console.warn(`Invalid instance or participants object for instance ${id}:`, instance);
        }
      });
      
      // Check if new instances were added
      if (this.activeInstances.size > prevSize) {
        this.updateNotificationCount(this.notificationCount + 1);
      }
      
      // Refresh UI if needed
      if (this.listEl && this.filterType === 'active') {
        this.populateExperienceList();
      }
      
      // Update detail view if showing an instance that was updated
      if (
        this.detailEl && 
        this.currentInstance && 
        this.activeInstances.has(this.currentInstance.id)
      ) {
        const instance = this.activeInstances.get(this.currentInstance.id);
        const experience = this.experiences.get(instance.experienceId);
        this.showExperienceDetail(experience, instance);
      }
    }
  }
  
  /**
   * Join an experience
   */
  joinExperience(experienceId) {
    this.room.send("experienceJoin", { experienceId });
  }
  
  /**
   * Complete a phase in an experience
   */
  completeExperiencePhase(instanceId, phaseIndex) {
    this.room.send("experiencePhaseComplete", {
      experienceId: this.activeInstances.get(instanceId).experienceId,
      phaseIndex,
      submission: {
        completed: true,
        timestamp: Date.now()
      }
    });
  }
  
  /**
   * Leave an experience
   */
  leaveExperience(instanceId) {
    // If completed, just go back to list
    const instance = this.activeInstances.get(instanceId);
    if (instance && (instance.status === 'Completed' || instance.status === 'Failed')) {
      this.showExperienceList();
      return;
    }
    
    // Otherwise, send leave message
    this.room.send("experienceLeave", {
      experienceId: instance.experienceId
    });
  }
  
  /**
   * Handle experience joined message
   */
  handleExperienceJoined(message) {
    this.showToast('Experience Joined', 'You have joined an experience', 'success');
    
    // Refresh experience list if in active filter
    if (this.listEl && this.filterType === 'active') {
      this.populateExperienceList();
    }
  }
  
  /**
   * Handle experience started message
   */
  handleExperienceStarted(message) {
    this.showToast('Experience Started', 'Your experience has started!', 'success');
    
    // If instance detail is currently shown, refresh it
    if (
      this.detailEl && 
      this.currentInstance && 
      this.currentInstance.id === message.instanceId
    ) {
      const instance = this.activeInstances.get(message.instanceId);
      const experience = this.experiences.get(message.experienceId);
      if (instance && experience) {
        this.showExperienceDetail(experience, instance);
      }
    }
  }
  
  /**
   * Handle experience phase changed message
   */
  handleExperiencePhaseChanged(message) {
    const experience = this.experiences.get(message.experienceId);
    const phaseName = message.phaseName || `Phase ${message.currentPhase + 1}`;
    
    this.showToast('Phase Completed', `Moving to ${phaseName}`, 'success');
    
    // If instance detail is currently shown, refresh it
    if (
      this.detailEl && 
      this.currentInstance && 
      this.currentInstance.id === message.instanceId
    ) {
      const instance = this.activeInstances.get(message.instanceId);
      if (instance && experience) {
        this.showExperienceDetail(experience, instance);
      }
    }
  }
  
  /**
   * Handle experience ended message
   */
  handleExperienceEnded(message) {
    const status = message.status;
    const title = status === 'Completed' ? 'Experience Completed' : 'Experience Failed';
    const msgText = status === 'Completed' 
      ? 'You have successfully completed the experience!' 
      : `Experience failed: ${message.reason || 'Unknown reason'}`;
    
    this.showToast(title, msgText, status === 'Completed' ? 'success' : 'error');
    
    // If instance detail is currently shown, refresh it
    if (
      this.detailEl && 
      this.currentInstance && 
      this.currentInstance.id === message.instanceId
    ) {
      const instance = this.activeInstances.get(message.instanceId);
      const experience = this.experiences.get(message.experienceId);
      if (experience) {
        this.showExperienceDetail(experience, instance);
      }
    }
  }
  
  /**
   * Handle experience participant left message
   */
  handleExperienceParticipantLeft(message) {
    this.showToast('Participant Left', `${message.username} has left the experience`);
    
    // If instance detail is currently shown, refresh it
    if (
      this.detailEl && 
      this.currentInstance && 
      this.currentInstance.id === message.instanceId
    ) {
      const instance = this.activeInstances.get(message.instanceId);
      const experience = this.experiences.get(instance.experienceId);
      if (instance && experience) {
        this.showExperienceDetail(experience, instance);
      }
    }
  }
  
  /**
   * Handle experience left message
   */
  handleExperienceLeft(message) {
    this.showToast('Left Experience', 'You have left the experience');
    
    // Go back to experience list
    this.showExperienceList();
  }
} 