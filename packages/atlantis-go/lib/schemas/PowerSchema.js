var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Schema, type } from '@colyseus/schema';
import { Position } from './index.js';
/**
 * Represents a power component mastery level
 */
export class PowerComponentMastery extends Schema {
    constructor() {
        super(...arguments);
        this.definition = 0;
        this.end = 0;
        this.parts = 0;
        this.matter = 0;
        this.instrument = 0;
    }
}
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerComponentMastery.prototype, "definition", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerComponentMastery.prototype, "end", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerComponentMastery.prototype, "parts", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerComponentMastery.prototype, "matter", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerComponentMastery.prototype, "instrument", void 0);
/**
 * Represents a power that can be collected
 */
export class Power extends Schema {
    constructor(id, name, type, rarity) {
        super();
        this.description = "";
        this.value = 1;
        this.position = new Position(0, 0);
        this.spawnTime = Date.now();
        this.despawnTime = Date.now() + 3600000; // 1 hour default
        this.isActive = true;
        this.capturedBy = "";
        this.id = id;
        this.name = name;
        this.type = type;
        this.rarity = rarity;
        // Set value based on rarity
        switch (rarity.toLowerCase()) {
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
    capture(playerId) {
        this.isActive = false;
        this.capturedBy = playerId;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "description", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "rarity", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Power.prototype, "value", void 0);
__decorate([
    type(Position),
    __metadata("design:type", Object)
], Power.prototype, "position", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Power.prototype, "spawnTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Power.prototype, "despawnTime", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], Power.prototype, "isActive", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "capturedBy", void 0);
/**
 * Represents a power that has been collected by a user
 */
export class PowerCollection extends Schema {
    constructor(powerId, userId) {
        super();
        this.overall = 0;
        this.components = new PowerComponentMastery();
        this.uses = 0;
        this.lastUsed = "";
        this.notes = "";
        this.favorite = false;
        this.powerId = powerId;
        this.userId = userId;
        this.acquiredAt = new Date().toISOString();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], PowerCollection.prototype, "powerId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], PowerCollection.prototype, "userId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], PowerCollection.prototype, "acquiredAt", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerCollection.prototype, "overall", void 0);
__decorate([
    type(PowerComponentMastery),
    __metadata("design:type", Object)
], PowerCollection.prototype, "components", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], PowerCollection.prototype, "uses", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], PowerCollection.prototype, "lastUsed", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], PowerCollection.prototype, "notes", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], PowerCollection.prototype, "favorite", void 0);
//# sourceMappingURL=PowerSchema.js.map