/**
 * Game Constants
 * Defines constants used throughout the game
 */

// Debug mode flag - set to true to show debug information
export const DEBUG_MODE = true;

// Game screen settings
export const SCREEN = {
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight
};

// Game world settings
export const WORLD = {
  WIDTH: 10000,
  HEIGHT: 10000
};

// Power types
export const POWER_TYPES = {
  'power-1': 'Wisdom',
  'power-2': 'Courage',
  'power-3': 'Temperance',
  'power-4': 'Justice'
};

// Zone types
export const ZONE_TYPES = {
  'zone-1': 'hub',
  'zone-2': 'residential',
  'zone-3': 'commercial',
  'zone-4': 'industrial',
  'zone-5': 'cultural'
};

// Color codes for different entity types
export const COLORS = {
  PLAYER: 0x00ff00,
  OTHER_PLAYER: 0x0000ff,
  POWER: 0xffff00,
  ZONE: 0xff00ff,
  WISDOM: 0x3a86ff,
  COURAGE: 0xff006e,
  TEMPERANCE: 0x8ac926,
  JUSTICE: 0xffbe0b
};

// Network config
export const NETWORK = {
  UPDATE_RATE: 100, // ms between position updates
  HEARTBEAT_INTERVAL: 5000 // ms between heartbeat packets
};

// Zone names mapping
export const ZONE_NAMES = {
  zone_center: 'Atlantis Central',
  zone_1: 'Eastern District',
  zone_2: 'Western Gardens',
  zone_3: 'Northern Heights',
  zone_4: 'Southern Market'
};

// Power rarities
export const POWER_RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']; 