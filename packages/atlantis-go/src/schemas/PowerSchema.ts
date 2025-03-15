import { Schema, type } from '@colyseus/schema';

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
  @type("string") _id: string;
  @type("string") name: string;
  @type("string") description: string;
  @type("string") category: string;
  @type("string") type: string;
  @type("string") rarity: string;

  // Power stats
  @type("number") complexity: number = 50;
  @type("number") spawnRate: number = 1;
  @type("number") requiredRank: number = 1;

  // Rewards
  @type("number") xpReward: number = 10;
  @type("number") coinsReward: number = 5;

  // Virtue rewards
  @type("number") wisdomReward: number = 0;
  @type("number") courageReward: number = 0;
  @type("number") temperanceReward: number = 0;
  @type("number") justiceReward: number = 0;
  @type("number") strengthReward: number = 0;

  // Visual assets
  @type("string") iconUrl: string = "";
  @type("string") modelUrl: string = "";
  
  constructor(id: string) {
    super();
    this._id = id;
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