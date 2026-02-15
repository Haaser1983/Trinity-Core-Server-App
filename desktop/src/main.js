const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
const axios = require('axios');
const Store = require('./store');
const SoapService = require('./services/soap');
const DB2Service = require('./services/db2');
const CASCService = require('./services/casc');
const BLPConverter = require('./services/blp');

// ─── Settings Store ─────────────────────────────────────────
// WHY Store? Persists config to a JSON file in AppData so your
// database credentials and SOAP settings survive app restarts.
const store = new Store({
  configName: 'trinitycore-config',
  defaults: {
    database: {
      host: '50.6.34.52',
      port: 3306,
      user: 'hiefcnte_WOW',
      password: 'Jh748329#',
      databases: {
        auth: 'hiefcnte_WOWAuth',
        characters: 'hiefcnte_WOWChars',
        world: 'hiefcnte_WOWServer',
        hotfixes: 'hiefcnte_WOWHotfixes'
      }
    },
    server: {
      enabled: false,
      host: 'localhost',
      worldPort: 8085,
      authPort: 3724
    },
    // NEW: SOAP configuration for live server commands
    soap: {
      enabled: false,
      host: 'localhost',
      port: 7878,
      user: '',
      password: ''
    },
    // Extractor / DB2 Browser configuration
    extractor: {
      clientPath: '',       // WoW client path (e.g. C:\Program Files\World of Warcraft\_retail_)
      outputPath: '',       // Where extracted assets go
      extractorBinPath: '', // TrinityCore build bin dir (has mapextractor.exe etc.)
      db2SourcePath: '',    // Where .db2 files live (e.g. server/data/dbc)
      dataSource: 'extracted', // 'extracted' = read from disk, 'casc' = read from CASC
      listfileCached: false
    }
  }
});

let mainWindow;
let dbConnections = {};

// ─── Initialize SOAP Service ────────────────────────────────
const soapConfig = store.get('soap') || {};
const soap = new SoapService(soapConfig);

// ─── Initialize Extractor Services ─────────────────────────
const db2Service = new DB2Service(store);
const cascService = new CASCService(store);
const blpConverter = new BLPConverter();

// ─── Window Creation ────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'CompApp — TrinityCore Companion',
    backgroundColor: '#0a0704'
  });

  mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeAllConnections();
  });
}

// ─── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ─── Database Connection Pool ───────────────────────────────
// WHY pools? Hostgator drops idle connections. A pool auto-
// reconnects and handles concurrent queries without blocking.

async function getConnection(dbName) {
  const config = store.get('database');

  if (!dbConnections[dbName]) {
    dbConnections[dbName] = await mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.databases[dbName],
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
  }

  return dbConnections[dbName];
}

async function closeAllConnections() {
  for (const [name, pool] of Object.entries(dbConnections)) {
    try { await pool.end(); } catch (e) { console.error(`Error closing ${name}:`, e); }
  }
  dbConnections = {};
}

// =============================================================
// IPC HANDLERS
// =============================================================

// ─── Settings ───────────────────────────────────────────────

ipcMain.handle('get-settings', async () => {
  return store.data;
});

ipcMain.handle('save-settings', async (event, settings) => {
  if (settings.database) store.set('database', settings.database);
  if (settings.server) store.set('server', settings.server);
  if (settings.soap) {
    store.set('soap', settings.soap);
    // Update the live SOAP service with new config
    soap.updateConfig(settings.soap);
  }

  // Close existing DB connections so new settings take effect
  await closeAllConnections();

  return { success: true };
});

// ─── Database Operations ────────────────────────────────────

ipcMain.handle('test-database', async (event, dbName) => {
  try {
    const pool = await getConnection(dbName);
    const [rows] = await pool.execute('SELECT 1 as test');
    return { success: true, message: 'Connection successful!' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('query-database', async (event, { database, query, params = [] }) => {
  try {
    const pool = await getConnection(database);
    const [rows] = await pool.execute(query, params);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Items ──────────────────────────────────────────────────

ipcMain.handle('get-items', async (event, { page = 1, limit = 50, search = '' }) => {
  try {
    const pool = await getConnection('world');
    const offset = (page - 1) * limit;

    let query = 'SELECT entry, class, subclass, name, Quality, ItemLevel, RequiredLevel FROM item_template';
    let countQuery = 'SELECT COUNT(*) as total FROM item_template';
    let params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR entry = ?';
      countQuery += ' WHERE name LIKE ? OR entry = ?';
      params = [`%${search}%`, parseInt(search) || 0];
    }

    query += ' ORDER BY entry LIMIT ? OFFSET ?';

    const [items] = await pool.execute(query, [...params, limit, offset]);
    const [countResult] = await pool.execute(countQuery, params);

    return {
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-item', async (event, itemId) => {
  try {
    const pool = await getConnection('world');
    const [items] = await pool.execute('SELECT * FROM item_template WHERE entry = ?', [itemId]);
    if (items.length === 0) return { success: false, error: 'Item not found' };
    return { success: true, data: items[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Players ────────────────────────────────────────────────

ipcMain.handle('get-players', async (event, { page = 1, limit = 50, onlineOnly = false }) => {
  try {
    const pool = await getConnection('characters');
    const offset = (page - 1) * limit;

    let query = 'SELECT guid, name, race, class, gender, level, zone, online FROM characters';
    let countQuery = 'SELECT COUNT(*) as total FROM characters';

    if (onlineOnly) {
      query += ' WHERE online = 1';
      countQuery += ' WHERE online = 1';
    }

    query += ' ORDER BY level DESC, guid DESC LIMIT ? OFFSET ?';

    const [players] = await pool.execute(query, [limit, offset]);
    const [countResult] = await pool.execute(countQuery);

    return {
      success: true,
      data: {
        players,
        pagination: {
          page, limit,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Server Status ──────────────────────────────────────────

ipcMain.handle('get-server-status', async () => {
  try {
    const pool = await getConnection('characters');
    const [onlineResult] = await pool.execute('SELECT COUNT(*) as count FROM characters WHERE online = 1');

    return {
      success: true,
      data: {
        online: true,
        playersOnline: onlineResult[0].count,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, data: { online: false, error: error.message } };
  }
});

// ─── SOAP Commands (NEW) ────────────────────────────────────
// WHY: These let you control the running worldserver in real-time.
// Without SOAP, you can only change the database — which doesn't
// affect the live server until it reloads or restarts.

ipcMain.handle('soap-test', async () => {
  return await soap.testConnection();
});

ipcMain.handle('soap-command', async (event, command) => {
  try {
    const result = await soap.sendCommand(command);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('soap-announce', async (event, { message, type }) => {
  try {
    let result;
    switch (type) {
      case 'notify':
        result = await soap.notify(message);
        break;
      case 'alert':
        // Server shutdown with message acts as an alert
        // Using announce with a different prefix for visual distinction
        result = await soap.sendCommand(`announce [ALERT] ${message}`);
        break;
      case 'announce':
      default:
        result = await soap.announce(message);
        break;
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('soap-server-info', async () => {
  try {
    const result = await soap.serverInfo();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── XP Rate Control (NEW) ─────────────────────────────────
// WHY: XP rates are stored in worldserver.conf on the server.
// Changing them requires either editing the conf file + restart,
// or using the .modify command per-player. For a global change,
// we use SOAP to send config reload after DB-based rate storage.
//
// TrinityCore approach: The worldserver reads Rate.XP.Kill etc.
// from its config. We can also use the .server set command or
// modify the game via SOAP. For now, we track the rate in our
// local config and send per-player commands, or announce it.

ipcMain.handle('set-xp-rate', async (event, rate) => {
  try {
    // Store the rate in our config
    store.set('xpRate', rate);

    // If SOAP is connected, announce the change
    const soapConfig = store.get('soap') || {};
    if (soapConfig.enabled) {
      await soap.announce(`XP Rate has been set to ${rate}x!`);
    }

    return { success: true, rate };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-xp-rate', async () => {
  return store.get('xpRate') || 1;
});

// ─── Holiday / Game Event Management (NEW) ──────────────────
// WHY: TrinityCore stores events in the game_event table.
// Each row has a start/end time and an "enabled" state.
// We read them from the DB, toggle them, then tell the server
// to reload via SOAP so changes take effect immediately.

ipcMain.handle('get-game-events', async () => {
  try {
    const pool = await getConnection('world');
    const [events] = await pool.execute(
      `SELECT eventEntry, start_time, end_time, description,
              world_event, holiday
       FROM game_event
       WHERE holiday > 0
       ORDER BY eventEntry`
    );
    return { success: true, data: events };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-game-event', async (event, { eventEntry, enabled }) => {
  try {
    const pool = await getConnection('world');

    if (enabled) {
      // Set the event to start now and end far in the future
      await pool.execute(
        `UPDATE game_event SET start_time = NOW(), end_time = '2030-12-31 23:59:59'
         WHERE eventEntry = ?`,
        [eventEntry]
      );
    } else {
      // Set end_time to the past to disable
      await pool.execute(
        `UPDATE game_event SET end_time = '2000-01-01 00:00:00'
         WHERE eventEntry = ?`,
        [eventEntry]
      );
    }

    // Tell the worldserver to reload events
    const soapConfig = store.get('soap') || {};
    if (soapConfig.enabled) {
      try {
        await soap.reloadGameEvent();
      } catch (e) {
        // SOAP might not be running — that's OK, DB change persists
        console.warn('SOAP reload failed:', e.message);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Boss Scripting / SmartAI (NEW) ─────────────────────────
// WHY: SmartAI is TrinityCore's event-driven creature scripting
// system. The smart_scripts table stores event→action mappings
// that control boss behavior, abilities, and phases.

ipcMain.handle('search-creatures-for-scripts', async (event, { search = '' }) => {
  try {
    const pool = await getConnection('world');
    const [creatures] = await pool.execute(
      `SELECT entry, name, minlevel, maxlevel, rank
       FROM creature_template
       WHERE name LIKE ? OR entry = ?
       LIMIT 20`,
      [`%${search}%`, parseInt(search) || 0]
    );
    return { success: true, data: creatures };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-smart-scripts', async (event, entryorguid) => {
  try {
    const pool = await getConnection('world');
    // source_type = 0 means creature scripts
    const [scripts] = await pool.execute(
      `SELECT * FROM smart_scripts
       WHERE entryorguid = ? AND source_type = 0
       ORDER BY id ASC`,
      [entryorguid]
    );
    return { success: true, data: scripts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-smart-script', async (event, sd) => {
  try {
    const pool = await getConnection('world');

    // Auto-increment: find next available id for this creature
    const [maxResult] = await pool.execute(
      `SELECT COALESCE(MAX(id), -1) + 1 as next_id
       FROM smart_scripts
       WHERE entryorguid = ? AND source_type = 0`,
      [sd.entryorguid]
    );
    const nextId = maxResult[0].next_id;

    await pool.execute(
      `INSERT INTO smart_scripts (
        entryorguid, source_type, id, link,
        event_type, event_phase_mask, event_chance, event_flags,
        event_param1, event_param2, event_param3, event_param4,
        action_type, action_param1, action_param2, action_param3,
        action_param4, action_param5, action_param6,
        target_type, target_param1, target_param2, target_param3,
        target_x, target_y, target_z, target_o, comment
      ) VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sd.entryorguid, nextId, sd.link || 0,
        sd.event_type, sd.event_phase_mask || 0, sd.event_chance || 100, sd.event_flags || 0,
        sd.event_param1 || 0, sd.event_param2 || 0, sd.event_param3 || 0, sd.event_param4 || 0,
        sd.action_type,
        sd.action_param1 || 0, sd.action_param2 || 0, sd.action_param3 || 0,
        sd.action_param4 || 0, sd.action_param5 || 0, sd.action_param6 || 0,
        sd.target_type || 0,
        sd.target_param1 || 0, sd.target_param2 || 0, sd.target_param3 || 0,
        sd.target_x || 0, sd.target_y || 0, sd.target_z || 0, sd.target_o || 0,
        sd.comment || ''
      ]
    );

    return { success: true, data: { id: nextId } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-smart-script', async (event, { entryorguid, id, scriptData: sd }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `UPDATE smart_scripts SET
        link = ?, event_type = ?, event_phase_mask = ?, event_chance = ?, event_flags = ?,
        event_param1 = ?, event_param2 = ?, event_param3 = ?, event_param4 = ?,
        action_type = ?,
        action_param1 = ?, action_param2 = ?, action_param3 = ?,
        action_param4 = ?, action_param5 = ?, action_param6 = ?,
        target_type = ?, target_param1 = ?, target_param2 = ?, target_param3 = ?,
        target_x = ?, target_y = ?, target_z = ?, target_o = ?,
        comment = ?
       WHERE entryorguid = ? AND source_type = 0 AND id = ?`,
      [
        sd.link || 0, sd.event_type, sd.event_phase_mask || 0, sd.event_chance || 100, sd.event_flags || 0,
        sd.event_param1 || 0, sd.event_param2 || 0, sd.event_param3 || 0, sd.event_param4 || 0,
        sd.action_type,
        sd.action_param1 || 0, sd.action_param2 || 0, sd.action_param3 || 0,
        sd.action_param4 || 0, sd.action_param5 || 0, sd.action_param6 || 0,
        sd.target_type || 0, sd.target_param1 || 0, sd.target_param2 || 0, sd.target_param3 || 0,
        sd.target_x || 0, sd.target_y || 0, sd.target_z || 0, sd.target_o || 0,
        sd.comment || '',
        entryorguid, id
      ]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-smart-script', async (event, { entryorguid, id }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `DELETE FROM smart_scripts WHERE entryorguid = ? AND source_type = 0 AND id = ?`,
      [entryorguid, id]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reload-smart-scripts', async () => {
  try {
    const soapConfig = store.get('soap') || {};
    if (!soapConfig.enabled) {
      return { success: false, error: 'SOAP not enabled. Scripts saved to DB but server not reloaded.' };
    }
    const result = await soap.sendCommand('reload smart_scripts');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: `Scripts saved to DB, but SOAP reload failed: ${error.message}` };
  }
});

// ─── Loot Table Builder (NEW) ────────────────────────────────
// WHY: creature_template.lootid points to creature_loot_template.Entry.
// We fetch the lootid first, then CRUD the loot entries using that ID.

ipcMain.handle('get-creature-lootid', async (event, creatureEntry) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      'SELECT entry, name, lootid FROM creature_template WHERE entry = ?',
      [creatureEntry]
    );
    if (rows.length === 0) return { success: false, error: 'Creature not found' };
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-creature-loot', async (event, lootId) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      `SELECT clt.*, it.name, it.Quality
       FROM creature_loot_template clt
       LEFT JOIN item_template it ON clt.Item = it.entry
       WHERE clt.Entry = ?
       ORDER BY clt.GroupId ASC, clt.Chance DESC`,
      [lootId]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-items-for-loot', async (event, search) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      `SELECT entry, name, Quality, ItemLevel
       FROM item_template
       WHERE name LIKE ? OR entry = ?
       LIMIT 20`,
      [`%${search}%`, parseInt(search) || 0]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-loot-entry', async (event, ld) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `INSERT INTO creature_loot_template
       (Entry, Item, Reference, Chance, QuestRequired, LootMode, GroupId, MinCount, MaxCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ld.entry, ld.item, ld.reference || 0,
        ld.chance, ld.questRequired || 0, ld.lootMode || 1,
        ld.groupId || 0, ld.minCount || 1, ld.maxCount || 1
      ]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-loot-entry', async (event, { lootId, itemId, lootData: ld }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `UPDATE creature_loot_template
       SET Chance = ?, MinCount = ?, MaxCount = ?, GroupId = ?,
           QuestRequired = ?, LootMode = ?, Reference = ?
       WHERE Entry = ? AND Item = ?`,
      [
        ld.chance, ld.minCount, ld.maxCount, ld.groupId,
        ld.questRequired, ld.lootMode, ld.reference || 0,
        lootId, itemId
      ]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-loot-entry', async (event, { lootId, itemId }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'DELETE FROM creature_loot_template WHERE Entry = ? AND Item = ?',
      [lootId, itemId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-reference-loot', async (event, referenceId) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      `SELECT rlt.*, it.name, it.Quality
       FROM reference_loot_template rlt
       LEFT JOIN item_template it ON rlt.Item = it.entry
       WHERE rlt.Entry = ?
       ORDER BY rlt.Chance DESC`,
      [referenceId]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-loot-table', async (event, { creatureEntry, lootId }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'UPDATE creature_template SET lootid = ? WHERE entry = ?',
      [lootId, creatureEntry]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Quest Builder (NEW) ──────────────────────────────────

ipcMain.handle('search-quests', async (event, { search = '' }) => {
  try {
    const pool = await getConnection('world');
    const [quests] = await pool.execute(
      `SELECT ID, LogTitle, QuestLevel, MinLevel, QuestType
       FROM quest_template
       WHERE LogTitle LIKE ? OR ID = ?
       ORDER BY ID
       LIMIT 20`,
      [`%${search}%`, parseInt(search) || 0]
    );
    return { success: true, data: quests };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quest', async (event, questId) => {
  try {
    const pool = await getConnection('world');
    const [quests] = await pool.execute(
      'SELECT * FROM quest_template WHERE ID = ?',
      [questId]
    );
    if (quests.length === 0) return { success: false, error: 'Quest not found' };

    let addon = null;
    try {
      const [addons] = await pool.execute(
        'SELECT * FROM quest_template_addon WHERE ID = ?',
        [questId]
      );
      if (addons.length > 0) addon = addons[0];
    } catch (e) { /* table may not exist */ }

    return { success: true, data: { ...quests[0], addon } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-quest', async (event, { questId, questData: qd }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `UPDATE quest_template SET
        LogTitle = ?, QuestLevel = ?, MinLevel = ?, MaxLevel = ?,
        QuestType = ?, QuestDescription = ?, LogDescription = ?,
        QuestCompletionLog = ?, AreaDescription = ?,
        RewardXPDifficulty = ?, RewardMoney = ?,
        RewardItem1 = ?, RewardAmount1 = ?,
        RewardItem2 = ?, RewardAmount2 = ?,
        RewardItem3 = ?, RewardAmount3 = ?,
        RewardItem4 = ?, RewardAmount4 = ?,
        RewardChoiceItemID1 = ?, RewardChoiceItemQuantity1 = ?,
        RewardChoiceItemID2 = ?, RewardChoiceItemQuantity2 = ?,
        RewardChoiceItemID3 = ?, RewardChoiceItemQuantity3 = ?,
        RewardChoiceItemID4 = ?, RewardChoiceItemQuantity4 = ?,
        RewardChoiceItemID5 = ?, RewardChoiceItemQuantity5 = ?,
        RewardChoiceItemID6 = ?, RewardChoiceItemQuantity6 = ?,
        RequiredNpcOrGo1 = ?, RequiredNpcOrGoCount1 = ?,
        RequiredNpcOrGo2 = ?, RequiredNpcOrGoCount2 = ?,
        RequiredNpcOrGo3 = ?, RequiredNpcOrGoCount3 = ?,
        RequiredNpcOrGo4 = ?, RequiredNpcOrGoCount4 = ?,
        RequiredItemId1 = ?, RequiredItemCount1 = ?,
        RequiredItemId2 = ?, RequiredItemCount2 = ?,
        RequiredItemId3 = ?, RequiredItemCount3 = ?,
        RequiredItemId4 = ?, RequiredItemCount4 = ?,
        PrevQuestID = ?, NextQuestID = ?, ExclusiveGroup = ?,
        RewardFactionID1 = ?, RewardFactionValue1 = ?,
        RewardFactionID2 = ?, RewardFactionValue2 = ?,
        RewardFactionID3 = ?, RewardFactionValue3 = ?,
        RewardFactionID4 = ?, RewardFactionValue4 = ?,
        RewardFactionID5 = ?, RewardFactionValue5 = ?
       WHERE ID = ?`,
      [
        qd.LogTitle, qd.QuestLevel, qd.MinLevel, qd.MaxLevel || 0,
        qd.QuestType || 0, qd.QuestDescription || '', qd.LogDescription || '',
        qd.QuestCompletionLog || '', qd.AreaDescription || '',
        qd.RewardXPDifficulty || 0, qd.RewardMoney || 0,
        qd.RewardItem1 || 0, qd.RewardAmount1 || 0,
        qd.RewardItem2 || 0, qd.RewardAmount2 || 0,
        qd.RewardItem3 || 0, qd.RewardAmount3 || 0,
        qd.RewardItem4 || 0, qd.RewardAmount4 || 0,
        qd.RewardChoiceItemID1 || 0, qd.RewardChoiceItemQuantity1 || 0,
        qd.RewardChoiceItemID2 || 0, qd.RewardChoiceItemQuantity2 || 0,
        qd.RewardChoiceItemID3 || 0, qd.RewardChoiceItemQuantity3 || 0,
        qd.RewardChoiceItemID4 || 0, qd.RewardChoiceItemQuantity4 || 0,
        qd.RewardChoiceItemID5 || 0, qd.RewardChoiceItemQuantity5 || 0,
        qd.RewardChoiceItemID6 || 0, qd.RewardChoiceItemQuantity6 || 0,
        qd.RequiredNpcOrGo1 || 0, qd.RequiredNpcOrGoCount1 || 0,
        qd.RequiredNpcOrGo2 || 0, qd.RequiredNpcOrGoCount2 || 0,
        qd.RequiredNpcOrGo3 || 0, qd.RequiredNpcOrGoCount3 || 0,
        qd.RequiredNpcOrGo4 || 0, qd.RequiredNpcOrGoCount4 || 0,
        qd.RequiredItemId1 || 0, qd.RequiredItemCount1 || 0,
        qd.RequiredItemId2 || 0, qd.RequiredItemCount2 || 0,
        qd.RequiredItemId3 || 0, qd.RequiredItemCount3 || 0,
        qd.RequiredItemId4 || 0, qd.RequiredItemCount4 || 0,
        qd.PrevQuestID || 0, qd.NextQuestID || 0, qd.ExclusiveGroup || 0,
        qd.RewardFactionID1 || 0, qd.RewardFactionValue1 || 0,
        qd.RewardFactionID2 || 0, qd.RewardFactionValue2 || 0,
        qd.RewardFactionID3 || 0, qd.RewardFactionValue3 || 0,
        qd.RewardFactionID4 || 0, qd.RewardFactionValue4 || 0,
        qd.RewardFactionID5 || 0, qd.RewardFactionValue5 || 0,
        questId
      ]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-quest', async (event, questData) => {
  try {
    const pool = await getConnection('world');
    const [maxResult] = await pool.execute(
      'SELECT COALESCE(MAX(ID), 99999) + 1 as next_id FROM quest_template WHERE ID >= 100000'
    );
    const newId = questData.ID || maxResult[0].next_id;

    await pool.execute(
      `INSERT INTO quest_template (ID, LogTitle, QuestLevel, MinLevel, QuestType)
       VALUES (?, ?, ?, ?, ?)`,
      [
        newId,
        questData.LogTitle || 'New Quest',
        questData.QuestLevel || 1,
        questData.MinLevel || 1,
        questData.QuestType || 0
      ]
    );
    return { success: true, data: { ID: newId } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quest-givers', async (event, questId) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      `SELECT cqs.id as entry, ct.name
       FROM creature_queststarter cqs
       LEFT JOIN creature_template ct ON cqs.id = ct.entry
       WHERE cqs.quest = ?
       ORDER BY cqs.id`,
      [questId]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quest-enders', async (event, questId) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      `SELECT cqe.id as entry, ct.name
       FROM creature_questender cqe
       LEFT JOIN creature_template ct ON cqe.id = ct.entry
       WHERE cqe.quest = ?
       ORDER BY cqe.id`,
      [questId]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-quest-giver', async (event, { questId, creatureEntry }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'REPLACE INTO creature_queststarter (id, quest) VALUES (?, ?)',
      [creatureEntry, questId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-quest-ender', async (event, { questId, creatureEntry }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'REPLACE INTO creature_questender (id, quest) VALUES (?, ?)',
      [creatureEntry, questId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-quest-giver', async (event, { questId, creatureEntry }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'DELETE FROM creature_queststarter WHERE id = ? AND quest = ?',
      [creatureEntry, questId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-quest-ender', async (event, { questId, creatureEntry }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'DELETE FROM creature_questender WHERE id = ? AND quest = ?',
      [creatureEntry, questId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── NPC Manager (NEW) ────────────────────────────────────

ipcMain.handle('search-creatures', async (event, { search = '', minLevel, maxLevel }) => {
  try {
    const pool = await getConnection('world');
    let sql, params;
    if (minLevel && maxLevel) {
      sql = `SELECT entry, name, minlevel, maxlevel, faction, rank, \`type\`
             FROM creature_template WHERE minlevel >= ? AND maxlevel <= ?
             ORDER BY minlevel LIMIT 30`;
      params = [parseInt(minLevel), parseInt(maxLevel)];
    } else {
      sql = `SELECT entry, name, minlevel, maxlevel, faction, rank, \`type\`
             FROM creature_template WHERE name LIKE ? OR entry = ?
             ORDER BY entry LIMIT 30`;
      params = [`%${search}%`, parseInt(search) || 0];
    }
    const [rows] = await pool.execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-creature', async (event, entry) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute('SELECT * FROM creature_template WHERE entry = ?', [entry]);
    if (rows.length === 0) return { success: false, error: 'Creature not found' };
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-creature', async (event, { entry, creatureData: cd }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `UPDATE creature_template SET
        name = ?, subname = ?, minlevel = ?, maxlevel = ?,
        faction = ?, npcflag = ?, speed_walk = ?, speed_run = ?,
        BaseAttackTime = ?, RangeAttackTime = ?, unit_class = ?,
        unit_flags = ?, \`type\` = ?, type_flags = ?,
        lootid = ?, mingold = ?, maxgold = ?,
        AIName = ?, ScriptName = ?, modelid1 = ?, modelid2 = ?,
        \`rank\` = ?, HealthModifier = ?, ManaModifier = ?,
        ArmorModifier = ?, DamageModifier = ?, ExperienceModifier = ?
       WHERE entry = ?`,
      [
        cd.name, cd.subname || '', cd.minlevel, cd.maxlevel,
        cd.faction || 0, cd.npcflag || 0, cd.speed_walk || 1, cd.speed_run || 1.14286,
        cd.BaseAttackTime || 2000, cd.RangeAttackTime || 2000, cd.unit_class || 1,
        cd.unit_flags || 0, cd.type || 0, cd.type_flags || 0,
        cd.lootid || 0, cd.mingold || 0, cd.maxgold || 0,
        cd.AIName || '', cd.ScriptName || '', cd.modelid1 || 0, cd.modelid2 || 0,
        cd.rank || 0, cd.HealthModifier || 1, cd.ManaModifier || 1,
        cd.ArmorModifier || 1, cd.DamageModifier || 1, cd.ExperienceModifier || 1,
        entry
      ]
    );
    // Try SOAP reload
    try {
      await soap.sendCommand(`.reload creature_template ${entry}`);
    } catch (e) { /* server may not be running */ }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-creature-spawns', async (event, creatureEntry) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute(
      'SELECT guid, id, map, position_x, position_y, position_z, orientation, spawntimesecs FROM creature WHERE id = ?',
      [creatureEntry]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-creature-spawn', async (event, spawn) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      'INSERT INTO creature (id, map, position_x, position_y, position_z, orientation, spawntimesecs) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [spawn.id, spawn.map, spawn.position_x, spawn.position_y, spawn.position_z, spawn.orientation || 0, spawn.spawntimesecs || 300]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-creature-spawn', async (event, guid) => {
  try {
    const pool = await getConnection('world');
    await pool.execute('DELETE FROM creature WHERE guid = ?', [guid]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Item Editor (NEW) ────────────────────────────────────

ipcMain.handle('get-item-full', async (event, entry) => {
  try {
    const pool = await getConnection('world');
    const [rows] = await pool.execute('SELECT * FROM item_template WHERE entry = ?', [entry]);
    if (rows.length === 0) return { success: false, error: 'Item not found' };
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-item', async (event, { entry, itemData: id }) => {
  try {
    const pool = await getConnection('world');
    await pool.execute(
      `UPDATE item_template SET
        name = ?, description = ?, Quality = ?, ItemLevel = ?, RequiredLevel = ?,
        class = ?, subclass = ?, InventoryType = ?, AllowableClass = ?, AllowableRace = ?,
        stat_type1 = ?, stat_value1 = ?, stat_type2 = ?, stat_value2 = ?,
        stat_type3 = ?, stat_value3 = ?, stat_type4 = ?, stat_value4 = ?,
        stat_type5 = ?, stat_value5 = ?, stat_type6 = ?, stat_value6 = ?,
        stat_type7 = ?, stat_value7 = ?, stat_type8 = ?, stat_value8 = ?,
        stat_type9 = ?, stat_value9 = ?, stat_type10 = ?, stat_value10 = ?,
        dmg_min1 = ?, dmg_max1 = ?, dmg_type1 = ?, armor = ?,
        holy_res = ?, fire_res = ?, nature_res = ?, frost_res = ?, shadow_res = ?, arcane_res = ?,
        delay = ?, bonding = ?, MaxDurability = ?,
        socketColor_1 = ?, socketColor_2 = ?, socketColor_3 = ?, socketBonus = ?,
        BuyPrice = ?, SellPrice = ?, stackable = ?, maxcount = ?
       WHERE entry = ?`,
      [
        id.name, id.description || '', id.Quality || 0, id.ItemLevel || 1, id.RequiredLevel || 0,
        id.class || 0, id.subclass || 0, id.InventoryType || 0, id.AllowableClass || -1, id.AllowableRace || -1,
        id.stat_type1 || 0, id.stat_value1 || 0, id.stat_type2 || 0, id.stat_value2 || 0,
        id.stat_type3 || 0, id.stat_value3 || 0, id.stat_type4 || 0, id.stat_value4 || 0,
        id.stat_type5 || 0, id.stat_value5 || 0, id.stat_type6 || 0, id.stat_value6 || 0,
        id.stat_type7 || 0, id.stat_value7 || 0, id.stat_type8 || 0, id.stat_value8 || 0,
        id.stat_type9 || 0, id.stat_value9 || 0, id.stat_type10 || 0, id.stat_value10 || 0,
        id.dmg_min1 || 0, id.dmg_max1 || 0, id.dmg_type1 || 0, id.armor || 0,
        id.holy_res || 0, id.fire_res || 0, id.nature_res || 0, id.frost_res || 0, id.shadow_res || 0, id.arcane_res || 0,
        id.delay || 0, id.bonding || 0, id.MaxDurability || 0,
        id.socketColor_1 || 0, id.socketColor_2 || 0, id.socketColor_3 || 0, id.socketBonus || 0,
        id.BuyPrice || 0, id.SellPrice || 0, id.stackable || 1, id.maxcount || 0,
        entry
      ]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-item', async (event, itemData) => {
  try {
    const pool = await getConnection('world');
    const [maxResult] = await pool.execute(
      'SELECT COALESCE(MAX(entry), 99999) + 1 as next_id FROM item_template WHERE entry >= 100000'
    );
    const newEntry = itemData.entry || maxResult[0].next_id;
    await pool.execute(
      'INSERT INTO item_template (entry, name, Quality, ItemLevel, class) VALUES (?, ?, ?, ?, ?)',
      [newEntry, itemData.name || 'New Item', itemData.Quality || 0, itemData.ItemLevel || 1, itemData.class || 0]
    );
    return { success: true, data: { entry: newEntry } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-item', async (event, entry) => {
  try {
    const pool = await getConnection('world');
    await pool.execute('DELETE FROM item_template WHERE entry = ?', [entry]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clone-item', async (event, sourceEntry) => {
  try {
    const pool = await getConnection('world');
    const [source] = await pool.execute('SELECT * FROM item_template WHERE entry = ?', [sourceEntry]);
    if (source.length === 0) return { success: false, error: 'Source item not found' };
    const [maxResult] = await pool.execute(
      'SELECT COALESCE(MAX(entry), 99999) + 1 as next_id FROM item_template WHERE entry >= 100000'
    );
    const newEntry = maxResult[0].next_id;
    const cols = Object.keys(source[0]).filter(k => k !== 'entry');
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(k => source[0][k]);
    await pool.execute(
      `INSERT INTO item_template (entry, ${cols.join(', ')}) VALUES (?, ${placeholders})`,
      [newEntry, ...values]
    );
    return { success: true, data: { entry: newEntry } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Player Manager (NEW) ─────────────────────────────────

ipcMain.handle('search-players', async (event, { search = '' }) => {
  try {
    const pool = await getConnection('characters');
    const [rows] = await pool.execute(
      `SELECT guid, name, race, class, level, online, money, zone
       FROM characters WHERE name LIKE ? OR guid = ?
       ORDER BY name LIMIT 30`,
      [`%${search}%`, parseInt(search) || 0]
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-player-detail', async (event, guid) => {
  try {
    const pool = await getConnection('characters');
    const [rows] = await pool.execute('SELECT * FROM characters WHERE guid = ?', [guid]);
    if (rows.length === 0) return { success: false, error: 'Player not found' };
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-player-inventory', async (event, guid) => {
  try {
    const chars = await getConnection('characters');
    const world = await getConnection('world');
    // Get equipped items (bag=0, slots 0-18)
    const [items] = await chars.execute(
      `SELECT ci.slot, ii.itemEntry FROM character_inventory ci
       JOIN item_instance ii ON ci.item = ii.guid
       WHERE ci.guid = ? AND ci.bag = 0 AND ci.slot <= 18
       ORDER BY ci.slot`,
      [guid]
    );
    // Look up item names from world DB
    const enriched = [];
    for (const item of items) {
      try {
        const [itemInfo] = await world.execute(
          'SELECT name, Quality FROM item_template WHERE entry = ?',
          [item.itemEntry]
        );
        enriched.push({ ...item, name: itemInfo[0]?.name || 'Unknown', Quality: itemInfo[0]?.Quality || 0 });
      } catch { enriched.push({ ...item, name: 'Unknown', Quality: 0 }); }
    }
    return { success: true, data: enriched };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-player-guild', async (event, guid) => {
  try {
    const pool = await getConnection('characters');
    const [rows] = await pool.execute(
      `SELECT g.name as guildName, gm.\`rank\` FROM guild_member gm
       JOIN guild g ON gm.guildid = g.guildid WHERE gm.guid = ?`,
      [guid]
    );
    return { success: true, data: rows.length > 0 ? rows[0] : null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-player-account', async (event, guid) => {
  try {
    const chars = await getConnection('characters');
    const [charRows] = await chars.execute('SELECT account FROM characters WHERE guid = ?', [guid]);
    if (charRows.length === 0) return { success: false, error: 'Player not found' };
    const accountId = charRows[0].account;
    const auth = await getConnection('auth');
    const [accRows] = await auth.execute(
      'SELECT id, username, email, last_login FROM account WHERE id = ?',
      [accountId]
    );
    // Check ban
    let banned = false;
    try {
      const [banRows] = await auth.execute(
        'SELECT * FROM account_banned WHERE id = ? AND active = 1',
        [accountId]
      );
      banned = banRows.length > 0;
    } catch {}
    return { success: true, data: { ...(accRows[0] || {}), banned } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('player-command', async (event, { command }) => {
  try {
    const result = await soap.sendCommand(command);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Economy Dashboard ──────────────────────────────────────

ipcMain.handle('get-economy-overview', async () => {
  try {
    const chars = await getConnection('characters');
    // Total gold in economy (money is stored as copper)
    const [totalRow] = await chars.execute('SELECT SUM(money) as totalMoney, COUNT(*) as totalChars FROM characters');
    const totalMoney = totalRow[0].totalMoney || 0;
    const totalChars = totalRow[0].totalChars || 0;
    const avgMoney = totalChars > 0 ? Math.floor(totalMoney / totalChars) : 0;

    // Richest players
    const [richest] = await chars.execute(
      'SELECT guid, name, level, class, money FROM characters ORDER BY money DESC LIMIT 10'
    );

    // Online players' gold
    const [onlineGold] = await chars.execute(
      'SELECT SUM(money) as onlineMoney, COUNT(*) as onlineCount FROM characters WHERE online = 1'
    );

    // Gold distribution by level ranges
    const [distribution] = await chars.execute(
      `SELECT
        CASE
          WHEN level BETWEEN 1 AND 19 THEN '1-19'
          WHEN level BETWEEN 20 AND 39 THEN '20-39'
          WHEN level BETWEEN 40 AND 59 THEN '40-59'
          WHEN level BETWEEN 60 AND 69 THEN '60-69'
          WHEN level BETWEEN 70 AND 79 THEN '70-79'
          WHEN level = 80 THEN '80'
          ELSE 'Other'
        END as levelRange,
        COUNT(*) as playerCount,
        SUM(money) as totalGold,
        AVG(money) as avgGold
      FROM characters
      GROUP BY levelRange
      ORDER BY MIN(level)`
    );

    return {
      success: true,
      data: {
        totalMoney, totalChars, avgMoney,
        richest,
        onlineMoney: onlineGold[0].onlineMoney || 0,
        onlineCount: onlineGold[0].onlineCount || 0,
        distribution
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-ah-stats', async () => {
  try {
    const chars = await getConnection('characters');
    const world = await getConnection('world');

    // Active auctions count and total value
    let ahStats = { totalAuctions: 0, totalBuyout: 0, totalBid: 0 };
    try {
      const [ahRow] = await chars.execute(
        'SELECT COUNT(*) as cnt, SUM(buyoutprice) as buyout, SUM(startbid) as bid FROM auctionhouse'
      );
      ahStats.totalAuctions = ahRow[0].cnt || 0;
      ahStats.totalBuyout = ahRow[0].buyout || 0;
      ahStats.totalBid = ahRow[0].bid || 0;
    } catch { /* auctionhouse table might not exist */ }

    // Most listed items
    let topItems = [];
    try {
      const [topRows] = await chars.execute(
        `SELECT ii.itemEntry, COUNT(*) as cnt
         FROM auctionhouse ah
         JOIN item_instance ii ON ah.itemguid = ii.guid
         GROUP BY ii.itemEntry
         ORDER BY cnt DESC LIMIT 10`
      );
      // Enrich with names
      for (const row of topRows) {
        try {
          const [info] = await world.execute('SELECT name, Quality FROM item_template WHERE entry = ?', [row.itemEntry]);
          topItems.push({ ...row, name: info[0]?.name || 'Unknown', Quality: info[0]?.Quality || 0 });
        } catch { topItems.push({ ...row, name: 'Unknown', Quality: 0 }); }
      }
    } catch { /* auctionhouse join may fail */ }

    return { success: true, data: { ...ahStats, topItems } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Event Scheduler ────────────────────────────────────────

ipcMain.handle('get-all-game-events', async () => {
  try {
    const world = await getConnection('world');
    const [rows] = await world.execute(
      `SELECT eventEntry, start_time, end_time, occurence, length, holiday, description
       FROM game_event ORDER BY eventEntry`
    );
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-game-event', async (event, { eventEntry, eventData }) => {
  try {
    const world = await getConnection('world');
    await world.execute(
      `UPDATE game_event SET start_time = ?, end_time = ?, occurence = ?, length = ?,
       holiday = ?, description = ? WHERE eventEntry = ?`,
      [eventData.start_time, eventData.end_time, eventData.occurence, eventData.length,
       eventData.holiday, eventData.description, eventEntry]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-game-event', async (event, eventData) => {
  try {
    const world = await getConnection('world');
    // Find next available eventEntry
    const [maxRow] = await world.execute('SELECT MAX(eventEntry) as maxId FROM game_event');
    const newId = (maxRow[0].maxId || 0) + 1;
    await world.execute(
      `INSERT INTO game_event (eventEntry, start_time, end_time, occurence, length, holiday, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, eventData.start_time || '2024-01-01 00:00:00', eventData.end_time || '2030-12-31 23:59:59',
       eventData.occurence || 5184000, eventData.length || 2592000,
       eventData.holiday || 0, eventData.description || 'New Event']
    );
    return { success: true, data: newId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-game-event', async (event, eventEntry) => {
  try {
    const world = await getConnection('world');
    await world.execute('DELETE FROM game_event WHERE eventEntry = ?', [eventEntry]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('trigger-game-event', async (event, { eventEntry, action }) => {
  try {
    const cmd = action === 'start' ? `.event start ${eventEntry}` : `.event stop ${eventEntry}`;
    const result = await soap.sendCommand(cmd);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Bot System ─────────────────────────────────────────────

ipcMain.handle('get-bot-config', async () => {
  try {
    const world = await getConnection('world');
    // Try to read from mod_playerbots config table (if installed)
    let config = {};
    try {
      const [rows] = await world.execute(
        "SELECT * FROM mod_playerbots_config LIMIT 50"
      );
      rows.forEach(r => { config[r.name] = r.value; });
    } catch {
      // mod_playerbots might not be installed — return empty config
      config = null;
    }
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('bot-command', async (event, { command }) => {
  try {
    const result = await soap.sendCommand(command);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-bot-stats', async () => {
  try {
    const chars = await getConnection('characters');
    // Count characters that look like bots (common naming convention)
    let botCount = 0;
    try {
      const [rows] = await chars.execute(
        "SELECT COUNT(*) as cnt FROM characters WHERE name LIKE '%bot%' OR account IN (SELECT id FROM account WHERE username LIKE '%bot%')"
      );
      botCount = rows[0].cnt || 0;
    } catch {
      // auth DB cross-query may fail
      try {
        const auth = await getConnection('auth');
        const [accs] = await auth.execute("SELECT id FROM account WHERE username LIKE '%bot%'");
        if (accs.length > 0) {
          const ids = accs.map(a => a.id).join(',');
          const [rows] = await chars.execute(`SELECT COUNT(*) as cnt FROM characters WHERE account IN (${ids})`);
          botCount = rows[0].cnt || 0;
        }
      } catch { botCount = 0; }
    }
    return { success: true, data: { botCount } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── DB2 Browser ─────────────────────────────────────────────

ipcMain.handle('db2-list-files', async () => {
  try {
    const files = await db2Service.listFiles();
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db2-read-file', async (event, { filename, page = 1, limit = 100 }) => {
  try {
    const data = await db2Service.getCachedTable(filename);
    const start = (page - 1) * limit;
    const paged = data.rows.slice(start, start + limit);
    return {
      success: true,
      data: {
        filename: data.filename,
        columns: data.columns,
        rowCount: data.rowCount,
        rows: paged,
        page,
        pages: Math.ceil(data.rowCount / limit)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db2-search', async (event, { filename, query, column }) => {
  try {
    const results = await db2Service.search(filename, query, column);
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db2-export', async (event, { filename, format }) => {
  try {
    const content = await db2Service.exportTable(filename, format);
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db2-get-full-spell', async (event, { spellId }) => {
  try {
    const spell = await db2Service.getFullSpell(spellId);
    return { success: true, data: spell };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Asset Extractor (CASC) ──────────────────────────────────

ipcMain.handle('extractor-set-client-path', async (event, clientPath) => {
  try {
    store.set('extractor.clientPath', clientPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extractor-scan-casc', async () => {
  try {
    const config = store.get('extractor') || {};
    if (!config.clientPath) return { success: false, error: 'No client path set' };
    const info = await cascService.initFromLocal(config.clientPath);
    return { success: true, data: info };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extractor-extract-icons', async (event, options) => {
  try {
    const result = await cascService.extractIcons(options, (msg) => {
      mainWindow?.webContents.send('extractor-progress', msg);
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extractor-extract-minimaps', async () => {
  try {
    // Minimap extraction uses CASC for BLP files
    return { success: false, error: 'Minimap extraction not yet implemented' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extractor-cancel', async () => {
  cascService.cancel();
  return { success: true };
});

// ─── Setup Wizard ────────────────────────────────────────────
// Runs TrinityCore's compiled extractor tools in sequence.
// Each step is a child process with progress reporting.

let wizardProcess = null;

ipcMain.handle('wizard-run-step', async (event, { step, clientPath, outputPath }) => {
  try {
    const config = store.get('extractor') || {};
    const binPath = config.extractorBinPath || '';
    if (!binPath) return { success: false, error: 'Extractor bin path not set. Configure it in Settings.' };

    const tools = {
      1: { exe: 'mapextractor.exe', args: ['-i', clientPath || config.clientPath, '-o', outputPath || config.outputPath, '-e', '7', '-f', '0'], name: 'Map & DB2 Extraction' },
      2: { exe: 'vmap4extractor.exe', args: ['-l', '-d', path.join(clientPath || config.clientPath, 'Data')], name: 'VMap Extraction' },
      3: { exe: 'vmap4assembler.exe', args: [path.join(outputPath || config.outputPath, 'Buildings'), path.join(outputPath || config.outputPath, 'vmaps')], name: 'VMap Assembly' },
      4: { exe: 'mmaps_generator.exe', args: [], name: 'MMap Generation' }
    };

    const tool = tools[step];
    if (!tool) return { success: false, error: `Unknown step: ${step}` };

    const exePath = path.join(binPath, tool.exe);
    if (!fs.existsSync(exePath)) {
      return { success: false, error: `Executable not found: ${exePath}` };
    }

    return new Promise((resolve) => {
      const child = spawn(exePath, tool.args, {
        cwd: outputPath || config.outputPath || binPath
      });
      wizardProcess = child;
      let output = '';

      child.stdout.on('data', (data) => {
        const line = data.toString();
        output += line;
        mainWindow?.webContents.send('wizard-progress', { step, line });
      });

      child.stderr.on('data', (data) => {
        const line = data.toString();
        output += line;
        mainWindow?.webContents.send('wizard-progress', { step, line });
      });

      child.on('close', (code) => {
        wizardProcess = null;
        if (code === 0) {
          resolve({ success: true, data: { step, name: tool.name, output } });
        } else {
          resolve({ success: false, error: `${tool.name} exited with code ${code}`, data: { output } });
        }
      });

      child.on('error', (err) => {
        wizardProcess = null;
        resolve({ success: false, error: err.message });
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wizard-cancel', async () => {
  if (wizardProcess) {
    wizardProcess.kill();
    wizardProcess = null;
    return { success: true };
  }
  return { success: false, error: 'No process running' };
});

// ─── Extractor Config ────────────────────────────────────────

ipcMain.handle('get-extractor-config', async () => {
  return { success: true, data: store.get('extractor') || {} };
});

ipcMain.handle('save-extractor-config', async (event, config) => {
  try {
    store.set('extractor', config);
    db2Service.clearCache();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Dashboard Stats (NEW) ─────────────────────────────────

ipcMain.handle('get-dashboard-stats', async () => {
  const stats = {};

  try {
    const world = await getConnection('world');
    const chars = await getConnection('characters');

    // Creature count
    try {
      const [r] = await world.execute('SELECT COUNT(*) as c FROM creature_template');
      stats.creatures = r[0].c;
    } catch { stats.creatures = null; }

    // Item count
    try {
      const [r] = await world.execute('SELECT COUNT(*) as c FROM item_template');
      stats.items = r[0].c;
    } catch { stats.items = null; }

    // Quest count
    try {
      const [r] = await world.execute('SELECT COUNT(*) as c FROM quest_template');
      stats.quests = r[0].c;
    } catch { stats.quests = null; }

    // Online players
    try {
      const [r] = await chars.execute('SELECT COUNT(*) as c FROM characters WHERE online = 1');
      stats.playersOnline = r[0].c;
    } catch { stats.playersOnline = null; }

    // Total characters
    try {
      const [r] = await chars.execute('SELECT COUNT(*) as c FROM characters');
      stats.totalCharacters = r[0].c;
    } catch { stats.totalCharacters = null; }

    // Total accounts
    try {
      const auth = await getConnection('auth');
      const [r] = await auth.execute('SELECT COUNT(*) as c FROM account');
      stats.totalAccounts = r[0].c;
    } catch { stats.totalAccounts = null; }

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message, data: stats };
  }
});

// ─── WoWHead Integration (existing) ────────────────────────

ipcMain.handle('fetch-wowhead-item', async (event, itemId) => {
  const cheerio = require('cheerio');

  try {
    const url = `https://www.wowhead.com/item=${itemId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    let itemData = null;

    $('script').each((_, elem) => {
      const script = $(elem).html();
      if (script && script.includes('WH.setPageData')) {
        try {
          const match = script.match(/WH\.setPageData\(([\s\S]*?)\);/);
          if (match) {
            const data = JSON.parse(match[1]);
            if (data.name) {
              itemData = {
                id: itemId, name: data.name,
                quality: data.quality || 1, itemLevel: data.level || 0,
                requiredLevel: data.reqlevel || 0, icon: data.icon || ''
              };
            }
          }
        } catch (e) { /* parse error */ }
      }
    });

    return itemData
      ? { success: true, data: itemData }
      : { success: false, error: 'Item not found on WoWHead' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Dialogs & Notifications (existing) ─────────────────────

ipcMain.handle('show-open-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-notification', async (event, { title, body }) => {
  const { Notification } = require('electron');
  new Notification({ title, body }).show();
});
