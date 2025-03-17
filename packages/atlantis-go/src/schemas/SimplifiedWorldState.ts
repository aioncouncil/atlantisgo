import { Schema, type, MapSchema } from '@colyseus/schema';

export class SimplePlayer extends Schema {
  @type("string") id: string;
  @type("string") username: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") level: number = 1;
  @type("number") experience: number = 0;
  @type("string") avatarUrl: string = "";

  constructor(id: string, username: string) {
    super();
    this.id = id;
    this.username = username;
  }
}

export class SimplePower extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") type: string;
  @type("string") rarity: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;

  constructor(id: string, name: string, type: string, rarity: string) {
    super();
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

  constructor(id: string, name: string, type: string) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
  }
}

export class SimplifiedWorldState extends Schema {
  @type({ map: SimplePlayer }) players = new MapSchema<SimplePlayer>();
  @type({ map: SimplePower }) powers = new MapSchema<SimplePower>();
  @type({ map: SimpleZone }) zones = new MapSchema<SimpleZone>();
} 