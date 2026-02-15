// ─── DB2 Browser Service ─────────────────────────────────────
// Reads extracted .db2 files from disk using @rhyster/wow-casc-dbc.
// WHY: Modern WoW (Master branch) stores game data in DB2 format
// (WDC3/WDC4/WDC5) — a complex compressed binary format.
// We use the community library + WoWDBDefs schemas to parse them.
//
// ESM/CommonJS bridge: The @rhyster/wow-casc-dbc package uses
// ESM imports, but CompApp uses CommonJS. We bridge via dynamic import().

const fs = require('fs');
const path = require('path');

let cascModule = null;

// Lazy-load the ESM module once
async function getCascModule() {
  if (!cascModule) {
    cascModule = await import('@rhyster/wow-casc-dbc');
  }
  return cascModule;
}

// Cache parsed DB2 tables in memory to avoid re-parsing for every lookup
const tableCache = {};

class DB2Service {
  constructor(store) {
    this.store = store;
  }

  // Get the path where extracted DB2 files live on disk
  getDb2SourcePath() {
    const config = this.store.get('extractor') || {};
    return config.db2SourcePath || '';
  }

  // List all .db2 files available on disk
  async listFiles() {
    const srcPath = this.getDb2SourcePath();
    if (!srcPath || !fs.existsSync(srcPath)) {
      return [];
    }
    const files = fs.readdirSync(srcPath)
      .filter(f => f.toLowerCase().endsWith('.db2'))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return files;
  }

  // Read and parse a single DB2 file, returning all records with named columns
  async readFile(filename) {
    const srcPath = this.getDb2SourcePath();
    const filePath = path.join(srcPath, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`DB2 file not found: ${filePath}`);
    }

    const { WDCReader, DBDParser } = await getCascModule();
    const buffer = fs.readFileSync(filePath);
    const reader = new WDCReader(buffer);
    const parser = await DBDParser.parse(reader);

    const ids = parser.getAllIDs();
    const rows = [];
    const columns = new Set();

    for (const id of ids) {
      const row = parser.getRowData(id);
      if (row) {
        row._ID = id;
        Object.keys(row).forEach(k => columns.add(k));
        rows.push(row);
      }
    }

    return {
      filename,
      rowCount: rows.length,
      columns: Array.from(columns),
      rows
    };
  }

  // Get a cached parsed table (keyed by filename). Used for spell lookups.
  async getCachedTable(filename) {
    if (tableCache[filename]) return tableCache[filename];

    const data = await this.readFile(filename);
    // Build indexed lookups
    const byId = {};
    const bySpellId = {};
    for (const row of data.rows) {
      byId[row._ID] = row;
      // Many spell-related DB2s have a SpellID column
      if (row.SpellID !== undefined) {
        if (!bySpellId[row.SpellID]) bySpellId[row.SpellID] = [];
        bySpellId[row.SpellID].push(row);
      }
    }
    tableCache[filename] = { ...data, byId, bySpellId };
    return tableCache[filename];
  }

  // Search rows in a DB2 file by column value
  async search(filename, query, column) {
    const data = await this.getCachedTable(filename);
    const q = String(query).toLowerCase();
    const qNum = parseInt(query);

    return data.rows.filter(row => {
      if (column) {
        const val = row[column];
        if (val === undefined) return false;
        if (typeof val === 'number') return val === qNum;
        return String(val).toLowerCase().includes(q);
      }
      // Search all columns
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'number') return val === qNum;
        return String(val).toLowerCase().includes(q);
      });
    }).slice(0, 200);
  }

  // Export a DB2 table as JSON or SQL
  async exportTable(filename, format = 'json') {
    const data = await this.getCachedTable(filename);
    const tableName = filename.replace(/\.db2$/i, '');

    if (format === 'json') {
      return JSON.stringify(data.rows, null, 2);
    }

    // SQL INSERT format
    if (data.rows.length === 0) return '-- No data';
    const cols = data.columns.filter(c => c !== '_ID');
    const lines = data.rows.map(row => {
      const vals = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      return `INSERT INTO \`${tableName}\` (${cols.map(c => '`' + c + '`').join(', ')}) VALUES (${vals.join(', ')});`;
    });
    return lines.join('\n');
  }

  // Combined Spell View: joins 8+ DB2 tables for a complete spell record
  async getFullSpell(spellId) {
    const names = await this.getCachedTable('SpellName.db2');
    const name = names.byId[spellId];
    if (!name) throw new Error(`Spell ${spellId} not found in SpellName.db2`);

    let spell = null, spellEffects = [], spellMisc = null, spellPower = null;
    let spellCooldown = null, castTime = null, range = null, duration = null;

    // Each table may or may not exist — fail gracefully
    try {
      const t = await this.getCachedTable('Spell.db2');
      spell = t.byId[spellId] || t.bySpellId?.[spellId]?.[0] || null;
    } catch {}

    try {
      const t = await this.getCachedTable('SpellEffect.db2');
      spellEffects = t.bySpellId?.[spellId] || [];
      if (!Array.isArray(spellEffects)) spellEffects = [spellEffects];
    } catch {}

    try {
      const t = await this.getCachedTable('SpellMisc.db2');
      spellMisc = t.bySpellId?.[spellId]?.[0] || null;
    } catch {}

    try {
      const t = await this.getCachedTable('SpellPower.db2');
      const powers = t.bySpellId?.[spellId] || [];
      spellPower = Array.isArray(powers) ? powers[0] : powers;
    } catch {}

    try {
      const t = await this.getCachedTable('SpellCooldowns.db2');
      const cds = t.bySpellId?.[spellId] || [];
      spellCooldown = Array.isArray(cds) ? cds[0] : cds;
    } catch {}

    if (spellMisc) {
      try {
        const castTimes = await this.getCachedTable('SpellCastTimes.db2');
        castTime = castTimes.byId[spellMisc.CastingTimeIndex] || null;
      } catch {}

      try {
        const ranges = await this.getCachedTable('SpellRange.db2');
        range = ranges.byId[spellMisc.RangeIndex] || null;
      } catch {}

      try {
        const durations = await this.getCachedTable('SpellDuration.db2');
        duration = durations.byId[spellMisc.DurationIndex] || null;
      } catch {}
    }

    return {
      id: spellId,
      name: name.Name || 'Unknown',
      description: spell?.Description || '',
      auraDescription: spell?.AuraDescription || '',
      effects: spellEffects,
      iconFileDataID: spellMisc?.SpellIconFileDataID || null,
      castTime: castTime?.Base || 0,
      rangeMin: range?.RangeMin?.[0] || range?.RangeMin || 0,
      rangeMax: range?.RangeMax?.[0] || range?.RangeMax || 0,
      rangeName: range?.DisplayName || '',
      duration: duration?.Duration || 0,
      manaCost: spellPower?.ManaCost || 0,
      powerType: spellPower?.PowerType || 0,
      cooldown: spellCooldown?.RecoveryTime || 0,
      categoryCooldown: spellCooldown?.CategoryRecoveryTime || 0,
    };
  }

  // Clear all cached tables (e.g. when source path changes)
  clearCache() {
    Object.keys(tableCache).forEach(k => delete tableCache[k]);
  }
}

module.exports = DB2Service;
