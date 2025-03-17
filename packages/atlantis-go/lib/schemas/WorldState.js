/**
 * @file schemas/WorldState.ts
 * @description World state schema for Atlantis Go
 *
 * This file defines the state that is synchronized between the server and clients
 * for the main world room.
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
import { Schema, type, MapSchema } from '@colyseus/schema';
import { Player, Power, Zone } from './GameEntities.js';
import { Experience, ExperienceInstance } from './ExperienceSchema.js';
/**
 * WorldState contains all synchronized game state
 */
export class WorldState extends Schema {
    constructor() {
        super();
        // Players currently in the world
        this.players = new MapSchema();
        // Powers (collectible arts) currently spawned in the world
        this.powers = new MapSchema();
        // Zones in the world
        this.zones = new MapSchema();
        // Experiences available in the world
        this.experiences = new MapSchema();
        // Active experience instances
        this.experienceInstances = new MapSchema();
        // Global properties
        this.worldTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.playerCount = 0;
        this.activePowerCount = 0;
        this.activeZoneCount = 0;
        this.activeExperienceCount = 0;
        // Game settings
        this.visibilityRadius = 1000; // meters
        this.interactionRadius = 50; // meters
        this.playerInactiveTimeout = 300000; // 5 minutes in ms
        this.powerDespawnTime = 3600000; // 1 hour in ms
    }
    /**
     * Update world time
     */
    tick() {
        this.worldTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.playerCount = this.players.size;
        this.activePowerCount = this.getActivePowerCount();
        this.activeZoneCount = this.getActiveZoneCount();
        this.activeExperienceCount = this.experienceInstances.size;
    }
    /**
     * Get count of active powers
     */
    getActivePowerCount() {
        let count = 0;
        this.powers.forEach(power => {
            if (power.isActive)
                count++;
        });
        return count;
    }
    /**
     * Get count of active zones
     */
    getActiveZoneCount() {
        let count = 0;
        this.zones.forEach(zone => {
            if (zone.isActive)
                count++;
        });
        return count;
    }
    /**
     * Get nearest power to a position
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param maxDistance - Maximum distance to consider
     * @returns Nearest power or null if none in range
     */
    getNearestPower(x, y, maxDistance) {
        let nearestPower = null;
        let minDistance = maxDistance;
        this.powers.forEach(power => {
            if (!power.isActive)
                return;
            const distance = Math.sqrt(Math.pow(power.position.x - x, 2) +
                Math.pow(power.position.y - y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestPower = power;
            }
        });
        return nearestPower;
    }
    /**
     * Get zone at position
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns Zone or null if no zone at position
     */
    getZoneAtPosition(x, y) {
        let result = null;
        this.zones.forEach(zone => {
            if (!zone.isActive)
                return;
            const distance = Math.sqrt(Math.pow(zone.center.x - x, 2) +
                Math.pow(zone.center.y - y, 2));
            if (distance <= zone.radius) {
                // If multiple zones overlap, prefer higher level zones
                if (!result || zone.level > result.level) {
                    result = zone;
                }
            }
        });
        return result;
    }
    /**
     * Get all powers within radius of position
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param radius - Search radius
     * @returns Array of powers within radius
     */
    getPowersInRadius(x, y, radius) {
        const result = [];
        this.powers.forEach(power => {
            if (!power.isActive)
                return;
            const distance = Math.sqrt(Math.pow(power.position.x - x, 2) +
                Math.pow(power.position.y - y, 2));
            if (distance <= radius) {
                result.push(power);
            }
        });
        return result;
    }
    /**
     * Get all players within radius of position
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param radius - Search radius
     * @returns Array of players within radius
     */
    getPlayersInRadius(x, y, radius) {
        const result = [];
        this.players.forEach(player => {
            if (!player.isActive)
                return;
            const distance = Math.sqrt(Math.pow(player.position.x - x, 2) +
                Math.pow(player.position.y - y, 2));
            if (distance <= radius) {
                result.push(player);
            }
        });
        return result;
    }
    /**
     * Get experiences in radius of position
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param radius - Search radius
     * @returns Array of experiences within radius
     */
    getExperiencesInRadius(x, y, radius) {
        const result = [];
        this.experiences.forEach(experience => {
            if (experience.locationType === "Anywhere") {
                // Always include "Anywhere" experiences when in range of any zone
                const nearbyZone = this.getZoneAtPosition(x, y);
                if (nearbyZone) {
                    result.push(experience);
                }
            }
            else if (experience.locationType === "Zone" && experience.zoneId) {
                // Check if player is in the specified zone
                const zone = this.zones.get(experience.zoneId);
                if (zone) {
                    const distance = Math.sqrt(Math.pow(zone.center.x - x, 2) +
                        Math.pow(zone.center.y - y, 2));
                    if (distance <= zone.radius) {
                        result.push(experience);
                    }
                }
            }
            else if (experience.locationType === "Coordinates") {
                // Check if player is near the coordinates
                const distance = Math.sqrt(Math.pow(experience.coordinates.x - x, 2) +
                    Math.pow(experience.coordinates.y - y, 2));
                if (distance <= experience.radius) {
                    result.push(experience);
                }
            }
        });
        return result;
    }
    /**
     * Get experience instance by ID
     * @param instanceId - ID of the experience instance
     * @returns ExperienceInstance or undefined if not found
     */
    getExperienceInstance(instanceId) {
        return this.experienceInstances.get(instanceId);
    }
    /**
     * Get experience by ID
     * @param experienceId - ID of the experience
     * @returns Experience or undefined if not found
     */
    getExperience(experienceId) {
        return this.experiences.get(experienceId);
    }
    /**
     * Get active experience instances for a player
     * @param playerId - ID of the player
     * @returns Array of experience instances the player is participating in
     */
    getPlayerExperienceInstances(playerId) {
        const result = [];
        this.experienceInstances.forEach(instance => {
            if (instance.participants.has(playerId)) {
                result.push(instance);
            }
        });
        return result;
    }
    /**
     * Get all experience instances in a zone
     * @param zoneId - ID of the zone
     * @returns Array of experience instances in the zone
     */
    getZoneExperienceInstances(zoneId) {
        const result = [];
        this.experienceInstances.forEach(instance => {
            if (instance.zoneId === zoneId) {
                result.push(instance);
            }
        });
        return result;
    }
}
__decorate([
    type({ map: Player }),
    __metadata("design:type", Object)
], WorldState.prototype, "players", void 0);
__decorate([
    type({ map: Power }),
    __metadata("design:type", Object)
], WorldState.prototype, "powers", void 0);
__decorate([
    type({ map: Zone }),
    __metadata("design:type", Object)
], WorldState.prototype, "zones", void 0);
__decorate([
    type({ map: Experience }),
    __metadata("design:type", Object)
], WorldState.prototype, "experiences", void 0);
__decorate([
    type({ map: ExperienceInstance }),
    __metadata("design:type", Object)
], WorldState.prototype, "experienceInstances", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "worldTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "lastUpdateTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "playerCount", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "activePowerCount", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "activeZoneCount", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "activeExperienceCount", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "visibilityRadius", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "interactionRadius", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "playerInactiveTimeout", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], WorldState.prototype, "powerDespawnTime", void 0);
//# sourceMappingURL=WorldState.js.map