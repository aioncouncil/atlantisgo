/**
 * @file schemas/GameEntities.ts
 * @description Game entity schemas for Atlantis Go
 *
 * This file defines the core game entities that are synchronized in real-time,
 * including players, powers (collectible arts), and zones.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { Position, VirtuePoints, UserMetadata } from './index.js';
import { PowerCollection } from './PowerSchema.js';
/**
 * Player entity representing a user in the game world
 */
export class Player extends Schema {
    constructor(id, username, metadata) {
        super();
        this.position = new Position(0, 0);
        this.level = 1;
        this.experience = 0;
        this.avatarUrl = "";
        this.lastActive = Date.now();
        this.virtues = new VirtuePoints();
        this.currentZoneId = "";
        this.isActive = true;
        this.lastActivity = Date.now();
        this.state = "idle"; // idle, moving, interacting, capturing
        this.powers = new MapSchema();
        this.rank = 1;
        this.xp = 0;
        this.coins = 0;
        this.id = id;
        this.username = username;
        this.metadata = metadata;
    }
    /**
     * Update player position
     * @param x - New x coordinate
     * @param y - New y coordinate
     */
    updatePosition(x, y) {
        this.position.update(x, y);
        this.lastActivity = Date.now();
        this.isActive = true;
    }
    /**
     * Mark player as inactive after timeout
     */
    markInactive() {
        this.isActive = false;
        this.state = "idle";
    }
    /**
     * Add power to player's collection
     * @param powerId - ID of the captured power
     * @param powerType - Type of the captured power
     * @param powerRarity - Rarity of the captured power
     */
    addPower(powerId, powerType, powerRarity) {
        // Create a new power collection entry
        const powerCollection = new PowerCollection(powerId, this.id);
        this.powers.set(powerId, powerCollection);
        // Update player state
        this.state = "idle";
        this.lastActivity = Date.now();
        // In a real implementation, rewards would be calculated based on power properties
        // For now, we give fixed rewards based on rarity
        switch (powerRarity) {
            case "Legendary":
                this.xp += 50;
                this.coins += 25;
                break;
            case "Epic":
                this.xp += 30;
                this.coins += 15;
                break;
            case "Rare":
                this.xp += 20;
                this.coins += 10;
                break;
            case "Uncommon":
                this.xp += 10;
                this.coins += 5;
                break;
            default: // Common
                this.xp += 5;
                this.coins += 2;
                break;
        }
        // Check if player has ranked up
        this.checkRankUp();
    }
    /**
     * Check if player has enough XP to rank up
     */
    checkRankUp() {
        const xpRequiredForRankUp = this.rank * 100; // Simple formula: rank * 100 XP needed
        if (this.xp >= xpRequiredForRankUp && this.rank < 4) {
            this.rank++;
            // Notify about rank up would happen here in a full implementation
        }
    }
    /**
     * Update player state
     * @param state - New state
     */
    setState(state) {
        this.state = state;
        this.lastActivity = Date.now();
    }
    /**
     * Set current zone
     * @param zoneId - ID of zone player is in
     */
    setZone(zoneId) {
        this.currentZoneId = zoneId;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], Player.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Player.prototype, "username", void 0);
__decorate([
    type(Position),
    __metadata("design:type", Object)
], Player.prototype, "position", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "level", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "experience", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Player.prototype, "avatarUrl", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "lastActive", void 0);
__decorate([
    type(UserMetadata),
    __metadata("design:type", UserMetadata)
], Player.prototype, "metadata", void 0);
__decorate([
    type(VirtuePoints),
    __metadata("design:type", VirtuePoints)
], Player.prototype, "virtues", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Player.prototype, "currentZoneId", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isActive", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "lastActivity", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Player.prototype, "state", void 0);
__decorate([
    type({ map: PowerCollection }),
    __metadata("design:type", Object)
], Player.prototype, "powers", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "rank", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "xp", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Player.prototype, "coins", void 0);
/**
 * Power entity representing a collectible art in the game world
 */
export class Power extends Schema {
    constructor(id, name, type, rarity) {
        super();
        this.position = new Position(0, 0);
        this.spawnTime = Date.now();
        this.despawnTime = Date.now() + 3600000; // 1 hour default
        this.isActive = true;
        this.challengeDifficulty = 1; // 1-100 difficulty to capture
        this.id = id;
        this.name = name;
        this.type = type;
        this.rarity = rarity;
    }
    /**
     * Schedule power to despawn
     * @param timeMs - Time in milliseconds until despawn
     */
    scheduleDespawn(timeMs) {
        this.despawnTime = Date.now() + timeMs;
    }
    /**
     * Set the capture challenge for this power
     * @param challenge - The challenge details
     */
    setCaptureChallenge(challenge) {
        this.captureChallenge = challenge;
        // Also set the difficulty value that will be synced
        if (challenge && challenge.difficulty) {
            this.challengeDifficulty = challenge.difficulty;
        }
    }
    /**
     * Check if power should be despawned
     * @returns True if it's time to despawn
     */
    shouldDespawn() {
        return this.despawnTime > 0 && Date.now() >= this.despawnTime;
    }
    /**
     * Deactivate power (e.g., after being captured)
     */
    deactivate() {
        this.isActive = false;
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
], Power.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Power.prototype, "rarity", void 0);
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
    type("number"),
    __metadata("design:type", Number)
], Power.prototype, "challengeDifficulty", void 0);
/**
 * Zone entity representing a geographic and functional area
 */
export class Zone extends Schema {
    constructor(id, name, type) {
        super();
        this.position = new Position(0, 0);
        this.radius = 100;
        this.controlledBy = "";
        this.lastCaptured = 0;
        this.creationTime = Date.now();
        this.lastActivity = Date.now();
        this.currentPlayerIds = new ArraySchema();
        this.maxCapacity = 50;
        this.isActive = true;
        this.attributes = {}; // Custom attributes for zone features
        this.id = id;
        this.name = name;
        this.type = type;
    }
    /**
     * Add player to zone
     * @param playerId - ID of player to add
     * @returns True if added successfully
     */
    addPlayer(playerId) {
        if (this.currentPlayerIds.includes(playerId))
            return false;
        if (this.currentPlayerIds.length >= this.maxCapacity)
            return false;
        this.currentPlayerIds.push(playerId);
        this.lastActivity = Date.now();
        return true;
    }
    /**
     * Remove player from zone
     * @param playerId - ID of player to remove
     * @returns True if removed successfully
     */
    removePlayer(playerId) {
        const index = this.currentPlayerIds.indexOf(playerId);
        if (index === -1)
            return false;
        this.currentPlayerIds.splice(index, 1);
        this.lastActivity = Date.now();
        return true;
    }
    /**
     * Check if a position is within this zone
     * @param position - Position to check
     * @returns True if position is in zone
     */
    containsPosition(position) {
        return this.position.distanceTo(position) <= this.radius;
    }
    /**
     * Update zone information
     * @param name - New zone name
     * @param description - New zone description
     */
    updateInfo(name, description) {
        this.name = name;
        this.lastActivity = Date.now();
    }
    /**
     * Set zone owner
     * @param ownerId - ID of new owner (user or team)
     */
    setOwner(ownerId) {
        this.controlledBy = ownerId;
        this.lastActivity = Date.now();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], Zone.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Zone.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Zone.prototype, "type", void 0);
__decorate([
    type(Position),
    __metadata("design:type", Object)
], Zone.prototype, "position", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Zone.prototype, "radius", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Zone.prototype, "controlledBy", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Zone.prototype, "lastCaptured", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Zone.prototype, "creationTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Zone.prototype, "lastActivity", void 0);
__decorate([
    type(["string"]),
    __metadata("design:type", Object)
], Zone.prototype, "currentPlayerIds", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Zone.prototype, "maxCapacity", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], Zone.prototype, "isActive", void 0);
//# sourceMappingURL=GameEntities.js.map