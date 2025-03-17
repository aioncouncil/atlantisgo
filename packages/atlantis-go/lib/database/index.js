/**
 * @file database/index.ts
 * @description Mock database service for development
 */
class MockDatabase {
    constructor() {
        this._isConnected = false;
    }
    get isConnected() {
        return this._isConnected;
    }
    async connect() {
        this._isConnected = true;
        console.log("Connected to mock database");
    }
    async disconnect() {
        this._isConnected = false;
        console.log("Disconnected from mock database");
    }
}
let database = null;
export async function connectDatabase() {
    if (!database) {
        database = new MockDatabase();
    }
    await database.connect();
}
export async function disconnectDatabase() {
    if (database) {
        await database.disconnect();
    }
}
export function getDatabase() {
    return database;
}
export default {
    connect: connectDatabase,
    disconnect: disconnectDatabase,
    getDatabase
};
//# sourceMappingURL=index.js.map