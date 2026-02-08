import express, { Request, Response } from 'express';
import { query } from '../services/database';

const router = express.Router();

// Get online players
router.get('/online', async (req: Request, res: Response) => {
  try {
    const players = await query<any[]>(
      'characters',
      'SELECT guid, name, race, class, gender, level, zone, online FROM characters WHERE online = 1'
    );
    
    res.json({
      count: players.length,
      players
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch players', message: error.message });
  }
});

// Get all players with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    const players = await query<any[]>(
      'characters',
      'SELECT guid, name, race, class, gender, level, totaltime, online FROM characters ORDER BY level DESC, guid DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    const [countResult] = await query<any[]>(
      'characters',
      'SELECT COUNT(*) as total FROM characters'
    );
    
    res.json({
      players,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch players', message: error.message });
  }
});

// Get player by GUID
router.get('/:guid', async (req: Request, res: Response) => {
  try {
    const guid = parseInt(req.params.guid);
    const players = await query<any[]>(
      'characters',
      'SELECT * FROM characters WHERE guid = ?',
      [guid]
    );
    
    if (players.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(players[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch player', message: error.message });
  }
});

export default router;
