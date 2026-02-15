# CompApp — TrinityCore Companion

Standalone Electron desktop app for managing a TrinityCore 3.3.5a WoW private server. Direct MySQL access to all four databases, live SOAP commands, WoWHead integration, and a WoW-themed dark UI.

![Status](https://img.shields.io/badge/status-active%20development-yellow)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Quick Start

```bash
cd desktop
npm install
npm start          # production
npm run dev        # with DevTools
```

Configure your MySQL credentials and SOAP settings in the **Settings** page on first launch.

---

## Features

### Core

| Page | Description |
|------|-------------|
| **Dashboard** | Server stats, online players, quick-action tiles |
| **Control Panel** | SOAP console, XP rate slider, holiday event toggles, broadcasts |
| **Settings** | Database credentials, SOAP config, server ports |

### Data Editors

| Page | Description |
|------|-------------|
| **NPC Manager** | Search/edit creature_template, manage spawns, SOAP reload |
| **Item Editor** | Full item_template CRUD, clone, tooltip preview, all 100+ fields |
| **Loot Table Builder** | Visual loot editor with drop simulation, group/reference loot |
| **Boss Scripting** | SmartAI event builder — event/action/target with all params |
| **Quest Builder** | Full quest editor with chain visualization, giver/ender assignment |

### Server Management

| Page | Description |
|------|-------------|
| **Player Manager** | Player lookup, inventory, guild, account info, SOAP commands (teleport, ban, grant items, mail) |
| **Economy Dashboard** | Total gold, richest players, gold distribution by level, auction house stats |
| **Event Scheduler** | Full game_event CRUD, live start/stop via SOAP |
| **Bot System** | PlayerBots module status, quick commands, custom SOAP |

### Tools

| Page | Description |
|------|-------------|
| **WoWHead Import** | Fetch item data by ID, import to database |
| **DB2 Browser** | Browse .db2 files (WDC3/4/5), search, paginate, export JSON/SQL |
| **Spell Viewer** | Combined spell view joining 8 DB2 tables |
| **Setup Wizard** | Run TrinityCore extractors (mapextractor, vmap, mmaps) with progress |
| **Asset Extractor** | CASC-based icon/texture extraction with BLP→PNG conversion |

---

## Architecture

```
desktop/
├── src/
│   ├── main.js              # Electron main process (IPC handlers, MySQL, SOAP)
│   ├── preload.js           # Context bridge (86 IPC channels)
│   ├── store.js             # JSON config persistence
│   └── services/
│       ├── soap.js          # SOAP XML-RPC client for worldserver
│       ├── db2.js           # DB2/DBC file parser (WDC3/4/5)
│       ├── casc.js          # CASC archive client for asset extraction
│       └── blp.js           # BLP texture → PNG converter
├── ui/
│   ├── index.html           # Single-page app (16 pages, tabbed navigation)
│   ├── app.js               # All renderer logic (~3600 lines)
│   └── styles.css           # WoW-themed dark UI (~1950 lines)
└── package.json
```

**Key design decisions:**
- **No framework** — vanilla HTML/CSS/JS renderer for zero build step and fast iteration
- **contextIsolation: true** — all Node.js access goes through explicit IPC channels in preload.js
- **4 MySQL pools** — auth, characters, world, hotfixes with auto-reconnect
- **SOAP integration** — live server commands without restart
- **Graceful degradation** — every DB query is wrapped in try/catch; missing tables don't crash the app

---

## Database Connections

The app connects to four TrinityCore databases via MySQL2 connection pools:

| Pool | Database | Used By |
|------|----------|---------|
| `auth` | Account data | Player Manager (account info, bans) |
| `characters` | Character data | Players, Economy, Bots |
| `world` | Game data | NPCs, Items, Quests, Loot, Scripts, Events |
| `hotfixes` | Client patches | DB2 Browser (future) |

---

## SOAP Commands

When SOAP is enabled and configured, these features use live server commands:

- **Control Panel** — `.server info`, custom console commands, broadcasts
- **NPC Manager** — `.reload creature_template` after edits
- **Boss Scripting** — `reload smart_scripts`
- **Player Manager** — `.tele`, `.additem`, `.setlevel`, `.ban`, `.unban`, `.send mail`
- **Event Scheduler** — `.event start/stop`
- **Bot System** — `.playerbots` commands

---

## Development

```bash
npm run dev        # Launch with DevTools open
```

The app uses no build tools — edit `ui/app.js`, `ui/styles.css`, or `ui/index.html` and reload (`Ctrl+R`).

### Adding a new IPC handler

1. Add `ipcMain.handle('channel-name', ...)` in `src/main.js`
2. Add the bridge method in `src/preload.js`
3. Call `window.api.namespace.method()` from `ui/app.js`

### Optional dependencies (not in package.json yet)

| Package | Used By | Purpose |
|---------|---------|---------|
| `@rhyster/wow-casc-dbc` | DB2 Browser, CASC Extractor | Parse DB2 files, read CASC archives |
| `sharp` | BLP Converter | Convert BLP textures to PNG |

---

## License

MIT
