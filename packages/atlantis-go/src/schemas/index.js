/**
 * index.js
 * 
 * Core schema definitions for Atlantis Go
 */

import { Schema, defineTypes } from '@colyseus/schema';

/**
 * Position class representing a 2D position
 */
export class Position extends Schema {
  constructor(x = 0, y = 0) {
    super();
    this.x = x;
    this.y = y;
  }
  
  /**
   * Update position coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  update(x, y) {
    this.x = x;
    this.y = y;
  }
  
  /**
   * Calculate distance to another position
   * @param {Position} otherPosition - Other position
   * @returns {number} - Distance in units
   */
  distanceTo(otherPosition) {
    if (!otherPosition) return Infinity;
    
    return Math.sqrt(
      Math.pow(this.x - otherPosition.x, 2) + 
      Math.pow(this.y - otherPosition.y, 2)
    );
  }
}

// Define schema types for Position
defineTypes(Position, {
  x: "number",
  y: "number"
});

/**
 * UserMetadata class for storing player information
 */
export class UserMetadata extends Schema {
  constructor(userId, username, rank = 1, avatarUrl = '') {
    super();
    this.userId = userId;
    this.username = username;
    this.rank = rank;
    this.avatarUrl = avatarUrl;
    this.joinedAt = Date.now();
  }
  
  /**
   * Get the user's display name
   * @returns {string} - User's display name
   */
  getDisplayName() {
    return this.username;
  }
}

// Define schema types for UserMetadata
defineTypes(UserMetadata, {
  userId: "string",
  username: "string",
  rank: "number",
  avatarUrl: "string",
  joinedAt: "number"
});

/**
 * VirtuePoints class for tracking player virtues
 */
export class VirtuePoints extends Schema {
  constructor() {
    super();
    this.wisdom = 0;
    this.courage = 0;
    this.temperance = 0;
    this.justice = 0;
    this.strength = 0;
  }
  
  /**
   * Get total virtue points
   * @returns {number} - Total virtue points
   */
  getTotal() {
    return this.wisdom + this.courage + this.temperance + this.justice + this.strength;
  }
  
  /**
   * Get primary virtue (highest value)
   * @returns {string} - Primary virtue
   */
  getPrimaryVirtue() {
    const virtues = [
      { name: 'Wisdom', value: this.wisdom },
      { name: 'Courage', value: this.courage },
      { name: 'Temperance', value: this.temperance },
      { name: 'Justice', value: this.justice },
      { name: 'Strength', value: this.strength }
    ];
    
    virtues.sort((a, b) => b.value - a.value);
    return virtues[0].name;
  }
}

// Define schema types for VirtuePoints
defineTypes(VirtuePoints, {
  wisdom: "number",
  courage: "number",
  temperance: "number",
  justice: "number",
  strength: "number"
}); 