/**
 * @file index.ts
 * @description Main entry point for Atlantis Go server
 */
import express from 'express';
import * as http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { WorldRoom } from './rooms/WorldRoom.js';
import { matchMaker } from '@colyseus/core';
// Environment configuration with defaults
const ENV = {
    PORT: Number(process.env.PORT || 3000),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MAX_PAYLOAD_SIZE: process.env.MAX_PAYLOAD_SIZE || '50mb',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
// Wrap the entire initialization in a try/catch to catch any initialization errors
try {
    // ES Module compatibility
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Get absolute path to the public directory - only go up one level from src
    const publicPath = path.resolve(__dirname, '../public');
    console.log('Public directory path:', publicPath);
    console.log('Environment:', ENV.NODE_ENV);
    // Create express app and server
    const app = express();
    // Enhanced security and performance middleware
    app.use(cors({
        origin: ENV.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json({ limit: ENV.MAX_PAYLOAD_SIZE }));
    app.use(express.urlencoded({ extended: true, limit: ENV.MAX_PAYLOAD_SIZE }));
    // Basic security headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
    // Serve static files from the public directory
    app.use(express.static(publicPath, {
        maxAge: ENV.NODE_ENV === 'production' ? '1d' : 0
    }));
    // Enhanced health check endpoint
    app.get('/health', (req, res) => {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: ENV.NODE_ENV
        };
        res.json(health);
    });
    // For debugging - list available routes (only in development)
    if (ENV.NODE_ENV === 'development') {
        app.get('/debug-routes', (req, res) => {
            const routes = [];
            app._router.stack.forEach(middleware => {
                if (middleware.route) {
                    routes.push({
                        path: middleware.route.path,
                        methods: Object.keys(middleware.route.methods)
                    });
                }
                else if (middleware.name === 'router') {
                    middleware.handle.stack.forEach(handler => {
                        if (handler.route) {
                            routes.push({
                                path: handler.route.path,
                                methods: Object.keys(handler.route.methods)
                            });
                        }
                    });
                }
            });
            res.json({ routes, publicPath });
        });
    }
    // Create Colyseus server with enhanced configuration
    const transport = new WebSocketTransport({
        server: http.createServer(app),
        pingInterval: 8000, // Check connection every 8 seconds
        pingMaxRetries: 3 // Allow 3 failed pings before disconnect
    });
    const gameServer = new Server({
        transport,
        presence: undefined // Will be configured when needed
    });
    // Register rooms
    gameServer.define('world', WorldRoom);
    // Add a simple status endpoint
    app.get('/status', async (req, res) => {
        const rooms = await matchMaker.query({});
        const connectedClients = rooms.reduce((acc, room) => acc + room.clients, 0);
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            serverTime: new Date().toISOString(),
            rooms: rooms.length,
            clients: connectedClients
        });
    });
    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: ENV.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    });
    // Redirect root to the world map client
    app.get('/', (req, res) => {
        res.redirect('/index.html');
    });
    // Start the server
    gameServer.listen(ENV.PORT).then(() => {
        console.log(`🎮 Atlantis Go server is running on http://localhost:${ENV.PORT}`);
        console.log(`🌐 WebSocket server is ready for clients`);
        console.log(`🗺️ World Map client available at http://localhost:${ENV.PORT}/index.html`);
    }).catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
    // Enhanced graceful shutdown
    const gracefulShutdown = async () => {
        console.log('Server is shutting down...');
        try {
            // Get all active rooms
            const rooms = await matchMaker.query({});
            // Notify all clients in all rooms
            for (const roomData of rooms) {
                const room = await matchMaker.getRoomById(roomData.roomId);
                if (room) {
                    room.clients.forEach((client) => {
                        client.send('shutdown', { message: 'Server is shutting down for maintenance' });
                    });
                }
            }
            // Wait for rooms to close
            await gameServer.gracefullyShutdown();
            console.log('Graceful shutdown complete');
            process.exit(0);
        }
        catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    };
    // Handle different termination signals
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
        console.error('Uncaught exception:', err);
        gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
}
catch (err) {
    console.error('CRITICAL INITIALIZATION ERROR:', err);
    process.exit(1);
}
//# sourceMappingURL=index.js.map