import express, { Request, Response } from 'express';
import wowheadService from '../services/WowheadService';

const router = express.Router();

// Get item by ID
router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const expansion = (req.query.expansion as 'retail' | 'classic') || 'retail';
    
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    
    const item = await wowheadService.getItem(itemId, expansion);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error: any) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item', message: error.message });
  }
});

// Search items
router.get('/items/search/:query', async (req: Request, res: Response) => {
  try {
    const query = req.params.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    
    const items = await wowheadService.searchItems(query);
    
    res.json({ 
      items, 
      count: items.length,
      query 
    });
  } catch (error: any) {
    console.error('Error searching items:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// Get NPC by ID
router.get('/npcs/:id', async (req: Request, res: Response) => {
  try {
    const npcId = parseInt(req.params.id);
    
    if (isNaN(npcId)) {
      return res.status(400).json({ error: 'Invalid NPC ID' });
    }
    
    const npc = await wowheadService.getNPC(npcId);
    
    if (!npc) {
      return res.status(404).json({ error: 'NPC not found' });
    }
    
    res.json(npc);
  } catch (error: any) {
    console.error('Error fetching NPC:', error);
    res.status(500).json({ error: 'Failed to fetch NPC', message: error.message });
  }
});

// Get spell by ID
router.get('/spells/:id', async (req: Request, res: Response) => {
  try {
    const spellId = parseInt(req.params.id);
    
    if (isNaN(spellId)) {
      return res.status(400).json({ error: 'Invalid spell ID' });
    }
    
    const spell = await wowheadService.getSpell(spellId);
    
    if (!spell) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    
    res.json(spell);
  } catch (error: any) {
    console.error('Error fetching spell:', error);
    res.status(500).json({ error: 'Failed to fetch spell', message: error.message });
  }
});

export default router;
