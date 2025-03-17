/**
 * @file repositories/ExperienceRepository.ts
 * @description Mock experience repository for development
 */
export class ExperienceRepository {
    constructor() {
        this.experiences = new Map();
        this.instances = new Map();
        this.activities = new Map();
    }
    async find(query) {
        // Mock implementation that returns all experiences
        return Array.from(this.experiences.values());
    }
    async findById(id) {
        return this.experiences.get(id) || null;
    }
    async create(data) {
        const doc = {
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
    async update(id, data) {
        const doc = this.experiences.get(id);
        if (!doc)
            return false;
        Object.assign(doc, data, { updatedAt: new Date() });
        this.experiences.set(id, doc);
        return true;
    }
    async delete(id) {
        return this.experiences.delete(id);
    }
}
//# sourceMappingURL=ExperienceRepository.js.map