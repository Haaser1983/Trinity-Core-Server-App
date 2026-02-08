# 🎮 TrinityCore Companion App

**WoWHead-Integrated Control Panel for TrinityCore Server Management**

![Status](https://img.shields.io/badge/status-active%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS or higher
- TrinityCore server with MySQL database
- Internet connection (for WoWHead data)

### Installation

```bash
# Navigate to backend
cd "D:\Trinity Core\Tools\CompApp\backend"

# Install dependencies
npm install

# Configure database (edit .env file)
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=trinity
# DB_PASS=trinity

# Start development server
npm run dev
```

Server starts on: **http://localhost:3001**

---

## ✨ Features

### Current Features ✅

**WoWHead Integration**
- 🔍 Search and fetch items from WoWHead
- 📦 Get NPC data with loot tables
- ✨ Fetch spell information
- 💾 Automatic caching (24-hour TTL)

**TrinityCore Database**
- 📊 Query items from world database
- 👥 View players and online status
- 📈 Server metrics and statistics
- 🔗 Direct MySQL access to all databases

### Coming Soon 🚧

**Code Generators**
- Generate TrinityCore SQL from WoWHead items
- Auto-create boss C++ scripts from strategy guides
- Build loot tables from WoWHead data
- Import modern WoW patches content

**Frontend UI**
- React-based web interface
- Item search and import
- Boss script designer
- Loot table editor
- Player management dashboard

---

## 📖 API Documentation

### WoWHead Endpoints

```http
GET /api/wowhead/items/:id
GET /api/wowhead/items/search/:query
GET /api/wowhead/npcs/:id
GET /api/wowhead/spells/:id
```

**Example**: Fetch Thunderfury
```bash
curl http://localhost:3001/api/wowhead/items/19019
```

**Example**: Search for swords
```bash
curl http://localhost:3001/api/wowhead/items/search/sword
```

### Database Endpoints

```http
GET /api/items?page=1&limit=50
GET /api/items/:id
GET /api/players
GET /api/players/online
GET /api/players/:guid
GET /api/server/status
GET /api/server/metrics
```

**Example**: Get online players
```bash
curl http://localhost:3001/api/players/online
```

---

## 🛠️ Development

### Project Structure

```
CompApp/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── services/       # WoWHead, Database services
│   │   ├── routes/         # API endpoints
│   │   ├── models/         # TypeScript types
│   │   └── index.ts        # Main application
│   ├── cache/              # WoWHead data cache
│   ├── .env                # Configuration
│   └── package.json
│
└── frontend/               # React UI (coming soon)
    └── (To be created)
```

### Backend Commands

```bash
npm run dev      # Development server (auto-reload)
npm run build    # Compile TypeScript to JavaScript
npm start        # Production server
npm test         # Run tests
```

### Adding the Frontend

```bash
cd "D:\Trinity Core\Tools\CompApp"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

---

## 🎯 Use Cases

### 1. Import Modern WoW Items

```typescript
// Search for Dragonflight items
const items = await wowhead.searchItems('dragonflight epic');

// Generate SQL for each item
items.forEach(async (item) => {
  const sql = await generator.generateItemSQL(item);
  await database.execute(sql);
});
```

### 2. Create Custom Boss

```typescript
// Fetch Lich King data
const lichKing = await wowhead.getNPC(36597);
const mechanics = await wowhead.getBossMechanics('Lich King');

// Generate C++ script
const script = await generator.generateBossScript(lichKing, mechanics);

// Save to TrinityCore/src/server/scripts/
fs.writeFileSync('boss_custom_lich_king.cpp', script);
```

### 3. Update Loot Tables

```typescript
// Get loot from WoWHead
const boss = await wowhead.getNPC(36597);

// Generate loot SQL
const lootSQL = await generator.generateLootTable(boss);

// Apply to database
await database.execute(lootSQL);
```

---

## 📊 Performance

- **WoWHead Requests**: Cached for 24 hours
- **Database Queries**: Connection pooling (10 connections per database)
- **API Response Time**: <100ms (cached), <2s (fresh WoWHead fetch)

---

## 🔒 Security

**Current Status**: Development mode (no authentication)

**Production Recommendations**:
- Add JWT authentication
- Implement rate limiting
- Enable HTTPS
- Use environment-specific configs
- Add input validation
- Implement RBAC (Role-Based Access Control)

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check Node.js version
node --version  # Should be v20+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database connection fails

```bash
# Test MySQL connection
mysql -h localhost -u trinity -p

# Check .env configuration
cat .env | grep DB_
```

### WoWHead requests fail

- Check internet connection
- WoWHead may rate-limit (wait a few minutes)
- Try using cached data
- Check firewall settings

---

## 📚 Documentation

- [Backend README](./backend/README.md) - API details
- [Analysis Reports](../TrinityCore_Analysis/) - Phase 1 analysis
- [Modernization Guides](../TrinityCore_Modernization/) - Implementation guides

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Backend API setup
- [x] WoWHead integration
- [x] Database access
- [x] Basic caching

### Phase 2: Code Generation (In Progress)
- [ ] Item SQL generator
- [ ] Boss script generator
- [ ] Loot table generator
- [ ] Batch import tools

### Phase 3: Frontend UI
- [ ] React application setup
- [ ] Item search interface
- [ ] Boss designer UI
- [ ] Loot table editor
- [ ] Player management

### Phase 4: Advanced Features
- [ ] Quest editor
- [ ] World event scheduler
- [ ] Server monitoring dashboard
- [ ] Backup/restore tools
- [ ] Log viewer

---

## 🤝 Contributing

This is a work in progress! Contributions welcome:

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **TrinityCore Team** - For the amazing emulator
- **WoWHead** - For the comprehensive database
- **Community** - For testing and feedback

---

## 📞 Support

- **Issues**: Create an issue in this repository
- **TrinityCore Discord**: https://discord.gg/trinitycore
- **Documentation**: Check the /docs folder

---

**Status**: 🚧 Active Development  
**Version**: 1.0.0-alpha  
**Last Updated**: February 6, 2026

---

## 🎉 Ready to Code!

Open this folder in VSCode and start developing:

```bash
code "D:\Trinity Core\Tools\CompApp"
```

Your companion app is ready to evolve! 🚀
