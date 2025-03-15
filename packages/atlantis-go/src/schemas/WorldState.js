/**
 * WorldState.js
 * 
 * Schema for the world state in Atlantis Go
 */

import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
// Removed import of Player, Power, Zone to avoid circular dependency

/**
 * WorldState class representing the entire game world state
 */
export class WorldState extends Schema {
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
   * Get players within a certain radius of a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Radius to search within
   * @returns {Array} - Players within radius
   */
  getPlayersInRadius(x, y, radius) {
    const result = [];
    
    this.players.forEach((player, sessionId) => {
      const distance = Math.sqrt(
        Math.pow(player.position.x - x, 2) + 
        Math.pow(player.position.y - y, 2)
      );
      
      if (distance <= radius) {
        result.push({
          id: player.id,
          sessionId: sessionId,
          position: {
            x: player.position.x,
            y: player.position.y
          }
        });
      }
    });
    
    return result;
  }
  
  /**
   * Get powers within a certain radius of a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Radius to search within
   * @returns {Array} - Powers within radius
   */
  getPowersInRadius(x, y, radius) {
    const result = [];
    
    this.powers.forEach((power, id) => {
      if (!power.isActive) return;
      
      const distance = Math.sqrt(
        Math.pow(power.position.x - x, 2) + 
        Math.pow(power.position.y - y, 2)
      );
      
      if (distance <= radius) {
        result.push({
          id: power.id,
          name: power.name,
          type: power.type,
          rarity: power.rarity,
          position: {
            x: power.position.x,
            y: power.position.y
          }
        });
      }
    });
    
    return result;
  }
  
  /**
   * Get the zone at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} - Zone at position or null
   */
  getZoneAtPosition(x, y) {
    let result = null;
    
    this.zones.forEach((zone) => {
      const distance = Math.sqrt(
        Math.pow(zone.position.x - x, 2) + 
        Math.pow(zone.position.y - y, 2)
      );
      
      if (distance <= zone.radius) {
        // If multiple zones overlap, prioritize the smaller one
        if (!result || zone.radius < result.radius) {
          result = zone;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Update tick counter
   */
  tick() {
    this.ticks++;
    this.lastUpdate = Date.now();
  }
}

// Define schema types for WorldState
defineTypes(WorldState, {
  players: { map: "any" },  // Using "any" for all map schemas to avoid type conflicts
  powers: { map: "any" },   // Using "any" for all map schemas to avoid type conflicts
  zones: { map: "any" },    // Using "any" for all map schemas to avoid type conflicts
  name: "string",
  visibilityRadius: "number",
  interactionRadius: "number",
  maxPlayers: "number",
  lastUpdate: "number",
  ticks: "number"
}); 