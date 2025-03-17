/**
 * @file ZoneService.ts
 * @description Service for managing zones, zone control, and raid mechanics
 */
import { nanoid } from 'nanoid';
import { ZoneRepository } from '../database/repositories/ZoneRepository.js';
import { MarketRepository } from '../database/repositories/MarketRepository.js';
import { connectDatabase } from '../database/index.js';
/**
 * Zone types
 */
const ZONE_TYPES = {
    PUBLIC: "Public area open to all",
    PRIVATE: "Private area with restricted access",
    COMMERCIAL: "Commercial zone for marketplace activities",
    EDUCATIONAL: "Zone focused on learning and development",
    RECREATIONAL: "Zone for entertainment and leisure",
    WILDERNESS: "Undeveloped natural area",
    SPECIAL: "Special purpose zone with unique properties"
};
/**
 * Raid types
 */
const RAID_TYPES = {
    CONQUEST: "Take control of a zone",
    RESOURCE: "Gather resources from a zone",
    CHALLENGE: "Special competition for reputation",
    TOURNAMENT: "Formal competitive event"
};
/**
 * Zone Service for managing zone-related functionality
 */
class ZoneService {
    constructor() {
        this.mockData = false;
        this.repository = new ZoneRepository();
        this.marketRepository = new MarketRepository();
    }
    /**
     * Initialize the service, connecting to database
     */
    async initialize() {
        try {
            await connectDatabase();
            console.log("ZoneService initialized with database connection");
        }
        catch (error) {
            console.error("Failed to initialize ZoneService:", error);
            this.mockData = true;
            console.log("Using mock data for ZoneService");
        }
    }
    /**
     * Get all zones
     */
    async getAllZones() {
        try {
            return await this.repository.find();
        }
        catch (error) {
            console.error("Error getting all zones:", error);
            return this.getMockZones();
        }
    }
    /**
     * Get zones near a location
     */
    async getZonesNearLocation(longitude, latitude, maxDistance = 5000) {
        try {
            return await this.repository.findNearLocation(longitude, latitude, maxDistance);
        }
        catch (error) {
            console.error("Error getting zones near location:", error);
            return [];
        }
    }
    /**
     * Get zone by ID
     */
    async getZoneById(id) {
        try {
            return await this.repository.findById(id);
        }
        catch (error) {
            console.error(`Error getting zone with ID ${id}:`, error);
            return null;
        }
    }
    /**
     * Create a new zone
     */
    async createZone(zone) {
        try {
            if (!zone.name || !zone.type) {
                throw new Error("Zone must have a name and type");
            }
            // Generate a unique ID for the zone
            const zoneDoc = {
                name: zone.name,
                description: zone.description || "",
                type: zone.type,
                sector: zone.sector || {
                    id: "sector-" + nanoid(6),
                    name: "Default Sector",
                    type: "Mixed"
                },
                geometry: zone.geometry || {
                    type: "Point",
                    coordinates: [[0, 0]],
                    center: [0, 0]
                },
                rank: zone.rank || 1,
                ownership: zone.ownership || {
                    controlledBy: "",
                    controlledSince: new Date(),
                    previousOwners: []
                },
                properties: zone.properties || {
                    capacity: 10,
                    amenities: [],
                    rating: 0,
                    price: 0,
                    availability: []
                },
                activity: zone.activity || {
                    currentUsers: 0,
                    popularTimes: {},
                    events: []
                },
                resources: zone.resources || [],
                tech: zone.tech || {
                    unlockedPowers: [],
                    currentPhase: "Initial",
                    specialAbilities: []
                },
                visuals: zone.visuals || {
                    theme: "Standard",
                    icon: "",
                    banner: ""
                }
            };
            return await this.repository.create(zoneDoc);
        }
        catch (error) {
            console.error("Error creating zone:", error);
            return null;
        }
    }
    /**
     * Update an existing zone
     */
    async updateZone(id, updates) {
        try {
            return await this.repository.update(id, updates);
        }
        catch (error) {
            console.error(`Error updating zone with ID ${id}:`, error);
            return false;
        }
    }
    /**
     * Update zone ownership
     */
    async updateZoneOwnership(zoneId, teamId) {
        try {
            return await this.repository.updateOwnership(zoneId, teamId);
        }
        catch (error) {
            console.error(`Error updating ownership for zone ${zoneId}:`, error);
            return false;
        }
    }
    /**
     * Get zones controlled by a team
     */
    async getTeamControlledZones(teamId) {
        try {
            return await this.repository.getTeamControlledZones(teamId);
        }
        catch (error) {
            console.error(`Error getting zones controlled by team ${teamId}:`, error);
            return [];
        }
    }
    /**
     * Get a user's zone memberships
     */
    async getUserZoneMemberships(userId) {
        try {
            return await this.repository.getUserZoneMemberships(userId);
        }
        catch (error) {
            console.error(`Error getting zone memberships for user ${userId}:`, error);
            return [];
        }
    }
    /**
     * Add a user to a zone
     */
    async addUserToZone(userId, zoneId, role = "Member") {
        try {
            return await this.repository.addUserToZone(userId, zoneId, role);
        }
        catch (error) {
            console.error(`Error adding user ${userId} to zone ${zoneId}:`, error);
            return null;
        }
    }
    /**
     * Update a user's zone role
     */
    async updateUserZoneRole(userId, zoneId, role) {
        try {
            return await this.repository.updateUserZoneRole(userId, zoneId, role);
        }
        catch (error) {
            console.error(`Error updating role for user ${userId} in zone ${zoneId}:`, error);
            return false;
        }
    }
    /**
     * Check if a user is a member of a zone
     */
    async isUserZoneMember(userId, zoneId) {
        try {
            const memberships = await this.repository.getUserZoneMemberships(userId);
            return memberships.some(m => m.zoneId === zoneId);
        }
        catch (error) {
            console.error(`Error checking if user ${userId} is member of zone ${zoneId}:`, error);
            return false;
        }
    }
    /**
     * Track user activity in a zone
     */
    async trackUserActivity(userId, zoneId) {
        try {
            // Update the zone's current user count
            const zone = await this.repository.findById(zoneId);
            if (!zone) {
                return false;
            }
            // Update popular times data
            const now = new Date();
            const dayHour = `${now.getDay()}-${now.getHours()}`;
            const popularTimes = { ...zone.activity.popularTimes };
            popularTimes[dayHour] = (popularTimes[dayHour] || 0) + 1;
            // Update zone activity
            await this.repository.update(zoneId, {
                activity: {
                    ...zone.activity,
                    currentUsers: zone.activity.currentUsers + 1,
                    popularTimes
                }
            });
            // Update user's last active time in membership
            const membership = await this.repository.getUserZoneMemberships(userId)
                .then(memberships => memberships.find(m => m.zoneId === zoneId));
            if (membership) {
                await this.repository.updateUserZoneRole(userId, zoneId, membership.role);
            }
            else {
                // If not already a member, add them
                await this.repository.addUserToZone(userId, zoneId, "Visitor");
            }
            return true;
        }
        catch (error) {
            console.error(`Error tracking activity for user ${userId} in zone ${zoneId}:`, error);
            return false;
        }
    }
    /**
     * Add resources to a zone
     */
    async addZoneResources(zoneId, resources) {
        try {
            const zone = await this.repository.findById(zoneId);
            if (!zone) {
                return false;
            }
            // Update zone resources
            const updatedResources = [...zone.resources];
            for (const [type, quantity] of Object.entries(resources)) {
                const existingResource = updatedResources.find(r => r.type === type);
                if (existingResource) {
                    existingResource.quantity += quantity;
                    existingResource.lastUpdated = new Date();
                }
                else {
                    updatedResources.push({
                        type,
                        quantity,
                        regenerationRate: 0,
                        lastUpdated: new Date()
                    });
                }
            }
            return await this.repository.update(zoneId, {
                resources: updatedResources
            });
        }
        catch (error) {
            console.error(`Error adding resources to zone ${zoneId}:`, error);
            return false;
        }
    }
    /**
     * Create a new raid
     */
    async createRaid(raidType, attackerTeamId, targetZoneId, participantIds, startTime) {
        try {
            const zone = await this.repository.findById(targetZoneId);
            if (!zone) {
                throw new Error(`Zone with ID ${targetZoneId} not found`);
            }
            const defenderTeamId = zone.ownership.controlledBy;
            if (!defenderTeamId && raidType === "CONQUEST") {
                // If no defender, this is a free claim
                await this.repository.updateOwnership(targetZoneId, attackerTeamId);
                return null;
            }
            // Create raid participants
            const now = new Date();
            const raidParticipants = participantIds.map(userId => ({
                userId,
                teamId: attackerTeamId,
                role: "Attacker",
                joinTime: now,
                score: 0
            }));
            // Create the raid
            const preparationStart = new Date();
            preparationStart.setHours(startTime.getHours() - 1); // 1 hour prep time
            const raidDoc = {
                type: raidType,
                status: "Scheduled",
                target: {
                    zoneId: targetZoneId,
                    controllingTeamId: defenderTeamId
                },
                attacker: {
                    teamId: attackerTeamId,
                    members: raidParticipants,
                    readiness: 0
                },
                defender: {
                    teamId: defenderTeamId,
                    members: [], // Will be populated when defenders join
                    defenseBonus: zone.rank * 5 // 5% bonus per zone rank
                },
                schedule: {
                    announced: now,
                    preparationStart,
                    raidStart: startTime,
                    estimatedDuration: 60 // 60 minutes
                },
                mechanics: {
                    format: raidType === "CONQUEST" ? "Capture" : "Points",
                    winCondition: raidType === "CONQUEST" ? "Capture the zone flag" : "Score more points than defenders",
                    phases: ["Preparation", "Attack", "Defense", "Resolution"],
                    specialRules: []
                },
                rewards: {
                    winner: {
                        xp: 100 * zone.rank,
                        coins: 50 * zone.rank,
                        zoneControl: raidType === "CONQUEST"
                    },
                    participation: {
                        xp: 25 * zone.rank,
                        coins: 10 * zone.rank
                    }
                },
                feeds: [{
                        timestamp: now,
                        message: `Raid ${raidType} scheduled by team ${attackerTeamId} against zone ${zone.name}`,
                        eventType: "RAID_SCHEDULED"
                    }]
            };
            return await this.repository.createRaid(raidDoc);
        }
        catch (error) {
            console.error(`Error creating raid for zone ${targetZoneId}:`, error);
            return null;
        }
    }
    /**
     * Join a raid as a defender
     */
    async joinRaidAsDefender(raidId, userId, teamId) {
        try {
            const raid = await this.repository.findRaidById(raidId);
            if (!raid) {
                throw new Error(`Raid with ID ${raidId} not found`);
            }
            // Verify this is the defending team
            if (raid.defender.teamId !== teamId) {
                throw new Error(`User ${userId} team ${teamId} is not the defending team`);
            }
            // Check if user is already a participant
            const existingParticipant = raid.defender.members.find(m => m.userId === userId);
            if (existingParticipant) {
                return true; // Already joined
            }
            // Add user as defender
            const updatedDefenders = [...raid.defender.members, {
                    userId,
                    teamId,
                    role: "Defender",
                    joinTime: new Date(),
                    score: 0
                }];
            const result = await this.repository.findRaidById(raidId);
            if (!result) {
                return false;
            }
            return await this.addRaidFeedEntry(raidId, `User ${userId} joined as defender for team ${teamId}`, "DEFENDER_JOINED");
        }
        catch (error) {
            console.error(`Error joining raid ${raidId} as defender for user ${userId}:`, error);
            return false;
        }
    }
    /**
     * Start a scheduled raid
     */
    async startRaid(raidId) {
        try {
            const raid = await this.repository.findRaidById(raidId);
            if (!raid) {
                throw new Error(`Raid with ID ${raidId} not found`);
            }
            if (raid.status !== "Scheduled") {
                throw new Error(`Raid ${raidId} is not in Scheduled status`);
            }
            // Update raid status to InProgress
            await this.repository.updateRaidStatus(raidId, "InProgress");
            // Add feed entry
            return await this.addRaidFeedEntry(raidId, `Raid has started! Attackers: ${raid.attacker.members.length}, Defenders: ${raid.defender.members.length}`, "RAID_STARTED");
        }
        catch (error) {
            console.error(`Error starting raid ${raidId}:`, error);
            return false;
        }
    }
    /**
     * Complete a raid with results
     */
    async completeRaid(raidId, attackerScore, defenderScore, mvpUserId) {
        try {
            const raid = await this.repository.findRaidById(raidId);
            if (!raid) {
                throw new Error(`Raid with ID ${raidId} not found`);
            }
            if (raid.status !== "InProgress") {
                throw new Error(`Raid ${raidId} is not in InProgress status`);
            }
            // Determine winner
            const attackerWins = attackerScore > defenderScore;
            const winnerTeamId = attackerWins ? raid.attacker.teamId : raid.defender.teamId;
            // Create results
            const results = {
                winner: winnerTeamId,
                score: {
                    attacker: attackerScore,
                    defender: defenderScore
                },
                mvp: mvpUserId || "",
                highlights: [
                    `${attackerWins ? "Attackers" : "Defenders"} won with a score of ${attackerWins ? attackerScore : defenderScore} to ${attackerWins ? defenderScore : attackerScore}`
                ],
                zoneChanges: {}
            };
            // If it was a conquest raid and attackers won, transfer zone ownership
            if (raid.type === "CONQUEST" && attackerWins) {
                await this.repository.updateOwnership(raid.target.zoneId, raid.attacker.teamId);
                results.zoneChanges = {
                    ownershipTransferred: true,
                    previousOwner: raid.defender.teamId,
                    newOwner: raid.attacker.teamId
                };
            }
            // Update raid status to Completed with results
            await this.repository.updateRaidStatus(raidId, "Completed", results);
            // Add feed entry
            return await this.addRaidFeedEntry(raidId, `Raid completed! Winner: ${winnerTeamId}, Score: ${attackerScore}-${defenderScore}`, "RAID_COMPLETED");
        }
        catch (error) {
            console.error(`Error completing raid ${raidId}:`, error);
            return false;
        }
    }
    /**
     * Cancel a scheduled raid
     */
    async cancelRaid(raidId, reason) {
        try {
            const raid = await this.repository.findRaidById(raidId);
            if (!raid) {
                throw new Error(`Raid with ID ${raidId} not found`);
            }
            if (raid.status !== "Scheduled") {
                throw new Error(`Raid ${raidId} cannot be cancelled in ${raid.status} status`);
            }
            // Update raid status to Cancelled
            await this.repository.updateRaidStatus(raidId, "Cancelled");
            // Add feed entry
            return await this.addRaidFeedEntry(raidId, `Raid cancelled: ${reason}`, "RAID_CANCELLED");
        }
        catch (error) {
            console.error(`Error cancelling raid ${raidId}:`, error);
            return false;
        }
    }
    /**
     * Get active raids for a zone
     */
    async getActiveZoneRaids(zoneId) {
        try {
            return await this.repository.getActiveZoneRaids(zoneId);
        }
        catch (error) {
            console.error(`Error getting active raids for zone ${zoneId}:`, error);
            return [];
        }
    }
    /**
     * Get raids for a team
     */
    async getTeamRaids(teamId) {
        try {
            return await this.repository.getTeamRaids(teamId);
        }
        catch (error) {
            console.error(`Error getting raids for team ${teamId}:`, error);
            return [];
        }
    }
    /**
     * Add a feed entry to a raid
     */
    async addRaidFeedEntry(raidId, message, eventType) {
        try {
            return await this.repository.addRaidFeedEntry(raidId, message, eventType);
        }
        catch (error) {
            console.error(`Error adding feed entry to raid ${raidId}:`, error);
            return false;
        }
    }
    /**
     * Get zone rank requirements
     */
    getZoneRankRequirements(rank) {
        const requirements = {
            1: {
                minTeamMembers: 1,
                minTeamLevel: 1,
                minResources: 100,
                minPowerLevel: 5
            },
            2: {
                minTeamMembers: 3,
                minTeamLevel: 5,
                minResources: 500,
                minPowerLevel: 15
            },
            3: {
                minTeamMembers: 5,
                minTeamLevel: 10,
                minResources: 2000,
                minPowerLevel: 30
            },
            4: {
                minTeamMembers: 10,
                minTeamLevel: 20,
                minResources: 10000,
                minPowerLevel: 50
            }
        };
        return requirements[rank] || requirements[1];
    }
    // Helper method to generate mock zones for testing
    getMockZones() {
        const mockZone = {
            _id: "mock1",
            name: "Downtown Tech Hub",
            description: "A bustling technological center in the heart of the city",
            type: "COMMERCIAL",
            sector: {
                id: "sector-downtown",
                name: "Downtown",
                type: "Urban"
            },
            geometry: {
                type: "Point",
                coordinates: [[0, 0]],
                center: [0, 0]
            },
            rank: 2,
            ownership: {
                controlledBy: "team1",
                controlledSince: new Date(),
                previousOwners: []
            },
            properties: {
                capacity: 50,
                amenities: ["WiFi", "Coffee Shop", "Conference Rooms"],
                rating: 4.5,
                price: 150,
                availability: []
            },
            activity: {
                currentUsers: 12,
                popularTimes: {},
                events: []
            },
            resources: [
                {
                    type: "Data",
                    quantity: 500,
                    regenerationRate: 10,
                    lastUpdated: new Date()
                },
                {
                    type: "Energy",
                    quantity: 300,
                    regenerationRate: 5,
                    lastUpdated: new Date()
                }
            ],
            tech: {
                unlockedPowers: ["power1", "power2"],
                currentPhase: "Advanced",
                specialAbilities: ["Fast Travel", "Resource Boost"]
            },
            visuals: {
                theme: "High Tech",
                icon: "tech-icon.png",
                banner: "tech-banner.jpg"
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        return [mockZone];
    }
}
export default new ZoneService();
//# sourceMappingURL=ZoneService.js.map