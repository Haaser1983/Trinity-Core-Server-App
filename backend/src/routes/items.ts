import express, { Request, Response } from 'express';
import { query } from '../services/database';

const router = express.Router();

// Get all items with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    const items = await query(
      'world',
      'SELECT entry, class, name, Quality, ItemLevel, RequiredLevel FROM item_template ORDER BY entry LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    const [countResult] = await query<any[]>(
      'world',
      'SELECT COUNT(*) as total FROM item_template'
    );
    
    res.json({
      items,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch items', message: error.message });
  }
});

// Get item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const items = await query<any[]>(
      'world',
      'SELECT * FROM item_template WHERE entry = ?',
      [itemId]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(items[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch item', message: error.message });
  }
});

export default router;
