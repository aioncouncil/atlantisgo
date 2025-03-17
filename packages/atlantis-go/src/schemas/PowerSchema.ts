import { Schema, type } from '@colyseus/schema';
import { Position } from './index.js';

/**
 * Represents a power component mastery level
 */
export class PowerComponentMastery extends Schema {
  @type("number") definition: number = 0;
  @type("number") end: number = 0;
  @type("number") parts: number = 0;
  @type("number") matter: number = 0;
  @type("number") instrument: number = 0;
}

/**
 * Represents a power that can be collected
 */
export class Power extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") description: string = "";
  @type("string") type: string;
  @type("string") rarity: string;
  @type("number") value: number = 1;
  @type(Position) position = new Position(0, 0);
  @type("number") spawnTime: number = Date.now();
  @type("number") despawnTime: number = Date.now() + 3600000; // 1 hour default
  @type("boolean") isActive: boolean = true;
  @type("string") capturedBy: string = "";

  constructor(id: string, name: string, type: string, rarity: string) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.rarity = rarity;
    
    // Set value based on rarity
    switch(rarity.toLowerCase()) {
      case 'common':
        this.value = 1;
        break;
      case 'uncommon':
        this.value = 2;
        break;
      case 'rare':
        this.value = 5;
        break;
      case 'epic':
        this.value = 10;
        break;
      case 'legendary':
        this.value = 20;
        break;
    }
  }

  capture(playerId: string) {
    this.isActive = false;
    this.capturedBy = playerId;
  }
}

/**
 * Represents a power that has been collected by a user
 */
export class PowerCollection extends Schema {
  @type("string") powerId: string;
  @type("string") userId: string;
  @type("string") acquiredAt: string;
  @type("number") overall: number = 0;
  @type(PowerComponentMastery) components = new PowerComponentMastery();
  @type("number") uses: number = 0;
  @type("string") lastUsed: string = "";
  @type("string") notes: string = "";
  @type("boolean") favorite: boolean = false;

  constructor(powerId: string, userId: string) {
    super();
    this.powerId = powerId;
    this.userId = userId;
    this.acquiredAt = new Date().toISOString();
  }
} 