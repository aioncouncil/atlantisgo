/**
 * @file PowerService.ts
 * @description Service for handling power collection, activation, and management
 */
import { Position } from '../schemas/index.js';
import { Power } from '../schemas/PowerSchema.js';
import { nanoid } from 'nanoid';
class PowerService {
    /**
     * Generate a random position within a radius of a center point
     */
    static generateRandomPosition(center, radius) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const x = center.x + Math.cos(angle) * distance;
        const y = center.y + Math.sin(angle) * distance;
        return new Position(x, y);
    }
    /**
     * Get a random rarity based on weights
     */
    static getRandomRarity() {
        const totalWeight = PowerService.rarities.reduce((sum, rarity) => sum + rarity.weight, 0);
        let random = Math.random() * totalWeight;
        for (const rarity of PowerService.rarities) {
            if (random < rarity.weight) {
                return rarity.name;
            }
            random -= rarity.weight;
        }
        return 'common'; // fallback
    }
    /**
     * Generate a random power name based on type
     */
    static getRandomPowerName(type) {
        const names = PowerService.powerNames[type] || PowerService.powerNames.wisdom;
        return names[Math.floor(Math.random() * names.length)];
    }
    /**
     * Generate powers for an area
     */
    static generatePowersForArea(center, radius, count) {
        const powers = [];
        for (let i = 0; i < count; i++) {
            // Get random type and rarity
            const type = PowerService.powerTypes[Math.floor(Math.random() * PowerService.powerTypes.length)];
            const rarity = PowerService.getRandomRarity();
            // Generate power
            const power = new Power(nanoid(), PowerService.getRandomPowerName(type), type, rarity);
            // Set position
            const pos = PowerService.generateRandomPosition(center, radius);
            power.position.x = pos.x;
            power.position.y = pos.y;
            powers.push(power);
        }
        return powers;
    }
    /**
     * Check if a power should be despawned
     */
    static shouldDespawn(power) {
        return !power.isActive || Date.now() >= power.despawnTime;
    }
    /**
     * Calculate power value based on rarity and other factors
     */
    static calculatePowerValue(power, playerLevel) {
        let value = power.value;
        // Bonus for higher level players finding lower rarity items
        if (playerLevel > 10) {
            value *= (1 + (playerLevel - 10) * 0.1);
        }
        return Math.round(value);
    }
}
PowerService.powerTypes = [
    'wisdom', 'courage', 'justice', 'temperance'
];
PowerService.rarities = [
    { name: 'common', weight: 50 },
    { name: 'uncommon', weight: 30 },
    { name: 'rare', weight: 15 },
    { name: 'epic', weight: 4 },
    { name: 'legendary', weight: 1 }
];
PowerService.powerNames = {
    wisdom: ['Insight', 'Knowledge', 'Understanding', 'Awareness', 'Clarity'],
    courage: ['Bravery', 'Valor', 'Strength', 'Resolve', 'Spirit'],
    justice: ['Balance', 'Harmony', 'Order', 'Truth', 'Honor'],
    temperance: ['Peace', 'Calm', 'Patience', 'Control', 'Serenity']
};
export default PowerService;
//# sourceMappingURL=PowerService.js.map