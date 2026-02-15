# CompApp — Feature Status

Last updated: 2026-02-15

## Completed Features

| # | Feature | Page | Key Files |
|---|---------|------|-----------|
| 1 | Dashboard | `page-dashboard` | app.js: `loadDashboard()` |
| 2 | Control Panel | `page-control` | app.js: `loadControlPanel()`, SOAP console, XP slider, holidays |
| 3 | Item Browser | `page-items` | app.js: `loadItems()`, paginated item_template search |
| 4 | Player Browser | `page-players` | app.js: `loadPlayers()`, online filter |
| 5 | WoWHead Import | `page-wowhead` | app.js: `fetchWowheadItem()`, `importWowheadItem()` |
| 6 | Settings | `page-settings` | app.js: `saveSettings()`, DB + SOAP + server config |
| 7 | NPC Manager | `page-npcs` | app.js: NPC CRUD, spawn management, SOAP reload |
| 8 | Item Editor | `page-item-editor` | app.js: Full CRUD, clone, delete, tooltip preview |
| 9 | Loot Table Builder | `page-loot` | app.js: Visual loot editor, drop simulation |
| 10 | Boss Scripting | `page-boss` | app.js: SmartAI event/action/target builder |
| 11 | Quest Builder | `page-quests` | app.js: Full quest editor, chain viz, givers/enders |
| 12 | Player Manager | `page-player-manager` | app.js: Detail view, inventory, guild, SOAP commands |
| 13 | Economy Dashboard | `page-economy` | app.js: Gold stats, AH stats, distribution |
| 14 | Event Scheduler | `page-events` | app.js: game_event CRUD, live start/stop |
| 15 | Bot System | `page-bots` | app.js: PlayerBots config, quick commands |
| 16 | DB2/Extractor | `page-extractor` | app.js: 5 sub-tabs (DB2 Browser, Spell Viewer, Setup Wizard, Asset Extractor, Config) |

## Services

| Service | File | Status |
|---------|------|--------|
| SoapService | `src/services/soap.js` | Complete — sendCommand, announce, notify, serverInfo, testConnection, reloadGameEvent |
| DB2Service | `src/services/db2.js` | Complete — listFiles, getCachedTable, search, exportTable, getFullSpell, clearCache |
| CASCService | `src/services/casc.js` | Complete — initFromLocal, extractIcons, cancel |
| BLPConverter | `src/services/blp.js` | Complete — convertToPng (paletted + DXT), convertDirectory |
| Store | `src/store.js` | Complete — get/set with dot-notation, auto-persist to JSON |

## IPC Channel Count

- **86** request/response channels (`ipcMain.handle` / `ipcRenderer.invoke`)
- **2** push channels (`webContents.send` / `ipcRenderer.on`): `extractor-progress`, `wizard-progress`
- **0** mismatches (verified 2026-02-15)

## Bug Fixes Applied (2026-02-15)

1. Fixed 4 SOAP handlers calling class instead of instance (`soap.sendCommand()`)
2. Added missing `axios` require in main.js
3. Added `script-src 'self' 'unsafe-inline'` to CSP for dynamic onclick handlers
4. Defined missing CSS variables (`--color-success`, `--color-error`, `--bg-darker`)
5. Fixed `onProgress` listener leak in preload.js (`removeAllListeners` before `on`)
6. Wired up dead `import-wowhead-btn` button
7. Added missing `navigateToPage` switch cases for `wowhead` and `settings`

## Optional Dependencies (not yet installed)

| Package | Required By | Note |
|---------|-------------|------|
| `@rhyster/wow-casc-dbc` | DB2 Browser, CASC Extractor | ESM module, bridged via dynamic import |
| `sharp` | BLP Converter | Native module, lazy-loaded |
