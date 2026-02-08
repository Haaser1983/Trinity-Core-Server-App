import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import wowheadRoutes from './routes/wowhead';
import generatorRoutes from './routes/generator';
import itemRoutes from './routes/items';
import playerRoutes from './routes/players';
import serverRoutes from './routes/server';

// Import database
import { testConnection } from './services/database';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Logging

// Routes
app.use('/api/wowhead', wowheadRoutes);
app.use('/api/generate', generatorRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/server', serverRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    name: 'TrinityCore Companion App API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      wowhead: '/api/wowhead',
      generator: '/api/generate',
      items: '/api/items',
      players: '/api/players',
      server: '/api/server'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await testConnection();
    console.log('✅ Database connection successful!');

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║   TrinityCore Companion App - Backend Server         ║
║   ───────────────────────────────────────────────    ║
║   🚀 Server running on http://localhost:${PORT}      ║
║   📊 Environment: ${process.env.NODE_ENV}                        ║
║   🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}                  ║
║   ⏰ Started: ${new Date().toLocaleString()}            ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
