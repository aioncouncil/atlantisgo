/**
 * @file schemas/index.ts
 * @description Core schema definitions for Atlantis Go's real-time multiplayer system
 *
 * This file defines the state synchronization schemas used by Colyseus.
 * These schemas determine what data is automatically synchronized between
 * the server and connected clients, providing the real-time foundation for
 * the multiplayer experience.
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
import { Schema, type } from '@colyseus/schema';
/**
 * Position within the game world
 * Used for tracking entity locations and calculating proximity-based interactions
 */
export class Position extends Schema {
    /**
     * Creates a new Position instance
     * @param x - Longitude coordinate
     * @param y - Latitude coordinate
     */
    constructor(x = 0, y = 0) {
        super();
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
    /**
     * Calculate distance to another position
     * @param other - Position to calculate distance to
     * @returns Distance in coordinate units (not meters)
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Update position from raw coordinates
     * @param x - New longitude
     * @param y - New latitude
     */
    update(x, y) {
        this.x = x;
        this.y = y;
    }
    /**
     * Create a Position from geolocation coordinates
     * @param latitude - Latitude value
     * @param longitude - Longitude value
     * @returns New Position instance
     */
    static fromGeoCoordinates(latitude, longitude) {
        // We're using longitude as x and latitude as y for consistency
        return new Position(longitude, latitude);
    }
    /**
     * Convert to GeoJSON point format
     * @returns GeoJSON Point object
     */
    toGeoJson() {
        return {
            type: "Point",
            coordinates: [this.x, this.y]
        };
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
/**
 * SynchronizedCounter provides an atomic counter that safely synchronizes
 * even with high update frequency
 */
export class SynchronizedCounter extends Schema {
    /**
     * Creates a new counter with initial value
     * @param initialValue - Starting value for counter
     */
    constructor(initialValue = 0) {
        super();
        this.value = 0;
        this.value = initialValue;
    }
    /**
     * Increment counter by specified amount
     * @param amount - Amount to increment (default: 1)
     * @returns New counter value
     */
    increment(amount = 1) {
        this.value += amount;
        return this.value;
    }
    /**
     * Decrement counter by specified amount
     * @param amount - Amount to decrement (default: 1)
     * @returns New counter value
     */
    decrement(amount = 1) {
        this.value -= amount;
        return this.value;
    }
    /**
     * Set counter to specific value
     * @param value - New value for counter
     */
    set(value) {
        this.value = value;
    }
}
__decorate([
    type("number"),
    __metadata("design:type", Number)
], SynchronizedCounter.prototype, "value", void 0);
/**
 * UserMetadata contains minimal information about a user
 * that needs to be shared with other players
 */
export class UserMetadata extends Schema {
    constructor(userId, username) {
        super();
        this.rank = 0;
        this.avatarUrl = "";
        this.userId = userId;
        this.username = username;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], UserMetadata.prototype, "userId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], UserMetadata.prototype, "username", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], UserMetadata.prototype, "rank", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], UserMetadata.prototype, "avatarUrl", void 0);
/**
 * VirtuePoints tracks a user's virtue levels in the game
 */
export class VirtuePoints extends Schema {
    constructor(wisdom = 0, courage = 0, temperance = 0, justice = 0) {
        super();
        this.wisdom = 0;
        this.courage = 0;
        this.temperance = 0;
        this.justice = 0;
        this.total = 0;
        this.wisdom = wisdom;
        this.courage = courage;
        this.temperance = temperance;
        this.justice = justice;
        this.total = this.wisdom + this.courage + this.temperance + this.justice;
    }
    /**
     * Calculate overall happiness score based on virtue points
     * @returns Happiness score from 0-100
     */
    calculateHappiness() {
        // Simple average for now, can be replaced with more complex algorithm
        return (this.wisdom + this.courage + this.temperance + this.justice) / 4;
    }
    addPoints(virtue, points) {
        switch (virtue.toLowerCase()) {
            case 'wisdom':
                this.wisdom += points;
                break;
            case 'justice':
                this.justice += points;
                break;
            case 'courage':
                this.courage += points;
                break;
            case 'temperance':
                this.temperance += points;
                break;
        }
        this.total = this.wisdom + this.justice + this.courage + this.temperance;
    }
}
__decorate([
    type("number"),
    __metadata("design:type", Number)
], VirtuePoints.prototype, "wisdom", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], VirtuePoints.prototype, "courage", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], VirtuePoints.prototype, "temperance", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], VirtuePoints.prototype, "justice", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], VirtuePoints.prototype, "total", void 0);
//# sourceMappingURL=index.js.map