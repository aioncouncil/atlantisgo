/**
 * @file ExperienceRoom.ts
 * @description Colyseus room for handling experience instances
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Room } from 'colyseus';
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { nanoid } from 'nanoid';
// Import services
import ExperienceService from '../services/ExperienceService.js';
import PowerService from '../services/PowerService.js';
import MarketService from '../services/MarketService.js';
// Define experience state schemas
class ParticipantState extends Schema {
    constructor() {
        super(...arguments);
        this.status = "ACTIVE"; // ACTIVE, INACTIVE, COMPLETED
        this.progress = 0;
        this.contribution = 0;
        this.isHost = false;
        this.achievements = new ArraySchema();
        this.resources = new MapSchema();
        this.activePowers = new ArraySchema();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], ParticipantState.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ParticipantState.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ParticipantState.prototype, "avatar", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ParticipantState.prototype, "status", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ParticipantState.prototype, "progress", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ParticipantState.prototype, "contribution", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], ParticipantState.prototype, "isHost", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ParticipantState.prototype, "joinedAt", void 0);
__decorate([
    type(["string"]),
    __metadata("design:type", Object)
], ParticipantState.prototype, "achievements", void 0);
__decorate([
    type({ map: "number" }),
    __metadata("design:type", Object)
], ParticipantState.prototype, "resources", void 0);
__decorate([
    type(["string"]),
    __metadata("design:type", Object)
], ParticipantState.prototype, "activePowers", void 0);
class MilestoneState extends Schema {
    constructor() {
        super(...arguments);
        this.status = "PENDING"; // PENDING, ACTIVE, COMPLETED
        this.actualProgress = 0;
        this.rewards = new MapSchema();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], MilestoneState.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], MilestoneState.prototype, "title", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], MilestoneState.prototype, "description", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], MilestoneState.prototype, "status", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], MilestoneState.prototype, "requiredProgress", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], MilestoneState.prototype, "actualProgress", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], MilestoneState.prototype, "order", void 0);
__decorate([
    type({ map: "number" }),
    __metadata("design:type", Object)
], MilestoneState.prototype, "rewards", void 0);
class LocationState extends Schema {
    constructor() {
        super(...arguments);
        this.isUnlocked = false;
        this.requirements = new MapSchema();
        this.discoveredBy = new ArraySchema();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], LocationState.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], LocationState.prototype, "name", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], LocationState.prototype, "lat", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], LocationState.prototype, "lng", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], LocationState.prototype, "description", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], LocationState.prototype, "isUnlocked", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], LocationState.prototype, "requirements", void 0);
__decorate([
    type(["string"]),
    __metadata("design:type", Object)
], LocationState.prototype, "discoveredBy", void 0);
class ActionState extends Schema {
    constructor() {
        super(...arguments);
        this.isProcessed = false;
        this.value = 0;
        this.metadata = new MapSchema();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], ActionState.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ActionState.prototype, "userId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ActionState.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ActionState.prototype, "target", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ActionState.prototype, "timestamp", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], ActionState.prototype, "isProcessed", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ActionState.prototype, "value", void 0);
__decorate([
    type({ map: "any" }),
    __metadata("design:type", Object)
], ActionState.prototype, "metadata", void 0);
class ExperienceState extends Schema {
    constructor() {
        super(...arguments);
        this.status = "WAITING"; // WAITING, IN_PROGRESS, PAUSED, COMPLETED, FAILED
        this.phase = "PULL"; // PULL, THINK, DO, REVIEW
        this.startedAt = 0;
        this.endedAt = 0;
        this.maxParticipants = 4;
        this.minParticipants = 1;
        this.currentProgress = 0;
        this.targetProgress = 100;
        this.timeLimit = 3600; // in seconds
        this.timeRemaining = 3600;
        this.participants = new MapSchema();
        this.milestones = new ArraySchema();
        this.locations = new ArraySchema();
        this.recentActions = new ArraySchema();
        this.metadata = new MapSchema();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceState.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceState.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceState.prototype, "description", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceState.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceState.prototype, "status", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceState.prototype, "phase", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "startedAt", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "endedAt", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "maxParticipants", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "minParticipants", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "currentProgress", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "targetProgress", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "timeLimit", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceState.prototype, "timeRemaining", void 0);
__decorate([
    type({ map: ParticipantState }),
    __metadata("design:type", Object)
], ExperienceState.prototype, "participants", void 0);
__decorate([
    type([MilestoneState]),
    __metadata("design:type", Object)
], ExperienceState.prototype, "milestones", void 0);
__decorate([
    type([LocationState]),
    __metadata("design:type", Object)
], ExperienceState.prototype, "locations", void 0);
__decorate([
    type([ActionState]),
    __metadata("design:type", Object)
], ExperienceState.prototype, "recentActions", void 0);
__decorate([
    type({ map: "any" }),
    __metadata("design:type", Object)
], ExperienceState.prototype, "metadata", void 0);
/**
 * Experience Room for handling experience instances
 */
export class ExperienceRoom extends Room {
    constructor() {
        super(...arguments);
        this.actionCount = 0;
    }
    async onCreate(options) {
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
                                milestoneState.rewards[key] = value;
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
                                locationState.requirements[key] = value;
                            });
                        }
                        this.state.locations.push(locationState);
                    });
                }
            }
            else {
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
        }
        catch (error) {
            console.error("Error setting up experience room:", error);
            this.state.status = "FAILED";
        }
        // Register message handlers
        this.registerMessageHandlers();
        // Set tick interval for game updates
        this.tickInterval = setInterval(() => this.tick(), 1000);
        console.log(`Experience room created: ${this.state.name} (${this.state.id})`);
    }
    onJoin(client, options) {
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
        }
        catch (error) {
            console.error(`Error on client join:`, error);
            // Force disconnect with error message
            client.leave(1000, error.message);
        }
    }
    onLeave(client, consented) {
        if (this.state.participants[client.sessionId]) {
            const participant = this.state.participants[client.sessionId];
            // If the host leaves, assign a new host if possible
            if (participant.isHost) {
                const remainingParticipants = Object.entries(this.state.participants)
                    .filter(([id]) => id !== client.sessionId);
                if (remainingParticipants.length > 0) {
                    // Assign the oldest participant as the new host
                    const oldestParticipant = remainingParticipants.sort(([, a], [, b]) => a.joinedAt - b.joinedAt)[0];
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
    registerMessageHandlers() {
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
    handleClientAction(client, data) {
        if (!this.state.participants[client.sessionId])
            return;
        if (this.state.status !== "IN_PROGRESS")
            return;
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
        }
        catch (error) {
            console.error("Error processing client action:", error);
        }
    }
    /**
     * Handle power use by participant
     */
    async handlePowerUse(client, data) {
        if (!this.state.participants[client.sessionId])
            return;
        if (this.state.status !== "IN_PROGRESS")
            return;
        try {
            const result = await PowerService.usePower(client.sessionId, data.powerId, {
                location: data.location,
                experienceId: this.state.id,
                experienceType: this.state.type,
                phase: this.state.phase
            });
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
        }
        catch (error) {
            console.error("Error processing power use:", error);
        }
    }
    /**
     * Handle milestone updates
     */
    handleMilestoneUpdate(client, data) {
        if (!this.state.participants[client.sessionId]?.isHost)
            return;
        try {
            const milestone = this.state.milestones.find(m => m.id === data.id);
            if (milestone) {
                if (data.status)
                    milestone.status = data.status;
                if (data.actualProgress !== undefined)
                    milestone.actualProgress = data.actualProgress;
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
        }
        catch (error) {
            console.error("Error updating milestone:", error);
        }
    }
    /**
     * Handle location discovery
     */
    handleLocationDiscovery(client, data) {
        if (!this.state.participants[client.sessionId])
            return;
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
        }
        catch (error) {
            console.error("Error processing location discovery:", error);
        }
    }
    /**
     * Game tick - update timers and state
     */
    tick() {
        if (this.state.status !== "IN_PROGRESS")
            return;
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
            activeMilestone.actualProgress = Math.min(activeMilestone.requiredProgress, this.state.currentProgress);
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
    startExperience() {
        if (this.state.status !== "WAITING")
            return;
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
    pauseExperience() {
        if (this.state.status !== "IN_PROGRESS")
            return;
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
    resumeExperience() {
        if (this.state.status !== "PAUSED")
            return;
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
    endExperience(success = true) {
        if (this.state.status !== "IN_PROGRESS" && this.state.status !== "PAUSED")
            return;
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
    advancePhase() {
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
        }
        else if (currentIndex === phases.length - 1) {
            // If we're at the last phase, complete the experience
            this.endExperience(true);
        }
    }
    /**
     * Update overall progress
     */
    updateProgress(amount) {
        // Update current progress
        this.state.currentProgress = Math.min(this.state.targetProgress, this.state.currentProgress + amount);
        // Check if experience is complete based on progress
        if (this.state.currentProgress >= this.state.targetProgress) {
            this.endExperience(true);
        }
    }
    /**
     * Distribute rewards for milestone completion
     */
    distributeMilestoneRewards(milestone) {
        try {
            // Get all active participants
            const activeParticipants = Object.entries(this.state.participants)
                .filter(([, p]) => p.status === "ACTIVE");
            if (activeParticipants.length === 0)
                return;
            // Extract rewards
            const rewards = Object.fromEntries(milestone.rewards.entries());
            // Distribute to participants
            activeParticipants.forEach(([id, participant]) => {
                // Add resources to participant
                Object.entries(rewards).forEach(([key, value]) => {
                    participant.resources[key] = (participant.resources[key] || 0) + value;
                });
                // Send reward notification
                this.send(this.clients.get(id), "reward", {
                    type: "milestone",
                    milestoneId: milestone.id,
                    milestoneTitle: milestone.title,
                    rewards
                });
            });
        }
        catch (error) {
            console.error("Error distributing milestone rewards:", error);
        }
    }
    /**
     * Check for random power discovery chances
     */
    async checkPowerDiscovery(userId, action) {
        try {
            // Each action has a small chance to discover a power
            if (Math.random() < 0.05) { // 5% chance
                const discoveredPower = await PowerService.generateRandomPowerDrop(userId, {
                    location: action.metadata.location,
                    experienceId: this.state.id,
                    experienceType: this.state.type,
                    actionType: action.type,
                    discoveryMethod: "EXPERIENCE_ACTION"
                });
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
        }
        catch (error) {
            console.error("Error checking for power discovery:", error);
        }
    }
    /**
     * Check if experience status needs to change
     */
    checkExperienceStatus() {
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
    async finalizeExperience() {
        try {
            if (this.state.startedAt === 0)
                return; // Experience never started
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
        }
        catch (error) {
            console.error("Error finalizing experience:", error);
        }
    }
    /**
     * Distribute final rewards to participants
     */
    async rewardParticipants() {
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
        }
        catch (error) {
            console.error("Error rewarding participants:", error);
        }
    }
}
//# sourceMappingURL=ExperienceRoom.js.map