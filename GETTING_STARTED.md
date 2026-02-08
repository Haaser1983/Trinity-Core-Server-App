# 🚀 Getting Started with TrinityCore Companion App

## Complete Setup Guide (5 Minutes)

### Step 1: Prerequisites Check ✅

**Required:**
- [x] Node.js 20 LTS ([Download](https://nodejs.org/))
- [x] TrinityCore MySQL database running
- [x] VSCode ([Download](https://code.visualstudio.com/))

**Test Node.js:**
```bash
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

---

### Step 2: Automated Setup (Recommended)

**Windows:**
```bash
# Double-click this file:
SETUP.bat
```

**Manual (if needed):**
```bash
cd "D:\Trinity Core\Tools\CompApp\backend"
npm install
```

---

### Step 3: Configure Database

Edit `backend\.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=trinity
DB_PASS=trinity  # ← Change this to your password

DB_NAME_AUTH=auth
DB_NAME_CHARACTERS=characters
DB_NAME_WORLD=world
DB_NAME_HOTFIXES=hotfixes
```

---

### Step 4: Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║   TrinityCore Companion App - Backend Server         ║
║   ───────────────────────────────────────────────    ║
║   🚀 Server running on http://localhost:3001         ║
║   📊 Environment: development                        ║
║   🗄️  Database: localhost:3306                       ║
╚═══════════════════════════════════════════════════════╝
```

✅ **If you see this, you're good to go!**

---

### Step 5: Test the API

**Option A: Browser**
```
http://localhost:3001/health
```

**Option B: curl**
```bash
# Health check
curl http://localhost:3001/health

# Get Thunderfury from WoWHead
curl http://localhost:3001/api/wowhead/items/19019

# Get online players
curl http://localhost:3001/api/players/online
```

**Option C: VSCode REST Client** (Recommended)
1. Install "REST Client" extension in VSCode
2. Open `api-tests.http`
3. Click "Send Request" above any endpoint
4. See results inline!

---

### Step 6: Open in VSCode

```bash
# Open workspace
code "D:\Trinity Core\Tools\CompApp\CompApp.code-workspace"
```

**Recommended Extensions** (VSCode will prompt):
- ESLint
- Prettier
- TypeScript
- REST Client

---

## 🎯 Quick Tour

### Test WoWHead Integration

```bash
# Get Thunderfury, Blessed Blade of the Windseeker
curl http://localhost:3001/api/wowhead/items/19019

# Expected Response:
{
  "id": 19019,
  "name": "Thunderfury, Blessed Blade of the Windseeker",
  "quality": 5,  // Legendary
  "itemLevel": 80,
  "requiredLevel": 60,
  ...
}
```

### Test Database Access

```bash
# Get first 10 items from your world database
curl http://localhost:3001/api/items?limit=10

# Get online players
curl http://localhost:3001/api/players/online

# Get server metrics
curl http://localhost:3001/api/server/metrics
```

---

## 📁 Project Structure

```
D:\Trinity Core\Tools\CompApp\
│
├── backend/                        # ← You'll work here
│   ├── src/
│   │   ├── services/
│   │   │   ├── WowheadService.ts  # ← WoWHead integration
│   │   │   └── database.ts        # ← MySQL connection
│   │   ├── routes/
│   │   │   ├── wowhead.ts         # ← API endpoints
│   │   │   ├── items.ts
│   │   │   ├── players.ts
│   │   │   ├── server.ts
│   │   │   └── generator.ts       # ← TODO: Code generation
│   │   └── index.ts               # ← Main app
│   ├── cache/                      # WoWHead cached data
│   ├── .env                        # ← Your config
│   ├── package.json
│   └── README.md
│
├── api-tests.http                  # ← REST Client tests
├── CompApp.code-workspace          # ← VSCode workspace
├── SETUP.bat                       # ← One-click setup
├── GETTING_STARTED.md              # ← This file
└── README.md                       # ← Project overview
```

---

## 🛠️ Development Workflow

### 1. Start Backend (Terminal 1)
```bash
cd backend
npm run dev  # Auto-reloads on file changes
```

### 2. Make Changes in VSCode
- Edit files in `backend/src/`
- Server auto-reloads
- Test with REST Client or curl

### 3. Test Your Changes
- Use `api-tests.http` in VSCode
- Or use curl/Postman

---

## 💡 What to Build Next?

### Priority 1: Code Generators 🎯

**Create these files:**

1. `backend/src/services/TrinityItemGenerator.ts`
   ```typescript
   // Generate TrinityCore SQL from WoWHead item data
   ```

2. `backend/src/services/BossScriptGenerator.ts`
   ```typescript
   // Generate C++ boss scripts
   ```

3. `backend/src/services/LootTableGenerator.ts`
   ```typescript
   // Generate loot table SQL
   ```

**See**: `D:\TrinityCore_Modernization\WOWHEAD_INTEGRATION_PART2.md` for complete implementations!

### Priority 2: Frontend UI

```bash
cd "D:\Trinity Core\Tools\CompApp"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

---

## 🐛 Troubleshooting

### "npm install failed"

```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### "Cannot connect to database"

1. Check MySQL is running:
   ```bash
   # Windows
   sc query MySQL80
   
   # Or check Task Manager for mysqld.exe
   ```

2. Test connection manually:
   ```bash
   mysql -h localhost -u trinity -p
   ```

3. Verify `.env` credentials match

### "Port 3001 already in use"

Change port in `backend/.env`:
```env
PORT=3002
```

### "WoWHead request failed"

- Check internet connection
- WoWHead may rate-limit (wait 5 minutes)
- Check cached data in `backend/cache/wowhead/`

### "ENOENT: no such file or directory"

```bash
cd backend
npm install  # Make sure dependencies are installed
```

---

## 📚 Learning Resources

### Backend (Node.js + TypeScript)
- [Node.js Docs](https://nodejs.org/docs/)
- [Express Guide](https://expressjs.com/en/guide/routing.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### TrinityCore
- [Database Documentation](https://trinitycore.atlassian.net/wiki/)
- [TrinityCore Wiki](https://trinitycore.info/)

### WoWHead
- [WoWHead](https://www.wowhead.com/)
- [Item Database](https://www.wowhead.com/items)
- [NPC Database](https://www.wowhead.com/npcs)

---

## 🎯 Your First Tasks

### Task 1: Test WoWHead Integration (2 minutes)

1. Start backend: `cd backend && npm run dev`
2. Open `api-tests.http` in VSCode
3. Click "Send Request" on "Get Thunderfury"
4. See the item data appear!

### Task 2: Query Your Database (2 minutes)

1. In `api-tests.http`, find "Get First 10 Items"
2. Click "Send Request"
3. See your actual TrinityCore items!

### Task 3: Build Your First Generator (30 minutes)

1. Copy code from `WOWHEAD_INTEGRATION_PART2.md`
2. Create `backend/src/services/TrinityItemGenerator.ts`
3. Implement `generateItemSQL()` method
4. Test it!

---

## ✅ Success Checklist

After setup, you should be able to:

- [x] Backend runs without errors (`npm run dev`)
- [x] Can fetch item from WoWHead (Thunderfury test)
- [x] Can query TrinityCore database (items, players)
- [x] See server metrics
- [x] VSCode workspace opens correctly
- [x] REST Client tests work

**If all checked, you're ready to build! 🎉**

---

## 🚀 Ready to Code!

```bash
# Open in VSCode
code "D:\Trinity Core\Tools\CompApp\CompApp.code-workspace"

# Start backend
cd backend
npm run dev

# Start coding!
```

**You can work on the companion app in VSCode while I help you with TrinityCore improvements here!**

---

## 📞 Need Help?

- Check `README.md` for full documentation
- See `backend/README.md` for API details
- Review `D:\TrinityCore_Modernization\` for implementation guides
- Ask me for specific implementations!

---

**Status**: ✅ Ready for Development  
**Next**: Build code generators or add frontend!
