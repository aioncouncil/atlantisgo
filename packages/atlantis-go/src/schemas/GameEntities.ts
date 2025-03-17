/**
 * @file schemas/GameEntities.ts
 * @description Game entity schemas for Atlantis Go
 * 
 * This file defines the core game entities that are synchronized in real-time,
 * including players, powers (collectible arts), and zones.
 */

import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { Position, VirtuePoints, UserMetadata } from './index.js';
import { PowerCollection } from './PowerSchema.js';
import { nanoid } from 'nanoid';

/**
 * Player entity representing a user in the game world
 */
export class Player extends Schema {
  @type("string") id: string;
  @type("string") username: string;
  @type(Position) position = new Position(0, 0);
  @type("number") level: number = 1;
  @type("number") experience: number = 0;
  @type("string") avatarUrl: string = "";
  @type("number") lastActive: number = Date.now();
  @type(UserMetadata) metadata: UserMetadata;
  @type(VirtuePoints) virtues: VirtuePoints = new VirtuePoints();
  @type("string") currentZoneId: string = "";
  @type("boolean") isActive: boolean = true;
  @type("number") lastActivity: number = Date.now();
  @type("string") state: string = "idle"; // idle, moving, interacting, capturing
  @type({ map: PowerCollection }) powers = new MapSchema<PowerCollection>();
  @type("number") rank: number = 1;
  @type("number") xp: number = 0;
  @type("number") coins: number = 0;

  constructor(id: string, username: string, metadata: UserMetadata) {
    super();
    this.id = id;
    this.username = username;
    this.metadata = metadata;
  }

  /**
   * Update player position
   * @param x - New x coordinate
   * @param y - New y coordinate
   */
  updatePosition(x: number, y: number): void {
    this.position.update(x, y);
    this.lastActivity = Date.now();
    this.isActive = true;
  }

  /**
   * Mark player as inactive after timeout
   */
  markInactive(): void {
    this.isActive = false;
    this.state = "idle";
  }
  
  /**
   * Add power to player's collection
   * @param powerId - ID of the captured power
   * @param powerType - Type of the captured power
   * @param powerRarity - Rarity of the captured power
   */
  addPower(powerId: string, powerType: string, powerRarity: string): void {
    // Create a new power collection entry
    const powerCollection = new PowerCollection(powerId, this.id);
    this.powers.set(powerId, powerCollection);
    
    // Update player state
    this.state = "idle";
    this.lastActivity = Date.now();
    
    // In a real implementation, rewards would be calculated based on power properties
    // For now, we give fixed rewards based on rarity
    switch (powerRarity) {
      case "Legendary":
        this.xp += 50;
        this.coins += 25;
        break;
      case "Epic":
        this.xp += 30;
        this.coins += 15;
        break;
      case "Rare":
        this.xp += 20;
        this.coins += 10;
        break;
      case "Uncommon":
        this.xp += 10;
        this.coins += 5;
        break;
      default: // Common
        this.xp += 5;
        this.coins += 2;
        break;
    }
    
    // Check if player has ranked up
    this.checkRankUp();
  }
  
  /**
   * Check if player has enough XP to rank up
   */
  checkRankUp(): void {
    const xpRequiredForRankUp = this.rank * 100; // Simple formula: rank * 100 XP needed
    
    if (this.xp >= xpRequiredForRankUp && this.rank < 4) {
      this.rank++;
      // Notify about rank up would happen here in a full implementation
    }
  }

  /**
   * Update player state
   * @param state - New state
   */
  setState(state: string): void {
    this.state = state;
    this.lastActivity = Date.now();
  }

  /**
   * Set current zone
   * @param zoneId - ID of zone player is in
   */
  setZone(zoneId: string): void {
    this.currentZoneId = zoneId;
  }
}

/**
 * Power entity representing a collectible art in the game world
 */
export class Power extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") type: string;
  @type("string") rarity: string;
  @type(Position) position = new Position(0, 0);
  @type("number") spawnTime: number = Date.now();
  @type("number") despawnTime: number = Date.now() + 3600000; // 1 hour default
  @type("boolean") isActive: boolean = true;
  @type("number") challengeDifficulty: number = 1; // 1-100 difficulty to capture
  
  // Store the full challenge details separately (not synced directly)
  captureChallenge: any;

  constructor(id: string, name: string, type: string, rarity: string) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.rarity = rarity;
  }

  /**
   * Schedule power to despawn
   * @param timeMs - Time in milliseconds until despawn
   */
  scheduleDespawn(timeMs: number): void {
    this.despawnTime = Date.now() + timeMs;
  }

  /**
   * Set the capture challenge for this power
   * @param challenge - The challenge details
   */
  setCaptureChallenge(challenge: any): void {
    this.captureChallenge = challenge;
    
    // Also set the difficulty value that will be synced
    if (challenge && challenge.difficulty) {
      this.challengeDifficulty = challenge.difficulty;
    }
  }

  /**
   * Check if power should be despawned
   * @returns True if it's time to despawn
   */
  shouldDespawn(): boolean {
    return this.despawnTime > 0 && Date.now() >= this.despawnTime;
  }

  /**
   * Deactivate power (e.g., after being captured)
   */
  deactivate(): void {
    this.isActive = false;
  }
}

/**
 * Zone entity representing a geographic and functional area
 */
export class Zone extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") type: string;
  @type(Position) position = new Position(0, 0);
  @type("number") radius: number = 100;
  @type("string") controlledBy: string = "";
  @type("number") lastCaptured: number = 0;
  @type("number") creationTime: number = Date.now();
  @type("number") lastActivity: number = Date.now();
  @type(["string"]) currentPlayerIds = new ArraySchema<string>();
  @type("number") maxCapacity: number = 50;
  @type("boolean") isActive: boolean = true;
  attributes: Record<string, any> = {}; // Custom attributes for zone features

  constructor(id: string, name: string, type: string) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
  }

  /**
   * Add player to zone
   * @param playerId - ID of player to add
   * @returns True if added successfully
   */
  addPlayer(playerId: string): boolean {
    if (this.currentPlayerIds.includes(playerId)) return false;
    if (this.currentPlayerIds.length >= this.maxCapacity) return false;
    
    this.currentPlayerIds.push(playerId);
    this.lastActivity = Date.now();
    return true;
  }

  /**
   * Remove player from zone
   * @param playerId - ID of player to remove
   * @returns True if removed successfully
   */
  removePlayer(playerId: string): boolean {
    const index = this.currentPlayerIds.indexOf(playerId);
    if (index === -1) return false;
    
    this.currentPlayerIds.splice(index, 1);
    this.lastActivity = Date.now();
    return true;
  }

  /**
   * Check if a position is within this zone
   * @param position - Position to check
   * @returns True if position is in zone
   */
  containsPosition(position: Position): boolean {
    return this.position.distanceTo(position) <= this.radius;
  }

  /**
   * Update zone information
   * @param name - New zone name
   * @param description - New zone description
   */
  updateInfo(name: string, description: string): void {
    this.name = name;
    this.lastActivity = Date.now();
  }

  /**
   * Set zone owner
   * @param ownerId - ID of new owner (user or team)
   */
  setOwner(ownerId: string): void {
    this.controlledBy = ownerId;
    this.lastActivity = Date.now();
  }
}
