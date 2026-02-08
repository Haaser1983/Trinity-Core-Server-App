import express, { Request, Response } from 'express';
import { query } from '../services/database';

const router = express.Router();

// Get server status
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get online player count
    const [onlineResult] = await query<any[]>(
      'characters',
      'SELECT COUNT(*) as count FROM characters WHERE online = 1'
    );
    
    res.json({
      online: true,
      uptime: process.uptime(),
      playersOnline: onlineResult.count,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      online: false,
      error: 'Failed to get server status', 
      message: error.message 
    });
  }
});

// Get server metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const [itemCount] = await query<any[]>(
      'world',
      'SELECT COUNT(*) as count FROM item_template'
    );
    
    const [characterCount] = await query<any[]>(
      'characters',
      'SELECT COUNT(*) as count FROM characters'
    );
    
    const [onlineCount] = await query<any[]>(
      'characters',
      'SELECT COUNT(*) as count FROM characters WHERE online = 1'
    );
    
    res.json({
      database: {
        items: itemCount.count,
        characters: characterCount.count,
        online: onlineCount.count
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get metrics', message: error.message });
  }
});

export default router;
