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

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get absolute path to the public directory - only go up one level from src
const publicPath = path.resolve(__dirname, '../public');

console.log('Public directory path:', publicPath);

// Create express app and server
const app = express();
const port = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(publicPath));

// For debugging - list available routes
app.get('/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push(middleware.route.path);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push(handler.route.path);
        }
      });
    }
  });
  res.json({ routes, publicPath });
});

// Create Colyseus server
const transport = new WebSocketTransport({
  server: http.createServer(app)
});
const gameServer = new Server({
  transport
});

// Register rooms
gameServer.define('world', WorldRoom);

// Add a simple status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    serverTime: new Date().toISOString()
  });
});

// Redirect root to the world map client
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Start the server
gameServer.listen(port).then(() => {
  console.log(`🎮 Atlantis Go server is running on http://localhost:${port}`);
  console.log(`🌐 WebSocket server is ready for clients`);
  console.log(`🗺️ World Map client available at http://localhost:${port}/index.html`);
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server is shutting down...');
  gameServer.gracefullyShutdown().then(() => {
    console.log('Graceful shutdown complete');
    process.exit(0);
  }).catch(err => {
    console.error('Error during shutdown:', err);
    process.exit(1);
  });
}); 