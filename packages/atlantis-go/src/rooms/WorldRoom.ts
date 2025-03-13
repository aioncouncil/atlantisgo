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
import { WorldState } from '../schemas/WorldState';
import { Player, Power, Zone } from '../schemas/GameEntities';
import { Position, UserMetadata, VirtuePoints } from '../schemas/index';
import { nanoid } from 'nanoid';

// Define RoomOptions type
interface RoomOptions {
  name?: string;
  description?: string;
  maxPlayers?: number;
  regionId?: string;
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
  response: any;
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
  INTERACTION_RADIUS: 50, // meters
  POWER_MAX_COUNT: 50,
  POWER_DENSITY: 0.001, // powers per square meter
  POWER_LIFETIME: 3600000, // 1 hour in ms
  WORLD_SIZE: {
    WIDTH: 10000, // meters
    HEIGHT: 10000, // meters
  },
  ZONE_MAX_COUNT: 30,
  WORLD_UPDATE_INTERVAL: 1000, // 1 second in ms
  RATE_LIMIT: {
    MOVEMENT: {
      WINDOW_MS: 1000, // 1 second
      MAX_REQUESTS: 5 // 5 requests per second
    },
    ACTION: {
      WINDOW_MS: 1000, // 1 second
      MAX_REQUESTS: 3 // 3 requests per second
    }
  }
};

/**
 * WorldRoom: The primary multiplayer room that manages the game world
 */
export class WorldRoom extends Room<WorldState> {
  // Track rate limits for clients
  private movementRateLimits: Map<string, { count: number, lastReset: number }> = new Map();
  private actionRateLimits: Map<string, { count: number, lastReset: number }> = new Map();
  
  // Scheduled tasks
  private powerSpawnTask: NodeJS.Timeout | null = null;
  private playerInactivityTask: NodeJS.Timeout | null = null;
  private worldStateUpdateTask: NodeJS.Timeout | null = null;
  
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
    const targetPowers = Math.floor(worldArea * CONFIG.POWER_DENSITY);
    const powersToSpawn = Math.min(
      CONFIG.POWER_MAX_COUNT - this.state.powers.size,
      Math.max(1, Math.floor(targetPowers / 10)) // Spawn ~10% of target per interval
    );
    
    // Generate powers
    for (let i = 0; i < powersToSpawn; i++) {
      // Generate random position
      const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE.WIDTH;
      const y = (Math.random() - 0.5) * CONFIG.WORLD_SIZE.HEIGHT;
      
      // Generate power with random attributes
      const position = new Position();
      position.update(x, y);
      
      const power = new Power(
        nanoid(10),
        this.generatePowerName(),
        this.getRandomPowerType(),
        this.getRandomRarity(),
        this.getRandomMatrixQuadrant(),
        position
      );
      
      // Set description
      power.description = "A power waiting to be discovered";
      
      // Set capture challenge based on rarity
      power.setCaptureChallenge(this.generateCaptureChallenge(power.rarity));
      
      // Add to world state
      this.state.powers.set(power.id, power);
      
      console.log(`Spawned power ${power.id} at (${x}, ${y})`);  
    }
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
   * Handle power capture attempt
   */
  private handlePowerCapture(client: Client, message: any) {
    // Rate limiting
    if (!this.checkRateLimit(client.sessionId, 'action')) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Validate message
    if (!message.powerId || !message.challengeResponse) return;
    
    const power = this.state.powers.get(message.powerId);
    if (!power || !power.isActive) {
      client.send('power:notFound', { powerId: message.powerId });
      return;
    }
    
    // Check if player is close enough to capture
    const distance = player.position.distanceTo(power.position);
    if (distance > CONFIG.INTERACTION_RADIUS) {
      client.send('power:tooFar', { 
        powerId: power.id,
        distance,
        maxDistance: CONFIG.INTERACTION_RADIUS 
      });
      return;
    }
    
    // Verify challenge response
    const successRate = this.evaluateCaptureChallenge(power, message.challengeResponse);
    const captureSuccess = Math.random() < successRate;
    
    if (captureSuccess) {
      // Add power to player's collection
      player.addPower(power.id, power.type, power.rarity);
      
      // Notify client
      client.send('power:captured', {
        powerId: power.id,
        powerName: power.name,
        powerType: power.type,
        powerRarity: power.rarity,
        successRate: successRate
      });
      
      // Remove power from world
      this.despawnPower(power.id);
    } else {
      // Failed capture attempt
      client.send('power:captureFailed', {
        powerId: power.id,
        powerName: power.name,
        successRate: successRate
      });
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
    if (!zone.containsPosition(player.position)) {
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
  
  private evaluateCaptureChallenge(power: Power, response: any): number {
    // This would contain logic to evaluate the quality of the user's response
    // to the philosophical challenge
    
    // For now, implement a simple evaluation based on response length and rarity
    const challenge = power.captureChallenge as unknown as CaptureChallenge;
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
    console.log('Creating World Room', { options });
    
    // Initialize room state
    this.setState(new WorldState());
    
    // Set room metadata
    this.setMetadata({
      name: options.name || 'Atlantis World',
      description: options.description || 'The main game world of Atlantis Go',
      maxPlayers: options.maxPlayers || 100,
      regionId: options.regionId || 'global'
    });
    
    // Enable presence features
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
    
    // Configure message handlers
    this.registerMessageHandlers();
    
    // Start scheduled tasks
    this.startScheduledTasks();
    
    console.log('World Room created successfully');
  }
  
  /**
   * Register message handlers for client messages
   */
  private registerMessageHandlers() {
    // Movement updates
    this.onMessage('move', (client, message) => {
      this.handlePlayerMovement(client, message);
    });
    
    // Power interactions
    this.onMessage('power:interact', (client, message) => {
      this.handlePowerInteraction(client, message);
    });
    
    // Power capture attempts
    this.onMessage('power:capture', (client, message) => {
      this.handlePowerCapture(client, message);
    });
    
    // Zone entry/exit
    this.onMessage('zone:enter', (client, message) => {
      this.handleZoneEntry(client, message);
    });
    
    this.onMessage('zone:exit', (client, message) => {
      this.handleZoneExit(client, message);
    });
    
    // Player status updates
    this.onMessage('player:status', (client, message) => {
      this.handlePlayerStatus(client, message);
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
    }, CONFIG.PLAYER_INACTIVE_TIMEOUT / 2);
    
    // Update world state
    this.worldStateUpdateTask = setInterval(() => {
      this.state.tick();
    }, 1000);
  }
  
  /**
   * Main simulation update loop
   */
  update(deltaTime: number) {
    // Check for powers that should despawn
    this.state.powers.forEach((power, key) => {
      if (power.shouldDespawn()) {
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
    
    const metadata = new UserMetadata(
      userId,
      username,
      options.rank || 1,
      options.avatarUrl || ""
    );
    
    const player = new Player(userId, metadata);
    
    // Set initial position
    if (options.position) {
      player.position.update(options.position.x, options.position.y);
    } else {
      // Random position if none provided
      player.position.update(
        (Math.random() * 2 - 1) * 0.01, // Small random offset around 0,0
        (Math.random() * 2 - 1) * 0.01
      );
    }
    
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
    
    // Send initial state to client
    this.sendVisibleWorldToClient(client);
  }
  
  /**
   * Send only the visible portion of the world to the client
   * based on their location and visibility radius
   */
  private sendVisibleWorldToClient(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Collect visible powers, zones, and players within visibility radius
    const visiblePlayers = this.state.getPlayersInRadius(
      player.position.x,
      player.position.y,
      this.state.visibilityRadius
    );
    
    const visiblePowers = this.state.getPowersInRadius(
      player.position.x,
      player.position.y,
      this.state.visibilityRadius
    );
    
    // Send this data to the client via message
    // Note: Colyseus already handles state synchronization, but this message
    // provides initial context about what's visible
    client.send('world:visible', {
      players: visiblePlayers.length,
      powers: visiblePowers.length,
      currentZone: player.currentZoneId ? this.state.zones.get(player.currentZoneId) : null,
      visibilityRadius: this.state.visibilityRadius
    });
  }
  
  /**
   * Handle player movement updates
   */
  private handlePlayerMovement(client: Client, message: any) {
    // Rate limiting
    if (!this.checkRateLimit(client.sessionId, 'movement')) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Validate movement data
    if (typeof message.x !== 'number' || typeof message.y !== 'number') {
      return;
    }
    
    // Update player position
    player.updatePosition(message.x, message.y);
    player.setState(message.state || 'moving');
    
    // Check if player has entered a new zone
    const zoneAtPosition = this.state.getZoneAtPosition(message.x, message.y);
    
    if (zoneAtPosition && zoneAtPosition.id !== player.currentZoneId) {
      // Player entered a new zone
      if (player.currentZoneId) {
        // Remove from previous zone
        const oldZone = this.state.zones.get(player.currentZoneId);
        if (oldZone) {
          oldZone.removePlayer(player.id);
        }
      }
      
      // Add to new zone
      zoneAtPosition.addPlayer(player.id);
      player.setZone(zoneAtPosition.id);
      
      // Notify client about zone entry
      client.send('zone:entered', {
        zoneId: zoneAtPosition.id,
        zoneName: zoneAtPosition.name,
        zoneType: zoneAtPosition.type
      });
    } else if (!zoneAtPosition && player.currentZoneId) {
      // Player left a zone
      const oldZone = this.state.zones.get(player.currentZoneId);
      if (oldZone) {
        oldZone.removePlayer(player.id);
      }
      
      player.setZone("");
      
      // Notify client about zone exit
      client.send('zone:exited', {
        zoneId: player.currentZoneId
      });
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
   * Handle power interaction
   */
  private handlePowerInteraction(client: Client, message: any) {
    // Rate limiting
    if (!this.checkRateLimit(client.sessionId, 'action')) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Validate message
    if (!message.powerId) return;
    
    const power = this.state.powers.get(message.powerId);
    if (!power || !power.isActive) {
      client.send('power:notFound', { powerId: message.powerId });
      return;
    }
    
    // Check if player is close enough to interact
    const distance = player.position.distanceTo(power.position);
    if (distance > CONFIG.INTERACTION_RADIUS) {
      client.send('power:tooFar', { 
        powerId: power.id,
        distance,
        maxDistance: CONFIG.INTERACTION_RADIUS 
      });
      return;
    }
    
    // Send power details to client
    client.send('power:details', {
      id: power.id,
      name: power.name,
      description: power.description,
      type: power.type,
      rarity: power.rarity,
      matrixQuadrant: power.matrixQuadrant,
      captureChallenge: power.captureChallenge
    });
    
    // Update player state
    player.setState('interacting');
  }
}
