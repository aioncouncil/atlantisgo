var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Schema, type, ArraySchema } from '@colyseus/schema';
import { Position } from './index.js';
import { nanoid } from 'nanoid';
/**
 * A phase within an experience
 */
export class ExperiencePhase extends Schema {
    constructor(id, type, prompt) {
        super();
        this.timeLimit = 300; // 5 minutes default
        this.completed = false;
        this.submission = "";
        this.id = id;
        this.type = type;
        this.prompt = prompt;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperiencePhase.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperiencePhase.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperiencePhase.prototype, "prompt", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperiencePhase.prototype, "timeLimit", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], ExperiencePhase.prototype, "completed", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperiencePhase.prototype, "submission", void 0);
/**
 * Represents an experience template that can be instantiated
 */
export class Experience extends Schema {
    constructor(id, name, type, difficulty) {
        super();
        this.description = "";
        this.minLevel = 1;
        this.maxParticipants = 1;
        this.position = new Position(0, 0);
        this.radius = 50;
        this.spawnTime = Date.now();
        this.despawnTime = Date.now() + 86400000; // 24 hours default
        this.isActive = true;
        this.id = id;
        this.name = name;
        this.type = type;
        this.difficulty = difficulty;
    }
    createInstance(playerId) {
        const instanceId = `${this.id}_${playerId}_${Date.now()}`;
        return new ExperienceInstance(instanceId, this.id, playerId);
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], Experience.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Experience.prototype, "name", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Experience.prototype, "description", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Experience.prototype, "type", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], Experience.prototype, "difficulty", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Experience.prototype, "minLevel", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Experience.prototype, "maxParticipants", void 0);
__decorate([
    type(Position),
    __metadata("design:type", Object)
], Experience.prototype, "position", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Experience.prototype, "radius", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Experience.prototype, "spawnTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], Experience.prototype, "despawnTime", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], Experience.prototype, "isActive", void 0);
/**
 * Represents a participant in an experience instance
 */
export class ExperienceParticipant extends Schema {
    constructor(userId, role = "Participant") {
        super();
        this.role = "Participant";
        this.status = "Active"; // "Active", "Completed", "Failed"
        this.joinTime = Date.now();
        this.completeTime = 0;
        this.userId = userId;
        this.role = role;
    }
    complete() {
        this.status = "Completed";
        this.completeTime = Date.now();
    }
    fail() {
        this.status = "Failed";
        this.completeTime = Date.now();
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceParticipant.prototype, "userId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceParticipant.prototype, "role", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceParticipant.prototype, "status", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceParticipant.prototype, "joinTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceParticipant.prototype, "completeTime", void 0);
/**
 * Represents an activity submission within an experience
 */
export class ExperienceActivity extends Schema {
    constructor(userId, content) {
        super();
        this.content = "";
        this.timestamp = Date.now();
        this.verified = false;
        this.id = nanoid();
        this.userId = userId;
        this.content = content;
    }
    verify() {
        this.verified = true;
    }
}
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceActivity.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceActivity.prototype, "userId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceActivity.prototype, "content", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceActivity.prototype, "timestamp", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], ExperienceActivity.prototype, "verified", void 0);
/**
 * Represents an active instance of an experience
 */
export class ExperienceInstance extends Schema {
    constructor(id, experienceId, playerId) {
        super();
        this.startTime = Date.now();
        this.endTime = 0;
        this.completed = false;
        this.currentPhase = 0;
        this.phases = new ArraySchema();
        this.id = id;
        this.experienceId = experienceId;
        this.playerId = playerId;
    }
    addPhase(phase) {
        this.phases.push(phase);
    }
    completePhase(submission) {
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
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceInstance.prototype, "id", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceInstance.prototype, "experienceId", void 0);
__decorate([
    type("string"),
    __metadata("design:type", String)
], ExperienceInstance.prototype, "playerId", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceInstance.prototype, "startTime", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceInstance.prototype, "endTime", void 0);
__decorate([
    type("boolean"),
    __metadata("design:type", Boolean)
], ExperienceInstance.prototype, "completed", void 0);
__decorate([
    type("number"),
    __metadata("design:type", Number)
], ExperienceInstance.prototype, "currentPhase", void 0);
__decorate([
    type({ array: ExperiencePhase }),
    __metadata("design:type", Object)
], ExperienceInstance.prototype, "phases", void 0);
//# sourceMappingURL=ExperienceSchema.js.map