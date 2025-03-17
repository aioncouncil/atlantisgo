/**
 * @file repositories/ExperienceRepository.ts
 * @description Mock experience repository for development
 */

export interface ExperienceDocument {
  _id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  locationType: string;
  zoneId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceInstanceDocument {
  _id: string;
  experienceId: string;
  status: string;
  participants: string[];
  startedAt: Date;
  endedAt?: Date;
}

export interface ExperienceActivityDocument {
  _id: string;
  instanceId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export class ExperienceRepository {
  private experiences: Map<string, ExperienceDocument> = new Map();
  private instances: Map<string, ExperienceInstanceDocument> = new Map();
  private activities: Map<string, ExperienceActivityDocument> = new Map();

  async find(query: any): Promise<ExperienceDocument[]> {
    // Mock implementation that returns all experiences
    return Array.from(this.experiences.values());
  }

  async findById(id: string): Promise<ExperienceDocument | null> {
    return this.experiences.get(id) || null;
  }

  async create(data: Partial<ExperienceDocument>): Promise<ExperienceDocument> {
    const doc: ExperienceDocument = {
      _id: Math.random().toString(36).substring(7),
      name: data.name || "",
      description: data.description || "",
      type: data.type || "Quest",
      status: data.status || "Draft",
      locationType: data.locationType || "Zone",
      zoneId: data.zoneId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.experiences.set(doc._id, doc);
    return doc;
  }

  async update(id: string, data: Partial<ExperienceDocument>): Promise<boolean> {
    const doc = this.experiences.get(id);
    if (!doc) return false;

    Object.assign(doc, data, { updatedAt: new Date() });
    this.experiences.set(id, doc);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.experiences.delete(id);
  }
} 