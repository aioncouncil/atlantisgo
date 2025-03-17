/**
 * @file config/index.ts
 * @description Configuration constants for Atlantis Go
 */
export const CONFIG = {
    // Server settings
    PORT: Number(process.env.PORT || 3000),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MAX_PAYLOAD_SIZE: process.env.MAX_PAYLOAD_SIZE || '50mb',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    // Game settings
    TICK_RATE: 1000 / 20, // 20 ticks per second
    CLEANUP_INTERVAL: 60000, // 1 minute
    POWER_LIFETIME: 3600000, // 1 hour
    MAX_PLAYERS_PER_ROOM: 100,
    // Movement settings
    MAX_MOVEMENT_RATE: 20, // movements per second
    MAX_ACTION_RATE: 5, // actions per second
    RATE_LIMIT_WINDOW: 1000, // 1 second window for rate limiting
    // Power settings
    MIN_POWER_SPAWN_DISTANCE: 50,
    MAX_POWER_SPAWN_DISTANCE: 1000,
    POWER_SPAWN_INTERVAL: 300000, // 5 minutes
    // Zone settings
    DEFAULT_ZONE_RADIUS: 100,
    MIN_ZONE_RADIUS: 50,
    MAX_ZONE_RADIUS: 1000,
    // Experience settings
    MIN_EXPERIENCE_DURATION: 300, // 5 minutes
    MAX_EXPERIENCE_DURATION: 7200, // 2 hours
    MAX_PARTICIPANTS_PER_EXPERIENCE: 10,
    // Database settings
    USE_MOCK_DATA: true, // Use mock data instead of real database
    // Development settings
    DEBUG_MODE: process.env.DEBUG_MODE === 'true',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
//# sourceMappingURL=index.js.map