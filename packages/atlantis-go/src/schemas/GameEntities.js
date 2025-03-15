/**
 * GameEntities.js
 * 
 * Schema definitions for game entities in Atlantis Go
 */

import { Schema, MapSchema, ArraySchema, defineTypes } from '@colyseus/schema';
import { Position, UserMetadata } from './index.js';

/**
 * Player class representing a player in the game
 */
export class Player extends Schema {
  /**
   * Create a player entity
   * 
   * @param {string} id - Player ID
   * @param {object|UserMetadata} metadataValues - Metadata about the player
   */
  constructor(id, metadataValues) {
    super();
    this.id = id;
    this.position = new Position();
    
    // Create UserMetadata instance from metadata values
    if (metadataValues) {
      if (metadataValues instanceof UserMetadata) {
        // If already a UserMetadata instance, use it directly
        this.metadata = metadataValues;
      } else {
        // Otherwise create a new UserMetadata from raw values
        this.metadata = new UserMetadata(
          metadataValues.userId || 'unknown',
          metadataValues.username || 'Player',
          metadataValues.rank || 1,
          metadataValues.avatarUrl || ''
        );
      }
    } else {
      this.metadata = new UserMetadata('unknown', 'Player');
    }
    
    this.powers = new MapSchema();
    this.virtues = {
      wisdom: 0,
      courage: 0,
      temperance: 0,
      justice: 0,
      strength: 0
    };
    this.isActive = true;
    this.lastActivity = Date.now();
    this.currentZoneId = "";
    this.state = "idle";
    this.rank = 1;
    this.xp = 0;
  }
  
  /**
   * Update player position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updatePosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    this.lastActivity = Date.now();
  }
  
  /**
   * Add a power to the player's collection
   * @param {string} powerId - ID of the power
   * @param {string} type - Type of the power
   * @param {string} rarity - Rarity of the power
   */
  addPower(powerId, type, rarity) {
    if (!this.powers.has(powerId)) {
      const power = {
        id: powerId,
        type: type || 'Unknown',
        rarity: rarity || 'Common',
        capturedAt: Date.now()
      };
      
      this.powers.set(powerId, power);
      
      // Increase XP based on rarity
      let xpGain = 10; // Default
      
      switch (rarity) {
        case 'Common': xpGain = 10; break;
        case 'Uncommon': xpGain = 25; break;
        case 'Rare': xpGain = 50; break;
        case 'Epic': xpGain = 100; break;
        case 'Legendary': xpGain = 250; break;
      }
      
      this.xp += xpGain;
      
      // Check for rank up
      this.checkRankUp();
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if player should rank up based on XP
   */
  checkRankUp() {
    const xpThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];
    
    for (let rank = xpThresholds.length; rank > 0; rank--) {
      if (this.xp >= xpThresholds[rank - 1]) {
        if (this.rank < rank) {
          this.rank = rank;
        }
        break;
      }
    }
  }
  
  /**
   * Set player's current zone
   * @param {string} zoneId - Zone ID
   */
  setZone(zoneId) {
    this.currentZoneId = zoneId;
  }
  
  /**
   * Set player state
   * @param {string} state - Player state
   */
  setState(state) {
    this.state = state;
    this.lastActivity = Date.now();
  }
  
  /**
   * Mark player as inactive
   */
  markInactive() {
    this.isActive = false;
    this.state = 'inactive';
  }
}

// Define schema types for Player using defineTypes
defineTypes(Player, {
  id: "string",
  position: Position,
  metadata: "any",
  powers: { map: "any" },
  isActive: "boolean",
  lastActivity: "number",
  currentZoneId: "string",
  state: "string",
  rank: "number",
  xp: "number"
});

/**
 * Power class representing a power in the game world
 */
export class Power extends Schema {
  constructor(id, name, type, rarity, matrixQuadrant, position, complexity) {
    super();
    this.id = id;
    this.name = name || 'Unknown Power';
    this.description = '';
    this.type = type || 'Unknown';
    this.rarity = rarity || 'Common';
    this.matrixQuadrant = matrixQuadrant || 'Soul-Out';
    this.complexity = complexity || 1;
    this.position = position || new Position();
    this.isActive = true;
    this.spawnedAt = Date.now();
    this.despawnAt = 0;
    this.captureChallenge = null;
  }
  
  /**
   * Schedule power to despawn after a delay
   * @param {number} delay - Delay in milliseconds
   */
  scheduleDespawn(delay) {
    this.despawnAt = Date.now() + delay;
  }
  
  /**
   * Check if power should despawn
   * @returns {boolean} - Whether power should despawn
   */
  shouldDespawn() {
    return this.despawnAt > 0 && Date.now() >= this.despawnAt;
  }
  
  /**
   * Deactivate the power
   */
  deactivate() {
    this.isActive = false;
  }
  
  /**
   * Set capture challenge for the power
   * @param {Object} challenge - Challenge data
   */
  setCaptureChallenge(challenge) {
    this.captureChallenge = challenge;
  }
}

// Define schema types for Power using defineTypes 
defineTypes(Power, {
  id: "string",
  name: "string",
  description: "string",
  type: "string",
  rarity: "string",
  matrixQuadrant: "string",
  complexity: "number",
  position: Position,
  isActive: "boolean",
  spawnedAt: "number",
  despawnAt: "number",
  captureChallenge: "any"
});

/**
 * Zone class representing a geographical zone in the game world
 */
export class Zone extends Schema {
  constructor(id, name, type, position, radius) {
    super();
    this.id = id;
    this.name = name || 'Unknown Zone';
    this.type = type || 'default';
    this.position = position || new Position();
    this.radius = radius || 100;
    this.players = new ArraySchema();
    this.attributes = {};
    this.description = '';
  }
  
  /**
   * Check if a position is within this zone
   * @param {Position} position - Position to check
   * @returns {boolean} - Whether position is in zone
   */
  containsPosition(position) {
    if (!position) return false;
    
    const distance = Math.sqrt(
      Math.pow(this.position.x - position.x, 2) + 
      Math.pow(this.position.y - position.y, 2)
    );
    
    return distance <= this.radius;
  }
  
  /**
   * Add a player to the zone
   * @param {string} playerId - Player ID to add
   */
  addPlayer(playerId) {
    if (!this.players.includes(playerId)) {
      this.players.push(playerId);
    }
  }
  
  /**
   * Remove a player from the zone
   * @param {string} playerId - Player ID to remove
   */
  removePlayer(playerId) {
    const index = this.players.indexOf(playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
  }
}

// Define schema types for Zone using defineTypes
defineTypes(Zone, {
  id: "string",
  name: "string",
  type: "string",
  position: Position,
  radius: "number",
  players: { array: "string" },
  description: "string"
}); 