# CompApp — Master Build Prompt for VSCode AI Assistant

> **Copy this entire file into your VSCode AI assistant (Copilot Chat, Cursor, Claude, etc.) as the starting prompt when you want to build new features.**

---

## WHO I AM

I'm John. I'm building CompApp — an Electron desktop application that manages my TrinityCore WoW private server. I need you to help me build features one at a time, following the exact architecture and patterns already established in my codebase.

---

## PROJECT LOCATION

```
D:\Trinity Core\Tools\CompApp\desktop\
```

---

## WHAT'S ALREADY BUILT

### File Structure
```
desktop/
├── package.json              # Electron app config, dependencies
├── src/
│   ├── main.js               # Main process — IPC handlers, DB pools, SOAP
│   ├── preload.js             # IPC bridge — exposes window.api to renderer
│   ├── store.js               # JSON config persistence (AppData)
│   └── services/
│       ├── soap.js            # SOAP service — sends GM commands to worldserver
│       └── TrinityItemGenerator.js  # Item generation utilities
└── ui/
    ├── index.html             # All pages (SPA with show/hide)
    ├── styles.css             # WoW-themed CSS (gold/leather/parchment)
    └── app.js                 # UI controller — navigation, data loading, events
```

### Working Features
1. **Dashboard** — Live stats from DB (players online, total characters, items, creatures, quests, accounts)
2. **Control Panel** — Broadcast messages (announce/notify/alert), XP rate slider with presets, holiday/game event toggles from game_event table, SOAP command console with history and quick-command buttons
3. **Item Browser** — Paginated item_template search with quality-colored names
4. **Player List** — Character roster with online filter, pagination
5. **WoWHead Import** — Fetches item data from WoWHead by ID
6. **Settings** — Database config (host, port, user, pass, 4 database names), SOAP config (host, port, user, pass), connection testing
7. **Connection Status** — Sidebar indicators for DB and SOAP with auto-refresh

### Installed Dependencies (package.json)
```json
{
  "dependencies": {
    "mysql2": "^3.6.5",
    "axios": "^1.6.2",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

---

## ARCHITECTURE RULES — FOLLOW THESE EXACTLY

### 1. Two-Process Model (Electron)
- **Main process** (src/main.js): Node.js — has access to MySQL, filesystem, SOAP, system APIs
- **Renderer process** (ui/): Browser — HTML/CSS/JS only, NO Node.js access
- **Bridge** (src/preload.js): Whitelists specific IPC channels via contextBridge

### 2. Adding a New Feature — The Pattern
Every feature follows this exact flow:

**Step A: Add IPC handler in src/main.js**
```javascript
ipcMain.handle('my-new-feature', async (event, params) => {
  try {
    const pool = await getConnection('world'); // or 'characters', 'auth'
    const [rows] = await pool.execute('SELECT * FROM some_table WHERE id = ?', [params.id]);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Step B: Expose in src/preload.js**
```javascript
// Inside contextBridge.exposeInMainWorld('api', { ... })
myFeature: {
  getData: (params) => ipcRenderer.invoke('my-new-feature', params),
},
```

**Step C: Add page HTML in ui/index.html**
```html
<!-- Add nav item in sidebar -->
<li class="nav-item" data-page="myfeature">
    <span class="icon">🆕</span><span>My Feature</span>
</li>

<!-- Add page section in main-content -->
<div id="page-myfeature" class="page">
    <header class="page-header">
        <div>
            <h2>My Feature</h2>
            <div class="page-desc">Description here</div>
        </div>
    </header>
    <!-- Feature content using .panel, .panel-title, .panel-body classes -->
</div>
```

**Step D: Wire up in ui/app.js**
```javascript
// In navigateToPage() switch:
case 'myfeature': loadMyFeature(); break;

// Add the load function:
async function loadMyFeature() {
  const result = await window.api.myFeature.getData({ id: 123 });
  if (result.success) {
    // Render data into DOM
  }
}
```

### 3. Database Connections
- **4 databases** on Hostgator: auth, characters, world, hotfixes
- Use getConnection('world') etc. — returns a mysql2 pool
- Always use parameterized queries: pool.execute('SELECT * FROM x WHERE id = ?', [id])
- Pool handles reconnection automatically

### 4. SOAP Commands
- Available via soap.sendCommand('.command here') in main.js
- Or via window.api.soap.command('.command here') from renderer
- Common commands: .server info, .announce <msg>, .reload config, .reload creature_template <id>, .reload game_event, .reload all, .npc add <id>, .modify xp <amount>, .account onlinelist, .server shutdown <seconds>

### 5. UI Patterns
- **Single Page App**: All pages are <div class="page"> sections, shown/hidden via .active class
- **Panels**: Use .panel > .panel-title + .panel-body for content sections
- **Buttons**: .btn .btn-primary (gold), .btn .btn-secondary (outline), .btn .btn-danger, .btn .btn-success
- **Tables**: .table-container > table.data-table
- **Inputs**: Standard <input> and <textarea> are already styled
- **Toggles**: .toggle > .knob with .on class for enabled state
- **Toasts**: Call showToast('message', 'success') or showToast('message', 'error')
- **Fonts**: Cinzel (headings), Crimson Text (body), monospace (console)
- **Colors**: CSS variables — var(--gold), var(--text-primary), var(--text-muted), var(--text-dim), var(--bg-panel), var(--border), var(--success), var(--error)

### 6. Error Handling
- Every IPC handler returns { success: true, data: ... } or { success: false, error: '...' }
- UI always checks result.success before rendering
- SOAP errors are caught and shown as toasts

### 7. Security
- contextIsolation: true, nodeIntegration: false
- All DB credentials stay in main process, never exposed to renderer
- Parameterized SQL queries everywhere (no string concatenation)
- HTML escaped with escapeHtml() before rendering user data

---

## DATABASE SCHEMA REFERENCE

### World Database (hiefcnte_WOWServer)
Key tables for features:

```
creature_template     — NPC definitions (entry, name, minlevel, maxlevel, faction, modelid1, etc.)
creature              — Spawned NPCs (guid, id→creature_template.entry, map, position_x/y/z, orientation)
waypoint_data         — Patrol paths (id→creature.guid, point, position_x/y/z, delay)
item_template         — Items (entry, name, Quality, ItemLevel, RequiredLevel, class, subclass, stat fields)
quest_template        — Quests (ID, LogTitle, QuestLevel, MinLevel, MaxLevel, etc.)
quest_template_addon  — Extra quest flags
creature_queststarter — Links NPC → quest they give
creature_questender   — Links NPC → quest they complete
game_event            — Holidays/events (eventEntry, start_time, end_time, description, holiday)
smart_scripts         — SmartAI scripting (entryorguid, event_type, action_type, etc.)
creature_loot_template    — NPC drops (Entry, Item, Chance, etc.)
reference_loot_template   — Shared loot groups
gameobject_loot_template  — Chest/object drops
spell_dbc             — Spell definitions (may not exist — check)
auctionhouse          — Active auctions
```

### Characters Database (hiefcnte_WOWChars)
```
characters            — All characters (guid, name, race, class, level, online, money, zone, map, position_x/y/z)
character_inventory   — Bags/equipment (guid, bag, slot, item→item_instance.guid)
item_instance         — Actual item instances (guid, itemEntry→item_template.entry, owner_guid)
guild                 — Guilds (guildid, name, leaderguid)
guild_member          — Guild roster (guildid, guid, rank)
arena_team            — Arena teams
arena_team_member     — Arena roster
mail                  — In-game mail
mail_items            — Mail attachments
character_achievement — Player achievements
```

### Auth Database (hiefcnte_WOWAuth)
```
account               — Accounts (id, username, email, last_login, online)
account_banned         — Ban records
realmlist              — Server realm definitions
```

---

## FEATURES TO BUILD — IN ORDER

Build each feature completely before moving to the next. Each feature needs: IPC handlers in main.js, preload bridge, HTML page, CSS if needed, and app.js wiring.

---

### FEATURE 1: NPC Manager
**Nav icon:** 👾 | **Page ID:** npcs

**UI Components:**
- Search bar (by name, entry ID, or level range)
- Results table: entry, name, minlevel-maxlevel, faction, modelid, rank, type
- Click a row → opens detail/edit panel
- Detail panel: editable fields for ALL important creature_template columns
- "Save" button → UPDATE creature_template + SOAP .reload creature_template <entry>
- "Spawn" section: map dropdown, x/y/z coordinate inputs, "Add Spawn" button → INSERT into creature table

**IPC Handlers needed:**
```
search-creatures     — SELECT from creature_template with name LIKE or entry = or level range
get-creature         — SELECT * FROM creature_template WHERE entry = ?
update-creature      — UPDATE creature_template SET ... WHERE entry = ? + SOAP reload
get-creature-spawns  — SELECT * FROM creature WHERE id = ? (all spawn points for an NPC)
add-creature-spawn   — INSERT INTO creature (id, map, position_x, position_y, position_z, orientation, spawntimesecs)
delete-creature-spawn — DELETE FROM creature WHERE guid = ?
```

**Important creature_template columns to expose in editor:**
entry, name, subname, minlevel, maxlevel, faction, npcflag, speed_walk, speed_run, BaseAttackTime, RangeAttackTime, unit_class, unit_flags, type, type_flags, lootid, mingold, maxgold, AIName, ScriptName, modelid1, modelid2, rank (0=Normal, 1=Elite, 2=Rare Elite, 3=Boss, 4=Rare), HealthModifier, ManaModifier, ArmorModifier, DamageModifier, ExperienceModifier

---

### FEATURE 2: Item Editor
**Nav icon:** 🗡️ | **Page ID:** item-editor

**UI Components:**
- Upgrade the existing Item Browser page to include an edit mode
- Click "Edit" on any item → opens full item editor panel
- WoW-style tooltip preview (colored name by quality, stat lines, flavor text)
- Quality selector with color preview (Poor=grey through Legendary=orange)
- Stat fields organized by category: Base Stats, Combat Stats, Resistances, Sockets
- "Create New Item" button with entry ID auto-generation (find max entry + 1)
- "Clone Item" button — copies all fields, assigns new entry

**IPC Handlers needed:**
```
get-item-full        — SELECT * FROM item_template WHERE entry = ? (all columns)
update-item          — UPDATE item_template SET ... WHERE entry = ?
create-item          — INSERT INTO item_template (all columns)
delete-item          — DELETE FROM item_template WHERE entry = ?
get-max-item-entry   — SELECT MAX(entry) FROM item_template (for auto-ID)
```

**Item tooltip rendering rules:**
- Name color by Quality: 0=#9d9d9d, 1=#ffffff, 2=#1eff00, 3=#0070dd, 4=#a335ee, 5=#ff8000, 6=#e6cc80
- Show: name, binding type, slot, armor type, stats, flavor text in yellow italic
- Build as a reusable function: renderItemTooltip(itemData) that returns HTML

**Important item_template columns for editor:**
entry, name, description (flavor text), Quality, ItemLevel, RequiredLevel, class, subclass, InventoryType, AllowableClass, AllowableRace, stat_type1-10, stat_value1-10, dmg_min1, dmg_max1, dmg_type1, armor, holy_res, fire_res, nature_res, frost_res, shadow_res, arcane_res, delay, bonding, MaxDurability, socketColor_1/2/3, socketBonus, BuyPrice, SellPrice, stackable, maxcount

---

### FEATURE 3: Loot Table Builder
**Nav icon:** 💰 | **Page ID:** loot

**UI Components:**
- Search for a creature or object to edit its loot
- Display current loot table as visual cards (item icon placeholder, name, drop chance bar)
- Add item to loot table: item search → set chance %, min/max count, group ID
- Drop chance visualization: colored progress bars (100% = green, <1% = red)
- "Simulate Kill" button: randomly rolls the loot table and shows what would drop
- Reference loot group support (shared loot pools)

**IPC Handlers needed:**
```
get-creature-loot    — SELECT clt.*, it.name, it.Quality FROM creature_loot_template clt JOIN item_template it ON clt.Item = it.entry WHERE clt.Entry = ?
add-loot-entry       — INSERT INTO creature_loot_template
update-loot-entry    — UPDATE creature_loot_template SET Chance=?, MinCount=?, MaxCount=? WHERE Entry=? AND Item=?
delete-loot-entry    — DELETE FROM creature_loot_template WHERE Entry=? AND Item=?
get-reference-loot   — SELECT * FROM reference_loot_template WHERE Entry = ?
```

**Loot table columns:** Entry, Item, Reference, Chance, QuestRequired, LootMode, GroupId, MinCount, MaxCount

---

### FEATURE 4: Boss Scripting (SmartAI)
**Nav icon:** 💀 | **Page ID:** boss

**UI Components:**
- Select a creature to script (search by name/entry)
- Display existing smart_scripts as a timeline/list
- Visual event builder with dropdowns for event type, action type, parameters
- "Add Script Row" button
- Export to SQL (generates INSERT statements)
- "Apply" button: writes to DB + SOAP .reload smart_scripts

**IPC Handlers needed:**
```
get-smart-scripts    — SELECT * FROM smart_scripts WHERE entryorguid = ? AND source_type = 0 ORDER BY id
add-smart-script     — INSERT INTO smart_scripts
update-smart-script  — UPDATE smart_scripts SET ... WHERE entryorguid=? AND id=?
delete-smart-script  — DELETE FROM smart_scripts WHERE entryorguid=? AND id=?
export-smart-scripts — Generate SQL text for all scripts of an entry
reload-smart-scripts — SOAP: .reload smart_scripts
```

**SmartAI event types to support:**
0=UpdateIC (timed in combat), 1=UpdateOOC, 2=HealthPct, 4=Aggro, 5=Kill, 6=Death, 7=Evade, 8=SpellHit, 9=Range, 11=Respawn, 25=Reset, 34=MovementInform

**SmartAI action types to support:**
1=Talk, 11=Cast, 12=SummonCreature, 17=SetFaction, 18=MorphToEntry, 20=CastSelf, 24=Evade, 33=SetPhase, 37=SetData, 41=Flee, 44=SetHP, 75=CloseGossip

---

### FEATURE 5: Quest Builder
**Nav icon:** 📜 | **Page ID:** quests

**UI Components:**
- Quest search (by name or ID)
- Quest editor with sections: Basic, Text, Objectives, Rewards, Chain
- Quest giver/ender NPC assignment
- "Create New Quest" with auto-ID
- WoW-style quest text preview

**IPC Handlers needed:**
```
search-quests, get-quest, update-quest, create-quest
get-quest-givers, get-quest-enders, set-quest-giver, set-quest-ender
remove-quest-giver, remove-quest-ender
```

---

### FEATURE 6: Player Manager
**Nav icon:** 👥 | **Page ID:** player-manager

Upgrade existing Players page with:
- Click player → detail panel (info, equipment, guild)
- Action buttons: Teleport, Grant Item, Set Level, Ban/Unban, Send Mail

---

### FEATURE 7: Economy Dashboard + AH Bot
**Nav icon:** 🪙 | **Page ID:** economy

- Gold overview, AH stats, richest players
- AH Bot configuration UI

---

### FEATURE 8: Event Scheduler
**Nav icon:** 📅 | **Page ID:** events

- Calendar view, event creation, recurrence, auto-triggers via SOAP

---

### FEATURE 9: Bot System
**Nav icon:** 🤖 | **Page ID:** bots

- Bot configuration for mod-playerbots, zone population, behavior profiles

---

## GENERAL INSTRUCTIONS FOR THE AI

1. **Ask me which feature to build** if I don't specify one
2. **Build one complete feature at a time** — don't half-build multiple features
3. **Follow the IPC pattern exactly**: handler in main.js → bridge in preload.js → HTML in index.html → logic in app.js
4. **Use the WoW theme classes** already in styles.css (.panel, .btn-primary, .data-table, etc.)
5. **Always use parameterized queries** — never concatenate user input into SQL
6. **Always return { success, data/error }** from IPC handlers
7. **Always escape HTML** when rendering data with escapeHtml()
8. **Add comments explaining WHY** — I'm learning this codebase
9. **Test SOAP availability** before sending commands — the server might not be running
10. **Keep the UI consistent** — same panel style, same button styles, same layout patterns
11. **Don't create new files unless necessary** — add to existing files following the established structure
12. **When adding CSS**, add it to the existing styles.css in a clearly labeled section

---

## HOW TO RUN AND TEST

```bash
cd "D:\Trinity Core\Tools\CompApp\desktop"
npm start          # Normal launch
npm run dev        # Launch with DevTools open
```

Database is live on Hostgator — queries execute against real data. Be careful with UPDATE/DELETE operations.
