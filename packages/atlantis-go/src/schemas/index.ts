/**
 * @file schemas/index.ts
 * @description Core schema definitions for Atlantis Go's real-time multiplayer system
 * 
 * This file defines the state synchronization schemas used by Colyseus.
 * These schemas determine what data is automatically synchronized between
 * the server and connected clients, providing the real-time foundation for
 * the multiplayer experience.
 */

import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { nanoid } from 'nanoid';

/**
 * Position within the game world
 * Used for tracking entity locations and calculating proximity-based interactions
 */
export class Position extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  
  /**
   * Creates a new Position instance
   * @param x - Longitude coordinate
   * @param y - Latitude coordinate
   */
  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
  
  /**
   * Calculate distance to another position
   * @param other - Position to calculate distance to
   * @returns Distance in coordinate units (not meters)
   */
  distanceTo(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Update position from raw coordinates
   * @param x - New longitude
   * @param y - New latitude
   */
  update(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
  
  /**
   * Create a Position from geolocation coordinates
   * @param latitude - Latitude value
   * @param longitude - Longitude value
   * @returns New Position instance
   */
  static fromGeoCoordinates(latitude: number, longitude: number): Position {
    // We're using longitude as x and latitude as y for consistency
    return new Position(longitude, latitude);
  }
  
  /**
   * Convert to GeoJSON point format
   * @returns GeoJSON Point object
   */
  toGeoJson(): { type: string, coordinates: number[] } {
    return {
      type: "Point",
      coordinates: [this.x, this.y]
    };
  }
}

/**
 * SynchronizedCounter provides an atomic counter that safely synchronizes
 * even with high update frequency
 */
export class SynchronizedCounter extends Schema {
  @type("number") value: number = 0;
  
  /**
   * Creates a new counter with initial value
   * @param initialValue - Starting value for counter
   */
  constructor(initialValue: number = 0) {
    super();
    this.value = initialValue;
  }
  
  /**
   * Increment counter by specified amount
   * @param amount - Amount to increment (default: 1)
   * @returns New counter value
   */
  increment(amount: number = 1): number {
    this.value += amount;
    return this.value;
  }
  
  /**
   * Decrement counter by specified amount
   * @param amount - Amount to decrement (default: 1)
   * @returns New counter value
   */
  decrement(amount: number = 1): number {
    this.value -= amount;
    return this.value;
  }
  
  /**
   * Set counter to specific value
   * @param value - New value for counter
   */
  set(value: number): void {
    this.value = value;
  }
}

/**
 * UserMetadata contains minimal information about a user
 * that needs to be shared with other players
 */
export class UserMetadata extends Schema {
  @type("string") userId: string;
  @type("string") username: string;
  @type("number") rank: number = 1;
  @type("string") avatarUrl: string = "";
  
  constructor(userId: string, username: string, rank: number = 1, avatarUrl: string = "") {
    super();
    this.userId = userId;
    this.username = username;
    this.rank = rank;
    this.avatarUrl = avatarUrl;
  }
}

/**
 * VirtuePoints tracks a user's virtue levels in the game
 */
export class VirtuePoints extends Schema {
  @type("number") wisdom: number = 0;
  @type("number") courage: number = 0;
  @type("number") temperance: number = 0;
  @type("number") justice: number = 0;
  @type("number") strength: number = 0;
  
  constructor(
    wisdom: number = 0,
    courage: number = 0,
    temperance: number = 0,
    justice: number = 0,
    strength: number = 0
  ) {
    super();
    this.wisdom = wisdom;
    this.courage = courage;
    this.temperance = temperance;
    this.justice = justice;
    this.strength = strength;
  }
  
  /**
   * Calculate overall happiness score based on virtue points
   * @returns Happiness score from 0-100
   */
  calculateHappiness(): number {
    // Simple average for now, can be replaced with more complex algorithm
    return (this.wisdom + this.courage + this.temperance + this.justice + this.strength) / 5;
  }
}
