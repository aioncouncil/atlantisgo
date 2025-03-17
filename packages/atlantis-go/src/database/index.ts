/**
 * @file database/index.ts
 * @description Mock database service for development
 */

export interface DatabaseConnection {
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

class MockDatabase implements DatabaseConnection {
  private _isConnected: boolean = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    this._isConnected = true;
    console.log("Connected to mock database");
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log("Disconnected from mock database");
  }
}

let database: DatabaseConnection | null = null;

export async function connectDatabase(): Promise<void> {
  if (!database) {
    database = new MockDatabase();
  }
  await database.connect();
}

export async function disconnectDatabase(): Promise<void> {
  if (database) {
    await database.disconnect();
  }
}

export function getDatabase(): DatabaseConnection | null {
  return database;
}

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  getDatabase
}; 