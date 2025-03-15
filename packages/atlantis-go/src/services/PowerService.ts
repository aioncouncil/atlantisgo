/**
 * @file PowerService.ts
 * @description Service for managing power collection and related functionality
 */

import { nanoid } from 'nanoid';
import { Power } from '../schemas/PowerSchema.js';
import { Position } from '../schemas/index.js';

/**
 * Available power rarities and their spawn weights
 */
const POWER_RARITIES = {
  Common: 0.6,     // 60% chance
  Uncommon: 0.25,  // 25% chance
  Rare: 0.1,       // 10% chance
  Epic: 0.04,      // 4% chance
  Legendary: 0.01  // 1% chance
};

/**
 * Power matrix quadrants
 */
const MATRIX_QUADRANTS = [
  'SoulOut',
  'SoulIn',
  'BodyOut',
  'BodyIn'
];

/**
 * Power categories by sector
 */
const POWER_CATEGORIES = [
  'Economics',
  'Education',
  'Health',
  'Justice',
  'Security',
  'Arts',
  'Technology',
  'Environment',
  'Governance',
  'Community',
  'Infrastructure',
  'Entertainment'
];

/**
 * Sample power names by category (simplified for MVP)
 */
const SAMPLE_POWERS = {
  Economics: [
    'Budget Analysis', 'Market Insight', 'Resource Allocation',
    'Trade Negotiation', 'Investment Strategy'
  ],
  Education: [
    'Critical Thinking', 'Research Method', 'Knowledge Sharing',
    'Effective Learning', 'Teaching Skill'
  ],
  Health: [
    'Physical Training', 'Nutrition Science', 'Medical Knowledge',
    'Mental Resilience', 'Recovery Technique'
  ],
  Justice: [
    'Ethical Reasoning', 'Conflict Resolution', 'Fairness Principle',
    'Rights Awareness', 'Judicial Wisdom'
  ],
  Security: [
    'Threat Detection', 'Defense Strategy', 'Protection Method',
    'Security Analysis', 'Risk Management'
  ],
  Arts: [
    'Creative Expression', 'Aesthetic Appreciation', 'Artistic Technique',
    'Cultural Understanding', 'Design Thinking'
  ],
  Technology: [
    'Technical Innovation', 'Digital Literacy', 'System Design',
    'Code Mastery', 'Data Analysis'
  ],
  Environment: [
    'Ecological Awareness', 'Sustainability Practice', 'Natural Connection',
    'Resource Conservation', 'Environmental Impact Assessment'
  ],
  Governance: [
    'Policy Analysis', 'Leadership Method', 'Civic Engagement',
    'Democratic Process', 'Diplomatic Skill'
  ],
  Community: [
    'Social Coordination', 'Community Building', 'Group Facilitation',
    'Network Development', 'Cultural Integration'
  ],
  Infrastructure: [
    'Urban Planning', 'Transportation Design', 'Construction Knowledge',
    'Utility Management', 'Architectural Vision'
  ],
  Entertainment: [
    'Performative Skill', 'Game Design', 'Narrative Creation',
    'Audience Engagement', 'Media Production'
  ]
};

export class PowerService {
  /**
   * Generate a random power
   * @param position Optional position to spawn at
   * @param minRank Minimum rank required to collect
   * @returns Newly generated power
   */
  generateRandomPower(position?: Position, minRank: number = 1): Power {
    // Generate a random ID
    const id = nanoid();
    
    // Select random category
    const categoryIndex = Math.floor(Math.random() * POWER_CATEGORIES.length);
    const category = POWER_CATEGORIES[categoryIndex];
    
    // Select random power from category
    const powerNames = SAMPLE_POWERS[category];
    const powerNameIndex = Math.floor(Math.random() * powerNames.length);
    const powerName = powerNames[powerNameIndex];
    
    // Determine rarity using weighted random selection
    const rarity = this.getWeightedRandomRarity();
    
    // Select random matrix quadrant
    const quadrantIndex = Math.floor(Math.random() * MATRIX_QUADRANTS.length);
    const quadrant = MATRIX_QUADRANTS[quadrantIndex];
    
    // Create position if not provided
    const powerPosition = position || this.generateRandomPosition();
    
    // Calculate capture difficulty based on rarity
    let captureDifficulty = 1;
    switch (rarity) {
      case 'Legendary': captureDifficulty = 90 + Math.floor(Math.random() * 10); break;
      case 'Epic': captureDifficulty = 70 + Math.floor(Math.random() * 20); break;
      case 'Rare': captureDifficulty = 50 + Math.floor(Math.random() * 20); break;
      case 'Uncommon': captureDifficulty = 30 + Math.floor(Math.random() * 20); break;
      case 'Common': captureDifficulty = 10 + Math.floor(Math.random() * 20); break;
    }
    
    // Create the power
    const power = new Power(id);
    power.name = powerName;
    power.description = `A ${rarity.toLowerCase()} ${category} power that embodies ${quadrant} principles.`;
    power.category = category;
    power.type = quadrant;
    power.rarity = rarity;
    
    // Set stats based on rarity
    power.complexity = captureDifficulty;
    power.spawnRate = this.getRaritySpawnRate(rarity);
    power.requiredRank = minRank;
    
    // Set rewards based on rarity
    power.xpReward = this.getXpReward(rarity);
    power.coinsReward = this.getCoinsReward(rarity);
    
    // Set virtue rewards (simplified for MVP)
    if (quadrant === 'SoulOut') power.wisdomReward = 2;
    if (quadrant === 'SoulIn') power.temperanceReward = 2;
    if (quadrant === 'BodyOut') power.courageReward = 2;
    if (quadrant === 'BodyIn') power.strengthReward = 2;
    if (category === 'Justice') power.justiceReward = 2;
    
    // Set visual assets (placeholders for MVP)
    power.iconUrl = `/assets/powers/${category.toLowerCase()}.png`;
    
    return power;
  }
  
  /**
   * Generate powers for a specific area
   * @param centerPosition Center position of the area
   * @param radius Radius of the area in meters
   * @param count Number of powers to generate
   * @param minRank Minimum rank required
   * @returns Array of generated powers
   */
  generatePowersForArea(
    centerPosition: Position,
    radius: number,
    count: number,
    minRank: number = 1
  ): Power[] {
    const powers: Power[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate a random position within the radius
      const position = this.generateRandomPositionInRadius(centerPosition, radius);
      
      // Generate a power at this position
      const power = this.generateRandomPower(position, minRank);
      
      powers.push(power);
    }
    
    return powers;
  }
  
  /**
   * Select a random rarity based on weighted probabilities
   * @returns Selected rarity
   */
  private getWeightedRandomRarity(): string {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const [rarity, probability] of Object.entries(POWER_RARITIES)) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return rarity;
      }
    }
    
    // Fallback to Common
    return 'Common';
  }
  
  /**
   * Generate a random position (for testing)
   * @returns Position object
   */
  private generateRandomPosition(): Position {
    const position = new Position();
    position.x = Math.random() * 1000 - 500; // -500 to 500
    position.y = Math.random() * 1000 - 500; // -500 to 500
    return position;
  }
  
  /**
   * Generate a random position within a radius
   * @param center Center position
   * @param radius Radius in meters
   * @returns Position object
   */
  private generateRandomPositionInRadius(center: Position, radius: number): Position {
    // Generate random angle
    const angle = Math.random() * Math.PI * 2;
    
    // Generate random distance (using square root to ensure uniform distribution)
    const distance = Math.sqrt(Math.random()) * radius;
    
    // Calculate position
    const position = new Position();
    position.x = center.x + Math.cos(angle) * distance;
    position.y = center.y + Math.sin(angle) * distance;
    
    return position;
  }
  
  /**
   * Get spawn rate modifier based on rarity
   * @param rarity Power rarity
   * @returns Spawn rate value
   */
  private getRaritySpawnRate(rarity: string): number {
    switch (rarity) {
      case 'Legendary': return 0.1;
      case 'Epic': return 0.3;
      case 'Rare': return 0.5;
      case 'Uncommon': return 0.7;
      default: return 1.0; // Common
    }
  }
  
  /**
   * Get XP reward based on rarity
   * @param rarity Power rarity
   * @returns XP amount
   */
  private getXpReward(rarity: string): number {
    switch (rarity) {
      case 'Legendary': return 50;
      case 'Epic': return 30;
      case 'Rare': return 20;
      case 'Uncommon': return 10;
      default: return 5; // Common
    }
  }
  
  /**
   * Get coin reward based on rarity
   * @param rarity Power rarity
   * @returns Coin amount
   */
  private getCoinsReward(rarity: string): number {
    switch (rarity) {
      case 'Legendary': return 25;
      case 'Epic': return 15;
      case 'Rare': return 10;
      case 'Uncommon': return 5;
      default: return 2; // Common
    }
  }
}

export default new PowerService(); 