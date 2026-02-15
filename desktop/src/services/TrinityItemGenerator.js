/**
 * TrinityCore Item SQL Generator
 * Converts WoWHead item data to TrinityCore SQL
 */

class TrinityItemGenerator {
  constructor() {
    // Item class mappings
    this.itemClasses = {
      0: 'Consumable',
      2: 'Weapon',
      4: 'Armor',
      15: 'Miscellaneous',
      16: 'Glyph'
    };

    // Item subclass mappings (weapons)
    this.weaponSubclasses = {
      0: 'Axe (1H)', 1: 'Axe (2H)', 2: 'Bow', 3: 'Gun',
      4: 'Mace (1H)', 5: 'Mace (2H)', 6: 'Polearm', 7: 'Sword (1H)',
      8: 'Sword (2H)', 10: 'Staff', 13: 'Fist Weapon', 15: 'Dagger',
      18: 'Crossbow', 19: 'Wand', 20: 'Fishing Pole'
    };

    // Armor subclasses
    this.armorSubclasses = {
      0: 'Miscellaneous', 1: 'Cloth', 2: 'Leather', 3: 'Mail',
      4: 'Plate', 6: 'Shield', 11: 'Relic'
    };

    // Quality names
    this.qualities = {
      0: 'Poor', 1: 'Common', 2: 'Uncommon', 3: 'Rare',
      4: 'Epic', 5: 'Legendary', 6: 'Artifact', 7: 'Heirloom'
    };

    // Inventory types (slots)
    this.inventoryTypes = {
      0: 'Non-equippable',
      1: 'Head', 2: 'Neck', 3: 'Shoulder', 4: 'Shirt', 5: 'Chest',
      6: 'Waist', 7: 'Legs', 8: 'Feet', 9: 'Wrist', 10: 'Hands',
      11: 'Finger', 12: 'Trinket', 13: 'One-Hand', 14: 'Off-Hand',
      15: 'Ranged', 16: 'Back', 17: 'Two-Hand', 18: 'Bag',
      20: 'Robe', 21: 'Main-Hand', 22: 'Off-Hand', 23: 'Held in Off-Hand',
      25: 'Thrown', 26: 'Ranged Right', 28: 'Relic'
    };

    // Stat types
    this.statTypes = {
      3: 'AGILITY',
      4: 'STRENGTH', 
      5: 'INTELLECT',
      6: 'SPIRIT',
      7: 'STAMINA',
      12: 'DEFENSE_SKILL_RATING',
      13: 'DODGE_RATING',
      14: 'PARRY_RATING',
      15: 'BLOCK_RATING',
      16: 'HIT_MELEE_RATING',
      17: 'HIT_RANGED_RATING',
      18: 'HIT_SPELL_RATING',
      19: 'CRIT_MELEE_RATING',
      20: 'CRIT_RANGED_RATING',
      21: 'CRIT_SPELL_RATING',
      28: 'HASTE_MELEE_RATING',
      29: 'HASTE_RANGED_RATING',
      30: 'HASTE_SPELL_RATING',
      31: 'HIT_RATING',
      32: 'CRIT_RATING',
      35: 'RESILIENCE_RATING',
      36: 'HASTE_RATING',
      37: 'EXPERTISE_RATING',
      38: 'ATTACK_POWER',
      45: 'SPELL_POWER',
      47: 'SPELL_PENETRATION',
      49: 'MASTERY_RATING'
    };
  }

  /**
   * Generate complete SQL INSERT statement for item
   */
  generateItemSQL(wowheadItem, customEntry = null) {
    const entry = customEntry || this.generateEntryId();
    
    const sql = `-- ${wowheadItem.name} (WoWHead ID: ${wowheadItem.id})
INSERT INTO \`item_template\` (
  \`entry\`, \`class\`, \`subclass\`, \`SoundOverrideSubclass\`, \`name\`,
  \`displayid\`, \`Quality\`, \`Flags\`, \`FlagsExtra\`, \`BuyCount\`,
  \`BuyPrice\`, \`SellPrice\`, \`InventoryType\`, \`AllowableClass\`,
  \`AllowableRace\`, \`ItemLevel\`, \`RequiredLevel\`, \`RequiredSkill\`,
  \`RequiredSkillRank\`, \`requiredspell\`, \`requiredhonorrank\`,
  \`RequiredCityRank\`, \`RequiredReputationFaction\`, \`RequiredReputationRank\`,
  \`maxcount\`, \`stackable\`, \`ContainerSlots\`, \`StatsCount\`,
  \`stat_type1\`, \`stat_value1\`, \`stat_type2\`, \`stat_value2\`,
  \`stat_type3\`, \`stat_value3\`, \`stat_type4\`, \`stat_value4\`,
  \`stat_type5\`, \`stat_value5\`, \`stat_type6\`, \`stat_value6\`,
  \`stat_type7\`, \`stat_value7\`, \`stat_type8\`, \`stat_value8\`,
  \`stat_type9\`, \`stat_value9\`, \`stat_type10\`, \`stat_value10\`,
  \`ScalingStatDistribution\`, \`ScalingStatValue\`, \`dmg_min1\`, \`dmg_max1\`,
  \`dmg_type1\`, \`dmg_min2\`, \`dmg_max2\`, \`dmg_type2\`, \`armor\`,
  \`holy_res\`, \`fire_res\`, \`nature_res\`, \`frost_res\`, \`shadow_res\`,
  \`arcane_res\`, \`delay\`, \`ammo_type\`, \`RangedModRange\`,
  \`spellid_1\`, \`spelltrigger_1\`, \`spellcharges_1\`, \`spellppmRate_1\`,
  \`spellcooldown_1\`, \`spellcategory_1\`, \`spellcategorycooldown_1\`,
  \`spellid_2\`, \`spelltrigger_2\`, \`spellcharges_2\`, \`spellppmRate_2\`,
  \`spellcooldown_2\`, \`spellcategory_2\`, \`spellcategorycooldown_2\`,
  \`spellid_3\`, \`spelltrigger_3\`, \`spellcharges_3\`, \`spellppmRate_3\`,
  \`spellcooldown_3\`, \`spellcategory_3\`, \`spellcategorycooldown_3\`,
  \`spellid_4\`, \`spelltrigger_4\`, \`spellcharges_4\`, \`spellppmRate_4\`,
  \`spellcooldown_4\`, \`spellcategory_4\`, \`spellcategorycooldown_4\`,
  \`spellid_5\`, \`spelltrigger_5\`, \`spellcharges_5\`, \`spellppmRate_5\`,
  \`spellcooldown_5\`, \`spellcategory_5\`, \`spellcategorycooldown_5\`,
  \`bonding\`, \`description\`, \`PageText\`, \`LanguageID\`, \`PageMaterial\`,
  \`startquest\`, \`lockid\`, \`Material\`, \`sheath\`, \`RandomProperty\`,
  \`RandomSuffix\`, \`block\`, \`itemset\`, \`MaxDurability\`, \`area\`,
  \`Map\`, \`BagFamily\`, \`TotemCategory\`, \`socketColor_1\`, \`socketContent_1\`,
  \`socketColor_2\`, \`socketContent_2\`, \`socketColor_3\`, \`socketContent_3\`,
  \`socketBonus\`, \`GemProperties\`, \`RequiredDisenchantSkill\`, \`ArmorDamageModifier\`,
  \`duration\`, \`ItemLimitCategory\`, \`HolidayId\`, \`ScriptName\`,
  \`DisenchantID\`, \`FoodType\`, \`minMoneyLoot\`, \`maxMoneyLoot\`,
  \`flagsCustom\`, \`VerifiedBuild\`
) VALUES (
  ${entry}, -- entry
  ${wowheadItem.itemClass || 0}, -- class
  ${wowheadItem.itemSubClass || 0}, -- subclass
  -1, -- SoundOverrideSubclass
  '${this.escapeSQLString(wowheadItem.name)}', -- name
  ${wowheadItem.displayId || 0}, -- displayid
  ${wowheadItem.quality || 1}, -- Quality
  0, -- Flags
  0, -- FlagsExtra
  1, -- BuyCount
  ${this.calculateBuyPrice(wowheadItem)}, -- BuyPrice
  ${this.calculateSellPrice(wowheadItem)}, -- SellPrice
  ${wowheadItem.inventoryType || 0}, -- InventoryType
  -1, -- AllowableClass
  -1, -- AllowableRace
  ${wowheadItem.itemLevel || 1}, -- ItemLevel
  ${wowheadItem.requiredLevel || 1}, -- RequiredLevel
  0, -- RequiredSkill
  0, -- RequiredSkillRank
  0, -- requiredspell
  0, -- requiredhonorrank
  0, -- RequiredCityRank
  0, -- RequiredReputationFaction
  0, -- RequiredReputationRank
  0, -- maxcount
  ${wowheadItem.stackable || 1}, -- stackable
  0, -- ContainerSlots
  ${this.getStatsCount(wowheadItem)}, -- StatsCount
  ${this.generateStatsSQL(wowheadItem)}
  0, -- ScalingStatDistribution
  0, -- ScalingStatValue
  ${this.generateDamageSQL(wowheadItem)}
  ${this.generateResistanceSQL(wowheadItem)}
  ${wowheadItem.delay || 0}, -- delay
  0, -- ammo_type
  0, -- RangedModRange
  ${this.generateSpellsSQL(wowheadItem)}
  ${wowheadItem.bonding || 0}, -- bonding
  '${this.escapeSQLString(wowheadItem.description || '')}', -- description
  0, -- PageText
  0, -- LanguageID
  0, -- PageMaterial
  0, -- startquest
  0, -- lockid
  ${this.getMaterialType(wowheadItem)}, -- Material
  ${this.getSheathType(wowheadItem)}, -- sheath
  0, -- RandomProperty
  0, -- RandomSuffix
  0, -- block
  0, -- itemset
  ${this.calculateDurability(wowheadItem)}, -- MaxDurability
  0, -- area
  0, -- Map
  0, -- BagFamily
  0, -- TotemCategory
  ${this.generateSocketsSQL(wowheadItem)}
  0, -- socketBonus
  0, -- GemProperties
  ${this.calculateDisenchantSkill(wowheadItem)}, -- RequiredDisenchantSkill
  0, -- ArmorDamageModifier
  0, -- duration
  0, -- ItemLimitCategory
  0, -- HolidayId
  '', -- ScriptName
  ${this.calculateDisenchantID(wowheadItem)}, -- DisenchantID
  0, -- FoodType
  0, -- minMoneyLoot
  0, -- maxMoneyLoot
  0, -- flagsCustom
  12340 -- VerifiedBuild
);`;

    return sql;
  }

  /**
   * Generate stats SQL portion
   */
  generateStatsSQL(item) {
    const stats = item.stats || [];
    let sql = '';
    
    for (let i = 1; i <= 10; i++) {
      const stat = stats[i - 1];
      if (stat) {
        sql += `${stat.type || 0}, ${stat.value || 0}, `;
      } else {
        sql += `0, 0, `;
      }
    }
    
    return sql;
  }

  /**
   * Get stats count
   */
  getStatsCount(item) {
    return (item.stats || []).length;
  }

  /**
   * Generate damage SQL portion
   */
  generateDamageSQL(item) {
    const dmg = item.damage || {};
    return `${dmg.min1 || 0}, ${dmg.max1 || 0}, ${dmg.type1 || 0}, ` +
           `${dmg.min2 || 0}, ${dmg.max2 || 0}, ${dmg.type2 || 0}, ` +
           `${item.armor || 0}, `;
  }

  /**
   * Generate resistance SQL portion
   */
  generateResistanceSQL(item) {
    const res = item.resistance || {};
    return `${res.holy || 0}, ${res.fire || 0}, ${res.nature || 0}, ` +
           `${res.frost || 0}, ${res.shadow || 0}, ${res.arcane || 0}, `;
  }

  /**
   * Generate spells SQL portion (5 spell slots)
   */
  generateSpellsSQL(item) {
    const spells = item.spells || [];
    let sql = '';
    
    for (let i = 1; i <= 5; i++) {
      const spell = spells[i - 1];
      if (spell) {
        sql += `${spell.id || 0}, ${spell.trigger || 0}, ${spell.charges || 0}, ` +
               `${spell.ppmRate || 0}, ${spell.cooldown || -1}, ${spell.category || 0}, ` +
               `${spell.categoryCooldown || -1}, `;
      } else {
        sql += `0, 0, 0, 0, -1, 0, -1, `;
      }
    }
    
    return sql;
  }

  /**
   * Generate sockets SQL portion (3 socket slots)
   */
  generateSocketsSQL(item) {
    const sockets = item.sockets || [];
    let sql = '';
    
    for (let i = 1; i <= 3; i++) {
      const socket = sockets[i - 1];
      if (socket) {
        sql += `${socket.color || 0}, ${socket.content || 0}, `;
      } else {
        sql += `0, 0, `;
      }
    }
    
    return sql;
  }

  /**
   * Calculate buy price based on item quality and level
   */
  calculateBuyPrice(item) {
    const quality = item.quality || 1;
    const level = item.itemLevel || 1;
    const basePrice = level * 100;
    const qualityMultiplier = [0.2, 1, 2, 5, 10, 50, 100, 20][quality] || 1;
    return Math.floor(basePrice * qualityMultiplier);
  }

  /**
   * Calculate sell price (25% of buy price)
   */
  calculateSellPrice(item) {
    return Math.floor(this.calculateBuyPrice(item) * 0.25);
  }

  /**
   * Get material type based on item class
   */
  getMaterialType(item) {
    const materialMap = {
      2: 1, // Weapon = Metal
      4: 7  // Armor = Cloth/Leather/Mail/Plate (default to cloth)
    };
    return materialMap[item.itemClass] || -1;
  }

  /**
   * Get sheath type for weapons
   */
  getSheathType(item) {
    if (item.itemClass !== 2) return 0; // Not a weapon
    
    const sheathMap = {
      0: 3,  // Axe 1H
      1: 2,  // Axe 2H
      2: 5,  // Bow
      4: 3,  // Mace 1H
      5: 2,  // Mace 2H
      6: 2,  // Polearm
      7: 3,  // Sword 1H
      8: 1,  // Sword 2H
      10: 2, // Staff
      15: 4  // Dagger
    };
    
    return sheathMap[item.itemSubClass] || 0;
  }

  /**
   * Calculate max durability based on item type and quality
   */
  calculateDurability(item) {
    if (item.itemClass !== 2 && item.itemClass !== 4) return 0; // Only weapons/armor
    
    const baseDurability = item.itemLevel * 5;
    const qualityMultiplier = [0.5, 1, 1.2, 1.5, 2, 3, 5, 2][item.quality || 1];
    return Math.floor(baseDurability * qualityMultiplier);
  }

  /**
   * Calculate required disenchant skill
   */
  calculateDisenchantSkill(item) {
    if (item.quality < 2) return -1; // Only uncommon+
    
    const level = item.itemLevel || 1;
    if (level <= 25) return 1;
    if (level <= 30) return 25;
    if (level <= 35) return 50;
    if (level <= 40) return 75;
    if (level <= 45) return 100;
    if (level <= 50) return 125;
    if (level <= 55) return 150;
    if (level <= 60) return 175;
    if (level <= 99) return 200;
    if (level <= 120) return 225;
    if (level <= 150) return 275;
    if (level <= 200) return 325;
    return 375;
  }

  /**
   * Calculate disenchant ID based on quality and level
   */
  calculateDisenchantID(item) {
    if (item.quality < 2) return 0; // Only uncommon+
    return 1; // Default disenchant loot
  }

  /**
   * Generate unique entry ID
   */
  generateEntryId() {
    // Start custom items at 200000 to avoid conflicts
    return 200000 + Math.floor(Math.random() * 100000);
  }

  /**
   * Escape SQL string
   */
  escapeSQLString(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  /**
   * Generate bulk import SQL for multiple items
   */
  generateBulkImportSQL(wowheadItems, startingEntry = 200000) {
    let sql = `-- Bulk Item Import (${wowheadItems.length} items)
-- Generated: ${new Date().toISOString()}
-- Starting Entry: ${startingEntry}

`;
    
    wowheadItems.forEach((item, index) => {
      const entry = startingEntry + index;
      sql += this.generateItemSQL(item, entry) + '\n\n';
    });
    
    return sql;
  }

  /**
   * Validate item data before SQL generation
   */
  validateItem(item) {
    const errors = [];
    
    if (!item.name || item.name.trim() === '') {
      errors.push('Item name is required');
    }
    
    if (!item.itemLevel || item.itemLevel < 1) {
      errors.push('Item level must be at least 1');
    }
    
    if (item.quality !== undefined && (item.quality < 0 || item.quality > 7)) {
      errors.push('Quality must be between 0-7');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Preview item before import
   */
  generateItemPreview(item) {
    return {
      name: item.name,
      quality: this.qualities[item.quality] || 'Unknown',
      itemLevel: item.itemLevel,
      requiredLevel: item.requiredLevel,
      type: this.getItemTypeString(item),
      stats: this.formatStatsPreview(item),
      buyPrice: this.formatGold(this.calculateBuyPrice(item)),
      sellPrice: this.formatGold(this.calculateSellPrice(item))
    };
  }

  /**
   * Get item type string
   */
  getItemTypeString(item) {
    const className = this.itemClasses[item.itemClass] || 'Unknown';
    let subClassName = '';
    
    if (item.itemClass === 2) {
      subClassName = this.weaponSubclasses[item.itemSubClass] || '';
    } else if (item.itemClass === 4) {
      subClassName = this.armorSubclasses[item.itemSubClass] || '';
    }
    
    return subClassName ? `${className} - ${subClassName}` : className;
  }

  /**
   * Format stats for preview
   */
  formatStatsPreview(item) {
    if (!item.stats || item.stats.length === 0) return [];
    
    return item.stats.map(stat => ({
      name: this.statTypes[stat.type] || `Stat ${stat.type}`,
      value: stat.value
    }));
  }

  /**
   * Format gold (copper to gold/silver/copper)
   */
  formatGold(copper) {
    const gold = Math.floor(copper / 10000);
    const silver = Math.floor((copper % 10000) / 100);
    const copperRem = copper % 100;
    
    const parts = [];
    if (gold > 0) parts.push(`${gold}g`);
    if (silver > 0) parts.push(`${silver}s`);
    if (copperRem > 0) parts.push(`${copperRem}c`);
    
    return parts.join(' ') || '0c';
  }
}

module.exports = TrinityItemGenerator;
