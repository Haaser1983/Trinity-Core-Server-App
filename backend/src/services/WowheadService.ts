import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

export interface WowheadItem {
  id: number;
  name: string;
  quality: number;
  itemLevel: number;
  requiredLevel: number;
  itemClass: number;
  itemSubClass: number;
  inventoryType: number;
  icon: string;
  description?: string;
}

export interface WowheadNPC {
  id: number;
  name: string;
  level: number;
  health: number;
  type: number;
  loot?: number[];
  abilities?: Array<{ id: number; name: string }>;
}

export interface WowheadSpell {
  id: number;
  name: string;
  description: string;
  icon: string;
  castTime: number;
  cooldown: number;
  range: number;
}

export interface BossMechanics {
  name: string;
  phases: Array<{
    number: number;
    description: string;
    healthPercent: number;
  }>;
  abilities: Array<{
    id: number;
    name: string;
    description: string;
  }>;
  tips: string[];
}

export class WowheadService {
  private baseUrl = 'https://www.wowhead.com';
  private classicUrl = 'https://classic.wowhead.com';
  private cacheDir: string;
  private cacheTTL: number;
  private memoryCache = new Map<string, any>();

  constructor() {
    this.cacheDir = process.env.WOWHEAD_CACHE_DIR || './cache/wowhead';
    this.cacheTTL = Number(process.env.WOWHEAD_CACHE_TTL_HOURS || 24) * 60 * 60 * 1000;
    this.ensureCacheDir();
  }

  private async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory exists
    }
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached && Date.now() - memCached.timestamp < this.cacheTTL) {
      return memCached.data as T;
    }

    // Check file cache
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const cached = JSON.parse(data);
      
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        this.memoryCache.set(key, cached);
        return cached.data as T;
      }
    } catch (error) {
      // Cache miss
    }

    return null;
  }

  private async setCache(key: string, data: any): Promise<void> {
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };

    this.memoryCache.set(key, cacheEntry);

    const filePath = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2));
  }

  /**
   * Fetch item data from WoWHead
   */
  async getItem(itemId: number, expansion: 'retail' | 'classic' = 'retail'): Promise<WowheadItem | null> {
    const cacheKey = `item_${expansion}_${itemId}`;
    
    const cached = await this.getFromCache<WowheadItem>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const baseUrl = expansion === 'classic' ? this.classicUrl : this.baseUrl;
      const url = `${baseUrl}/item=${itemId}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract item data from page scripts
      const scriptData = this.extractItemData($, itemId);
      
      if (scriptData) {
        await this.setCache(cacheKey, scriptData);
        return scriptData;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Search for items by name
   */
  async searchItems(query: string): Promise<WowheadItem[]> {
    try {
      const searchUrl = `${this.baseUrl}/items?filter-name=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const items: WowheadItem[] = [];

      // Extract item IDs from search results
      $('script').each((_, elem) => {
        const script = $(elem).html();
        if (script && script.includes('new Listview')) {
          const match = script.match(/data:\s*(\[[\s\S]*?\])/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              data.slice(0, 20).forEach((item: any) => {
                items.push({
                  id: item.id,
                  name: item.name || '',
                  quality: item.quality || 1,
                  itemLevel: item.level || 0,
                  requiredLevel: item.reqlevel || 0,
                  itemClass: item.classs || 0,
                  itemSubClass: item.subclass || 0,
                  inventoryType: item.slot || 0,
                  icon: item.icon || ''
                });
              });
            } catch (e) {
              // Parse error
            }
          }
        }
      });

      return items;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Get NPC data
   */
  async getNPC(npcId: number): Promise<WowheadNPC | null> {
    const cacheKey = `npc_${npcId}`;
    
    const cached = await this.getFromCache<WowheadNPC>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/npc=${npcId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const scriptData = this.extractNPCData($, npcId);

      if (scriptData) {
        await this.setCache(cacheKey, scriptData);
        return scriptData;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch NPC ${npcId}:`, error);
      return null;
    }
  }

  /**
   * Get spell data
   */
  async getSpell(spellId: number): Promise<WowheadSpell | null> {
    const cacheKey = `spell_${spellId}`;
    
    const cached = await this.getFromCache<WowheadSpell>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/spell=${spellId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const spell = this.extractSpellData($, spellId);

      if (spell) {
        await this.setCache(cacheKey, spell);
        return spell;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch spell ${spellId}:`, error);
      return null;
    }
  }

  private extractItemData($: cheerio.CheerioAPI, itemId: number): WowheadItem | null {
    try {
      let data: any = {};

      $('script').each((_, elem) => {
        const script = $(elem).html();
        if (script && script.includes('WH.setPageData')) {
          try {
            const match = script.match(/WH\.setPageData\(([\s\S]*?)\);/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              Object.assign(data, parsed);
            }
          } catch (e) {
            // Parse error
          }
        }
      });

      if (data.name) {
        return {
          id: itemId,
          name: data.name || '',
          quality: data.quality || 1,
          itemLevel: data.level || 0,
          requiredLevel: data.reqlevel || 0,
          itemClass: data.classs || 0,
          itemSubClass: data.subclass || 0,
          inventoryType: data.slot || 0,
          icon: data.icon || ''
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private extractNPCData($: cheerio.CheerioAPI, npcId: number): WowheadNPC | null {
    try {
      let data: any = {};

      $('script').each((_, elem) => {
        const script = $(elem).html();
        if (script && script.includes('WH.setPageData')) {
          try {
            const match = script.match(/WH\.setPageData\(([\s\S]*?)\);/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              Object.assign(data, parsed);
            }
          } catch (e) {
            // Parse error
          }
        }
      });

      if (data.name) {
        return {
          id: npcId,
          name: data.name || '',
          level: data.level || 0,
          health: data.health || 0,
          type: data.type || 0
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private extractSpellData($: cheerio.CheerioAPI, spellId: number): WowheadSpell | null {
    try {
      const name = $('h1.heading-size-1').text().trim();
      const description = $('.q2').text().trim();

      return {
        id: spellId,
        name: name || `Spell ${spellId}`,
        description: description || '',
        icon: '',
        castTime: 0,
        cooldown: 0,
        range: 0
      };
    } catch (error) {
      return null;
    }
  }
}

export default new WowheadService();
