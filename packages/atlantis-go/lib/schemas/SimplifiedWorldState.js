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
export class SimplePlayer extends Schema {
    constructor(id, username) {
        super();
        this.x = 0;
        this.y = 0;
        this.level = 1;
        this.experience = 0;
        this.avatarUrl = "";
        this.id = id;
        this.username = username;
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
export class SimplePower extends Schema {
    constructor(id, name, type, rarity) {
        super();
        this.x = 0;
        this.y = 0;
        this.id = id;
        this.name = name;
        this.type = type;
        this.rarity = rarity;
    }
}
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
export class SimpleZone extends Schema {
    constructor(id, name, type) {
        super();
        this.x = 0;
        this.y = 0;
        this.radius = 100;
        this.id = id;
        this.name = name;
        this.type = type;
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
export class SimplifiedWorldState extends Schema {
    constructor() {
        super(...arguments);
        this.players = new MapSchema();
        this.powers = new MapSchema();
        this.zones = new MapSchema();
    }
}
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
//# sourceMappingURL=SimplifiedWorldState.js.map