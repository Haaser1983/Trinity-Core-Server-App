# TrinityCore Companion App - Backend

🎮 **WoWHead-Integrated Control Panel for TrinityCore**

## Quick Start

### 1. Install Dependencies

```bash
cd "D:\Trinity Core\Tools\CompApp\backend"
npm install
```

### 2. Configure Database

Edit `.env` file with your TrinityCore MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=trinity
DB_PASS=trinity
```

### 3. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## Features

✅ **WoWHead Integration**
- Fetch items, NPCs, spells directly from WoWHead
- Automatic caching (24-hour TTL)
- Search functionality

✅ **TrinityCore Database Access**
- Query items, players, server status
- Direct MySQL access to auth/world/characters databases

✅ **Code Generation** (Coming Soon)
- Generate item SQL from WoWHead data
- Create boss C++ scripts automatically
- Build loot tables

## API Endpoints

### WoWHead Data

```
GET  /api/wowhead/items/:id              # Get item by ID
GET  /api/wowhead/items/search/:query    # Search items
GET  /api/wowhead/npcs/:id               # Get NPC data
GET  /api/wowhead/spells/:id             # Get spell data
```

### TrinityCore Database

```
GET  /api/items                          # List all items (paginated)
GET  /api/items/:id                      # Get item by entry
GET  /api/players                        # List all players
GET  /api/players/online                 # Get online players
GET  /api/players/:guid                  # Get player by GUID
GET  /api/server/status                  # Server status
GET  /api/server/metrics                 # Server metrics
```

### Code Generation (Coming Soon)

```
POST /api/generate/item/:id              # Generate item SQL
POST /api/generate/boss/:id              # Generate boss C++ script
POST /api/generate/loot/:npcId           # Generate loot table SQL
```

## Testing the API

### Test WoWHead Integration

```bash
# Get Thunderfury item data
curl http://localhost:3001/api/wowhead/items/19019

# Search for swords
curl http://localhost:3001/api/wowhead/items/search/sword
```

### Test Database Access

```bash
# Get first 10 items
curl http://localhost:3001/api/items?limit=10

# Get online players
curl http://localhost:3001/api/players/online

# Get server metrics
curl http://localhost:3001/api/server/metrics
```

## Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── database.ts           # MySQL connection pools
│   │   └── WowheadService.ts     # WoWHead API integration
│   ├── routes/
│   │   ├── wowhead.ts            # WoWHead endpoints
│   │   ├── items.ts              # Item database endpoints
│   │   ├── players.ts            # Player endpoints
│   │   ├── server.ts             # Server status endpoints
│   │   └── generator.ts          # Code generation (TODO)
│   ├── models/                   # Type definitions
│   ├── utils/                    # Utilities
│   └── index.ts                  # Main app
├── cache/                        # WoWHead cache directory
├── .env                          # Environment configuration
├── package.json
└── tsconfig.json
```

## Development Commands

```bash
npm run dev      # Start development server (auto-reload)
npm run build    # Compile TypeScript
npm start        # Run production build
npm test         # Run tests (TODO)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment |
| `DB_HOST` | localhost | MySQL host |
| `DB_PORT` | 3306 | MySQL port |
| `DB_USER` | trinity | MySQL user |
| `DB_PASS` | trinity | MySQL password |
| `DB_NAME_WORLD` | world | World database |
| `DB_NAME_CHARACTERS` | characters | Characters database |
| `DB_NAME_AUTH` | auth | Auth database |
| `WOWHEAD_CACHE_DIR` | ./cache/wowhead | Cache directory |
| `WOWHEAD_CACHE_TTL_HOURS` | 24 | Cache lifetime |

## Next Steps

### Implement Code Generators

1. **Item SQL Generator** (`src/services/TrinityItemGenerator.ts`)
   - Convert WoWHead item data to TrinityCore SQL
   - Handle all item fields properly
   - Support custom entry IDs

2. **Boss Script Generator** (`src/services/BossScriptGenerator.ts`)
   - Generate C++ boss AI scripts
   - Parse WoWHead strategy guides
   - Create header and source files

3. **Loot Table Generator** (`src/services/LootTableGenerator.ts`)
   - Build loot tables from WoWHead data
   - Handle drop chances
   - Support multiple difficulties

### Add Frontend

```bash
cd "D:\Trinity Core\Tools\CompApp"
npm create vite@latest frontend -- --template react-ts
```

## Troubleshooting

### "Cannot connect to database"

1. Check MySQL is running
2. Verify credentials in `.env`
3. Ensure databases exist (auth, world, characters)

```sql
-- Create databases if needed
CREATE DATABASE IF NOT EXISTS auth;
CREATE DATABASE IF NOT EXISTS world;
CREATE DATABASE IF NOT EXISTS characters;
```

### "WoWHead request failed"

1. Check internet connection
2. WoWHead may be rate limiting (wait a few minutes)
3. Check cache directory exists and is writable

### "Port 3001 already in use"

Change port in `.env`:
```env
PORT=3002
```

## Contributing

This is a work in progress! Feel free to add:
- More WoWHead data extraction
- Better caching strategies
- Code generators
- Frontend UI
- Tests
- Documentation

## License

MIT

---

**Status**: 🚧 Active Development

**Priority Features**:
1. ✅ WoWHead integration
2. ✅ Database access
3. 🚧 Code generators (in progress)
4. 📅 Frontend UI (planned)
5. 📅 Authentication (planned)
