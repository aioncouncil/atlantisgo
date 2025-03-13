/**
 * @file schemas/GameEntities.ts
 * @description Game entity schemas for Atlantis Go
 * 
 * This file defines the core game entities that are synchronized in real-time,
 * including players, powers (collectible arts), and zones.
 */

import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { Position, VirtuePoints, UserMetadata } from './index';
import { nanoid } from 'nanoid';

/**
 * Player entity representing a user in the game world
 */
export class Player extends Schema {
  @type("string") id: string;
  @type(UserMetadata) metadata: UserMetadata;
  @type(Position) position: Position = new Position();
  @type(VirtuePoints) virtues: VirtuePoints = new VirtuePoints();
  @type("string") currentZoneId: string = "";
  @type("boolean") isActive: boolean = true;
  @type("number") lastActivity: number = Date.now();
  @type("string") state: string = "idle"; // idle, moving, interacting, capturing

  constructor(id: string, metadata: UserMetadata) {
    super();
    this.id = id;
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
    // In a full implementation, this would add to a MapSchema of powers
    // For now, we just update the player's state
    this.state = "idle";
    this.lastActivity = Date.now();
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
  @type("string") description: string = "";
  @type("string") type: string; // maps to Art category
  @type("string") rarity: string; // Common, Uncommon, Rare, Epic, Legendary
  @type("string") matrixQuadrant: string; // SoulOut, SoulIn, BodyOut, BodyIn
  @type(Position) position: Position = new Position();
  @type("number") spawnTime: number = Date.now();
  @type("number") despawnTime: number = 0; // 0 means no despawn scheduled
  @type("boolean") isActive: boolean = true;
  @type("number") captureChallenge: number = 1; // 1-100 difficulty to capture

  constructor(
    id: string, 
    name: string, 
    type: string, 
    rarity: string, 
    matrixQuadrant: string,
    position: Position,
    captureChallenge: number = 1
  ) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.rarity = rarity;
    this.matrixQuadrant = matrixQuadrant;
    this.position = position;
    this.captureChallenge = captureChallenge;
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
  @type("string") description: string = "";
  @type("string") type: string; // e.g., "residential", "commercial", "education"
  @type("number") level: number = 1;
  @type(Position) center: Position;
  @type("number") radius: number; // in meters
  @type("string") ownerId: string = ""; // User or team that owns this zone
  @type("number") creationTime: number = Date.now();
  @type("number") lastActivity: number = Date.now();
  @type(["string"]) currentPlayerIds = new ArraySchema<string>();
  @type("number") maxCapacity: number = 50;
  @type("boolean") isActive: boolean = true;
  attributes: Record<string, any> = {}; // Custom attributes for zone features

  constructor(
    id: string,
    name: string,
    type: string,
    center: Position,
    radius: number
  ) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.center = center;
    this.radius = radius;
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
    return this.center.distanceTo(position) <= this.radius;
  }

  /**
   * Update zone information
   * @param name - New zone name
   * @param description - New zone description
   */
  updateInfo(name: string, description: string): void {
    this.name = name;
    this.description = description;
    this.lastActivity = Date.now();
  }

  /**
   * Set zone owner
   * @param ownerId - ID of new owner (user or team)
   */
  setOwner(ownerId: string): void {
    this.ownerId = ownerId;
    this.lastActivity = Date.now();
  }
}
