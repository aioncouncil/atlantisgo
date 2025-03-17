/**
 * @file rooms/WorldRoom.ts
 * @description Primary multiplayer room for Atlantis Go's world
 * 
 * This room handles:
 * - Player movement and presence
 * - Power spawning and capturing
 * - Zone interactions
 * - Real-time state synchronization
 */

import { Room, Client, Delayed, ServerError } from '@colyseus/core';
import { MapSchema } from '@colyseus/schema';
import { SimplifiedWorldState, SimplePlayer, SimplePower, SimpleZone } from '../schemas/BaseSchema.js';
import { Player, Zone } from '../schemas/GameEntities.js';
import { Position, UserMetadata, VirtuePoints } from '../schemas/index.js';
import { PowerCollection, Power } from '../schemas/PowerSchema.js';
import { PowerService } from '../services/PowerService.js';
import { ExperienceService, type Experience } from '../services/ExperienceService.js';
import { nanoid } from 'nanoid';
import { SimplePosition } from '../types.js';
import { ExperienceInstance } from '../schemas/ExperienceSchema.js';

// Define RoomOptions type
interface RoomOptions {
  name?: string;
  description?: string;
  maxPlayers?: number;
  regionId?: string;
}

// Player metadata values interface
interface MetadataValues {
  userId: string;
  username: string;
  rank?: number;
  avatarUrl?: string;
}

// Type definitions for the capture challenge
interface CaptureChallenge {
  type: string;
  prompt: string;
  minLength?: number;
  options?: string[];
  correctIndex?: number;
}

// Definitions for message types
interface MovementMessage {
  x: number;
  y: number;
}

interface PowerInteractionMessage {
  powerId: string;
  type: string;
  data?: any;
}

interface ExperienceInteractionMessage {
  experienceId: string;
  type: string;
  data?: any;
}

interface PlayerStatusMessage {
  state?: string;
}

// Configuration constants
const CONFIG = {
  PLAYER_INACTIVE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  POWER_SPAWN_INTERVAL: 60 * 1000, // 1 minute
  MAX_POWERS_PER_AREA: 10,
  VISIBILITY_RADIUS: 1000, // meters
  INTERACTION_RADIUS: 5000, // meters - increased for testing (was 50)
  POWER_MAX_COUNT: 50,
  POWER_DENSITY: 0.001, // powers per square meter
  POWER_LIFETIME: 3600000, // 1 hour in ms
  WORLD_SIZE: {
    WIDTH: 10000, // meters
    HEIGHT: 10000, // meters
  },
  ZONE_MAX_COUNT: 30,
  WORLD_UPDATE_INTERVAL: 1000, // 1 second in ms
  MAX_PLAYERS: 100, // Maximum players in the room
  RATE_LIMIT: {
    MOVEMENT: {
      WINDOW_MS: 1000, // 1 second
      MAX_REQUESTS: 5 // 5 requests per second
    },
    ACTION: {
      WINDOW_MS: 1000, // 1 second
      MAX_REQUESTS: 3 // 3 requests per second
    }
  },
  // Added more efficient configuration
  BATCH_UPDATES: true,
  BROADCAST_THROTTLE_MS: 100, // Throttle broadcasts
  ENTITY_CULLING_DISTANCE: 2000, // Only send entities within this distance
  OPTIMIZE_NETWORK: true, // Enable network optimizations
  EXPERIENCE_SPAWN_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_EXPERIENCES_PER_AREA: 5,
  EXPERIENCE_MAX_COUNT: 30,
  EXPERIENCE_DENSITY: 0.0002, // Experiences per square meter
  EXPERIENCE_LIFETIME: 24 * 3600000, // 24 hours in ms
};

interface GeneratedPower {
  id: string;
  name: string;
  type: string;
  rarity: string;
  position: Position;
}

/**
 * WorldRoom: The primary multiplayer room that manages the game world
 */
export class WorldRoom extends Room<SimplifiedWorldState> {
  private powerService: PowerService;
  private experienceService: ExperienceService;
  private tickInterval!: Delayed;
  private cleanupInterval!: Delayed;
  private lastTickTime: number = Date.now();
  private readonly TICK_RATE: number = 1000 / 20; // 20 ticks per second
  private readonly CLEANUP_INTERVAL: number = 60000; // 1 minute

  constructor() {
    super();
    this.powerService = new PowerService();
    this.experienceService = new ExperienceService();
  }

  // Track rate limits for clients
  private movementRateLimits: Map<string, { count: number, lastReset: number }> = new Map();
  private actionRateLimits: Map<string, { count: number, lastReset: number }> = new Map();
  
  // Scheduled tasks
  private powerSpawnTask: NodeJS.Timeout | null = null;
  private playerInactivityTask: NodeJS.Timeout | null = null;
  private worldStateUpdateTask: NodeJS.Timeout | null = null;
  
  // Track players needing state updates
  private playersPendingUpdate: Set<string> = new Set();
  
  // Last broadcast time
  private lastBroadcastTime: number = 0;
  
  // Add these properties to the WorldRoom class
  private experienceSpawnTask: NodeJS.Timeout | null = null;
  private activeExperienceInstances: Map<string, Delayed> = new Map();
  
  /**
   * Called when room is initialized
   */
  async onCreate(options: RoomOptions = {}) {
    console.log("WorldRoom created with options:", options);
    
    try {
      // Initialize state
      this.setState(new SimplifiedWorldState());
      this.state.name = options.name || "Main World";
      
      // Set max clients
      this.maxClients = CONFIG.MAX_PLAYERS;
      
      // Create initial zones - spread across creation
      setTimeout(() => this.createInitialZones(), 100);
      
      // Spawn initial powers
      this.spawnPowers();
      
      // Spawn initial experiences
      this.spawnExperiences();
      
      // Register message handlers
      this.registerMessageHandlers();
      
      // Start scheduled tasks
      this.startScheduledTasks();
      
      // Set up periodic world updates
      this.tickInterval = this.clock.setInterval(() => {
        this.state.updateTick();
        this.lastTickTime = Date.now();
      }, this.TICK_RATE);

      // Set up periodic cleanup
      this.cleanupInterval = this.clock.setInterval(() => {
        this.cleanup();
      }, this.CLEANUP_INTERVAL);
      
      console.log(`WorldRoom initialized successfully`);
    } catch (error) {
      console.error("Error creating WorldRoom:", error);
    }
  }
  
  /**
   * Create initial test zones
   */
  private createInitialZones() {
    // Create a central zone
    const centerZone = new SimpleZone(
      'zone_center',
      'Atlantis Central',
      'hub'
    );
    centerZone.x = 0;
    centerZone.y = 0;
    centerZone.radius = 200;
    this.state.zones.set(centerZone.id, centerZone);
    
    // Create some additional zones
    const northZone = new SimpleZone(
      'zone_north',
      'Northern District',
      'residential'
    );
    northZone.x = 0;
    northZone.y = 300;
    northZone.radius = 150;
    this.state.zones.set(northZone.id, northZone);
    
    const eastZone = new SimpleZone(
      'zone_east',
      'Eastern District',
      'commercial'
    );
    eastZone.x = 300;
    eastZone.y = 0;
    eastZone.radius = 150;
    this.state.zones.set(eastZone.id, eastZone);
    
    const southZone = new SimpleZone(
      'zone_south',
      'Southern District',
      'industrial'
    );
    southZone.x = 0;
    southZone.y = -300;
    southZone.radius = 150;
    this.state.zones.set(southZone.id, southZone);
    
    const westZone = new SimpleZone(
      'zone_west',
      'Western District',
      'educational'
    );
    westZone.x = -300;
    westZone.y = 0;
    westZone.radius = 150;
    this.state.zones.set(westZone.id, westZone);
    
    console.log(`Created ${this.state.zones.size} initial zones`);
  }
  
  /**
   * Register message handlers
   * @private
   */
  private registerMessageHandlers() {
    // Player movement
    this.onMessage("move", (client, message: MovementMessage) => {
      this.handlePlayerMovement(client, message);
    });
    
    // Power interactions
    this.onMessage("power:interact", (client, message: PowerInteractionMessage) => {
      this.handlePowerInteraction(client, message);
    });
    
    // Power capture attempt
    this.onMessage("power:capture", (client, message: PowerInteractionMessage) => {
      const power = this.state.powers.get(message.powerId);
      if (power) {
        this.handlePowerCapture(client, power);
      }
    });
    
    // Request power details
    this.onMessage("power:details", (client, message: any) => {
      // Get the power
      const power = this.state.powers.get(message.powerId);
      if (!power) {
        client.send("powerDetailsResult", {
          success: false,
          message: "Power not found"
        });
        return;
      }
      
      // Send power details
      client.send("power:details", {
        power: {
          id: power.id,
          name: power.name,
          type: power.type,
          rarity: power.rarity,
          position: {
            x: power.x,
            y: power.y
          }
        }
      });
    });
    
    // Ping handler for latency measurement
    this.onMessage("ping", (client, message: any) => {
      // Simply echo back the time sent by the client
      client.send("pong", { time: message.time });
    });
    
    // Handle zone entry requests
    this.onMessage("zone:enter", (client, message: any) => {
      this.handleZoneEntry(client, message);
    });
    
    // Handle zone exit requests
    this.onMessage("zone:exit", (client, message: any) => {
      this.handleZoneExit(client, message);
    });
    
    // Handle player status updates
    this.onMessage("player:status", (client, message: PlayerStatusMessage) => {
      this.handlePlayerStatus(client, message);
    });
    
    // Test spawning powers (development only)
    if (process.env.NODE_ENV === 'development') {
      this.onMessage("debug:spawnTestPowers", (client) => {
        this.handleSpawnTestPowers();
      });
    }
    
    // Experience handlers
    this.onMessage("experienceJoin", (client, message: ExperienceInteractionMessage) => {
      this.checkRateLimit(client.sessionId, 'action') && 
        this.handleExperienceJoin(client, message.experienceId);
    });
    
    this.onMessage("experiencePhaseComplete", (client, message: ExperienceInteractionMessage) => {
      if (message.data?.submission) {
        this.checkRateLimit(client.sessionId, 'action') && 
          this.handleExperiencePhaseComplete(client, {
            experienceId: message.experienceId,
            submission: message.data.submission
          });
      }
    });
    
    this.onMessage("experienceLeave", (client, message: ExperienceInteractionMessage) => {
      this.checkRateLimit(client.sessionId, 'action') && 
        this.handleExperienceLeave(client, message.experienceId);
    });
  }
  
  /**
   * Start scheduled background tasks
   */
  private startScheduledTasks() {
    // Spawn powers periodically
    this.powerSpawnTask = setInterval(() => {
      this.spawnPowers();
    }, CONFIG.POWER_SPAWN_INTERVAL);
    
    // Check for inactive players
    this.playerInactivityTask = setInterval(() => {
      this.checkInactivePlayers();
    }, CONFIG.PLAYER_INACTIVE_TIMEOUT / 10);
    
    // Update world state - efficient update using pending updates tracking
    this.worldStateUpdateTask = setInterval(() => {
      // Skip if no players or no pending updates
      if (this.clients.length === 0 || this.playersPendingUpdate.size === 0) {
        return;
      }
      
      const now = Date.now();
      // Only broadcast if enough time has passed since last broadcast
      if (now - this.lastBroadcastTime >= CONFIG.BROADCAST_THROTTLE_MS) {
        this.lastBroadcastTime = now;
        
        // Process pending updates
        for (const clientId of this.playersPendingUpdate) {
          const client = this.clients.find(c => c.sessionId === clientId);
          if (client) {
            this.sendVisibleWorldToClient(client);
          }
        }
        
        // Clear pending updates
        this.playersPendingUpdate.clear();
      }
      
      // Update state tick
      this.state.updateTick();
    }, CONFIG.WORLD_UPDATE_INTERVAL);
    
    // Spawn new experiences periodically
    this.experienceSpawnTask = setInterval(() => {
      try {
        this.spawnExperiences();
      } catch (error) {
        console.error("Error in experience spawn task:", error);
      }
    }, CONFIG.EXPERIENCE_SPAWN_INTERVAL);
  }
  
  /**
   * Main simulation update loop
   */
  update(deltaTime: number) {
    // Check for powers that should despawn based on age
    const currentTime = Date.now();
    const maxAge = CONFIG.POWER_LIFETIME;
    
    this.state.powers.forEach((power, key) => {
      // Check if power has been active for too long
      if (currentTime - power.spawnedAt > maxAge) {
        this.state.powers.delete(key);
      }
    });
    
    // Update world time and tick
    this.state.worldTime = Date.now();
    this.state.updateTick();
  }
  
  /**
   * When a client joins the room
   */
  async onJoin(client: Client, options: RoomOptions) {
    console.log(`${client.sessionId} joined the world!`, options);
    
    // Get or create player
    let player = this.state.players.get(client.sessionId);
    
    if (!player) {
      // Create new player
      player = new SimplePlayer(client.sessionId, options.name || `Player_${client.sessionId.slice(0, 8)}`);
      
      // Set initial position
      const randomX = (Math.random() - 0.5) * CONFIG.WORLD_SIZE.WIDTH;
      const randomY = (Math.random() - 0.5) * CONFIG.WORLD_SIZE.HEIGHT;
      player.x = randomX;
      player.y = randomY;
      
      // Set metadata
      player.metadata = new MapSchema<string>();
      player.metadata.set('joinedAt', Date.now().toString());
      player.metadata.set('lastActivity', Date.now().toString());
      
      // Initialize rate limiters
      this.movementRateLimits.set(client.sessionId, {
        count: 0,
        lastReset: Date.now()
      });
      
      this.actionRateLimits.set(client.sessionId, {
        count: 0,
        lastReset: Date.now()
      });
      
      // Add to state
      this.state.players.set(client.sessionId, player);
      
      // Broadcast player joined
      this.broadcast("playerJoined", {
        id: player.id,
        username: player.username,
        position: { x: player.x, y: player.y }
      });
    }
    
    // Send current state to the client
    client.send("worldState", this.state);
    
    // Start inactivity check
    this.startInactivityCheck(client.sessionId);
  }
  
  /**
   * Send only the visible portion of the world to the client
   * based on their location and visibility radius
   */
  private sendVisibleWorldToClient(client: Client) {
    try {
      // Get player from state
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`sendVisibleWorldToClient: Player not found for client ${client.sessionId}`);
        return;
      }
      
      // Create a player position reference for visibility checks
      const playerPos = { x: player.x, y: player.y };
      
      // Count of entities by type within visibility radius
      const counts = {
        players: 0,
        powers: 0,
        zones: 0
      };
      
      // Find visible players
      const visiblePlayers: any[] = [];
      this.state.players.forEach((otherPlayer, sessionId) => {
        // Skip self
        if (sessionId === client.sessionId) return;
        
        // Calculate distance
        const distance = this.calculateDistance(
          playerPos,
          { x: otherPlayer.x, y: otherPlayer.y }
        );
        
        // Check if within visibility radius
        if (distance <= CONFIG.ENTITY_CULLING_DISTANCE) {
          visiblePlayers.push({
            id: sessionId,
            username: otherPlayer.username,
            x: otherPlayer.x,
            y: otherPlayer.y,
            state: otherPlayer.state
          });
          counts.players++;
        }
      });
      
      // Find visible powers
      const visiblePowers: any[] = [];
      this.state.powers.forEach((power, powerId) => {
        // Calculate distance
        const distance = this.calculateDistance(
          playerPos,
          { x: power.x, y: power.y }
        );
        
        // Check if within visibility radius
        if (distance <= CONFIG.ENTITY_CULLING_DISTANCE) {
          visiblePowers.push({
            id: powerId,
            name: power.name,
            type: power.type,
            rarity: power.rarity,
            x: power.x,
            y: power.y
          });
          counts.powers++;
        }
      });
      
      // Find visible zones
      const visibleZones: any[] = [];
      this.state.zones.forEach((zone, zoneId) => {
        // Calculate distance
        const distance = this.calculateDistance(
          playerPos,
          { x: zone.x, y: zone.y }
        );
        
        // Check if within visibility radius
        if (distance <= CONFIG.ENTITY_CULLING_DISTANCE) {
          visibleZones.push({
            id: zoneId,
            name: zone.name,
            type: zone.type,
            x: zone.x,
            y: zone.y,
            radius: zone.radius
          });
          counts.zones++;
        }
      });
      
      // Send visible world state to client
      client.send('world:visible', {
        players: counts.players,
        powers: counts.powers,
        zones: counts.zones,
        visiblePlayers,
        visiblePowers,
        visibleZones,
        visibilityRadius: CONFIG.VISIBILITY_RADIUS
      });
      
    } catch (error) {
      console.error('Error in sendVisibleWorldToClient:', error);
    }
  }
  
  /**
   * Calculate distance between two points
   */
  private calculateDistance(pos1: SimplePosition, pos2: SimplePosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Handle player movement with improved efficiency
   */
  private handlePlayerMovement(client: Client, message: MovementMessage & { state?: string }) {
    // Rate limit check
    if (!this.checkRateLimit(client.sessionId, 'movement')) {
      return;
    }
    
    try {
      // Validate message format
      if (!message || typeof message.x !== 'number' || typeof message.y !== 'number') {
        console.warn(`Invalid movement message from client ${client.sessionId}`);
        return;
      }
      
      // Set the state based on message if provided
      const state = message.state || "moving";
      
      // Get player
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`Player not found for client ${client.sessionId}`);
        return;
      }
      
      // Update position
      player.x = message.x;
      player.y = message.y;
      
      // Update state and last activity
      player.setState(state);
      
      // Mark player as needing a world update
      this.playersPendingUpdate.add(client.sessionId);
      
      // Check if player is inside any zone
      this.checkZoneEntry(client, player);
      
    } catch (error) {
      console.error('Error in handlePlayerMovement:', error);
    }
  }
  
  /**
   * When a client leaves the room
   */
  async onLeave(client: Client, consented: boolean) {
    console.log(`${client.sessionId} disconnected. Waiting for reconnection...`);
    
    try {
      // Allow reconnection for 30 seconds
      await this.allowReconnection(client, 30);
      
      // Get player
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Update player status
        player.metadata.set('lastActivity', Date.now().toString());
        player.metadata.set('status', 'disconnected');
        
        // Broadcast player left
        this.broadcast("playerLeft", {
          id: player.id,
          username: player.username
        });
      }
    } catch (error) {
      console.error(`Error in onLeave for client ${client.sessionId}:`, error);
      
      // If reconnection failed, clean up the player
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Remove from current zone if any
        if (player.currentZoneId) {
          const zone = this.state.zones.get(player.currentZoneId);
          if (zone) {
            zone.removePlayer(player.id);
          }
        }
        
        // Remove player from state
        this.state.players.delete(client.sessionId);
        
        // Broadcast player left
        this.broadcast("playerLeft", {
          id: player.id,
          username: player.username,
          reason: "reconnection_failed"
        });
      }
      
      // Clean up rate limiters
      this.movementRateLimits.delete(client.sessionId);
      this.actionRateLimits.delete(client.sessionId);
    }
  }
  
  /**
   * When room is disposed
   */
  onDispose() {
    console.log(`World Room ${this.roomId} is being disposed`);
    
    // Clear all scheduled tasks
    if (this.powerSpawnTask) clearInterval(this.powerSpawnTask);
    if (this.playerInactivityTask) clearInterval(this.playerInactivityTask);
    if (this.worldStateUpdateTask) clearInterval(this.worldStateUpdateTask);
    
    // Clear experience spawn task
    if (this.experienceSpawnTask) {
      clearInterval(this.experienceSpawnTask);
      this.experienceSpawnTask = null;
    }
    
    // Clear active experience timeouts
    this.activeExperienceInstances.forEach(timeout => {
      timeout.clear();
    });
    this.activeExperienceInstances.clear();
    
    console.log('All tasks cleared');
  }
  
  /**
   * Check and enforce rate limits for client actions
   * @param sessionId - Client session ID
   * @param type - Type of action (movement, action)
   * @returns Whether the action is allowed
   */
  private checkRateLimit(sessionId: string, type: 'movement' | 'action'): boolean {
    const now = Date.now();
    const limitMap = type === 'movement' ? this.movementRateLimits : this.actionRateLimits;
    const limits = CONFIG.RATE_LIMIT[type.toUpperCase() as keyof typeof CONFIG.RATE_LIMIT];
    
    if (!limitMap.has(sessionId)) return false;
    
    const clientLimit = limitMap.get(sessionId)!;
    
    // Reset counter if window expired
    if (now - clientLimit.lastReset > limits.WINDOW_MS) {
      clientLimit.count = 0;
      clientLimit.lastReset = now;
    }
    
    // Check if limit exceeded
    if (clientLimit.count >= limits.MAX_REQUESTS) {
      return false;
    }
    
    // Increment counter
    clientLimit.count++;
    return true;
  }
  
  /**
   * Check for and mark inactive players
   */
  private checkInactivePlayers() {
    const now = Date.now();
    const inactiveTimeout = CONFIG.PLAYER_INACTIVE_TIMEOUT;
    
    this.state.players.forEach((player, sessionId) => {
      if (now - player.lastActivity > inactiveTimeout) {
        player.markInactive();
      }
    });
  }
  
  /**
   * Handle a power interaction request
   * @param client Client initiating the power interaction
   * @param message Power interaction message
   */
  private handlePowerInteraction(client: Client, message: PowerInteractionMessage) {
    try {
      // Verbose logging for debugging
      console.log(`[handlePowerInteraction] Client ${client.sessionId} is interacting with power:`, JSON.stringify(message));
      
      // Validate message structure
      if (!message || typeof message !== 'object') {
        console.log(`[handlePowerInteraction] Invalid message format from client ${client.sessionId}`);
        client.send('power:error', { 
          message: 'Invalid message format',
          status: 'error',
          code: 'INVALID_FORMAT'
        });
        return;
      }
      
      // Rate limiting
      if (!this.checkRateLimit(client.sessionId, 'action')) {
        console.log(`[handlePowerInteraction] Rate limit exceeded for client ${client.sessionId}`);
        client.send('power:error', { 
          message: 'Action rate limit exceeded. Please try again in a few seconds.',
          status: 'error',
          code: 'RATE_LIMIT'
        });
        return;
      }
      
      // Get player from state
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.log(`[handlePowerInteraction] Player not found for client ${client.sessionId}`);
        client.send('power:error', { 
          message: 'Player not found in game state. Please try reconnecting.',
          status: 'error',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }
      
      // Validate message
      if (!message.powerId) {
        console.log(`[handlePowerInteraction] Missing powerId in message from client ${client.sessionId}`);
        client.send('power:error', { 
          message: 'Missing power ID in request',
          status: 'error',
          code: 'MISSING_POWER_ID'
        });
        return;
      }
      
      console.log(`[handlePowerInteraction] Looking for power ${message.powerId} in state.powers (size: ${this.state.powers.size})`);
      
      // Log all available power IDs for debugging
      const availablePowerIds = Array.from(this.state.powers.keys());
      console.log(`[handlePowerInteraction] Available power IDs: ${JSON.stringify(availablePowerIds)}`);
      
      // Try to find the power in the state
      const power = this.state.powers.get(message.powerId);
      if (!power) {
        console.log(`[handlePowerInteraction] Power ${message.powerId} not found`);
        client.send('power:notFound', { 
          powerId: message.powerId,
          availablePowers: availablePowerIds.length,
          playerPosition: { x: player.x, y: player.y },
          message: 'Power not found in game state',
          status: 'error',
          code: 'POWER_NOT_FOUND'
        });
        return;
      }
      
      // Check if power is active
      if (!power.isActive) {
        console.log(`[handlePowerInteraction] Power ${message.powerId} is not active`);
        client.send('power:notActive', { 
          powerId: message.powerId,
          message: 'This power has already been captured',
          status: 'error',
          code: 'POWER_NOT_ACTIVE'
        });
        return;
      }
      
      console.log(`[handlePowerInteraction] Found power: ${power.id} (${power.name})`);
      
      // Check if player is close enough to interact
      const distance = Math.sqrt(Math.pow(player.x - power.x, 2) + Math.pow(player.y - power.y, 2));
      console.log(`[handlePowerInteraction] Distance to power: ${distance}m (max: ${CONFIG.INTERACTION_RADIUS}m)`);
      
      // Handle power interaction
      this.handlePowerInteractionLogic(client, power);
    } catch (error) {
      console.error('Error in handlePowerInteraction:', error);
    }
  }
  
  private async spawnPowers() {
    try {
      const center = new Position(0, 0);
      const powers = PowerService.generatePowersForArea(center, 1000, 10);
      powers.forEach((power: GeneratedPower) => {
        const simplePower = new SimplePower(
          power.id,
          power.name,
          power.type,
          power.rarity
        );
        if (power.position) {
          simplePower.x = power.position.x;
          simplePower.y = power.position.y;
        }
        this.state.powers.set(power.id, simplePower);
      });
    } catch (error) {
      this.handleError(error, 'spawnPowers');
    }
  }

  private handleError(error: unknown, context: string) {
    console.error(`Error in ${context}:`, error instanceof Error ? error.message : String(error));
  }

  private async handleExperienceInteraction(client: Client, experienceData: { id: string }) {
    try {
      const experience = await this.experienceService.getExperienceById(experienceData.id);
      if (!experience) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const instance = ExperienceService.createExperienceInstance(
        experienceData.id,
        player.currentZoneId || null
      );

      // Update state and broadcast
      this.broadcast('experience:started', {
        playerId: client.sessionId,
        experienceId: experienceData.id,
        instanceId: instance.id
      });
    } catch (error) {
      this.handleError(error, 'handleExperienceInteraction');
    }
  }

  private async spawnExperiences() {
    try {
      const center = new Position(0, 0);
      const experiences = ExperienceService.generateExperiencesForArea(center, 1000, 5);
      experiences.forEach(experience => {
        // Ensure experience has all required fields before storing
        const validExperience = {
          id: experience.id,
          name: experience.name,
          description: experience.description,
          type: experience.type || 'Quest', // Ensure type is always set
          minPlayers: experience.minPlayers || 1,
          maxPlayers: experience.maxPlayers || 4,
          phases: experience.phases || [],
          estimatedDuration: experience.estimatedDuration || 30,
          maximumDuration: experience.maximumDuration || 60,
          xpReward: experience.xpReward || 100,
          coinsReward: experience.coinsReward || 50,
          wisdomReward: experience.wisdomReward || 10,
          courageReward: experience.courageReward || 10,
          temperanceReward: experience.temperanceReward || 10,
          justiceReward: experience.justiceReward || 10,
          strengthReward: experience.strengthReward || 10,
          spawnTime: Date.now()
        };
        this.state.experiences.set(experience.id, JSON.stringify(validExperience));
      });
    } catch (error) {
      this.handleError(error, 'spawnExperiences');
    }
  }

  private cleanup() {
    try {
      // Clean up inactive players
      this.state.players.forEach((player, sessionId) => {
        if (!player.isActive && Date.now() - player.lastActivity > CONFIG.PLAYER_INACTIVE_TIMEOUT) {
          this.state.players.delete(sessionId);
        }
      });

      // Clean up expired powers
      this.state.powers.forEach((power, powerId) => {
        if (!power.isActive || Date.now() - power.spawnedAt > CONFIG.POWER_LIFETIME) {
          this.state.powers.delete(powerId);
        }
      });

      // Clean up expired experiences
      this.state.experiences.forEach((experienceStr, experienceId) => {
        const experience = JSON.parse(experienceStr);
        if (Date.now() - experience.spawnTime > CONFIG.EXPERIENCE_LIFETIME) {
          this.state.experiences.delete(experienceId);
        }
      });
    } catch (error) {
      this.handleError(error, 'cleanup');
    }
  }

  private handlePowerCapture(client: Client, power: SimplePower) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Remove power from state
      this.state.powers.delete(power.id);

      // Update player's power collection
      if (!player.powers) {
        player.powers = new MapSchema<string>();
      }
      player.powers.set(power.id, power.id);

      // Broadcast power capture
      this.broadcast('power:captured', {
        playerId: client.sessionId,
        powerId: power.id
      });
    } catch (error) {
      this.handleError(error, 'handlePowerCapture');
    }
  }

  private handleZoneEntry(client: Client, zoneId: string) {
    try {
      const player = this.state.players.get(client.sessionId);
      const zone = this.state.zones.get(zoneId);
      if (!player || !zone) return;

      zone.addPlayer(client.sessionId);
      player.setZone(zoneId);

      this.broadcast('zone:entered', {
        playerId: client.sessionId,
        zoneId: zoneId
      });
    } catch (error) {
      this.handleError(error, 'handleZoneEntry');
    }
  }

  private handleZoneExit(client: Client, zoneId: string) {
    try {
      const player = this.state.players.get(client.sessionId);
      const zone = this.state.zones.get(zoneId);
      if (!player || !zone) return;

      zone.removePlayer(client.sessionId);
      player.setZone('');

      this.broadcast('zone:exited', {
        playerId: client.sessionId,
        zoneId: zoneId
      });
    } catch (error) {
      this.handleError(error, 'handleZoneExit');
    }
  }

  private handlePlayerStatus(client: Client, message: PlayerStatusMessage) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (message.state) {
        player.setState(message.state);
      }
    } catch (error) {
      this.handleError(error, 'handlePlayerStatus');
    }
  }

  private handleSpawnTestPowers() {
    try {
      this.spawnPowers();
    } catch (error) {
      this.handleError(error, 'handleSpawnTestPowers');
    }
  }

  private handleExperienceJoin(client: Client, experienceId: string) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`Player not found for client ${client.sessionId}`);
        return;
      }

      const experienceStr = this.state.experiences.get(experienceId);
      if (!experienceStr) {
        console.warn(`Experience ${experienceId} not found`);
        return;
      }

      let experience;
      try {
        experience = JSON.parse(experienceStr);
        // Validate required fields
        if (!experience || !experience.type || !experience.id) {
          console.error(`Invalid experience data for ${experienceId}:`, experience);
          return;
        }
      } catch (e) {
        console.error(`Failed to parse experience data for ${experienceId}:`, e);
        return;
      }

      const instance = ExperienceService.createExperienceInstance(experienceId, player.currentZoneId || null);
      instance.addParticipant(client.sessionId);

      this.broadcast('experience:joined', {
        playerId: client.sessionId,
        experienceId: experienceId,
        instanceId: instance.id,
        experience: {
          id: experience.id,
          name: experience.name,
          type: experience.type,
          description: experience.description
        }
      });
    } catch (error) {
      this.handleError(error, 'handleExperienceJoin');
    }
  }

  private handleExperiencePhaseComplete(client: Client, data: { experienceId: string, submission: string }) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const experienceStr = this.state.experiences.get(data.experienceId);
      if (!experienceStr) return;

      const experience = JSON.parse(experienceStr);
      // Handle phase completion logic here

      this.broadcast('experience:phaseComplete', {
        playerId: client.sessionId,
        experienceId: data.experienceId,
        submission: data.submission
      });
    } catch (error) {
      this.handleError(error, 'handleExperiencePhaseComplete');
    }
  }

  private handleExperienceLeave(client: Client, experienceId: string) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const experienceStr = this.state.experiences.get(experienceId);
      if (!experienceStr) return;

      this.broadcast('experience:left', {
        playerId: client.sessionId,
        experienceId: experienceId
      });
    } catch (error) {
      this.handleError(error, 'handleExperienceLeave');
    }
  }

  /**
   * Check if player is inside any zone
   */
  private checkZoneEntry(client: Client, player: SimplePlayer) {
    this.state.zones.forEach((zone, zoneId) => {
      const distance = this.calculateDistance(
        { x: player.x, y: player.y },
        { x: zone.x, y: zone.y }
      );
      
      if (distance <= zone.radius && player.currentZoneId !== zoneId) {
        this.handleZoneEntry(client, zoneId);
      } else if (distance > zone.radius && player.currentZoneId === zoneId) {
        this.handleZoneExit(client, zoneId);
      }
    });
  }

  /**
   * Handle power interaction logic
   */
  private handlePowerInteractionLogic(client: Client, power: SimplePower) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const distance = this.calculateDistance(
      { x: player.x, y: player.y },
      { x: power.x, y: power.y }
    );

    if (distance > CONFIG.INTERACTION_RADIUS) {
      client.send('power:tooFar', {
        powerId: power.id,
        distance: Math.round(distance),
        maxDistance: CONFIG.INTERACTION_RADIUS
      });
      return;
    }

    // Send interaction details to client
    client.send('power:interaction', {
      powerId: power.id,
      name: power.name,
      type: power.type,
      rarity: power.rarity
    });
  }

  /**
   * Update world state
   */
  private updateWorldState() {
    this.state.updateTick();
    this.state.worldTime = Date.now();
  }

  /**
   * Start inactivity check for a player
   */
  private startInactivityCheck(sessionId: string) {
    // Clear any existing check
    if (this.playerInactivityTask) {
      clearTimeout(this.playerInactivityTask);
    }
    
    // Set up new check
    this.playerInactivityTask = setTimeout(() => {
      const player = this.state.players.get(sessionId);
      if (player) {
        const lastActivity = parseInt(player.metadata.get('lastActivity') || '0');
        const now = Date.now();
        
        if (now - lastActivity > CONFIG.PLAYER_INACTIVE_TIMEOUT) {
          // Player is inactive, remove them
          this.state.players.delete(sessionId);
          this.broadcast("playerLeft", {
            id: sessionId,
            username: player.username,
            reason: "inactive"
          });
        }
      }
    }, CONFIG.PLAYER_INACTIVE_TIMEOUT);
  }
}