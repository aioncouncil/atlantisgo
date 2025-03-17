/**
 * @file index.ts
 * @description Main entry point for Atlantis Go server
 */

import express from 'express';
import * as http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Client } from '@colyseus/core';
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

// Define route type
interface Route {
  path: string;
  methods: string[];
}

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
  const server = http.createServer(app);
  
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

  // Debug middleware to log all requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Routes for test-powers page
  app.get('/test-powers', (req, res) => {
    console.log('Test powers page requested');
    res.sendFile(path.join(publicPath, 'test-powers.html'));
  });

  app.get('/test-powers.html', (req, res) => {
    console.log('Test powers page requested (with .html)');
    res.sendFile(path.join(publicPath, 'test-powers.html'));
  });

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
      const routes: Route[] = [];
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
          });
        } else if (middleware.name === 'router') {
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
    server, // Use the same HTTP server
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
    const rooms = await matchMaker.query({ });
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
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  server.listen(ENV.PORT, () => {
    console.log(`🎮 Atlantis Go server is running on http://localhost:${ENV.PORT}`);
    console.log(`🌐 WebSocket server is ready for clients`);
    console.log(`🗺️ World Map client available at http://localhost:${ENV.PORT}/index.html`);
  });

  // Enhanced graceful shutdown
  const gracefulShutdown = async () => {
    console.log('Received shutdown signal. Starting graceful shutdown...');
    
    try {
      // Disconnect all clients
      const rooms = await matchMaker.query({});
      for (const room of rooms) {
        const instance = await matchMaker.getRoomById(room.roomId);
        if (instance) {
          instance.disconnect();
        }
      }
      
      // Close the server
      server.close(() => {
        console.log('Server closed successfully');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
      
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

} catch (error) {
  console.error('Fatal error during server initialization:', error);
  process.exit(1);
} 