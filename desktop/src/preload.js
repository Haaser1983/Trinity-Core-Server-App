const { contextBridge, ipcRenderer } = require('electron');

// ─────────────────────────────────────────────────────────────
// THE BRIDGE — Exposes safe APIs from main process to renderer
//
// WHY: The renderer (UI) runs in a sandboxed browser context.
// It cannot access Node.js, MySQL, or SOAP directly. Every
// action goes through these explicitly defined channels.
// This means a bug in the UI can never leak your DB password.
// ─────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('api', {

  // ─── Settings ────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // ─── Database ────────────────────────────────────────────
  testDatabase: (dbName) => ipcRenderer.invoke('test-database', dbName),
  query: (params) => ipcRenderer.invoke('query-database', params),

  // ─── Dashboard ───────────────────────────────────────────
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

  // ─── Items ───────────────────────────────────────────────
  getItems: (params) => ipcRenderer.invoke('get-items', params),
  getItem: (itemId) => ipcRenderer.invoke('get-item', itemId),

  // ─── Players ─────────────────────────────────────────────
  getPlayers: (params) => ipcRenderer.invoke('get-players', params),

  // ─── Server Status ───────────────────────────────────────
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),

  // ─── SOAP (NEW) — Live server commands ───────────────────
  soap: {
    test: () => ipcRenderer.invoke('soap-test'),
    command: (cmd) => ipcRenderer.invoke('soap-command', cmd),
    announce: (message, type) => ipcRenderer.invoke('soap-announce', { message, type }),
    serverInfo: () => ipcRenderer.invoke('soap-server-info'),
  },

  // ─── Control Panel (NEW) ─────────────────────────────────
  control: {
    getXpRate: () => ipcRenderer.invoke('get-xp-rate'),
    setXpRate: (rate) => ipcRenderer.invoke('set-xp-rate', rate),
    getGameEvents: () => ipcRenderer.invoke('get-game-events'),
    toggleGameEvent: (eventEntry, enabled) =>
      ipcRenderer.invoke('toggle-game-event', { eventEntry, enabled }),
  },

  // ─── Boss Scripting / SmartAI (NEW) ─────────────────────
  scripts: {
    searchCreatures: (search) => ipcRenderer.invoke('search-creatures-for-scripts', { search }),
    getScripts: (entryorguid) => ipcRenderer.invoke('get-smart-scripts', entryorguid),
    addScript: (scriptData) => ipcRenderer.invoke('add-smart-script', scriptData),
    updateScript: (entryorguid, id, scriptData) =>
      ipcRenderer.invoke('update-smart-script', { entryorguid, id, scriptData }),
    deleteScript: (entryorguid, id) =>
      ipcRenderer.invoke('delete-smart-script', { entryorguid, id }),
    reloadScripts: () => ipcRenderer.invoke('reload-smart-scripts'),
  },

  // ─── Loot Tables (NEW) ──────────────────────────────────
  loot: {
    getCreatureLootId: (creatureEntry) => ipcRenderer.invoke('get-creature-lootid', creatureEntry),
    getCreatureLoot: (lootId) => ipcRenderer.invoke('get-creature-loot', lootId),
    searchItems: (search) => ipcRenderer.invoke('search-items-for-loot', search),
    addEntry: (lootData) => ipcRenderer.invoke('add-loot-entry', lootData),
    updateEntry: (lootId, itemId, lootData) =>
      ipcRenderer.invoke('update-loot-entry', { lootId, itemId, lootData }),
    deleteEntry: (lootId, itemId) =>
      ipcRenderer.invoke('delete-loot-entry', { lootId, itemId }),
    getReferenceLoot: (referenceId) => ipcRenderer.invoke('get-reference-loot', referenceId),
    createLootTable: (creatureEntry, lootId) =>
      ipcRenderer.invoke('create-loot-table', { creatureEntry, lootId }),
  },

  // ─── Quest Builder (NEW) ────────────────────────────────
  quests: {
    search: (search) => ipcRenderer.invoke('search-quests', { search }),
    getQuest: (questId) => ipcRenderer.invoke('get-quest', questId),
    updateQuest: (questId, questData) =>
      ipcRenderer.invoke('update-quest', { questId, questData }),
    createQuest: (questData) => ipcRenderer.invoke('create-quest', questData),
    getQuestGivers: (questId) => ipcRenderer.invoke('get-quest-givers', questId),
    getQuestEnders: (questId) => ipcRenderer.invoke('get-quest-enders', questId),
    setQuestGiver: (questId, creatureEntry) =>
      ipcRenderer.invoke('set-quest-giver', { questId, creatureEntry }),
    setQuestEnder: (questId, creatureEntry) =>
      ipcRenderer.invoke('set-quest-ender', { questId, creatureEntry }),
    removeQuestGiver: (questId, creatureEntry) =>
      ipcRenderer.invoke('remove-quest-giver', { questId, creatureEntry }),
    removeQuestEnder: (questId, creatureEntry) =>
      ipcRenderer.invoke('remove-quest-ender', { questId, creatureEntry }),
  },

  // ─── NPC Manager (NEW) ──────────────────────────────────
  npcs: {
    search: (search, minLevel, maxLevel) =>
      ipcRenderer.invoke('search-creatures', { search, minLevel, maxLevel }),
    get: (entry) => ipcRenderer.invoke('get-creature', entry),
    update: (entry, creatureData) =>
      ipcRenderer.invoke('update-creature', { entry, creatureData }),
    getSpawns: (entry) => ipcRenderer.invoke('get-creature-spawns', entry),
    addSpawn: (spawn) => ipcRenderer.invoke('add-creature-spawn', spawn),
    deleteSpawn: (guid) => ipcRenderer.invoke('delete-creature-spawn', guid),
  },

  // ─── Item Editor (NEW) ──────────────────────────────────
  itemEditor: {
    get: (entry) => ipcRenderer.invoke('get-item-full', entry),
    update: (entry, itemData) => ipcRenderer.invoke('update-item', { entry, itemData }),
    create: (itemData) => ipcRenderer.invoke('create-item', itemData),
    delete: (entry) => ipcRenderer.invoke('delete-item', entry),
    clone: (entry) => ipcRenderer.invoke('clone-item', entry),
  },

  // ─── Player Manager (NEW) ───────────────────────────────
  playerManager: {
    search: (search) => ipcRenderer.invoke('search-players', { search }),
    getDetail: (guid) => ipcRenderer.invoke('get-player-detail', guid),
    getInventory: (guid) => ipcRenderer.invoke('get-player-inventory', guid),
    getGuild: (guid) => ipcRenderer.invoke('get-player-guild', guid),
    getAccount: (guid) => ipcRenderer.invoke('get-player-account', guid),
    command: (command) => ipcRenderer.invoke('player-command', { command }),
  },

  // ─── Economy Dashboard ──────────────────────────────────
  economy: {
    getOverview: () => ipcRenderer.invoke('get-economy-overview'),
    getAhStats: () => ipcRenderer.invoke('get-ah-stats'),
  },

  // ─── Event Scheduler ──────────────────────────────────────
  events: {
    getAll: () => ipcRenderer.invoke('get-all-game-events'),
    update: (eventEntry, eventData) =>
      ipcRenderer.invoke('update-game-event', { eventEntry, eventData }),
    create: (eventData) => ipcRenderer.invoke('create-game-event', eventData),
    delete: (eventEntry) => ipcRenderer.invoke('delete-game-event', eventEntry),
    trigger: (eventEntry, action) =>
      ipcRenderer.invoke('trigger-game-event', { eventEntry, action }),
  },

  // ─── Bot System ────────────────────────────────────────────
  bots: {
    getConfig: () => ipcRenderer.invoke('get-bot-config'),
    command: (command) => ipcRenderer.invoke('bot-command', { command }),
    getStats: () => ipcRenderer.invoke('get-bot-stats'),
  },

  // ─── DB2 Browser ────────────────────────────────────────
  db2: {
    listFiles: () => ipcRenderer.invoke('db2-list-files'),
    readFile: (params) => ipcRenderer.invoke('db2-read-file', params),
    search: (params) => ipcRenderer.invoke('db2-search', params),
    export: (params) => ipcRenderer.invoke('db2-export', params),
    getFullSpell: (params) => ipcRenderer.invoke('db2-get-full-spell', params),
  },

  // ─── Asset Extractor (CASC) ────────────────────────────
  extractor: {
    setClientPath: (path) => ipcRenderer.invoke('extractor-set-client-path', path),
    scanCasc: () => ipcRenderer.invoke('extractor-scan-casc'),
    extractIcons: (opts) => ipcRenderer.invoke('extractor-extract-icons', opts),
    extractMinimaps: () => ipcRenderer.invoke('extractor-extract-minimaps'),
    cancel: () => ipcRenderer.invoke('extractor-cancel'),
    getConfig: () => ipcRenderer.invoke('get-extractor-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-extractor-config', config),
    onProgress: (callback) => {
      ipcRenderer.removeAllListeners('extractor-progress');
      ipcRenderer.on('extractor-progress', (_, msg) => callback(msg));
    },
  },

  // ─── Setup Wizard ──────────────────────────────────────
  wizard: {
    runStep: (params) => ipcRenderer.invoke('wizard-run-step', params),
    cancel: () => ipcRenderer.invoke('wizard-cancel'),
    onProgress: (callback) => {
      ipcRenderer.removeAllListeners('wizard-progress');
      ipcRenderer.on('wizard-progress', (_, data) => callback(data));
    },
  },

  // ─── WoWHead ─────────────────────────────────────────────
  fetchWowheadItem: (itemId) => ipcRenderer.invoke('fetch-wowhead-item', itemId),

  // ─── Dialogs & Notifications ─────────────────────────────
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showNotification: (params) => ipcRenderer.invoke('show-notification', params),
});
