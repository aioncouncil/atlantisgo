import { Schema, type, ArraySchema, MapSchema } from '@colyseus/schema';
import { Position } from './index.js';
import { nanoid } from 'nanoid';

/**
 * A phase within an experience
 */
export class ExperiencePhase extends Schema {
  @type("string") id: string;
  @type("string") type: string;
  @type("string") prompt: string;
  @type("number") timeLimit: number = 300; // 5 minutes default
  @type("boolean") completed: boolean = false;
  @type("string") submission: string = "";

  constructor(id: string, type: string, prompt: string) {
    super();
    this.id = id;
    this.type = type;
    this.prompt = prompt;
  }
}

/**
 * Represents an experience template that can be instantiated
 */
export class Experience extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") description: string = "";
  @type("string") type: string;
  @type("string") difficulty: string;
  @type("number") minLevel: number = 1;
  @type("number") maxParticipants: number = 1;
  @type(Position) position = new Position(0, 0);
  @type("number") radius: number = 50;
  @type("number") spawnTime: number = Date.now();
  @type("number") despawnTime: number = Date.now() + 86400000; // 24 hours default
  @type("boolean") isActive: boolean = true;

  constructor(id: string, name: string, type: string, difficulty: string) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.difficulty = difficulty;
  }

  createInstance(playerId: string): ExperienceInstance {
    const instanceId = `${this.id}_${playerId}_${Date.now()}`;
    return new ExperienceInstance(instanceId, this.id, playerId);
  }
}

/**
 * Represents a participant in an experience instance
 */
export class ExperienceParticipant extends Schema {
  @type("string") userId: string;
  @type("string") role: string = "Participant";
  @type("string") status: string = "Active"; // "Active", "Completed", "Failed"
  @type("number") joinTime: number = Date.now();
  @type("number") completeTime: number = 0;
  
  constructor(userId: string, role: string = "Participant") {
    super();
    this.userId = userId;
    this.role = role;
  }
  
  complete(): void {
    this.status = "Completed";
    this.completeTime = Date.now();
  }
  
  fail(): void {
    this.status = "Failed";
    this.completeTime = Date.now();
  }
}

/**
 * Represents an activity submission within an experience
 */
export class ExperienceActivity extends Schema {
  @type("string") id: string;
  @type("string") userId: string;
  @type("string") content: string = "";
  @type("number") timestamp: number = Date.now();
  @type("boolean") verified: boolean = false;
  
  constructor(userId: string, content: string) {
    super();
    this.id = nanoid();
    this.userId = userId;
    this.content = content;
  }
  
  verify(): void {
    this.verified = true;
  }
}

/**
 * Represents an active instance of an experience
 */
export class ExperienceInstance extends Schema {
  @type("string") id: string;
  @type("string") experienceId: string;
  @type("string") playerId: string;
  @type("number") startTime: number = Date.now();
  @type("number") endTime: number = 0;
  @type("boolean") completed: boolean = false;
  @type("number") currentPhase: number = 0;
  @type({ array: ExperiencePhase }) phases = new ArraySchema<ExperiencePhase>();

  constructor(id: string, experienceId: string, playerId: string) {
    super();
    this.id = id;
    this.experienceId = experienceId;
    this.playerId = playerId;
  }

  addPhase(phase: ExperiencePhase) {
    this.phases.push(phase);
  }

  completePhase(submission: any) {
    if (this.currentPhase < this.phases.length) {
      this.phases[this.currentPhase].completed = true;
      this.phases[this.currentPhase].submission = submission;
      this.currentPhase++;

      if (this.currentPhase >= this.phases.length) {
        this.completed = true;
        this.endTime = Date.now();
      }
    }
  }
} 