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
import { SimplifiedWorldState, SimplePlayer, SimplePower, SimpleZone } from '../schemas/SimplifiedWorldState.js';
import { Player, Power as GameEntityPower, Zone } from '../schemas/GameEntities.js';
import { Position, UserMetadata, VirtuePoints } from '../schemas/index.js';
import { Power } from '../schemas/PowerSchema.js';
import PowerService from '../services/PowerService.js';
import { nanoid } from 'nanoid';
import { SimplePosition } from '../types.js';

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
  response?: any;
  challengeResponse?: any;
}

interface ZoneInteractionMessage {
  zoneId: string;
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
  OPTIMIZE_NETWORK: true // Enable network optimizations
};

/**
 * WorldRoom: The primary multiplayer room that manages the game world
 */
export class WorldRoom extends Room<SimplifiedWorldState> {
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
  
  /**
   * Spawn powers across the game world
   */
  private spawnPowers() {
    // Check if we've reached the max power count
    if (this.state.powers.size >= CONFIG.POWER_MAX_COUNT) {
      return;
    }
    
    // Calculate number of powers to spawn based on density and world size
    const worldArea = CONFIG.WORLD_SIZE.WIDTH * CONFIG.WORLD_SIZE.HEIGHT;
    const targetPowerCount = Math.floor(worldArea * CONFIG.POWER_DENSITY);
    const powersToSpawn = Math.min(
      CONFIG.MAX_POWERS_PER_AREA,
      targetPowerCount - this.state.powers.size
    );
    
    if (powersToSpawn <= 0) {
      return;
    }
    
    console.log(`Spawning ${powersToSpawn} powers...`);
    
    // Create a Position object
    const centerPosition = new Position(
      CONFIG.WORLD_SIZE.WIDTH / 2,
      CONFIG.WORLD_SIZE.HEIGHT / 2
    );
    
    // Generate powers using our service - use batch operation for better performance
    const powers = PowerService.generatePowersForArea(
      centerPosition,
      Math.max(CONFIG.WORLD_SIZE.WIDTH, CONFIG.WORLD_SIZE.HEIGHT) / 2,
      powersToSpawn
    );
    
    console.log(`Generated ${powers.length} powers`);
    
    // Improved batch adding of powers with spatial distribution
    const batchSize = 10; // Process powers in batches to avoid UI freezing
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, powers.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const powerData = powers[i];
        
        // Create a simplified power
        const power = new SimplePower(
          powerData._id,
          powerData.name,
          powerData.type,
          powerData.rarity
        );
        
        // Distribute powers more widely across the map
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * CONFIG.WORLD_SIZE.WIDTH / 3;
        
        power.x = Math.cos(angle) * distance;
        power.y = Math.sin(angle) * distance;
        
        // Add to state
        this.state.powers.set(power.id, power);
      }
      
      // Process next batch if there are more powers
      if (endIndex < powers.length) {
        setTimeout(() => processBatch(endIndex), 50); // Small delay between batches
      }
    };
    
    // Start processing the first batch
    processBatch(0);
  }
  
  /**
   * Despawn a power from the world
   */
  private despawnPower(powerId: string) {
    const power = this.state.powers.get(powerId);
    if (!power) return;
    
    console.log(`Despawning power ${powerId}`);
    this.state.powers.delete(powerId);
  }
  
  /**
   * Handle a power capture attempt
   * @param client Client attempting capture
   * @param message Capture message
   */
  private handlePowerCapture(client: Client, message: PowerInteractionMessage) {
    try {
      console.log(`[handlePowerCapture] Processing capture attempt from client ${client.sessionId} for power ${message.powerId}`);
      
      // Get player
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.log(`[handlePowerCapture] Player not found for client ${client.sessionId}`);
        client.send("powerCaptureResult", {
          success: false,
          message: "Player not found",
          powerId: message.powerId
        });
        return;
      }
      
      console.log(`[handlePowerCapture] Processing capture for player ${player.username} (${client.sessionId})`);
      
      // Get power
      const power = this.state.powers.get(message.powerId);
      if (!power) {
        console.log(`[handlePowerCapture] Power not found: ${message.powerId}`);
        client.send("powerCaptureResult", {
          success: false,
          message: "Power not found",
          powerId: message.powerId
        });
        return;
      }
      
      if (!power.isActive) {
        console.log(`[handlePowerCapture] Power already captured: ${message.powerId}`);
        client.send("powerCaptureResult", {
          success: false,
          message: "Power has already been captured",
          powerId: message.powerId
        });
        return;
      }
      
      // Check if player is close enough to interact
      const distance = Math.sqrt(Math.pow(player.x - power.x, 2) + Math.pow(player.y - power.y, 2));
      const maxDistance = CONFIG.INTERACTION_RADIUS;
      
      console.log(`[handlePowerCapture] Player position: (${player.x}, ${player.y}), Power position: (${power.x}, ${power.y})`);
      console.log(`[handlePowerCapture] Distance to power: ${distance}m (max: ${maxDistance}m)`);
      
      if (distance > maxDistance) {
        console.log(`[handlePowerCapture] Too far from power: ${distance}m (max: ${maxDistance}m)`);
        client.send("powerCaptureResult", {
          success: false,
          message: "Too far from power",
          powerId: message.powerId,
          distance: distance,
          maxDistance: maxDistance
        });
        return;
      }
      
      // Process capture - add power to player's collection
      console.log(`[handlePowerCapture] Capturing power: ${power.id} (${power.name})`);
      
      // Make sure player.powers exists
      if (!player.powers) {
        console.log(`[handlePowerCapture] Creating new powers collection for player`);
        player.powers = new MapSchema();
      }
      
      // Add the power to the player's collection
      player.powers.set(power.id, power.id);
      console.log(`[handlePowerCapture] Added power ${power.id} to player's collection. Player now has ${player.powers.size} powers`);
      
      // Award XP
      const xpReward = 10; // Default XP reward
      player.xp += xpReward;
      console.log(`[handlePowerCapture] Awarded ${xpReward} XP, new total: ${player.xp}`);
      
      // Check rank up based on XP
      this.checkPlayerRankUp(player);
      
      // Deactivate power
      power.isActive = false;
      console.log(`[handlePowerCapture] Deactivated power ${power.id}`);
      
      // Schedule power to be removed after delay
      setTimeout(() => {
        this.despawnPower(power.id);
      }, 5000);
      
      // Send capture result
      console.log(`[handlePowerCapture] Sending success result to client ${client.sessionId}`);
      client.send("powerCaptureResult", {
        success: true,
        message: "Power captured successfully!",
        powerId: power.id,
        powerName: power.name,
        powerType: power.type,
        powerRarity: power.rarity,
        playerXp: player.xp,
        playerRank: player.rank,
        powerCount: player.powers.size
      });
      
      // Broadcast capture event to other clients
      this.broadcast("powerCaptured", {
        playerId: player.id,
        playerName: player.username,
        powerId: power.id,
        powerName: power.name,
        powerRarity: power.rarity
      }, { except: client });
      
    } catch (error) {
      console.error(`[handlePowerCapture] Error processing capture:`, error);
      client.send("powerCaptureResult", {
        success: false,
        message: "Server error processing capture",
        powerId: message.powerId
      });
    }
  }
  
  /**
   * Check if player should rank up based on XP
   */
  private checkPlayerRankUp(player: SimplePlayer) {
    const xpThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];
    
    for (let rank = xpThresholds.length; rank > 0; rank--) {
      if (player.xp >= xpThresholds[rank - 1]) {
        if (player.rank < rank) {
          player.rank = rank;
        }
        break;
      }
    }
  }
  
  /**
   * Handle zone entry
   */
  private handleZoneEntry(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Validate message
    if (!message.zoneId) return;
    
    const zone = this.state.zones.get(message.zoneId);
    if (!zone) {
      client.send('zone:notFound', { zoneId: message.zoneId });
      return;
    }
    
    // Check if player is inside zone bounds
    if (!zone.containsPosition({ x: player.x, y: player.y })) {
      client.send('zone:notInRange', { zoneId: zone.id });
      return;
    }
    
    // Update player's current zone
    if (player.currentZoneId) {
      // Remove from previous zone
      const oldZone = this.state.zones.get(player.currentZoneId);
      if (oldZone) oldZone.removePlayer(player.id);
    }
    
    // Add to new zone
    zone.addPlayer(player.id);
    player.setZone(zone.id);
    
    // Send zone details to client
    client.send('zone:entered', {
      zoneId: zone.id,
      zoneName: zone.name,
      zoneType: zone.type,
      zoneAttributes: zone.attributes
    });
  }
  
  /**
   * Handle zone exit
   */
  private handleZoneExit(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.currentZoneId) return;
    
    // Validate message
    if (!message.zoneId || message.zoneId !== player.currentZoneId) return;
    
    const zone = this.state.zones.get(player.currentZoneId);
    if (!zone) return;
    
    // Remove player from zone
    zone.removePlayer(player.id);
    player.setZone("");
    
    // Notify client
    client.send('zone:exited', {
      zoneId: zone.id,
      zoneName: zone.name
    });
  }
  
  /**
   * Handle player status updates
   */
  private handlePlayerStatus(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Update player status
    if (message.state) {
      player.setState(message.state);
    }
    
    // Update activity timestamp
    player.lastActivity = Date.now();
    player.isActive = true;
  }
  
  // Utility methods for power generation
  
  private generatePowerName(): string {
    const prefixes = [
      "Cosmic", "Ancient", "Divine", "Mystic", "Eternal", 
      "Primal", "Astral", "Elemental", "Virtuous", "Harmonic"
    ];
    
    const types = [
      "Wisdom", "Courage", "Temperance", "Justice", "Harmony", 
      "Balance", "Insight", "Vision", "Presence", "Connection"
    ];
    
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${types[Math.floor(Math.random() * types.length)]}`;
  }
  
  private getRandomPowerType(): string {
    const types = ["Wisdom", "Courage", "Temperance", "Justice"];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  private getRandomRarity(): string {
    const rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
    const weights = [50, 30, 15, 4, 1]; // Percentage chance
    
    const roll = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (let i = 0; i < rarities.length; i++) {
      cumulativeWeight += weights[i];
      if (roll < cumulativeWeight) {
        return rarities[i];
      }
    }
    
    return "Common"; // Default fallback
  }
  
  private getRandomMatrixQuadrant(): string {
    const quadrants = ["Soul-Out", "Soul-In", "Body-Out", "Body-In"];
    return quadrants[Math.floor(Math.random() * quadrants.length)];
  }
  
  private generateCaptureChallenge(rarity: string): any {
    // This would typically generate a philosophical or virtue-related challenge
    // based on the rarity of the power
    
    const challenges = {
      "Common": {
        type: "reflection",
        question: "What small act of kindness did you perform today?",
        difficulty: 1
      },
      "Uncommon": {
        type: "choice",
        scenario: "You find a wallet with $100. What do you do?",
        options: ["Keep it", "Turn it in", "Look for the owner"],
        correctIndex: 2,
        difficulty: 2
      },
      "Rare": {
        type: "virtue",
        virtue: "Courage",
        task: "Describe a time when you stood up for what's right, despite fear",
        difficulty: 3
      },
      "Epic": {
        type: "philosophical",
        question: "How do you balance personal freedom with responsibility to others?",
        minLength: 100,
        difficulty: 4
      },
      "Legendary": {
        type: "wisdom",
        paradox: "The more you give, the more you receive",
        task: "Explain this paradox through a personal experience",
        minLength: 200,
        difficulty: 5
      }
    };
    
    return challenges[rarity as keyof typeof challenges] || challenges["Common"];
  }
  
  private evaluateCaptureChallenge(power: GameEntityPower, response: any): number {
    // This would contain logic to evaluate the quality of the user's response
    // to the philosophical challenge
    
    // For now, implement a simple evaluation based on response length and rarity
    let baseSuccessRate = 0;
    
    switch (power.rarity) {
      case "Common": baseSuccessRate = 0.9; break;
      case "Uncommon": baseSuccessRate = 0.7; break;
      case "Rare": baseSuccessRate = 0.5; break;
      case "Epic": baseSuccessRate = 0.3; break;
      case "Legendary": baseSuccessRate = 0.1; break;
      default: baseSuccessRate = 0.5;
    }
    
    // Very simple response quality evaluation based on type
    let responseQuality = 0;
    
    const challenge = power.captureChallenge;
    if (!challenge) return baseSuccessRate;
    
    if (challenge.type === "reflection" || challenge.type === "virtue" || 
        challenge.type === "philosophical" || challenge.type === "wisdom") {
      // For text responses, check length and keywords
      const responseText = response.text || "";
      responseQuality = Math.min(1, responseText.length / (challenge.minLength || 50));
      
      // In a real implementation, you would use NLP to evaluate the quality
      // of philosophical responses
    } else if (challenge.type === "choice") {
      // For multiple choice, check correctness
      responseQuality = response.choiceIndex === challenge.correctIndex ? 1 : 0;
    }
    
    // Final success rate combines base rate and response quality
    return Math.min(1, baseSuccessRate + (responseQuality * 0.3));
  }
  
  /**
   * Called when room is initialized
   */
  async onCreate(options: RoomOptions) {
    console.log("WorldRoom created with options:", options);
    
    try {
      // Initialize state
      this.setState(new SimplifiedWorldState());
      
      // Set max clients
      this.maxClients = CONFIG.MAX_PLAYERS;
      
      // Create initial zones - spread across creation
      setTimeout(() => this.createInitialZones(), 100);
      
      // Register message handlers
      this.registerMessageHandlers();
      
      // Start scheduled tasks
      this.startScheduledTasks();
      
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
    this.onMessage("move", (client, message) => {
      this.handlePlayerMovement(client, message);
    });
    
    // Power interactions
    this.onMessage("power:interact", (client, message) => {
      this.handlePowerInteraction(client, message);
    });
    
    // Power capture attempt
    this.onMessage("power:capture", (client, message) => {
      this.handlePowerCapture(client, message);
    });
    
    // Request power details
    this.onMessage("power:details", (client, message) => {
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
    this.onMessage("ping", (client, message) => {
      // Simply echo back the time sent by the client
      client.send("pong", { time: message.time });
    });
    
    // Handle zone entry requests
    this.onMessage("zone:enter", (client, message) => {
      this.handleZoneEntry(client, message);
    });
    
    // Handle zone exit requests
    this.onMessage("zone:exit", (client, message) => {
      this.handleZoneExit(client, message);
    });
    
    // Handle player status updates
    this.onMessage("player:status", (client, message) => {
      this.handlePlayerStatus(client, message);
    });
    
    // Test spawning powers (development only)
    if (process.env.NODE_ENV === 'development') {
      this.onMessage("debug:spawnTestPowers", (client, message) => {
        this.handleSpawnTestPowers(client, message);
      });
    }
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
      this.state.tick();
    }, CONFIG.WORLD_UPDATE_INTERVAL);
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
        this.despawnPower(power.id);
      }
    });
  }
  
  /**
   * When a client joins the room
   */
  onJoin(client: Client, options: any) {
    console.log(`${client.sessionId} joined the world!`, options);
    
    // Create player instance
    const userId = options.userId || `user_${nanoid(8)}`;
    const username = options.username || `Player ${Math.floor(Math.random() * 1000)}`;
    
    // Create a simplified player
    const player = new SimplePlayer(userId, username);
    
    // Set initial position
    if (options.position) {
      player.x = options.position.x;
      player.y = options.position.y;
    } else {
      // Random position if none provided
      player.x = (Math.random() * 100) - 50;  // -50 to +50
      player.y = (Math.random() * 100) - 50;
    }
    
    // Ensure metadata is null to avoid schema mismatch
    player.metadata = null;
    
    // Add player to state
    this.state.players.set(client.sessionId, player);
    
    // Initialize rate limiters for this client
    this.movementRateLimits.set(client.sessionId, {
      count: 0,
      lastReset: Date.now()
    });
    
    this.actionRateLimits.set(client.sessionId, {
      count: 0,
      lastReset: Date.now()
    });
    
    console.log(`Player ${client.sessionId} joined with position: (${player.x}, ${player.y})`);
    
    // Send initial state to client
    this.sendVisibleWorldToClient(client);
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
  private calculateDistance(point1: SimplePosition, point2: SimplePosition): number {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) + 
      Math.pow(point1.y - point2.y, 2)
    );
  }
  
  /**
   * Handle player movement with improved efficiency
   */
  private handlePlayerMovement(client: Client, message: any) {
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
    const player = this.state.players.get(client.sessionId);
    
    try {
      if (!consented) {
        // Unexpected disconnect - wait for reconnection
        console.log(`${client.sessionId} disconnected. Waiting for reconnection...`);
        await this.allowReconnection(client, 30);
        console.log(`${client.sessionId} reconnected!`);
        
        // Reset activity timestamp
        if (player) {
          player.lastActivity = Date.now();
          player.isActive = true;
        }
        
        return;
      }
    } catch (e) {
      // Reconnection failed or timeout expired
      console.log(`${client.sessionId} couldn't reconnect, removing from world`);
    }
    
    // Remove player from world
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
    }
    
    // Clean up rate limiters
    this.movementRateLimits.delete(client.sessionId);
    this.actionRateLimits.delete(client.sessionId);
    
    console.log(`${client.sessionId} left the world`);
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
  private handlePowerInteraction(client: Client, message: any) {
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
      console.log(`[handlePowerInteraction] Player position: (${player.x}, ${player.y}), Power position: (${power.x}, ${power.y})`);
      
      if (distance > CONFIG.INTERACTION_RADIUS) {
        console.log(`[handlePowerInteraction] Player too far from power: ${distance}m > ${CONFIG.INTERACTION_RADIUS}m`);
        client.send('power:tooFar', { 
          powerId: power.id,
          distance,
          maxDistance: CONFIG.INTERACTION_RADIUS,
          playerPosition: { x: player.x, y: player.y },
          powerPosition: { x: power.x, y: power.y },
          message: 'You are too far away from this power',
          status: 'error',
          code: 'TOO_FAR'
        });
        return;
      }
      
      // Send power details to client
      console.log(`[handlePowerInteraction] Sending power details to client ${client.sessionId}`);
      try {
        const details = {
          id: power.id,
          name: power.name || "Unknown Power",
          description: power.description || "No description available",
          type: power.type || "Unknown",
          rarity: power.rarity || "Common",
          matrixQuadrant: power.matrixQuadrant || "Unknown",
          captureChallenge: power.captureChallenge || {
            type: "reflection",
            question: "What virtue does this power represent to you?"
          },
          status: 'success',
          message: 'Power details retrieved successfully',
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
          playerPosition: { x: player.x, y: player.y },
          powerPosition: { x: power.x, y: power.y }
        };
        
        console.log(`[handlePowerInteraction] Power details to send:`, JSON.stringify(details));
        client.send('power:details', details);
        
        // Update player last activity and state
        player.lastActivity = Date.now();
        player.setState('interacting');
      } catch (detailsError) {
        console.error(`[handlePowerInteraction] Error sending power details:`, detailsError);
        client.send('power:error', { 
          message: 'Error processing power details',
          error: detailsError.message,
          status: 'error',
          code: 'DETAILS_ERROR'
        });
      }
    } catch (error) {
      console.error(`[handlePowerInteraction] Unexpected error:`, error);
      try {
        client.send('power:error', { 
          message: 'Server error processing power interaction',
          error: error.message,
          status: 'error',
          code: 'SERVER_ERROR'
        });
      } catch (sendError) {
        console.error(`[handlePowerInteraction] Failed to send error to client:`, sendError);
      }
    }
  }
  
  /**
   * Handle the admin request to spawn test powers
   * @param client - Client requesting power spawn
   * @param message - Spawn message with options
   */
  private handleSpawnTestPowers(client: Client, message: any) {
    console.log(`[handleSpawnTestPowers] Received request:`, message);
    
    // Get player
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.log(`[handleSpawnTestPowers] Player not found for client ${client.sessionId}`);
      return;
    }
    
    // Log the request
    console.log(`[handleSpawnTestPowers] Admin request from ${player.username} (${client.sessionId})`);
    
    // Default count
    const count = message.count || 3;
    console.log(`[handleSpawnTestPowers] Spawning ${count} powers`);
    
    // Generate powers near the player if specified
    let centerPosition = new Position();
    if (message.nearPlayer) {
      centerPosition.x = player.x;
      centerPosition.y = player.y;
      console.log(`[handleSpawnTestPowers] Using player position: (${centerPosition.x}, ${centerPosition.y})`);
    } else {
      centerPosition.x = 0;
      centerPosition.y = 0;
      console.log(`[handleSpawnTestPowers] Using default position: (0, 0)`);
    }
    
    // Generate powers
    const radius = message.radius || 100; // 100 meter radius
    console.log(`[handleSpawnTestPowers] Requesting ${count} powers within ${radius}m radius`);
    
    const powers = PowerService.generatePowersForArea(centerPosition, radius, count);
    console.log(`[handleSpawnTestPowers] Generated ${powers.length} powers`);
    
    // Add powers to game world
    for (const powerData of powers) {
      // Create a simplified power that works with our schema
      const power = new SimplePower(
        powerData._id,
        powerData.name,
        powerData.type,
        powerData.rarity
      );
      
      // Position the power - randomly place within radius of requested position
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius * 0.8; // 80% of radius for better clustering
      power.x = centerPosition.x + Math.cos(angle) * distance;
      power.y = centerPosition.y + Math.sin(angle) * distance;
      
      // Make sure the power is active
      power.isActive = true;
      power.spawnedAt = Date.now();
      
      // Add to state
      this.state.powers.set(power.id, power);
      console.log(`[handleSpawnTestPowers] Spawned power: ${power.name} (${power.id}) at (${power.x}, ${power.y})`);
    }
    
    // Update total count
    console.log(`[handleSpawnTestPowers] Total powers in world: ${this.state.powers.size}`);
    
    // Notify the client
    client.send("admin:powersSpawned", {
      count: powers.length,
      position: {
        x: centerPosition.x,
        y: centerPosition.y
      },
      radius: radius
    });
  }
  
  /**
   * Check if a player has entered or exited a zone
   * @param client Client to notify
   * @param player Player to check
   */
  private checkZoneEntry(client: Client, player: SimplePlayer) {
    // Find zone at current position
    let currentZone = null;
    
    this.state.zones.forEach((zone) => {
      const distance = Math.sqrt(
        Math.pow(zone.x - player.x, 2) + 
        Math.pow(zone.y - player.y, 2)
      );
      
      // Check if player is inside zone
      if (distance <= zone.radius) {
        // If multiple zones overlap, prioritize the smaller one
        if (!currentZone || zone.radius < currentZone.radius) {
          currentZone = zone;
        }
      }
    });
    
    // Process zone changes
    const previousZoneId = player.currentZoneId;
    
    if (currentZone) {
      // Player entered a zone
      const zoneId = currentZone.id;
      
      // Update player's current zone
      player.setZone(zoneId);
      
      // Only notify if the zone changed
      if (previousZoneId !== zoneId) {
        client.send('zone:entered', {
          zoneId: zoneId,
          zoneName: currentZone.name,
          zoneType: currentZone.type
        });
      }
    } else if (previousZoneId) {
      // Player exited a zone
      const previousZone = this.state.zones.get(previousZoneId);
      
      // Clear player's current zone
      player.setZone("");
      
      if (previousZone) {
        client.send('zone:exited', {
          zoneId: previousZoneId,
          zoneName: previousZone.name
        });
      }
    }
  }
}
