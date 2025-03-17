/**
 * @file services/ExperienceService.ts
 * @description Service for managing experiences and instances
 */
import { ExperienceRepository } from '../database/repositories/ExperienceRepository';
import { nanoid } from 'nanoid';
export class ExperienceService {
    constructor() {
        this.repository = new ExperienceRepository();
        this.mockData = true;
    }
    static generateExperiencesForArea(center, radius, count) {
        const experiences = [];
        for (let i = 0; i < count; i++) {
            experiences.push({
                id: nanoid(),
                name: `Experience ${i + 1}`,
                description: "A test experience",
                type: "Quest",
                minPlayers: 1,
                maxPlayers: 4,
                phases: [
                    {
                        name: "Start",
                        description: "Beginning phase",
                        type: "introduction",
                        duration: 5
                    }
                ],
                estimatedDuration: 30,
                maximumDuration: 60,
                xpReward: 100,
                coinsReward: 50,
                wisdomReward: 10,
                courageReward: 10,
                temperanceReward: 10,
                justiceReward: 10,
                strengthReward: 10
            });
        }
        return experiences;
    }
    static checkExperienceQualification(experience, playerRank, playerPowers) {
        // Mock implementation
        return { qualified: true };
    }
    static createExperienceInstance(experienceId, zoneId) {
        return {
            id: nanoid(),
            experienceId,
            zoneId,
            status: 'Scheduled',
            participants: new Map(),
            currentPhase: 0,
            lastUpdateTime: Date.now(),
            addParticipant(playerId) {
                const data = {
                    joinedAt: Date.now(),
                    status: 'joined',
                    progress: 0
                };
                this.participants.set(playerId, data);
                return data;
            },
            removeParticipant(playerId) {
                return this.participants.delete(playerId);
            },
            start() {
                this.status = 'InProgress';
                this.startTime = Date.now();
            },
            complete() {
                this.status = 'Completed';
            },
            fail() {
                this.status = 'Failed';
            },
            addActivity(playerId, content) {
                // Mock implementation
            },
            advancePhase() {
                this.currentPhase++;
            }
        };
    }
}
//# sourceMappingURL=ExperienceService.js.map