/**
 * @file ExperienceRoom.ts
 * @description Colyseus room for handling experience instances
 */

import { Room, Client } from 'colyseus';
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { nanoid } from 'nanoid';

// Import services
import ExperienceService from '../services/ExperienceService.js';
import PowerService from '../services/PowerService.js';
import MarketService from '../services/MarketService.js';

// Define experience state schemas
class ParticipantState extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") avatar: string;
  @type("string") status: string = "ACTIVE"; // ACTIVE, INACTIVE, COMPLETED
  @type("number") progress: number = 0;
  @type("number") contribution: number = 0;
  @type("boolean") isHost: boolean = false;
  @type("number") joinedAt: number;
  @type(["string"]) achievements = new ArraySchema<string>();
  @type({ map: "number" }) resources = new MapSchema<number>();
  @type(["string"]) activePowers = new ArraySchema<string>();
}

class MilestoneState extends Schema {
  @type("string") id: string;
  @type("string") title: string;
  @type("string") description: string;
  @type("string") status: string = "PENDING"; // PENDING, ACTIVE, COMPLETED
  @type("number") requiredProgress: number;
  @type("number") actualProgress: number = 0;
  @type("number") order: number;
  @type({ map: "number" }) rewards = new MapSchema<number>();
}

class LocationState extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("number") lat: number;
  @type("number") lng: number;
  @type("string") description: string;
  @type("boolean") isUnlocked: boolean = false;
  @type({ map: "string" }) requirements = new MapSchema<string>();
  @type(["string"]) discoveredBy = new ArraySchema<string>();
}

class ActionState extends Schema {
  @type("string") id: string;
  @type("string") userId: string;
  @type("string") type: string;
  @type("string") target: string;
  @type("number") timestamp: number;
  @type("boolean") isProcessed: boolean = false;
  @type("number") value: number = 0;
  @type({ map: "any" }) metadata = new MapSchema<any>();
}

class ExperienceState extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") description: string;
  @type("string") type: string;
  @type("string") status: string = "WAITING"; // WAITING, IN_PROGRESS, PAUSED, COMPLETED, FAILED
  @type("string") phase: string = "PULL"; // PULL, THINK, DO, REVIEW
  @type("number") startedAt: number = 0;
  @type("number") endedAt: number = 0;
  @type("number") maxParticipants: number = 4;
  @type("number") minParticipants: number = 1;
  @type("number") currentProgress: number = 0;
  @type("number") targetProgress: number = 100;
  @type("number") timeLimit: number = 3600; // in seconds
  @type("number") timeRemaining: number = 3600;
  @type({ map: ParticipantState }) participants = new MapSchema<ParticipantState>();
  @type([MilestoneState]) milestones = new ArraySchema<MilestoneState>();
  @type([LocationState]) locations = new ArraySchema<LocationState>();
  @type([ActionState]) recentActions = new ArraySchema<ActionState>();
  @type({ map: "any" }) metadata = new MapSchema<any>();
}

/**
 * Experience Room for handling experience instances
 */
export class ExperienceRoom extends Room<ExperienceState> {
  private experienceData: any;
  private tickInterval: NodeJS.Timeout;
  private actionCount: number = 0;
  
  async onCreate(options: any) {
    // Initialize state
    this.setState(new ExperienceState());
    
    // Load experience data
    try {
      if (options.experienceId) {
        this.experienceData = await ExperienceService.getExperienceById(options.experienceId);
        
        if (!this.experienceData) {
          throw new Error(`Experience with ID ${options.experienceId} not found`);
        }
        
        // Configure room based on experience data
        this.state.id = this.experienceData._id.toString();
        this.state.name = this.experienceData.name;
        this.state.description = this.experienceData.description;
        this.state.type = this.experienceData.type;
        this.state.maxParticipants = this.experienceData.capacity?.max || 4;
        this.state.minParticipants = this.experienceData.capacity?.min || 1;
        this.state.targetProgress = this.experienceData.requirements?.progress || 100;
        this.state.timeLimit = this.experienceData.timeLimit || 3600;
        this.state.timeRemaining = this.state.timeLimit;
        
        // Add milestones
        if (this.experienceData.milestones && this.experienceData.milestones.length > 0) {
          this.experienceData.milestones.forEach((milestone, index) => {
            const milestoneState = new MilestoneState();
            milestoneState.id = milestone._id?.toString() || nanoid();
            milestoneState.title = milestone.title;
            milestoneState.description = milestone.description;
            milestoneState.requiredProgress = milestone.requiredProgress;
            milestoneState.order = index;
            
            if (milestone.rewards) {
              Object.entries(milestone.rewards).forEach(([key, value]) => {
                milestoneState.rewards[key] = value as number;
              });
            }
            
            this.state.milestones.push(milestoneState);
          });
        }
        
        // Add locations if applicable
        if (this.experienceData.locations && this.experienceData.locations.length > 0) {
          this.experienceData.locations.forEach(location => {
            const locationState = new LocationState();
            locationState.id = location._id?.toString() || nanoid();
            locationState.name = location.name;
            locationState.lat = location.coordinates?.lat || 0;
            locationState.lng = location.coordinates?.lng || 0;
            locationState.description = location.description;
            locationState.isUnlocked = location.isStartingPoint || false;
            
            if (location.requirements) {
              Object.entries(location.requirements).forEach(([key, value]) => {
                locationState.requirements[key] = value as string;
              });
            }
            
            this.state.locations.push(locationState);
          });
        }
      } else {
        // Create a quick generic experience if none specified
        this.state.id = nanoid();
        this.state.name = options.name || "Dynamic Experience";
        this.state.description = options.description || "An impromptu experience";
        this.state.type = options.type || "QUEST";
      }
      
      // Set up room metadata
      this.setMetadata({
        name: this.state.name,
        type: this.state.type,
        maxParticipants: this.state.maxParticipants
      });
    } catch (error) {
      console.error("Error setting up experience room:", error);
      this.state.status = "FAILED";
    }
    
    // Register message handlers
    this.registerMessageHandlers();
    
    // Set tick interval for game updates
    this.tickInterval = setInterval(() => this.tick(), 1000);
    
    console.log(`Experience room created: ${this.state.name} (${this.state.id})`);
  }

  onJoin(client: Client, options: any) {
    try {
      // Check if experience can accept new participants
      if (this.state.status === "COMPLETED" || this.state.status === "FAILED") {
        throw new Error("Cannot join a completed or failed experience");
      }
      
      if (Object.keys(this.state.participants).length >= this.state.maxParticipants) {
        throw new Error("Experience is at max capacity");
      }
      
      // Create participant state
      const participant = new ParticipantState();
      participant.id = client.sessionId;
      participant.name = options.name || "Anonymous";
      participant.avatar = options.avatar || "default.png";
      participant.joinedAt = Date.now();
      participant.isHost = Object.keys(this.state.participants).length === 0; // First participant is host
      
      // Add to state
      this.state.participants[client.sessionId] = participant;
      
      // Check if experience can start
      this.checkExperienceStatus();
      
      console.log(`Participant ${participant.name} (${client.sessionId}) joined experience ${this.state.name}`);
    } catch (error) {
      console.error(`Error on client join:`, error);
      // Force disconnect with error message
      client.leave(1000, error.message);
    }
  }
  
  onLeave(client: Client, consented: boolean) {
    if (this.state.participants[client.sessionId]) {
      const participant = this.state.participants[client.sessionId];
      
      // If the host leaves, assign a new host if possible
      if (participant.isHost) {
        const remainingParticipants = Object.entries(this.state.participants)
          .filter(([id]) => id !== client.sessionId);
          
        if (remainingParticipants.length > 0) {
          // Assign the oldest participant as the new host
          const oldestParticipant = remainingParticipants.sort(([, a], [, b]) => 
            a.joinedAt - b.joinedAt
          )[0];
          
          this.state.participants[oldestParticipant[0]].isHost = true;
        }
      }
      
      // Mark participant as inactive instead of removing immediately
      participant.status = "INACTIVE";
      
      console.log(`Participant ${participant.name} (${client.sessionId}) left experience ${this.state.name}`);
      
      // Check if experience can continue
      this.checkExperienceStatus();
      
      // Remove participant after a grace period (in case they reconnect)
      setTimeout(() => {
        if (this.state.participants[client.sessionId]?.status === "INACTIVE") {
          delete this.state.participants[client.sessionId];
          console.log(`Participant ${participant.name} (${client.sessionId}) removed from experience ${this.state.name}`);
        }
      }, 60000); // 1 minute grace period
    }
  }
  
  onDispose() {
    // Clean up timers
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    // Record experience completion
    this.finalizeExperience();
    
    console.log(`Experience room disposed: ${this.state.name} (${this.state.id})`);
  }
  
  /**
   * Register message handlers for client<>server communication
   */
  private registerMessageHandlers() {
    this.onMessage("action", (client, data) => {
      this.handleClientAction(client, data);
    });
    
    this.onMessage("chat", (client, message) => {
      if (this.state.participants[client.sessionId]) {
        this.broadcast("chat", {
          sender: this.state.participants[client.sessionId].name,
          senderId: client.sessionId,
          text: message,
          timestamp: Date.now()
        });
      }
    });
    
    this.onMessage("usePower", (client, data) => {
      this.handlePowerUse(client, data);
    });
    
    this.onMessage("milestone", (client, data) => {
      this.handleMilestoneUpdate(client, data);
    });
    
    this.onMessage("location", (client, data) => {
      this.handleLocationDiscovery(client, data);
    });
    
    this.onMessage("status", (client, status) => {
      if (this.state.participants[client.sessionId]) {
        const participant = this.state.participants[client.sessionId];
        participant.status = status;
        
        // Check if experience can continue or is completed
        this.checkExperienceStatus();
      }
    });
    
    this.onMessage("host", (client, command) => {
      // Host-only commands
      if (this.state.participants[client.sessionId]?.isHost) {
        switch (command.type) {
          case "start":
            this.startExperience();
            break;
          case "pause":
            this.pauseExperience();
            break;
          case "resume":
            this.resumeExperience();
            break;
          case "end":
            this.endExperience(command.success || false);
            break;
          case "nextPhase":
            this.advancePhase();
            break;
        }
      }
    });
  }
  
  /**
   * Handle client action
   */
  private handleClientAction(client: Client, data: any) {
    if (!this.state.participants[client.sessionId]) return;
    if (this.state.status !== "IN_PROGRESS") return;
    
    try {
      const participant = this.state.participants[client.sessionId];
      
      // Create action record
      const action = new ActionState();
      action.id = `${this.actionCount++}`;
      action.userId = client.sessionId;
      action.type = data.type;
      action.target = data.target || "";
      action.timestamp = Date.now();
      action.value = data.value || 1;
      
      if (data.metadata) {
        Object.entries(data.metadata).forEach(([key, value]) => {
          action.metadata[key] = value;
        });
      }
      
      // Process action based on type
      switch (data.type) {
        case "PROGRESS":
          // Add to participant and overall progress
          participant.progress += data.value || 1;
          participant.contribution += data.value || 1;
          this.updateProgress(data.value || 1);
          break;
          
        case "RESOURCE_COLLECT":
          // Add resource to participant
          const resourceType = data.resourceType || "DEFAULT";
          participant.resources[resourceType] = (participant.resources[resourceType] || 0) + (data.value || 1);
          break;
          
        case "INTERACTION":
          // Just record the interaction
          break;
      }
      
      // Add to recent actions
      this.state.recentActions.push(action);
      
      // Keep only the last 20 actions
      while (this.state.recentActions.length > 20) {
        this.state.recentActions.shift();
      }
      
      // Mark action as processed
      action.isProcessed = true;
      
      // Trigger random power discovery chance
      this.checkPowerDiscovery(client.sessionId, action);
      
    } catch (error) {
      console.error("Error processing client action:", error);
    }
  }
  
  /**
   * Handle power use by participant
   */
  private async handlePowerUse(client: Client, data: any) {
    if (!this.state.participants[client.sessionId]) return;
    if (this.state.status !== "IN_PROGRESS") return;
    
    try {
      const result = await PowerService.usePower(
        client.sessionId,
        data.powerId,
        {
          location: data.location,
          experienceId: this.state.id,
          experienceType: this.state.type,
          phase: this.state.phase
        }
      );
      
      // Send result back to client
      this.send(client, "powerResult", {
        powerId: data.powerId,
        success: result.success,
        effect: result.effect,
        cooldown: result.cooldown,
        error: result.error
      });
      
      // If successful, broadcast power use to all participants
      if (result.success) {
        const participant = this.state.participants[client.sessionId];
        
        // Add to active powers if not already there
        if (!participant.activePowers.includes(data.powerId)) {
          participant.activePowers.push(data.powerId);
          
          // Remove after effect duration expires
          const effectDuration = result.effect?.[0]?.duration || 60;
          setTimeout(() => {
            const index = participant.activePowers.indexOf(data.powerId);
            if (index !== -1) {
              participant.activePowers.splice(index, 1);
            }
          }, effectDuration * 1000);
        }
        
        // Broadcast to room
        this.broadcast("powerUsed", {
          userId: client.sessionId,
          userName: participant.name,
          powerId: data.powerId,
          effect: result.effect
        });
      }
    } catch (error) {
      console.error("Error processing power use:", error);
    }
  }
  
  /**
   * Handle milestone updates
   */
  private handleMilestoneUpdate(client: Client, data: any) {
    if (!this.state.participants[client.sessionId]?.isHost) return;
    
    try {
      const milestone = this.state.milestones.find(m => m.id === data.id);
      if (milestone) {
        if (data.status) milestone.status = data.status;
        if (data.actualProgress !== undefined) milestone.actualProgress = data.actualProgress;
        
        // Check if milestone is completed
        if (milestone.status !== "COMPLETED" && milestone.actualProgress >= milestone.requiredProgress) {
          milestone.status = "COMPLETED";
          
          // Broadcast milestone completion
          this.broadcast("milestoneCompleted", {
            id: milestone.id,
            title: milestone.title,
            rewards: Object.fromEntries(milestone.rewards.entries())
          });
          
          // Distribute rewards if specified
          if (data.distributeRewards && Object.keys(milestone.rewards).length > 0) {
            this.distributeMilestoneRewards(milestone);
          }
        }
      }
    } catch (error) {
      console.error("Error updating milestone:", error);
    }
  }
  
  /**
   * Handle location discovery
   */
  private handleLocationDiscovery(client: Client, data: any) {
    if (!this.state.participants[client.sessionId]) return;
    
    try {
      const location = this.state.locations.find(l => l.id === data.id);
      if (location && !location.discoveredBy.includes(client.sessionId)) {
        // Add user to discovered list
        location.discoveredBy.push(client.sessionId);
        
        // Check if this unlocks the location
        if (!location.isUnlocked) {
          const allRequirementsMet = Object.entries(location.requirements).every(([req, val]) => {
            // Check if requirement is met
            switch (req) {
              case "minDiscoverers":
                return location.discoveredBy.length >= parseInt(val);
              case "previousLocation":
                const prevLoc = this.state.locations.find(l => l.id === val);
                return prevLoc && prevLoc.isUnlocked;
              default:
                return true;
            }
          });
          
          if (allRequirementsMet) {
            location.isUnlocked = true;
            
            // Broadcast location unlock
            this.broadcast("locationUnlocked", {
              id: location.id,
              name: location.name,
              discoveredBy: Array.from(location.discoveredBy)
            });
          }
        }
      }
    } catch (error) {
      console.error("Error processing location discovery:", error);
    }
  }
  
  /**
   * Game tick - update timers and state
   */
  private tick() {
    if (this.state.status !== "IN_PROGRESS") return;
    
    // Update time remaining
    if (this.state.timeLimit > 0) {
      this.state.timeRemaining = Math.max(0, this.state.timeRemaining - 1);
      
      // Check for time expiration
      if (this.state.timeRemaining <= 0) {
        // Determine if experience was successful based on progress
        const success = this.state.currentProgress >= this.state.targetProgress;
        this.endExperience(success);
        return;
      }
    }
    
    // Update current milestone progress
    const activeMilestone = this.state.milestones.find(m => m.status === "ACTIVE");
    if (activeMilestone) {
      activeMilestone.actualProgress = Math.min(
        activeMilestone.requiredProgress,
        this.state.currentProgress
      );
      
      // Check if milestone is complete
      if (activeMilestone.actualProgress >= activeMilestone.requiredProgress) {
        activeMilestone.status = "COMPLETED";
        
        // Broadcast milestone completion
        this.broadcast("milestoneCompleted", {
          id: activeMilestone.id,
          title: activeMilestone.title,
          rewards: Object.fromEntries(activeMilestone.rewards.entries())
        });
        
        // Distribute rewards
        this.distributeMilestoneRewards(activeMilestone);
        
        // Activate next milestone
        const nextMilestone = this.state.milestones
          .filter(m => m.status === "PENDING")
          .sort((a, b) => a.order - b.order)[0];
          
        if (nextMilestone) {
          nextMilestone.status = "ACTIVE";
          
          // Broadcast next milestone activation
          this.broadcast("milestoneActivated", {
            id: nextMilestone.id,
            title: nextMilestone.title,
            requiredProgress: nextMilestone.requiredProgress
          });
        }
      }
    }
  }
  
  /**
   * Start the experience
   */
  private startExperience() {
    if (this.state.status !== "WAITING") return;
    
    // Check if we have minimum participants
    if (Object.keys(this.state.participants).length < this.state.minParticipants) {
      this.broadcast("notification", {
        type: "error",
        message: `Need at least ${this.state.minParticipants} participants to start`
      });
      return;
    }
    
    // Set state and record start time
    this.state.status = "IN_PROGRESS";
    this.state.startedAt = Date.now();
    
    // Activate first milestone
    const firstMilestone = this.state.milestones
      .sort((a, b) => a.order - b.order)[0];
      
    if (firstMilestone) {
      firstMilestone.status = "ACTIVE";
      
      // Broadcast milestone activation
      this.broadcast("milestoneActivated", {
        id: firstMilestone.id,
        title: firstMilestone.title,
        requiredProgress: firstMilestone.requiredProgress
      });
    }
    
    // Broadcast start event
    this.broadcast("experienceStarted", {
      startedAt: this.state.startedAt,
      timeLimit: this.state.timeLimit,
      targetProgress: this.state.targetProgress
    });
    
    console.log(`Experience ${this.state.name} started with ${Object.keys(this.state.participants).length} participants`);
  }
  
  /**
   * Pause the experience
   */
  private pauseExperience() {
    if (this.state.status !== "IN_PROGRESS") return;
    
    this.state.status = "PAUSED";
    
    // Broadcast pause event
    this.broadcast("experiencePaused", {
      pausedAt: Date.now(),
      timeRemaining: this.state.timeRemaining
    });
    
    console.log(`Experience ${this.state.name} paused with ${this.state.timeRemaining}s remaining`);
  }
  
  /**
   * Resume the experience
   */
  private resumeExperience() {
    if (this.state.status !== "PAUSED") return;
    
    this.state.status = "IN_PROGRESS";
    
    // Broadcast resume event
    this.broadcast("experienceResumed", {
      resumedAt: Date.now(),
      timeRemaining: this.state.timeRemaining
    });
    
    console.log(`Experience ${this.state.name} resumed with ${this.state.timeRemaining}s remaining`);
  }
  
  /**
   * End the experience
   */
  private endExperience(success: boolean = true) {
    if (this.state.status !== "IN_PROGRESS" && this.state.status !== "PAUSED") return;
    
    this.state.status = success ? "COMPLETED" : "FAILED";
    this.state.endedAt = Date.now();
    
    // Broadcast end event
    this.broadcast("experienceEnded", {
      endedAt: this.state.endedAt,
      success,
      duration: Math.floor((this.state.endedAt - this.state.startedAt) / 1000),
      progress: this.state.currentProgress,
      target: this.state.targetProgress
    });
    
    // Finalize the experience record
    this.finalizeExperience();
    
    console.log(`Experience ${this.state.name} ended with success=${success}, progress=${this.state.currentProgress}/${this.state.targetProgress}`);
  }
  
  /**
   * Advance to next phase of the experience
   */
  private advancePhase() {
    const phases = ["PULL", "THINK", "DO", "REVIEW"];
    const currentIndex = phases.indexOf(this.state.phase);
    
    if (currentIndex >= 0 && currentIndex < phases.length - 1) {
      this.state.phase = phases[currentIndex + 1];
      
      // Broadcast phase change
      this.broadcast("phaseChanged", {
        phase: this.state.phase,
        timestamp: Date.now()
      });
      
      console.log(`Experience ${this.state.name} advanced to phase ${this.state.phase}`);
    } else if (currentIndex === phases.length - 1) {
      // If we're at the last phase, complete the experience
      this.endExperience(true);
    }
  }
  
  /**
   * Update overall progress
   */
  private updateProgress(amount: number) {
    // Update current progress
    this.state.currentProgress = Math.min(
      this.state.targetProgress,
      this.state.currentProgress + amount
    );
    
    // Check if experience is complete based on progress
    if (this.state.currentProgress >= this.state.targetProgress) {
      this.endExperience(true);
    }
  }
  
  /**
   * Distribute rewards for milestone completion
   */
  private distributeMilestoneRewards(milestone: MilestoneState) {
    try {
      // Get all active participants
      const activeParticipants = Object.entries(this.state.participants)
        .filter(([, p]) => p.status === "ACTIVE");
      
      if (activeParticipants.length === 0) return;
      
      // Extract rewards
      const rewards = Object.fromEntries(milestone.rewards.entries());
      
      // Distribute to participants
      activeParticipants.forEach(([id, participant]) => {
        // Add resources to participant
        Object.entries(rewards).forEach(([key, value]) => {
          participant.resources[key] = (participant.resources[key] || 0) + (value as number);
        });
        
        // Send reward notification
        this.send(this.clients.get(id), "reward", {
          type: "milestone",
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          rewards
        });
      });
    } catch (error) {
      console.error("Error distributing milestone rewards:", error);
    }
  }
  
  /**
   * Check for random power discovery chances
   */
  private async checkPowerDiscovery(userId: string, action: ActionState) {
    try {
      // Each action has a small chance to discover a power
      if (Math.random() < 0.05) { // 5% chance
        const discoveredPower = await PowerService.generateRandomPowerDrop(
          userId,
          {
            location: action.metadata.location,
            experienceId: this.state.id,
            experienceType: this.state.type,
            actionType: action.type,
            discoveryMethod: "EXPERIENCE_ACTION"
          }
        );
        
        if (discoveredPower) {
          // Send power discovery notification to this player only
          this.send(this.clients.get(userId), "powerDiscovered", {
            powerId: discoveredPower._id.toString(),
            name: discoveredPower.name,
            type: discoveredPower.type,
            rarity: discoveredPower.rarity,
            description: discoveredPower.description,
            context: action.type
          });
        }
      }
    } catch (error) {
      console.error("Error checking for power discovery:", error);
    }
  }
  
  /**
   * Check if experience status needs to change
   */
  private checkExperienceStatus() {
    // Count active participants
    const activeParticipants = Object.values(this.state.participants)
      .filter(p => p.status === "ACTIVE").length;
    
    // If in progress but below minimum participants, pause
    if (this.state.status === "IN_PROGRESS" && activeParticipants < this.state.minParticipants) {
      this.pauseExperience();
    }
    
    // If everyone is "COMPLETED", end the experience
    const allCompleted = Object.values(this.state.participants).length > 0 && 
      Object.values(this.state.participants).every(p => p.status === "COMPLETED");
      
    if (allCompleted) {
      this.endExperience(true);
    }
  }
  
  /**
   * Save experience outcome to database
   */
  private async finalizeExperience() {
    try {
      if (this.state.startedAt === 0) return; // Experience never started
      
      // Create summary of participants
      const participants = Object.entries(this.state.participants).map(([id, p]) => ({
        userId: id,
        name: p.name,
        progress: p.progress,
        contribution: p.contribution,
        status: p.status,
        resources: Object.fromEntries(p.resources.entries()),
        achievements: Array.from(p.achievements)
      }));
      
      // Create experience instance record
      await ExperienceService.createExperienceInstance({
        experienceId: this.state.id,
        name: this.state.name,
        type: this.state.type,
        startedAt: new Date(this.state.startedAt),
        endedAt: new Date(this.state.endedAt || Date.now()),
        status: this.state.status,
        progress: {
          current: this.state.currentProgress,
          target: this.state.targetProgress
        },
        participants,
        milestones: this.state.milestones.map(m => ({
          id: m.id,
          title: m.title,
          status: m.status,
          progress: m.actualProgress,
          required: m.requiredProgress
        })),
        metadata: Object.fromEntries(this.state.metadata.entries())
      });
      
      // Reward participants with coins and resources
      await this.rewardParticipants();
      
    } catch (error) {
      console.error("Error finalizing experience:", error);
    }
  }
  
  /**
   * Distribute final rewards to participants
   */
  private async rewardParticipants() {
    try {
      const success = this.state.status === "COMPLETED";
      const participants = Object.entries(this.state.participants);
      
      for (const [id, participant] of participants) {
        // Calculate reward based on contribution and success
        const progressPercent = this.state.targetProgress > 0 ? 
          this.state.currentProgress / this.state.targetProgress : 0;
          
        const contributionPercent = participant.contribution / 
          Math.max(1, this.state.currentProgress);
          
        // Base rewards
        const baseCoins = success ? 50 : 10;
        const progressBonus = Math.floor(progressPercent * 100);
        const contributionBonus = Math.floor(contributionPercent * 100);
        
        const totalCoins = baseCoins + progressBonus + contributionBonus;
        
        // Basic resources based on experience type
        const resources = {
          DATA: Math.floor(progressPercent * 20),
          ENERGY: Math.floor(progressPercent * 15)
        };
        
        // Add special resources based on experience type
        switch (this.state.type) {
          case "QUEST":
            resources.WISDOM = Math.floor(progressPercent * 10);
            break;
          case "CHALLENGE":
            resources.INFLUENCE = Math.floor(progressPercent * 5);
            break;
          case "EXPEDITION":
            resources.MATERIALS = Math.floor(progressPercent * 10);
            break;
        }
        
        // Create reward transaction
        await MarketService.createRewardTransaction(id, {
          coins: totalCoins,
          resources
        });
        
        // Send final rewards notification
        this.send(this.clients.get(id), "finalRewards", {
          coins: totalCoins,
          resources,
          bonuses: {
            progress: progressBonus,
            contribution: contributionBonus
          },
          experienceId: this.state.id,
          experienceName: this.state.name
        });
      }
    } catch (error) {
      console.error("Error rewarding participants:", error);
    }
  }
} 