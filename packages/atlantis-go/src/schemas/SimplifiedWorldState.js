/**
 * SimplifiedWorldState.js
 * 
 * A simplified schema for world state, avoiding complex nested objects
 */

import { Schema, MapSchema, ArraySchema, defineTypes } from '@colyseus/schema';

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
 * SimpleExperiencePhase class
 */
export class SimpleExperiencePhase extends Schema {
  constructor(name, description, duration) {
    super();
    this.name = name;
    this.description = description;
    this.duration = duration;
    this.tasks = new ArraySchema();
  }
  
  addTask(task) {
    this.tasks.push(task);
  }
}

defineTypes(SimpleExperiencePhase, {
  name: "string",
  description: "string",
  duration: "number",
  tasks: ["string"]
});

/**
 * SimpleExperience class
 */
export class SimpleExperience extends Schema {
  constructor(id, name, type) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.description = "";
    this.difficulty = 1;
    this.estimatedDuration = 15;
    this.maximumDuration = 30;
    this.minimumRank = 1;
    this.minPlayers = 1;
    this.maxPlayers = 4;
    this.locationType = "Anywhere";
    this.zoneId = "";
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.flow = new ArraySchema();
    this.phases = new ArraySchema();
    this.requiredPowers = new ArraySchema();
    this.xpReward = 10;
    this.coinsReward = 5;
    this.powerRewards = new ArraySchema();
  }
}

defineTypes(SimpleExperience, {
  id: "string",
  name: "string",
  type: "string",
  description: "string",
  difficulty: "number",
  estimatedDuration: "number",
  maximumDuration: "number",
  minimumRank: "number",
  minPlayers: "number",
  maxPlayers: "number",
  locationType: "string",
  zoneId: "string",
  x: "number",
  y: "number",
  radius: "number",
  flow: ["string"],
  phases: [SimpleExperiencePhase],
  requiredPowers: ["string"],
  xpReward: "number",
  coinsReward: "number",
  powerRewards: ["string"]
});

/**
 * SimpleExperienceParticipant class
 */
export class SimpleExperienceParticipant extends Schema {
  constructor(userId, role = "Participant") {
    super();
    this.userId = userId;
    this.role = role;
    this.status = "Active";
    this.joinTime = Date.now();
    this.completeTime = 0;
  }
  
  complete() {
    this.status = "Completed";
    this.completeTime = Date.now();
  }
  
  fail() {
    this.status = "Failed";
    this.completeTime = Date.now();
  }
}

defineTypes(SimpleExperienceParticipant, {
  userId: "string",
  role: "string",
  status: "string",
  joinTime: "number",
  completeTime: "number"
});

/**
 * SimpleExperienceActivity class
 */
export class SimpleExperienceActivity extends Schema {
  constructor(id, userId, content) {
    super();
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.timestamp = Date.now();
    this.verified = false;
  }
  
  verify() {
    this.verified = true;
  }
}

defineTypes(SimpleExperienceActivity, {
  id: "string",
  userId: "string",
  content: "string",
  timestamp: "number",
  verified: "boolean"
});

/**
 * SimpleExperienceInstance class
 */
export class SimpleExperienceInstance extends Schema {
  constructor(id, experienceId) {
    super();
    this.id = id;
    this.experienceId = experienceId;
    this.status = "Scheduled";
    this.participants = new MapSchema();
    this.currentPhase = 0;
    this.startTime = 0;
    this.lastUpdateTime = Date.now();
    this.estimatedCompletionTime = 0;
    this.activities = new MapSchema();
    this.completionTime = 0;
    this.zoneId = "";
  }
}

defineTypes(SimpleExperienceInstance, {
  id: "string",
  experienceId: "string",
  status: "string",
  participants: { map: SimpleExperienceParticipant },
  currentPhase: "number",
  startTime: "number",
  lastUpdateTime: "number",
  estimatedCompletionTime: "number",
  activities: { map: SimpleExperienceActivity },
  completionTime: "number",
  zoneId: "string"
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
    this.experiences = new MapSchema();
    this.experienceInstances = new MapSchema();
    
    // World properties
    this.name = "Atlantis World";
    this.visibilityRadius = 1000; // meters
    this.interactionRadius = 50; // meters
    this.maxPlayers = 100;
    this.worldTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.playerCount = 0;
    this.activePowerCount = 0;
    this.activeZoneCount = 0;
    this.activeExperienceCount = 0;
  }
  
  /**
   * Update world time
   */
  tick() {
    this.worldTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.playerCount = Object.keys(this.players).length;
    this.activePowerCount = this.countActivePowers();
    this.activeZoneCount = this.countActiveZones();
    this.activeExperienceCount = Object.keys(this.experienceInstances).length;
  }
}

defineTypes(SimplifiedWorldState, {
  players: { map: SimplePlayer },
  powers: { map: SimplePower },
  zones: { map: SimpleZone },
  experiences: { map: SimpleExperience },
  experienceInstances: { map: SimpleExperienceInstance },
  name: "string",
  visibilityRadius: "number",
  interactionRadius: "number",
  maxPlayers: "number",
  worldTime: "number",
  lastUpdateTime: "number",
  playerCount: "number",
  activePowerCount: "number",
  activeZoneCount: "number",
  activeExperienceCount: "number"
}); 