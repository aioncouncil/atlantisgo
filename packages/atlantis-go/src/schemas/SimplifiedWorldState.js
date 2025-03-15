/**
 * SimplifiedWorldState.js
 * 
 * A simplified schema for world state, avoiding complex nested objects
 */

import { Schema, MapSchema, defineTypes } from '@colyseus/schema';

/**
 * SimplePosition class
 */
export class SimplePosition extends Schema {
  constructor(x = 0, y = 0) {
    super();
    this.x = x;
    this.y = y;
  }
}

defineTypes(SimplePosition, {
  x: "number",
  y: "number"
});

/**
 * SimplePlayer class
 */
export class SimplePlayer extends Schema {
  constructor(id, username) {
    super();
    this.id = id;
    this.username = username;
    this.x = 0;
    this.y = 0;
    this.isActive = true;
    this.lastActivity = Date.now();
    this.rank = 1;
    this.xp = 0;
    this.state = "idle";
    this.currentZoneId = "";
    // Initialize powers as a map schema
    this.powers = new MapSchema();
    // Don't initialize metadata here - it will be set separately if needed
    this.metadata = undefined;
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
   * Set player's current zone
   * @param {string} zoneId - Zone ID
   */
  setZone(zoneId) {
    this.currentZoneId = zoneId;
  }
}

defineTypes(SimplePlayer, {
  id: "string",
  username: "string",
  x: "number",
  y: "number",
  isActive: "boolean",
  lastActivity: "number",
  rank: "number",
  xp: "number",
  state: "string",
  currentZoneId: "string",
  powers: { map: "string" },
  metadata: "any"
});

/**
 * SimplePower class
 */
export class SimplePower extends Schema {
  constructor(id, name, type, rarity) {
    super();
    this.id = id;
    this.name = name || 'Unknown Power';
    this.type = type || 'Unknown';
    this.rarity = rarity || 'Common';
    this.x = 0;
    this.y = 0;
    this.isActive = true;
    this.spawnedAt = Date.now();
  }
}

defineTypes(SimplePower, {
  id: "string",
  name: "string",
  type: "string",
  rarity: "string",
  x: "number",
  y: "number",
  isActive: "boolean",
  spawnedAt: "number"
});

/**
 * SimpleZone class
 */
export class SimpleZone extends Schema {
  constructor(id, name, type) {
    super();
    this.id = id;
    this.name = name || 'Unknown Zone';
    this.type = type || 'default';
    this.x = 0;
    this.y = 0;
    this.radius = 100;
  }
  
  /**
   * Check if a position is within this zone
   * @param {object} position - Position with x and y coordinates
   * @returns {boolean} - Whether position is in zone
   */
  containsPosition(position) {
    if (!position) return false;
    
    const distance = Math.sqrt(
      Math.pow(this.x - position.x, 2) + 
      Math.pow(this.y - position.y, 2)
    );
    
    return distance <= this.radius;
  }
}

defineTypes(SimpleZone, {
  id: "string",
  name: "string",
  type: "string",
  x: "number",
  y: "number",
  radius: "number"
});

/**
 * SimplifiedWorldState class
 */
export class SimplifiedWorldState extends Schema {
  constructor() {
    super();
    
    // Collections of entities
    this.players = new MapSchema();
    this.powers = new MapSchema();
    this.zones = new MapSchema();
    
    // World properties
    this.name = "Atlantis World";
    this.visibilityRadius = 1000; // meters
    this.interactionRadius = 50; // meters
    this.maxPlayers = 100;
    this.lastUpdate = Date.now();
    this.ticks = 0;
  }
  
  /**
   * Update tick counter
   */
  tick() {
    this.ticks++;
    this.lastUpdate = Date.now();
  }
}

defineTypes(SimplifiedWorldState, {
  players: { map: SimplePlayer },
  powers: { map: SimplePower },
  zones: { map: SimpleZone },
  name: "string",
  visibilityRadius: "number",
  interactionRadius: "number",
  maxPlayers: "number",
  lastUpdate: "number",
  ticks: "number"
}); 