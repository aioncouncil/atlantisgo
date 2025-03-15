/**
 * PowerSchema.js
 * 
 * Schema for power data model in Atlantis Go
 * Optimized version with improved performance
 */

import { Schema, defineTypes } from '@colyseus/schema';

/**
 * PowerComponentMastery class representing mastery levels of power components
 * Optimized with caching and better property access
 */
export class PowerComponentMastery extends Schema {
  constructor() {
    super();
    // Initialize all component values to fixed values
    this.definition = 0;
    this.end = 0;
    this.parts = 0;
    this.matter = 0;
    this.instrument = 0;
    
    // Cache for computed values
    this._cache = {
      average: null,
      max: null
    };
    
    // Property mapping for fast lookups
    this._propMap = ['definition', 'end', 'parts', 'matter', 'instrument'];
  }
  
  /**
   * Get component value by index or name
   * @param {number|string} index - Index or property name
   * @returns {number} - Component value
   */
  getByIndex(index) {
    // Safety check to ensure index is valid
    if (index === undefined || index === null) {
      return 0;
    }
    
    // Fast lookup using pre-defined mapping
    const propName = typeof index === 'number' ? this._propMap[index] : index;
    
    // Return the value or 0 if not found
    return this[propName] || 0;
  }
  
  /**
   * Get average mastery level across all components
   * @returns {number} - Average mastery level
   */
  getAverageMastery() {
    // Use cached value if available
    if (this._cache.average !== null) {
      return this._cache.average;
    }
    
    // Calculate average
    const sum = this.definition + this.end + this.parts + this.matter + this.instrument;
    const average = sum / 5;
    
    // Cache result
    this._cache.average = average;
    
    return average;
  }
  
  /**
   * Reset cache when any value changes
   */
  resetCache() {
    this._cache.average = null;
    this._cache.max = null;
  }
}

// Define schema types for PowerComponentMastery
defineTypes(PowerComponentMastery, {
  definition: "number",
  end: "number",
  parts: "number",
  matter: "number",
  instrument: "number"
});

/**
 * PowerCollection class for tracking a player's collected powers
 * Optimized for better performance
 */
export class PowerCollection extends Schema {
  constructor(powerId, userId) {
    super();
    this.powerId = powerId || '';
    this.userId = userId || '';
    this.acquiredAt = new Date().toISOString();
    this.overall = 0;
    this.components = new PowerComponentMastery();
    this.uses = 0;
    this.lastUsed = "";
    this.notes = "";
    this.favorite = false;
    
    // Metadata for faster references
    this._meta = {
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Update usage count and timestamp
   */
  incrementUses() {
    this.uses++;
    this.lastUsed = new Date().toISOString();
    this._meta.lastUpdated = Date.now();
  }
  
  /**
   * Calculate overall mastery based on component values
   * Updates the overall property efficiently
   */
  recalculateOverall() {
    // Use the component average for overall mastery
    this.overall = Math.round(this.components.getAverageMastery());
    this._meta.lastUpdated = Date.now();
  }
}

// Define schema types for PowerCollection
defineTypes(PowerCollection, {
  powerId: "string",
  userId: "string",
  acquiredAt: "string",
  overall: "number",
  components: PowerComponentMastery,
  uses: "number",
  lastUsed: "string",
  notes: "string",
  favorite: "boolean"
});

/**
 * Power class representing the data model for a power
 * Optimized with caching and more efficient methods
 */
export class Power extends Schema {
  constructor(data = {}) {
    super();
    
    // Core properties
    this._id = data._id || '';
    this.name = data.name || 'Unknown Power';
    this.description = data.description || '';
    this.type = data.type || 'Unknown';
    this.rarity = data.rarity || 'Common';
    this.complexity = data.complexity || 1;
    this.requiredRank = data.requiredRank || 1;
    this.category = data.category || 'wisdom';
    this.overall = data.overall || 0;
    
    // Rewards
    this.wisdomReward = data.wisdomReward || 0;
    this.courageReward = data.courageReward || 0;
    this.temperanceReward = data.temperanceReward || 0;
    this.justiceReward = data.justiceReward || 0;
    this.strengthReward = data.strengthReward || 0;
    
    // Capture challenge
    if (data.captureChallenge) {
      this.captureChallenge = data.captureChallenge;
    } else {
      this.captureChallenge = {
        type: 'reflection',
        question: 'What virtue does this power represent to you?'
      };
    }
    
    // Cache for computed values
    this._cache = {
      totalReward: null,
      primaryVirtue: null,
      xpValue: null
    };
    
    // Fixed rarity values lookup table for better performance
    this._rarityValues = {
      'Common': 10,
      'Uncommon': 25,
      'Rare': 50,
      'Epic': 100,
      'Legendary': 250
    };
  }
  
  /**
   * Get the total virtue reward from this power
   * Uses caching for better performance
   * @returns {number} - Total reward
   */
  getTotalReward() {
    // Return cached value if available
    if (this._cache.totalReward !== null) {
      return this._cache.totalReward;
    }
    
    // Calculate total reward
    const total = (
      this.wisdomReward +
      this.courageReward +
      this.temperanceReward +
      this.justiceReward +
      this.strengthReward
    );
    
    // Cache the result
    this._cache.totalReward = total;
    
    return total;
  }
  
  /**
   * Get the primary virtue reward (highest value)
   * Uses caching for better performance
   * @returns {string} - Primary virtue
   */
  getPrimaryVirtue() {
    // Return cached value if available
    if (this._cache.primaryVirtue !== null) {
      return this._cache.primaryVirtue;
    }
    
    // Fast determination of highest virtue
    let maxValue = -1;
    let maxVirtue = 'None';
    
    // Check each virtue
    if (this.wisdomReward > maxValue) {
      maxValue = this.wisdomReward;
      maxVirtue = 'Wisdom';
    }
    
    if (this.courageReward > maxValue) {
      maxValue = this.courageReward;
      maxVirtue = 'Courage';
    }
    
    if (this.temperanceReward > maxValue) {
      maxValue = this.temperanceReward;
      maxVirtue = 'Temperance';
    }
    
    if (this.justiceReward > maxValue) {
      maxValue = this.justiceReward;
      maxVirtue = 'Justice';
    }
    
    if (this.strengthReward > maxValue) {
      maxValue = this.strengthReward;
      maxVirtue = 'Strength';
    }
    
    // Cache the result
    this._cache.primaryVirtue = maxVirtue;
    
    return maxVirtue;
  }
  
  /**
   * Get XP value of this power
   * Uses caching and lookup table for better performance
   * @returns {number} - XP value
   */
  getXpValue() {
    // Return cached value if available
    if (this._cache.xpValue !== null) {
      return this._cache.xpValue;
    }
    
    // Use lookup table for fast access
    const xpValue = this._rarityValues[this.rarity] || 10;
    
    // Cache the result
    this._cache.xpValue = xpValue;
    
    return xpValue;
  }
  
  /**
   * Reset all cached values
   * Call this whenever any property changes
   */
  resetCache() {
    this._cache.totalReward = null;
    this._cache.primaryVirtue = null;
    this._cache.xpValue = null;
  }
  
  /**
   * Create a simplified representation for network transmission
   * @returns {Object} - Simplified power object
   */
  toSimplified() {
    return {
      id: this._id,
      name: this.name,
      type: this.type,
      rarity: this.rarity,
      primaryVirtue: this.getPrimaryVirtue(),
      xpValue: this.getXpValue()
    };
  }
}

// Define schema types
defineTypes(Power, {
  _id: "string",
  name: "string",
  description: "string",
  type: "string",
  rarity: "string",
  complexity: "number",
  requiredRank: "number",
  category: "string",
  overall: "number",
  wisdomReward: "number",
  courageReward: "number",
  temperanceReward: "number",
  justiceReward: "number",
  strengthReward: "number",
  captureChallenge: "any"
}); 