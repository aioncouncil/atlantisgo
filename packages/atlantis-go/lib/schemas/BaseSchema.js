var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Schema, type, MapSchema } from '@colyseus/schema';
export class Position extends Schema {
    constructor(x = 0, y = 0) {
        super();
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Position.prototype, "x", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Position.prototype, "y", void 0);
export class SimplePlayer extends Schema {
    constructor(id, username) {
        super();
        this.x = 0;
        this.y = 0;
        this.level = 1;
        this.experience = 0;
        this.avatarUrl = "";
        this.rank = 1;
        this.xp = 0;
        this.currentZoneId = "";
        this.isActive = true;
        this.lastActivity = Date.now();
        this.powers = new MapSchema();
        this.state = "idle";
        this.status = "online";
        this.lastUpdateTime = Date.now();
        this.metadata = new MapSchema();
        this.id = id;
        this.username = username;
    }
    setState(state) {
        this.state = state;
    }
    setZone(zoneId) {
        this.currentZoneId = zoneId;
    }
    markInactive() {
        this.isActive = false;
        this.status = "offline";
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePlayer.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePlayer.prototype, "username", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "x", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "y", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "level", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "experience", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePlayer.prototype, "avatarUrl", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "rank", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "xp", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePlayer.prototype, "currentZoneId", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], SimplePlayer.prototype, "isActive", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "lastActivity", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], SimplePlayer.prototype, "powers", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePlayer.prototype, "state", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePlayer.prototype, "status", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePlayer.prototype, "lastUpdateTime", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], SimplePlayer.prototype, "metadata", void 0);
export class SimplePower extends Schema {
    constructor(id, name, type, rarity) {
        super();
        this.x = 0;
        this.y = 0;
        this.isActive = true;
        this.spawnedAt = Date.now();
        this.description = "";
        this.matrixQuadrant = "";
        this.captureChallenge = "";
        this._id = id;
        this.id = id;
        this.name = name;
        this.type = type;
        this.rarity = rarity;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "_id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "rarity", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePower.prototype, "x", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePower.prototype, "y", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], SimplePower.prototype, "isActive", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplePower.prototype, "spawnedAt", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "description", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "matrixQuadrant", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplePower.prototype, "captureChallenge", void 0);
export class SimpleZone extends Schema {
    constructor(id, name, type) {
        super();
        this.x = 0;
        this.y = 0;
        this.radius = 100;
        this.players = new MapSchema();
        this.attributes = new MapSchema();
        this.id = id;
        this.name = name;
        this.type = type;
    }
    addPlayer(playerId) {
        this.players.set(playerId, playerId);
    }
    removePlayer(playerId) {
        this.players.delete(playerId);
    }
    containsPosition(pos) {
        const dx = this.x - pos.x;
        const dy = this.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimpleZone.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimpleZone.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimpleZone.prototype, "type", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimpleZone.prototype, "x", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimpleZone.prototype, "y", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimpleZone.prototype, "radius", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], SimpleZone.prototype, "players", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], SimpleZone.prototype, "attributes", void 0);
export class SimplifiedWorldState extends Schema {
    constructor() {
        super(...arguments);
        this.name = "Main World";
        this.tick = 0;
        this.worldTime = Date.now();
        this.players = new MapSchema();
        this.powers = new MapSchema();
        this.zones = new MapSchema();
        this.experienceInstances = new MapSchema();
        this.experiences = new MapSchema();
    }
    updateTick() {
        this.tick++;
        this.worldTime = Date.now();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], SimplifiedWorldState.prototype, "name", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplifiedWorldState.prototype, "tick", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SimplifiedWorldState.prototype, "worldTime", void 0);
__decorate([
    type({ map: SimplePlayer }),
    __metadata("design:type", Object)
], SimplifiedWorldState.prototype, "players", void 0);
__decorate([
    type({ map: SimplePower }),
    __metadata("design:type", Object)
], SimplifiedWorldState.prototype, "powers", void 0);
__decorate([
    type({ map: SimpleZone }),
    __metadata("design:type", Object)
], SimplifiedWorldState.prototype, "zones", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], SimplifiedWorldState.prototype, "experienceInstances", void 0);
__decorate([
    type({ map: "string" }),
    __metadata("design:type", Object)
], SimplifiedWorldState.prototype, "experiences", void 0);
//# sourceMappingURL=BaseSchema.js.map