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

export interface WowheadSearchResponse {
  items: WowheadItem[];
  count: number;
  query: string;
}
