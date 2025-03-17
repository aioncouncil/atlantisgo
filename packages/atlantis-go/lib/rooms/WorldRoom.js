/**
 * @file rooms/WorldRoom.ts
 * @description Primary multiplayer room for Atlantis Go's world
 *
 * This room handles:
 * - Player movement and presence
 * - Power spawning and capturing
 * - Zone interactions
 * - Real-time state synchronization
 */
import { Room } from '@colyseus/core';
import { MapSchema } from '@colyseus/schema';
import { SimplifiedWorldState, SimplePlayer, SimplePower, SimpleZone } from '../schemas/BaseSchema.js';
import { Position } from '../schemas/index.js';
import PowerService from '../services/PowerService.js';
import ExperienceService from '../services/ExperienceService.js';
import { nanoid } from 'nanoid';
// Configuration constants
const CONFIG = {
    PLAYER_INACTIVE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    POWER_SPAWN_INTERVAL: 60 * 1000, // 1 minute
    MAX_POWERS_PER_AREA: 10,
    VISIBILITY_RADIUS: 1000, // meters
    INTERACTION_RADIUS: 5000, // meters - increased for testing (was 50)
    POWER_MAX_COUNT: 50,
    POWER_DENSITY: 0.001, // powers per square meter
    POWER_LIFETIME: 3600000, // 1 hour in ms
    WORLD_SIZE: {
        WIDTH: 10000, // meters
        HEIGHT: 10000, // meters
    },
    ZONE_MAX_COUNT: 30,
    WORLD_UPDATE_INTERVAL: 1000, // 1 second in ms
    MAX_PLAYERS: 100, // Maximum players in the room
    RATE_LIMIT: {
        MOVEMENT: {
            WINDOW_MS: 1000, // 1 second
            MAX_REQUESTS: 5 // 5 requests per second
        },
        ACTION: {
            WINDOW_MS: 1000, // 1 second
            MAX_REQUESTS: 3 // 3 requests per second
        }
    },
    // Added more efficient configuration
    BATCH_UPDATES: true,
    BROADCAST_THROTTLE_MS: 100, // Throttle broadcasts
    ENTITY_CULLING_DISTANCE: 2000, // Only send entities within this distance
    OPTIMIZE_NETWORK: true, // Enable network optimizations
    EXPERIENCE_SPAWN_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_EXPERIENCES_PER_AREA: 5,
    EXPERIENCE_MAX_COUNT: 30,
    EXPERIENCE_DENSITY: 0.0002, // Experiences per square meter
    EXPERIENCE_LIFETIME: 24 * 3600000, // 24 hours in ms
};
/**
 * WorldRoom: The primary multiplayer room that manages the game world
 */
export class WorldRoom extends Room {
    constructor() {
        super();
        this.lastTickTime = Date.now();
        this.TICK_RATE = 1000 / 20; // 20 ticks per second
        this.CLEANUP_INTERVAL = 60000; // 1 minute
        // Track rate limits for clients
        this.movementRateLimits = new Map();
        this.actionRateLimits = new Map();
        // Scheduled tasks
        this.powerSpawnTask = null;
        this.playerInactivityTask = null;
        this.worldStateUpdateTask = null;
        // Track players needing state updates
        this.playersPendingUpdate = new Set();
        // Last broadcast time
        this.lastBroadcastTime = 0;
        // Add these properties to the WorldRoom class
        this.experienceSpawnTask = null;
        this.activeExperienceInstances = new Map();
        this.powerService = PowerService;
        this.experienceService = {}; // Mock service for now
    }
    /**
     * Called when room is initialized
     */
    async onCreate(options = {}) {
        console.log("WorldRoom created with options:", options);
        try {
            // Initialize state
            this.setState(new SimplifiedWorldState());
            this.state.name = options.name || "Main World";
            // Set max clients
            this.maxClients = CONFIG.MAX_PLAYERS;
            // Create initial zones - spread across creation
            setTimeout(() => this.createInitialZones(), 100);
            // Spawn initial powers
            this.spawnPowers();
            // Spawn initial experiences
            this.spawnExperiences();
            // Register message handlers
            this.registerMessageHandlers();
            // Start scheduled tasks
            this.startScheduledTasks();
            // Set up periodic world updates
            this.tickInterval = this.clock.setInterval(() => {
                this.state.updateTick();
                this.lastTickTime = Date.now();
            }, this.TICK_RATE);
            // Set up periodic cleanup
            this.cleanupInterval = this.clock.setInterval(() => {
                this.cleanup();
            }, this.CLEANUP_INTERVAL);
            console.log(`WorldRoom initialized successfully`);
        }
        catch (error) {
            console.error("Error creating WorldRoom:", error);
        }
    }
    /**
     * Create initial test zones
     */
    createInitialZones() {
        // Create a central zone
        const centerZone = new SimpleZone('zone_center', 'Atlantis Central', 'hub');
        centerZone.x = 0;
        centerZone.y = 0;
        centerZone.radius = 200;
        this.state.zones.set(centerZone.id, centerZone);
        // Create some additional zones
        const northZone = new SimpleZone('zone_north', 'Northern District', 'residential');
        northZone.x = 0;
        northZone.y = 300;
        northZone.radius = 150;
        this.state.zones.set(northZone.id, northZone);
        const eastZone = new SimpleZone('zone_east', 'Eastern District', 'commercial');
        eastZone.x = 300;
        eastZone.y = 0;
        eastZone.radius = 150;
        this.state.zones.set(eastZone.id, eastZone);
        const southZone = new SimpleZone('zone_south', 'Southern District', 'industrial');
        southZone.x = 0;
        southZone.y = -300;
        southZone.radius = 150;
        this.state.zones.set(southZone.id, southZone);
        const westZone = new SimpleZone('zone_west', 'Western District', 'educational');
        westZone.x = -300;
        westZone.y = 0;
        westZone.radius = 150;
        this.state.zones.set(westZone.id, westZone);
        console.log(`Created ${this.state.zones.size} initial zones`);
    }
    /**
     * Register message handlers
     * @private
     */
    registerMessageHandlers() {
        // Player movement
        this.onMessage("move", (client, message) => {
            this.handlePlayerMovement(client, message);
        });
        // Power interactions
        this.onMessage("power:interact", (client, message) => {
            this.handlePowerInteraction(client, message);
        });
        // Power capture attempt
        this.onMessage("power:capture", (client, message) => {
            this.handlePowerCapture(client, message);
        });
        // Request power details
        this.onMessage("power:details", (client, message) => {
            // Get the power
            const power = this.state.powers.get(message.powerId);
            if (!power) {
                client.send("powerDetailsResult", {
                    success: false,
                    message: "Power not found"
                });
                return;
            }
            // Send power details
            client.send("power:details", {
                power: {
                    id: power.id,
                    name: power.name,
                    type: power.type,
                    rarity: power.rarity,
                    position: {
                        x: power.x,
                        y: power.y
                    }
                }
            });
        });
        // Ping handler for latency measurement
        this.onMessage("ping", (client, message) => {
            // Simply echo back the time sent by the client
            client.send("pong", { time: message.time });
        });
        // Handle zone entry requests
        this.onMessage("zone:enter", (client, message) => {
            this.handleZoneEntry(client, message);
        });
        // Handle zone exit requests
        this.onMessage("zone:exit", (client, message) => {
            this.handleZoneExit(client, message);
        });
        // Handle player status updates
        this.onMessage("player:status", (client, message) => {
            this.handlePlayerStatus(client, message);
        });
        // Test spawning powers (development only)
        if (process.env.NODE_ENV === 'development') {
            this.onMessage("debug:spawnTestPowers", (client, message) => {
                this.handleSpawnTestPowers(client, message);
            });
        }
        // Experience handlers
        this.onMessage("experienceJoin", (client, message) => {
            this.checkRateLimit(client.sessionId, 'action') &&
                this.handleExperienceJoin(client, message);
        });
        this.onMessage("experiencePhaseComplete", (client, message) => {
            this.checkRateLimit(client.sessionId, 'action') &&
                this.handleExperiencePhaseComplete(client, message);
        });
        this.onMessage("experienceLeave", (client, message) => {
            this.checkRateLimit(client.sessionId, 'action') &&
                this.handleExperienceLeave(client, message);
        });
    }
    /**
     * Start scheduled background tasks
     */
    startScheduledTasks() {
        // Spawn powers periodically
        this.powerSpawnTask = setInterval(() => {
            this.spawnPowers();
        }, CONFIG.POWER_SPAWN_INTERVAL);
        // Check for inactive players
        this.playerInactivityTask = setInterval(() => {
            this.checkInactivePlayers();
        }, CONFIG.PLAYER_INACTIVE_TIMEOUT / 10);
        // Update world state - efficient update using pending updates tracking
        this.worldStateUpdateTask = setInterval(() => {
            // Skip if no players or no pending updates
            if (this.clients.length === 0 || this.playersPendingUpdate.size === 0) {
                return;
            }
            const now = Date.now();
            // Only broadcast if enough time has passed since last broadcast
            if (now - this.lastBroadcastTime >= CONFIG.BROADCAST_THROTTLE_MS) {
                this.lastBroadcastTime = now;
                // Process pending updates
                for (const clientId of this.playersPendingUpdate) {
                    const client = this.clients.find(c => c.sessionId === clientId);
                    if (client) {
                        this.sendVisibleWorldToClient(client);
                    }
                }
                // Clear pending updates
                this.playersPendingUpdate.clear();
            }
            // Update state tick
            this.state.tick();
        }, CONFIG.WORLD_UPDATE_INTERVAL);
        // Spawn new experiences periodically
        this.experienceSpawnTask = setInterval(() => {
            try {
                this.spawnExperiences();
            }
            catch (error) {
                console.error("Error in experience spawn task:", error);
            }
        }, CONFIG.EXPERIENCE_SPAWN_INTERVAL);
    }
    /**
     * Main simulation update loop
     */
    update(deltaTime) {
        // Check for powers that should despawn based on age
        const currentTime = Date.now();
        const maxAge = CONFIG.POWER_LIFETIME;
        this.state.powers.forEach((power, key) => {
            // Check if power has been active for too long
            if (currentTime - power.spawnedAt > maxAge) {
                this.state.powers.delete(key);
            }
        });
        // Update world time and tick
        this.state.worldTime = Date.now();
        this.state.updateTick();
    }
    /**
     * When a client joins the room
     */
    onJoin(client, options) {
        console.log(`${client.sessionId} joined the world!`, options);
        // Create player instance
        const userId = options.userId || `user_${nanoid(8)}`;
        const username = options.username || `Player ${Math.floor(Math.random() * 1000)}`;
        // Create a simplified player
        const player = new SimplePlayer(userId, username);
        // Set initial position
        if (options.position) {
            player.x = options.position.x;
            player.y = options.position.y;
        }
        else {
            // Random position if none provided
            player.x = (Math.random() * 100) - 50; // -50 to +50
            player.y = (Math.random() * 100) - 50;
        }
        // Initialize empty metadata
        player.metadata = new MapSchema();
        // Add player to state
        this.state.players.set(client.sessionId, player);
        // Initialize rate limiters for this client
        this.movementRateLimits.set(client.sessionId, {
            count: 0,
            lastReset: Date.now()
        });
        this.actionRateLimits.set(client.sessionId, {
            count: 0,
            lastReset: Date.now()
        });
        console.log(`Player ${client.sessionId} joined with position: (${player.x}, ${player.y})`);
        // Send initial state to client
        this.sendVisibleWorldToClient(client);
    }
    /**
     * Send only the visible portion of the world to the client
     * based on their location and visibility radius
     */
    sendVisibleWorldToClient(client) {
        try {
            // Get player from state
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                console.warn(`sendVisibleWorldToClient: Player not found for client ${client.sessionId}`);
                return;
            }
            // Create a player position reference for visibility checks
            const playerPos = { x: player.x, y: player.y };
            // Count of entities by type within visibility radius
            const counts = {
                players: 0,
                powers: 0,
                zones: 0
            };
            // Find visible players
            const visiblePlayers = [];
            this.state.players.forEach((otherPlayer, sessionId) => {
                // Skip self
                if (sessionId === client.sessionId)
                    return;
                // Calculate distance
                const distance = this.calculateDistance(playerPos, { x: otherPlayer.x, y: otherPlayer.y });
                // Check if within visibility radius
                if (distance <= CONFIG.ENTITY_CULLING_DISTANCE) {
                    visiblePlayers.push({
                        id: sessionId,
                        username: otherPlayer.username,
                        x: otherPlayer.x,
                        y: otherPlayer.y,
                        state: otherPlayer.state
                    });
                    counts.players++;
                }
            });
            // Find visible powers
            const visiblePowers = [];
            this.state.powers.forEach((power, powerId) => {
                // Calculate distance
                const distance = this.calculateDistance(playerPos, { x: power.x, y: power.y });
                // Check if within visibility radius
                if (distance <= CONFIG.ENTITY_CULLING_DISTANCE) {
                    visiblePowers.push({
                        id: powerId,
                        name: power.name,
                        type: power.type,
                        rarity: power.rarity,
                        x: power.x,
                        y: power.y
                    });
                    counts.powers++;
                }
            });
            // Find visible zones
            const visibleZones = [];
            this.state.zones.forEach((zone, zoneId) => {
                // Calculate distance
                const distance = this.calculateDistance(playerPos, { x: zone.x, y: zone.y });
                // Check if within visibility radius
                if (distance <= CONFIG.ENTITY_CULLING_DISTANCE) {
                    visibleZones.push({
                        id: zoneId,
                        name: zone.name,
                        type: zone.type,
                        x: zone.x,
                        y: zone.y,
                        radius: zone.radius
                    });
                    counts.zones++;
                }
            });
            // Send visible world state to client
            client.send('world:visible', {
                players: counts.players,
                powers: counts.powers,
                zones: counts.zones,
                visiblePlayers,
                visiblePowers,
                visibleZones,
                visibilityRadius: CONFIG.VISIBILITY_RADIUS
            });
        }
        catch (error) {
            console.error('Error in sendVisibleWorldToClient:', error);
        }
    }
    /**
     * Calculate distance between two points
     */
    calculateDistance(point1, point2) {
        return Math.sqrt(Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2));
    }
    /**
     * Handle player movement with improved efficiency
     */
    handlePlayerMovement(client, message) {
        // Rate limit check
        if (!this.checkRateLimit(client.sessionId, 'movement')) {
            return;
        }
        try {
            // Validate message format
            if (!message || typeof message.x !== 'number' || typeof message.y !== 'number') {
                console.warn(`Invalid movement message from client ${client.sessionId}`);
                return;
            }
            // Set the state based on message if provided
            const state = message.state || "moving";
            // Get player
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                console.warn(`Player not found for client ${client.sessionId}`);
                return;
            }
            // Update position
            player.x = message.x;
            player.y = message.y;
            // Update state and last activity
            player.setState(state);
            // Mark player as needing a world update
            this.playersPendingUpdate.add(client.sessionId);
            // Check if player is inside any zone
            this.checkZoneEntry(client, player);
        }
        catch (error) {
            console.error('Error in handlePlayerMovement:', error);
        }
    }
    /**
     * When a client leaves the room
     */
    async onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        try {
            if (!consented) {
                // Unexpected disconnect - wait for reconnection
                console.log(`${client.sessionId} disconnected. Waiting for reconnection...`);
                await this.allowReconnection(client, 30);
                console.log(`${client.sessionId} reconnected!`);
                // Reset activity timestamp
                if (player) {
                    player.lastActivity = Date.now();
                    player.isActive = true;
                }
                return;
            }
        }
        catch (e) {
            // Reconnection failed or timeout expired
            console.log(`${client.sessionId} couldn't reconnect, removing from world`);
        }
        // Remove player from world
        if (player) {
            // Remove from current zone if any
            if (player.currentZoneId) {
                const zone = this.state.zones.get(player.currentZoneId);
                if (zone) {
                    zone.removePlayer(player.id);
                }
            }
            // Remove player from state
            this.state.players.delete(client.sessionId);
        }
        // Clean up rate limiters
        this.movementRateLimits.delete(client.sessionId);
        this.actionRateLimits.delete(client.sessionId);
        console.log(`${client.sessionId} left the world`);
    }
    /**
     * When room is disposed
     */
    onDispose() {
        console.log(`World Room ${this.roomId} is being disposed`);
        // Clear all scheduled tasks
        if (this.powerSpawnTask)
            clearInterval(this.powerSpawnTask);
        if (this.playerInactivityTask)
            clearInterval(this.playerInactivityTask);
        if (this.worldStateUpdateTask)
            clearInterval(this.worldStateUpdateTask);
        // Clear experience spawn task
        if (this.experienceSpawnTask) {
            clearInterval(this.experienceSpawnTask);
            this.experienceSpawnTask = null;
        }
        // Clear active experience timeouts
        this.activeExperienceInstances.forEach(timeout => {
            timeout.clear();
        });
        this.activeExperienceInstances.clear();
        console.log('All tasks cleared');
    }
    /**
     * Check and enforce rate limits for client actions
     * @param sessionId - Client session ID
     * @param type - Type of action (movement, action)
     * @returns Whether the action is allowed
     */
    checkRateLimit(sessionId, type) {
        const now = Date.now();
        const limitMap = type === 'movement' ? this.movementRateLimits : this.actionRateLimits;
        const limits = CONFIG.RATE_LIMIT[type.toUpperCase()];
        if (!limitMap.has(sessionId))
            return false;
        const clientLimit = limitMap.get(sessionId);
        // Reset counter if window expired
        if (now - clientLimit.lastReset > limits.WINDOW_MS) {
            clientLimit.count = 0;
            clientLimit.lastReset = now;
        }
        // Check if limit exceeded
        if (clientLimit.count >= limits.MAX_REQUESTS) {
            return false;
        }
        // Increment counter
        clientLimit.count++;
        return true;
    }
    /**
     * Check for and mark inactive players
     */
    checkInactivePlayers() {
        const now = Date.now();
        const inactiveTimeout = CONFIG.PLAYER_INACTIVE_TIMEOUT;
        this.state.players.forEach((player, sessionId) => {
            if (now - player.lastActivity > inactiveTimeout) {
                player.markInactive();
            }
        });
    }
    /**
     * Handle a power interaction request
     * @param client Client initiating the power interaction
     * @param message Power interaction message
     */
    handlePowerInteraction(client, message) {
        try {
            // Verbose logging for debugging
            console.log(`[handlePowerInteraction] Client ${client.sessionId} is interacting with power:`, JSON.stringify(message));
            // Validate message structure
            if (!message || typeof message !== 'object') {
                console.log(`[handlePowerInteraction] Invalid message format from client ${client.sessionId}`);
                client.send('power:error', {
                    message: 'Invalid message format',
                    status: 'error',
                    code: 'INVALID_FORMAT'
                });
                return;
            }
            // Rate limiting
            if (!this.checkRateLimit(client.sessionId, 'action')) {
                console.log(`[handlePowerInteraction] Rate limit exceeded for client ${client.sessionId}`);
                client.send('power:error', {
                    message: 'Action rate limit exceeded. Please try again in a few seconds.',
                    status: 'error',
                    code: 'RATE_LIMIT'
                });
                return;
            }
            // Get player from state
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                console.log(`[handlePowerInteraction] Player not found for client ${client.sessionId}`);
                client.send('power:error', {
                    message: 'Player not found in game state. Please try reconnecting.',
                    status: 'error',
                    code: 'PLAYER_NOT_FOUND'
                });
                return;
            }
            // Validate message
            if (!message.powerId) {
                console.log(`[handlePowerInteraction] Missing powerId in message from client ${client.sessionId}`);
                client.send('power:error', {
                    message: 'Missing power ID in request',
                    status: 'error',
                    code: 'MISSING_POWER_ID'
                });
                return;
            }
            console.log(`[handlePowerInteraction] Looking for power ${message.powerId} in state.powers (size: ${this.state.powers.size})`);
            // Log all available power IDs for debugging
            const availablePowerIds = Array.from(this.state.powers.keys());
            console.log(`[handlePowerInteraction] Available power IDs: ${JSON.stringify(availablePowerIds)}`);
            // Try to find the power in the state
            const power = this.state.powers.get(message.powerId);
            if (!power) {
                console.log(`[handlePowerInteraction] Power ${message.powerId} not found`);
                client.send('power:notFound', {
                    powerId: message.powerId,
                    availablePowers: availablePowerIds.length,
                    playerPosition: { x: player.x, y: player.y },
                    message: 'Power not found in game state',
                    status: 'error',
                    code: 'POWER_NOT_FOUND'
                });
                return;
            }
            // Check if power is active
            if (!power.isActive) {
                console.log(`[handlePowerInteraction] Power ${message.powerId} is not active`);
                client.send('power:notActive', {
                    powerId: message.powerId,
                    message: 'This power has already been captured',
                    status: 'error',
                    code: 'POWER_NOT_ACTIVE'
                });
                return;
            }
            console.log(`[handlePowerInteraction] Found power: ${power.id} (${power.name})`);
            // Check if player is close enough to interact
            const distance = Math.sqrt(Math.pow(player.x - power.x, 2) + Math.pow(player.y - power.y, 2));
            console.log(`[handlePowerInteraction] Distance to power: ${distance}m (max: ${CONFIG.INTERACTION_RADIUS}m)`);
            console.log(`[handlePowerInteraction] Player position: (${player.x}, ${player.y}), Power position: (${power.x}, ${power.y})`);
            if (distance > CONFIG.INTERACTION_RADIUS) {
                console.log(`[handlePowerInteraction] Player too far from power: ${distance}m > ${CONFIG.INTERACTION_RADIUS}m`);
                client.send('power:tooFar', {
                    powerId: power.id,
                    distance,
                    maxDistance: CONFIG.INTERACTION_RADIUS,
                    playerPosition: { x: player.x, y: player.y },
                    powerPosition: { x: power.x, y: power.y },
                    message: 'You are too far away from this power',
                    status: 'error',
                    code: 'TOO_FAR'
                });
                return;
            }
            // Send power details to client
            console.log(`[handlePowerInteraction] Sending power details to client ${client.sessionId}`);
            try {
                const details = {
                    id: power.id,
                    name: power.name || "Unknown Power",
                    description: power.description || "No description available",
                    type: power.type || "Unknown",
                    rarity: power.rarity || "Common",
                    matrixQuadrant: power.matrixQuadrant || "Unknown",
                    captureChallenge: power.captureChallenge || {
                        type: "reflection",
                        question: "What virtue does this power represent to you?"
                    },
                    status: 'success',
                    message: 'Power details retrieved successfully',
                    distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
                    playerPosition: { x: player.x, y: player.y },
                    powerPosition: { x: power.x, y: power.y }
                };
                console.log(`[handlePowerInteraction] Power details to send:`, JSON.stringify(details));
                client.send('power:details', details);
                // Update player last activity and state
                player.lastActivity = Date.now();
                player.setState('interacting');
            }
            catch (detailsError) {
                console.error(`[handlePowerInteraction] Error sending power details:`, detailsError);
                client.send('power:error', {
                    message: 'Error processing power details',
                    error: detailsError.message || 'Unknown error',
                    status: 'error',
                    code: 'DETAILS_ERROR'
                });
            }
        }
        catch (error) {
            console.error(`[handlePowerInteraction] Unexpected error:`, error);
            try {
                client.send('power:error', {
                    message: 'Server error processing power interaction',
                    error: error.message,
                    status: 'error',
                    code: 'SERVER_ERROR'
                });
            }
            catch (sendError) {
                console.error(`[handlePowerInteraction] Failed to send error to client:`, sendError);
            }
        }
    }
    /**
     * Handle the admin request to spawn test powers
     * @param client - Client requesting power spawn
     * @param message - Spawn message with options
     */
    handleSpawnTestPowers(client, message) {
        console.log(`[handleSpawnTestPowers] Received request:`, message);
        // Get player
        const player = this.state.players.get(client.sessionId);
        if (!player) {
            console.log(`[handleSpawnTestPowers] Player not found for client ${client.sessionId}`);
            return;
        }
        // Log the request
        console.log(`[handleSpawnTestPowers] Admin request from ${player.username} (${client.sessionId})`);
        // Default count
        const count = message.count || 3;
        console.log(`[handleSpawnTestPowers] Spawning ${count} powers`);
        // Generate powers near the player if specified
        let centerPosition = new Position();
        if (message.nearPlayer) {
            centerPosition.x = player.x;
            centerPosition.y = player.y;
            console.log(`[handleSpawnTestPowers] Using player position: (${centerPosition.x}, ${centerPosition.y})`);
        }
        else {
            centerPosition.x = 0;
            centerPosition.y = 0;
            console.log(`[handleSpawnTestPowers] Using default position: (0, 0)`);
        }
        // Generate powers
        const radius = message.radius || 100; // 100 meter radius
        console.log(`[handleSpawnTestPowers] Requesting ${count} powers within ${radius}m radius`);
        const powers = PowerService.generatePowersForArea(centerPosition, radius, count);
        console.log(`[handleSpawnTestPowers] Generated ${powers.length} powers`);
        // Add powers to game world
        for (const powerData of powers) {
            // Create a simplified power that works with our schema
            const power = new SimplePower(powerData._id, powerData.name, powerData.type, powerData.rarity);
            // Position the power - randomly place within radius of requested position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.8; // 80% of radius for better clustering
            power.x = centerPosition.x + Math.cos(angle) * distance;
            power.y = centerPosition.y + Math.sin(angle) * distance;
            // Make sure the power is active
            power.isActive = true;
            power.spawnedAt = Date.now();
            // Add to state
            this.state.powers.set(power.id, power);
            console.log(`[handleSpawnTestPowers] Spawned power: ${power.name} (${power.id}) at (${power.x}, ${power.y})`);
        }
        // Update total count
        console.log(`[handleSpawnTestPowers] Total powers in world: ${this.state.powers.size}`);
        // Notify the client
        client.send("admin:powersSpawned", {
            count: powers.length,
            position: {
                x: centerPosition.x,
                y: centerPosition.y
            },
            radius: radius
        });
    }
    /**
     * Check if a player has entered or exited a zone
     * @param client Client to notify
     * @param player Player to check
     */
    checkZoneEntry(client, player) {
        // Find zone at current position
        let currentZone = null;
        this.state.zones.forEach((zone) => {
            const distance = Math.sqrt(Math.pow(zone.x - player.x, 2) +
                Math.pow(zone.y - player.y, 2));
            // Check if player is inside zone
            if (distance <= zone.radius) {
                // If multiple zones overlap, prioritize the smaller one
                if (!currentZone || zone.radius < currentZone.radius) {
                    currentZone = zone;
                }
            }
        });
        // Process zone changes
        const previousZoneId = player.currentZoneId;
        if (currentZone) {
            // Player entered a zone
            const zoneId = currentZone.id;
            // Update player's current zone
            player.setZone(zoneId);
            // Only notify if the zone changed
            if (previousZoneId !== zoneId) {
                client.send('zone:entered', {
                    zoneId: zoneId,
                    zoneName: currentZone.name,
                    zoneType: currentZone.type
                });
            }
        }
        else if (previousZoneId) {
            // Player exited a zone
            const previousZone = this.state.zones.get(previousZoneId);
            // Clear player's current zone
            player.setZone("");
            if (previousZone) {
                client.send('zone:exited', {
                    zoneId: previousZoneId,
                    zoneName: previousZone.name
                });
            }
        }
    }
    /**
     * Spawn experiences throughout the world
     */
    spawnExperiences() {
        // Check if we've reached the maximum number of experiences
        const experienceCount = this.state.experiences.size;
        if (experienceCount >= CONFIG.EXPERIENCE_MAX_COUNT) {
            return;
        }
        // Calculate how many experiences to spawn
        const targetCount = Math.floor(CONFIG.WORLD_SIZE.WIDTH * CONFIG.WORLD_SIZE.HEIGHT * CONFIG.EXPERIENCE_DENSITY);
        // Don't spawn more than the max
        const spawnCount = Math.min(targetCount - experienceCount, CONFIG.MAX_EXPERIENCES_PER_AREA);
        if (spawnCount <= 0) {
            return;
        }
        console.log(`Spawning ${spawnCount} new experiences`);
        // Create a center position in the world
        const centerPosition = new Position();
        centerPosition.x = CONFIG.WORLD_SIZE.WIDTH / 2;
        centerPosition.y = CONFIG.WORLD_SIZE.HEIGHT / 2;
        // Generate experiences
        const experiences = ExperienceService.generateExperiencesForArea(centerPosition, Math.min(CONFIG.WORLD_SIZE.WIDTH, CONFIG.WORLD_SIZE.HEIGHT) / 2, spawnCount);
        // Add experiences to the state
        experiences.forEach(experience => {
            this.state.experiences.set(experience.id, experience);
            // Schedule despawn if needed
            this.clock.setTimeout(() => {
                if (this.state.experiences.has(experience.id)) {
                    this.state.experiences.delete(experience.id);
                    console.log(`Experience ${experience.id} despawned due to timeout`);
                }
            }, CONFIG.EXPERIENCE_LIFETIME);
        });
    }
    /**
     * Handle a request to join an experience
     */
    handleExperienceJoin(client, message) {
        try {
            // Get player and experience
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                throw new Error("Player not found");
            }
            const experience = this.state.experiences.get(message.experienceId);
            if (!experience) {
                throw new Error("Experience not found");
            }
            // Check if player meets requirements
            const playerPowers = Array.from(player.powers.keys());
            const qualification = ExperienceService.checkExperienceQualification(experience, player.rank, playerPowers);
            if (!qualification.qualified) {
                client.send("experienceError", {
                    experienceId: experience.id,
                    error: qualification.reason || "You don't meet the requirements for this experience"
                });
                return;
            }
            // Check if there's already an instance for this experience in the same zone
            let instance;
            const playerZoneId = player.currentZoneId;
            // Look for existing instances with open slots
            this.state.experienceInstances.forEach(existingInstance => {
                if (existingInstance.experienceId === experience.id &&
                    existingInstance.status === "Scheduled" &&
                    (existingInstance.zoneId === playerZoneId || !existingInstance.zoneId) &&
                    existingInstance.participants.size < experience.maxPlayers) {
                    instance = existingInstance;
                }
            });
            // Create new instance if needed
            if (!instance) {
                instance = ExperienceService.createExperienceInstance(experience.id, playerZoneId);
                this.state.experienceInstances.set(instance.id, instance);
                console.log(`Created new experience instance ${instance.id} for experience ${experience.id}`);
            }
            // Add player to instance
            const participant = instance.addParticipant(player.id);
            // If we've reached minimum players, schedule the start
            if (instance.participants.size >= experience.minPlayers &&
                instance.status === "Scheduled") {
                // Start after a short delay
                this.clock.setTimeout(() => {
                    if (this.state.experienceInstances.has(instance.id) &&
                        instance.status === "Scheduled") {
                        instance.start();
                        // Set estimated completion time
                        instance.estimatedCompletionTime = Date.now() + (experience.estimatedDuration * 60 * 1000);
                        // Notify all participants
                        instance.participants.forEach((participant, userId) => {
                            const participantClient = this.clients.find(c => this.state.players.get(c.sessionId)?.id === userId);
                            if (participantClient) {
                                participantClient.send("experienceStarted", {
                                    instanceId: instance.id,
                                    experienceId: experience.id,
                                    startTime: instance.startTime
                                });
                            }
                        });
                        // Schedule automatic completion/failure check
                        const maxDuration = experience.maximumDuration * 60 * 1000; // Convert to ms
                        const timeoutTask = this.clock.setTimeout(() => {
                            // Check if instance still exists and is in progress
                            if (this.state.experienceInstances.has(instance.id) &&
                                instance.status === "InProgress") {
                                // Time's up - mark as failed
                                instance.fail();
                                // Notify all participants
                                instance.participants.forEach((participant, userId) => {
                                    const participantClient = this.clients.find(c => this.state.players.get(c.sessionId)?.id === userId);
                                    if (participantClient) {
                                        participantClient.send("experienceEnded", {
                                            instanceId: instance.id,
                                            experienceId: experience.id,
                                            status: "Failed",
                                            reason: "Time expired"
                                        });
                                    }
                                });
                                // Schedule cleanup
                                this.clock.setTimeout(() => {
                                    if (this.state.experienceInstances.has(instance.id)) {
                                        this.state.experienceInstances.delete(instance.id);
                                    }
                                }, 60000); // Clean up after 1 minute
                            }
                            this.activeExperienceInstances.delete(instance.id);
                        }, maxDuration);
                        // Store the timeout task
                        this.activeExperienceInstances.set(instance.id, timeoutTask);
                    }
                }, 5000); // Start after 5 seconds
            }
            // Notify player they've joined
            client.send("experienceJoined", {
                instanceId: instance.id,
                experienceId: experience.id,
                status: instance.status,
                currentPhase: instance.currentPhase,
                participantCount: instance.participants.size
            });
        }
        catch (error) {
            console.error("Error handling experience join:", error);
            client.send("experienceError", {
                experienceId: message.experienceId,
                error: error.message || "Failed to join experience"
            });
        }
    }
    /**
     * Handle experience phase completion
     */
    handleExperiencePhaseComplete(client, message) {
        try {
            // Get player
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                throw new Error("Player not found");
            }
            // Find the instance the player is in
            let instance;
            this.state.experienceInstances.forEach(exp => {
                if (exp.participants.has(player.id)) {
                    instance = exp;
                }
            });
            if (!instance) {
                throw new Error("You are not in an active experience");
            }
            // Get the experience template
            const experience = this.state.experiences.get(instance.experienceId);
            if (!experience) {
                throw new Error("Experience template not found");
            }
            // Check if this is the current phase
            if (message.phaseIndex !== undefined && message.phaseIndex !== instance.currentPhase) {
                throw new Error("Invalid phase index");
            }
            // Check if we're in the right status
            if (instance.status !== "InProgress") {
                throw new Error(`Experience is not in progress (status: ${instance.status})`);
            }
            // If there's a submission, add it
            if (message.submission) {
                instance.addActivity(player.id, JSON.stringify(message.submission));
            }
            // Check if this is the last phase
            if (instance.currentPhase >= experience.phases.length - 1) {
                // This was the last phase, complete the experience
                instance.complete();
                // Award rewards to all participants
                instance.participants.forEach((participant, userId) => {
                    const participantPlayer = this.findPlayerById(userId);
                    if (participantPlayer) {
                        // XP and coins
                        participantPlayer.xp += experience.xpReward;
                        participantPlayer.coins += experience.coinsReward;
                        // Check rank up
                        participantPlayer.checkRankUp();
                        // Add virtue rewards (would update player.virtues in a full implementation)
                        // Notify player
                        const participantClient = this.clients.find(c => this.state.players.get(c.sessionId)?.id === userId);
                        if (participantClient) {
                            participantClient.send("experienceEnded", {
                                instanceId: instance.id,
                                experienceId: experience.id,
                                status: "Completed",
                                rewards: {
                                    xp: experience.xpReward,
                                    coins: experience.coinsReward,
                                    virtues: {
                                        wisdom: experience.wisdomReward,
                                        courage: experience.courageReward,
                                        temperance: experience.temperanceReward,
                                        justice: experience.justiceReward,
                                        strength: experience.strengthReward
                                    }
                                }
                            });
                        }
                    }
                });
                // Clear any scheduled timeouts
                if (this.activeExperienceInstances.has(instance.id)) {
                    this.activeExperienceInstances.get(instance.id).clear();
                    this.activeExperienceInstances.delete(instance.id);
                }
                // Schedule cleanup
                this.clock.setTimeout(() => {
                    if (this.state.experienceInstances.has(instance.id)) {
                        this.state.experienceInstances.delete(instance.id);
                    }
                }, 60000); // Clean up after 1 minute
            }
            else {
                // Move to next phase
                instance.advancePhase();
                // Notify all participants
                instance.participants.forEach((participant, userId) => {
                    const participantClient = this.clients.find(c => this.state.players.get(c.sessionId)?.id === userId);
                    if (participantClient) {
                        participantClient.send("experiencePhaseChanged", {
                            instanceId: instance.id,
                            experienceId: experience.id,
                            currentPhase: instance.currentPhase,
                            phaseName: experience.phases[instance.currentPhase]?.name || "Unknown"
                        });
                    }
                });
            }
        }
        catch (error) {
            console.error("Error handling experience phase completion:", error);
            client.send("experienceError", {
                error: error.message || "Failed to complete experience phase"
            });
        }
    }
    /**
     * Handle leaving an experience
     */
    handleExperienceLeave(client, message) {
        try {
            // Get player
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                throw new Error("Player not found");
            }
            // Find the instance the player is in
            let instanceId;
            this.state.experienceInstances.forEach((instance, id) => {
                if (instance.participants.has(player.id)) {
                    instanceId = id;
                }
            });
            if (!instanceId) {
                throw new Error("You are not in an active experience");
            }
            const instance = this.state.experienceInstances.get(instanceId);
            if (!instance) {
                throw new Error("Experience instance not found");
            }
            // Remove player from instance
            instance.removeParticipant(player.id);
            // If no participants left, clean up the instance
            if (instance.participants.size === 0) {
                if (this.activeExperienceInstances.has(instanceId)) {
                    this.activeExperienceInstances.get(instanceId).clear();
                    this.activeExperienceInstances.delete(instanceId);
                }
                this.state.experienceInstances.delete(instanceId);
            }
            else if (instance.status === "InProgress") {
                // If experience was in progress, notify remaining participants
                instance.participants.forEach((participant, userId) => {
                    const participantClient = this.clients.find(c => this.state.players.get(c.sessionId)?.id === userId);
                    if (participantClient) {
                        participantClient.send("experienceParticipantLeft", {
                            instanceId: instance.id,
                            userId: player.id,
                            username: player.metadata.username
                        });
                    }
                });
            }
            // Notify the player they've left
            client.send("experienceLeft", {
                instanceId: instance.id,
                experienceId: instance.experienceId
            });
        }
        catch (error) {
            console.error("Error handling experience leave:", error);
            client.send("experienceError", {
                error: error.message || "Failed to leave experience"
            });
        }
    }
    /**
     * Find a player by ID (not session ID)
     */
    findPlayerById(playerId) {
        let result;
        this.state.players.forEach(player => {
            if (player.id === playerId) {
                result = player;
            }
        });
        return result;
    }
    cleanup() {
        const now = Date.now();
        // Cleanup inactive players
        this.state.players.forEach((player, sessionId) => {
            if (!player.isActive && now - player.lastUpdateTime > 3600000) {
                this.state.players.delete(sessionId);
            }
        });
        // Cleanup expired powers
        this.state.powers.forEach((power, powerId) => {
            if (PowerService.shouldDespawn(power)) {
                this.state.powers.delete(powerId);
            }
        });
    }
    spawnPowers() {
        // Generate powers using PowerService
        const center = new Position(0, 0);
        const powers = this.powerService.generatePowersForArea(center, 1000, 10);
        powers.forEach(power => {
            const id = nanoid();
            const simplePower = new SimplePower(id, power.name || 'Unknown Power', power.type || 'Unknown', power.rarity || 'Common');
            if (power.position) {
                simplePower.x = power.position.x;
                simplePower.y = power.position.y;
            }
            this.state.powers.set(id, simplePower);
        });
    }
    handlePowerCapture(client, message) {
        const player = this.state.players.get(client.sessionId);
        const power = this.state.powers.get(message.powerId);
        if (!player || !power) {
            return;
        }
        // Add power to player's collection
        player.powers.set(power.id, power.id);
        power.isActive = false;
        // Remove power after delay
        this.clock.setTimeout(() => {
            this.state.powers.delete(power.id);
        }, 5000);
    }
    handleZoneEntry(client, message) {
        const player = this.state.players.get(client.sessionId);
        const zone = this.state.zones.get(message.zoneId);
        if (!player || !zone) {
            return;
        }
        zone.addPlayer(player.id);
        player.setZone(zone.id);
    }
    handleZoneExit(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.currentZoneId) {
            return;
        }
        const zone = this.state.zones.get(player.currentZoneId);
        if (zone) {
            zone.removePlayer(player.id);
            player.setZone("");
        }
    }
    handlePlayerStatus(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
            return;
        }
        if (message.state) {
            player.setState(message.state);
        }
        player.lastUpdateTime = Date.now();
        player.isActive = true;
    }
    handleError(client, error, code) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        client.send('error', {
            message: errorMessage,
            code: code
        });
    }
    // Temporarily disable experience-related functionality until proper types are implemented
    async handleExperienceInteraction(client, message) {
        client.send('experienceError', {
            message: 'Experience functionality is temporarily disabled',
            code: 'NOT_IMPLEMENTED'
        });
    }
}
//# sourceMappingURL=WorldRoom.js.map