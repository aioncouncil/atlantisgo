import { Schema, type, MapSchema } from '@colyseus/schema';

export class Position extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }

  distanceTo(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class SimplePlayer extends Schema {
  @type("string") id: string;
  @type("string") username: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") level: number = 1;
  @type("number") experience: number = 0;
  @type("string") avatarUrl: string = "";
  @type("number") rank: number = 1;
  @type("number") xp: number = 0;
  @type("string") currentZoneId: string = "";
  @type("boolean") isActive: boolean = true;
  @type("number") lastActivity: number = Date.now();
  @type({ map: "string" }) powers = new MapSchema<string>();
  @type("string") state: string = "idle";
  @type("string") status: string = "online";
  @type("number") lastUpdateTime: number = Date.now();
  @type({ map: "string" }) metadata = new MapSchema<string>();

  constructor(id: string, username: string) {
    super();
    this.id = id;
    this.username = username;
  }

  setState(state: string) {
    this.state = state;
  }

  setZone(zoneId: string) {
    this.currentZoneId = zoneId;
  }

  markInactive() {
    this.isActive = false;
    this.status = "offline";
  }
}

export class SimplePower extends Schema {
  @type("string") _id: string;
  @type("string") id: string;
  @type("string") name: string;
  @type("string") type: string;
  @type("string") rarity: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") isActive: boolean = true;
  @type("number") spawnedAt: number = Date.now();
  @type("string") description: string = "";
  @type("string") matrixQuadrant: string = "";
  @type("string") captureChallenge: string = "";

  constructor(id: string, name: string, type: string, rarity: string) {
    super();
    this._id = id;
    this.id = id;
    this.name = name;
    this.type = type;
    this.rarity = rarity;
  }
}

export class SimpleZone extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") type: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") radius: number = 100;
  @type({ map: "string" }) players = new MapSchema<string>();
  @type({ map: "string" }) attributes = new MapSchema<string>();

  constructor(id: string, name: string, type: string) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
  }

  addPlayer(playerId: string) {
    this.players.set(playerId, playerId);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
  }

  containsPosition(pos: { x: number, y: number }): boolean {
    const dx = this.x - pos.x;
    const dy = this.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }
}

export class SimplifiedWorldState extends Schema {
  @type("string") name: string = "Main World";
  @type("number") tick: number = 0;
  @type("number") worldTime: number = Date.now();
  @type({ map: SimplePlayer }) players = new MapSchema<SimplePlayer>();
  @type({ map: SimplePower }) powers = new MapSchema<SimplePower>();
  @type({ map: SimpleZone }) zones = new MapSchema<SimpleZone>();
  @type({ map: "string" }) experienceInstances = new MapSchema<string>();
  @type({ map: "string" }) experiences = new MapSchema<string>();

  updateTick() {
    this.tick++;
    this.worldTime = Date.now();
  }
} 