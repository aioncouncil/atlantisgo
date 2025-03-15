/**
 * PowerService.js
 * 
 * Service for generating and managing powers in the Atlantis Go world
 */

import { nanoid } from 'nanoid';

class PowerService {
  /**
   * Generate powers for a specific area
   * @param {Object} centerPosition - Center position {x, y}
   * @param {number} radius - Radius around the center position
   * @param {number} count - Number of powers to generate
   * @returns {Array} - Array of power objects
   */
  static generatePowersForArea(centerPosition, radius, count) {
    console.log(`[PowerService] Generating ${count} powers within ${radius}m of (${centerPosition.x}, ${centerPosition.y})`);
    
    const powers = [];
    
    for (let i = 0; i < count; i++) {
      // Generate a power
      const power = this.generatePower();
      
      // Assign a random position within the radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      power.position = {
        x: centerPosition.x + Math.cos(angle) * distance,
        y: centerPosition.y + Math.sin(angle) * distance
      };
      
      powers.push(power);
    }
    
    console.log(`[PowerService] Generated ${powers.length} powers`);
    return powers;
  }
  
  /**
   * Generate a single power
   * @returns {Object} - Power object
   */
  static generatePower() {
    // Generate power attributes
    const power = {
      _id: nanoid(),
      name: this.generatePowerName(),
      type: this.getRandomPowerType(),
      rarity: this.getRandomRarity(),
      description: this.generateDescription(),
      complexity: Math.floor(Math.random() * 5) + 1,
      requiredRank: 1,
      category: this.getRandomCategory(),
      overall: Math.floor(Math.random() * 100),
      
      // Rewards
      wisdomReward: Math.floor(Math.random() * 10),
      courageReward: Math.floor(Math.random() * 10),
      temperanceReward: Math.floor(Math.random() * 10),
      justiceReward: Math.floor(Math.random() * 10),
      strengthReward: Math.floor(Math.random() * 10),
      
      // Set capture challenge
      captureChallenge: this.generateCaptureChallenge()
    };
    
    return power;
  }
  
  /**
   * Generate a random power name
   * @returns {string} - Power name
   */
  static generatePowerName() {
    const prefixes = [
      "Cosmic", "Ancient", "Divine", "Mystic", "Eternal", 
      "Primal", "Astral", "Elemental", "Virtuous", "Harmonic"
    ];
    
    const types = [
      "Wisdom", "Courage", "Temperance", "Justice", "Harmony", 
      "Balance", "Insight", "Vision", "Presence", "Connection"
    ];
    
    return `${this.getRandomItem(prefixes)} ${this.getRandomItem(types)}`;
  }
  
  /**
   * Generate a random description for a power
   * @returns {string} - Description
   */
  static generateDescription() {
    const descriptions = [
      "A power that enhances one's ability to perceive the truth in all situations.",
      "Grants the wielder courage to face any challenge with fortitude.",
      "Helps maintain balance between opposing forces in one's life.",
      "Provides clarity of thought and deep insight into complex problems.",
      "Connects the wielder to the cosmic wisdom of the universe.",
      "Strengthens one's resolve and determination in the face of adversity.",
      "Illuminates the path forward when all seems dark and uncertain.",
      "Brings harmony to chaotic situations and calms turbulent emotions.",
      "Enhances one's natural virtues and moral character.",
      "Allows one to see connections between seemingly unrelated events."
    ];
    
    return this.getRandomItem(descriptions);
  }
  
  /**
   * Get a random power type
   * @returns {string} - Power type
   */
  static getRandomPowerType() {
    const types = ["Wisdom", "Courage", "Temperance", "Justice", "Strength"];
    return this.getRandomItem(types);
  }
  
  /**
   * Get a random rarity level
   * @returns {string} - Rarity level
   */
  static getRandomRarity() {
    const rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
    const weights = [50, 30, 15, 4, 1]; // Percentage chances
    
    const roll = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (let i = 0; i < rarities.length; i++) {
      cumulativeWeight += weights[i];
      if (roll < cumulativeWeight) {
        return rarities[i];
      }
    }
    
    return "Common"; // Default fallback
  }
  
  /**
   * Get a random category for the power
   * @returns {string} - Category
   */
  static getRandomCategory() {
    const categories = ["wisdom", "courage", "temperance", "justice", "strength"];
    return this.getRandomItem(categories);
  }
  
  /**
   * Generate a capture challenge for a power
   * @returns {Object} - Capture challenge
   */
  static generateCaptureChallenge() {
    const challengeTypes = ["reflection", "choice"];
    const type = this.getRandomItem(challengeTypes);
    
    if (type === "reflection") {
      const questions = [
        "What virtue does this power represent to you?",
        "How would you use this power in your daily life?",
        "What personal strength does this power connect with?",
        "How might this power help you grow as a person?",
        "What challenge in your life could this power help overcome?"
      ];
      
      return {
        type: "reflection",
        question: this.getRandomItem(questions),
        minLength: 20
      };
    } else {
      const scenarios = [
        {
          scenario: "You find someone in need of help. What do you do?",
          options: [
            "Ignore them and continue on your way",
            "Help them without expecting anything in return",
            "Help them but ask for compensation"
          ],
          correctIndex: 1
        },
        {
          scenario: "You witness an injustice. How do you respond?",
          options: [
            "Stay silent to avoid trouble",
            "Speak up against the injustice",
            "Discuss it with others but take no action"
          ],
          correctIndex: 1
        },
        {
          scenario: "You're offered an opportunity that would benefit you but harm others. What do you choose?",
          options: [
            "Take the opportunity",
            "Decline the opportunity",
            "Try to modify the opportunity to minimize harm"
          ],
          correctIndex: 2
        }
      ];
      
      const scenario = this.getRandomItem(scenarios);
      return {
        type: "choice",
        scenario: scenario.scenario,
        options: scenario.options,
        correctIndex: scenario.correctIndex
      };
    }
  }
  
  /**
   * Get a random item from an array
   * @param {Array} array - Array to select from
   * @returns {any} - Random item
   */
  static getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

export default PowerService; 