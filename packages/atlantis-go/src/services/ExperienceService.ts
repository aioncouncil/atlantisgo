/**
 * @file services/ExperienceService.ts
 * @description Service for managing experiences and instances
 */

import { ExperienceRepository } from '../database/repositories/ExperienceRepository.js';
import { Position } from '../schemas/BaseSchema.js';
import { nanoid } from 'nanoid';

export interface Experience {
  id: string;
  name: string;
  description: string;
  type: string;
  minPlayers: number;
  maxPlayers: number;
  phases: Phase[];
  estimatedDuration: number;
  maximumDuration: number;
  xpReward: number;
  coinsReward: number;
  wisdomReward: number;
  courageReward: number;
  temperanceReward: number;
  justiceReward: number;
  strengthReward: number;
}

export interface Phase {
  name: string;
  description: string;
  type: string;
  duration: number;
}

export interface ExperienceInstance {
  id: string;
  experienceId: string;
  zoneId: string | null;
  status: 'Scheduled' | 'InProgress' | 'Completed' | 'Failed';
  participants: Map<string, ParticipantData>;
  currentPhase: number;
  startTime?: number;
  estimatedCompletionTime?: number;
  lastUpdateTime: number;

  addParticipant(playerId: string): ParticipantData;
  removeParticipant(playerId: string): boolean;
  start(): void;
  complete(): void;
  fail(): void;
  addActivity(playerId: string, content: string): void;
  advancePhase(): void;
}

interface ParticipantData {
  joinedAt: number;
  status: string;
  progress: number;
}

export class ExperienceService {
  private repository: ExperienceRepository;
  private mockData: boolean;

  constructor() {
    this.repository = new ExperienceRepository();
    this.mockData = true;
  }

  static generateExperiencesForArea(center: Position, radius: number, count: number): Experience[] {
    const experiences: Experience[] = [];
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

  static checkExperienceQualification(experience: Experience, playerRank: number, playerPowers: string[]): { qualified: boolean; reason?: string } {
    // Mock implementation
    return { qualified: true };
  }

  static createExperienceInstance(experienceId: string, zoneId: string | null): ExperienceInstance {
    return {
      id: nanoid(),
      experienceId,
      zoneId,
      status: 'Scheduled',
      participants: new Map(),
      currentPhase: 0,
      lastUpdateTime: Date.now(),

      addParticipant(playerId: string): ParticipantData {
        const data = {
          joinedAt: Date.now(),
          status: 'joined',
          progress: 0
        };
        this.participants.set(playerId, data);
        return data;
      },

      removeParticipant(playerId: string): boolean {
        return this.participants.delete(playerId);
      },

      start(): void {
        this.status = 'InProgress';
        this.startTime = Date.now();
      },

      complete(): void {
        this.status = 'Completed';
      },

      fail(): void {
        this.status = 'Failed';
      },

      addActivity(playerId: string, content: string): void {
        // Mock implementation
      },

      advancePhase(): void {
        this.currentPhase++;
      }
    };
  }

  async getExperienceById(id: string): Promise<Experience | null> {
    try {
      if (this.mockData) {
        // Return a mock experience for testing
        return {
          id,
          name: `Experience ${id}`,
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
        };
      }

      // In a real implementation, this would fetch from the repository
      const doc = await this.repository.findById(id);
      if (!doc) return null;

      // Convert repository document to Experience type with default values
      return {
        id: doc._id,
        name: doc.name,
        description: doc.description,
        type: doc.type,
        minPlayers: 1, // Default values since these aren't in ExperienceDocument
        maxPlayers: 4,
        phases: [], // Default empty phases
        estimatedDuration: 30,
        maximumDuration: 60,
        xpReward: 100,
        coinsReward: 50,
        wisdomReward: 10,
        courageReward: 10,
        temperanceReward: 10,
        justiceReward: 10,
        strengthReward: 10
      };
    } catch (error) {
      console.error(`Error getting experience by ID ${id}:`, error);
      return null;
    }
  }
}

// Export the service as both default and named export
export default ExperienceService; 