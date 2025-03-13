/**
 * @file schemas/WorldState.ts
 * @description World state schema for Atlantis Go
 * 
 * This file defines the state that is synchronized between the server and clients
 * for the main world room.
 */

import { Schema, type, MapSchema } from '@colyseus/schema';
import { Player, Power, Zone } from './GameEntities';

/**
 * WorldState contains all synchronized game state
 */
export class WorldState extends Schema {
  // Players currently in the world
  @type({ map: Player }) players = new MapSchema<Player>();
  
  // Powers (collectible arts) currently spawned in the world
  @type({ map: Power }) powers = new MapSchema<Power>();
  
  // Zones in the world
  @type({ map: Zone }) zones = new MapSchema<Zone>();
  
  // Global properties
  @type("number") worldTime: number = Date.now();
  @type("number") lastUpdateTime: number = Date.now();
  @type("number") playerCount: number = 0;
  @type("number") activePowerCount: number = 0;
  @type("number") activeZoneCount: number = 0;
  
  // Game settings
  @type("number") visibilityRadius: number = 1000; // meters
  @type("number") interactionRadius: number = 50; // meters
  @type("number") playerInactiveTimeout: number = 300000; // 5 minutes in ms
  @type("number") powerDespawnTime: number = 3600000; // 1 hour in ms
  
  constructor() {
    super();
  }
  
  /**
   * Update world time
   */
  tick(): void {
    this.worldTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.playerCount = this.players.size;
    this.activePowerCount = this.getActivePowerCount();
    this.activeZoneCount = this.getActiveZoneCount();
  }
  
  /**
   * Get count of active powers
   */
  private getActivePowerCount(): number {
    let count = 0;
    this.powers.forEach(power => {
      if (power.isActive) count++;
    });
    return count;
  }
  
  /**
   * Get count of active zones
   */
  private getActiveZoneCount(): number {
    let count = 0;
    this.zones.forEach(zone => {
      if (zone.isActive) count++;
    });
    return count;
  }
  
  /**
   * Get nearest power to a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param maxDistance - Maximum distance to consider
   * @returns Nearest power or null if none in range
   */
  getNearestPower(x: number, y: number, maxDistance: number): Power | null {
    let nearestPower: Power | null = null;
    let minDistance = maxDistance;
    
    this.powers.forEach(power => {
      if (!power.isActive) return;
      
      const distance = Math.sqrt(
        Math.pow(power.position.x - x, 2) + 
        Math.pow(power.position.y - y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestPower = power;
      }
    });
    
    return nearestPower;
  }
  
  /**
   * Get zone at position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Zone or null if no zone at position
   */
  getZoneAtPosition(x: number, y: number): Zone | null {
    let result: Zone | null = null;
    
    this.zones.forEach(zone => {
      if (!zone.isActive) return;
      
      const distance = Math.sqrt(
        Math.pow(zone.center.x - x, 2) + 
        Math.pow(zone.center.y - y, 2)
      );
      
      if (distance <= zone.radius) {
        // If multiple zones overlap, prefer higher level zones
        if (!result || zone.level > result.level) {
          result = zone;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Get all powers within radius of position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param radius - Search radius
   * @returns Array of powers within radius
   */
  getPowersInRadius(x: number, y: number, radius: number): Power[] {
    const result: Power[] = [];
    
    this.powers.forEach(power => {
      if (!power.isActive) return;
      
      const distance = Math.sqrt(
        Math.pow(power.position.x - x, 2) + 
        Math.pow(power.position.y - y, 2)
      );
      
      if (distance <= radius) {
        result.push(power);
      }
    });
    
    return result;
  }
  
  /**
   * Get all players within radius of position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param radius - Search radius
   * @returns Array of players within radius
   */
  getPlayersInRadius(x: number, y: number, radius: number): Player[] {
    const result: Player[] = [];
    
    this.players.forEach(player => {
      if (!player.isActive) return;
      
      const distance = Math.sqrt(
        Math.pow(player.position.x - x, 2) + 
        Math.pow(player.position.y - y, 2)
      );
      
      if (distance <= radius) {
        result.push(player);
      }
    });
    
    return result;
  }
}
