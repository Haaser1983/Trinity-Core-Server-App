# ✅ CompApp Setup Checklist

## Pre-Flight Check

### 1. Prerequisites ✓
- [ ] Node.js 20+ installed (`node --version`)
- [ ] MySQL running with TrinityCore databases
- [ ] VSCode installed
- [ ] Internet connection (for WoWHead)

---

## Installation (5 Minutes)

### 2. Open Project ✓
```bash
# Open the workspace file
code "D:\Trinity Core\Tools\CompApp\CompApp.code-workspace"
```
- [ ] VSCode opens successfully
- [ ] Can see backend/ folder in sidebar

### 3. Install Dependencies ✓
```bash
cd backend
npm install
```
- [ ] npm install completes without errors
- [ ] node_modules/ folder created
- [ ] See ~200+ packages installed

### 4. Configure Database ✓

**Edit `backend/.env`:**
```env
DB_USER=trinity
DB_PASS=trinity
```
- [ ] .env file exists
- [ ] Credentials match your MySQL setup
- [ ] All 4 database names correct (auth, characters, world, hotfixes)

---

## First Run

### 5. Start Server ✓
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] See "Server running on http://localhost:3001"
- [ ] See "Database connection successful"
- [ ] No red error messages

### 6. Test Health Check ✓
**Browser: http://localhost:3001/health**
```json
{
  "status": "ok",
  "uptime": 2.5
}
```
- [ ] Opens in browser
- [ ] Shows JSON response
- [ ] status is "ok"

---

## Feature Testing

### 7. Test WoWHead Integration ✓

**Option A - Browser:**
```
http://localhost:3001/api/wowhead/items/19019
```

**Option B - curl:**
```bash
curl http://localhost:3001/api/wowhead/items/19019
```

**Expected Response:**
```json
{
  "id": 19019,
  "name": "Thunderfury, Blessed Blade of the Windseeker",
  "quality": 5,
  "itemLevel": 80
}
```

- [ ] Returns item data
- [ ] Item name is correct
- [ ] No errors in server console

### 8. Test Database Access ✓
```bash
curl http://localhost:3001/api/items?limit=5
```

**Expected:**
```json
{
  "items": [...],
  "pagination": {
    "total": 50000
  }
}
```

- [ ] Returns items from world database
- [ ] Shows pagination info
- [ ] Items have entry, name, quality fields

### 9. Test Players Endpoint ✓
```bash
curl http://localhost:3001/api/players/online
```

- [ ] Returns player count
- [ ] Shows online players (if any)
- [ ] No database errors

---

## VSCode Setup

### 10. Install Recommended Extensions ✓
**VSCode will prompt you. Install these:**
- [ ] ESLint
- [ ] Prettier
- [ ] REST Client
- [ ] TypeScript and JavaScript Language Features

### 11. Test REST Client ✓
1. Open `api-tests.http`
2. Find "### Get Thunderfury"
3. Click "Send Request" above it
4. See response in new panel

- [ ] REST Client extension installed
- [ ] Can click "Send Request"
- [ ] Response appears inline
- [ ] Shows item data

---

## Development Workflow

### 12. Test Auto-Reload ✓
1. Keep server running (`npm run dev`)
2. Edit `backend/src/index.ts`
3. Add comment: `// Test change`
4. Save file

- [ ] Server automatically restarts
- [ ] See "Restarting..." in terminal
- [ ] Server comes back online
- [ ] No manual restart needed

### 13. View Logs ✓
Make a request while watching server terminal:
```bash
curl http://localhost:3001/api/wowhead/items/19019
```

- [ ] See request logged in terminal
- [ ] Shows GET request
- [ ] Shows response status (200)
- [ ] No error stack traces

---

## Cache Verification

### 14. Test Caching ✓
1. Request item: `curl http://localhost:3001/api/wowhead/items/19019`
2. Note response time (~2 seconds)
3. Request again immediately
4. Note response time (~50ms)

- [ ] First request takes ~1-2 seconds
- [ ] Second request is instant
- [ ] Cache file created in `backend/cache/wowhead/`

### 15. Check Cache Files ✓
```bash
dir backend\cache\wowhead
```

- [ ] Cache directory exists
- [ ] Contains .json files
- [ ] Files have item data

---

## Troubleshooting Tests

### 16. Test Error Handling ✓
```bash
# Request invalid item
curl http://localhost:3001/api/wowhead/items/999999999
```

- [ ] Returns 404 error
- [ ] Error message is clear
- [ ] Server doesn't crash
- [ ] Can still make other requests

### 17. Test Database Error Handling ✓
```bash
# Temporarily stop MySQL
# Then request
curl http://localhost:3001/api/items
```

- [ ] Returns 500 error
- [ ] Error message shown
- [ ] Server stays running
- [ ] Logs error to console

---

## Final Checks

### 18. All Endpoints Work ✓
Test each endpoint in `api-tests.http`:
- [ ] /health
- [ ] /api/wowhead/items/:id
- [ ] /api/wowhead/items/search/:query
- [ ] /api/wowhead/npcs/:id
- [ ] /api/items
- [ ] /api/players
- [ ] /api/players/online
- [ ] /api/server/status
- [ ] /api/server/metrics

### 19. Documentation Complete ✓
- [ ] Read README.md
- [ ] Read GETTING_STARTED.md
- [ ] Read backend/README.md
- [ ] Understand project structure

### 20. Ready to Develop ✓
- [ ] Can edit TypeScript files
- [ ] Server auto-reloads on changes
- [ ] Can test with REST Client
- [ ] Understand where to add code

---

## 🎉 SUCCESS!

If all boxes are checked, your setup is **COMPLETE**!

### You Can Now:
✅ Fetch WoWHead data  
✅ Query TrinityCore database  
✅ Test API endpoints  
✅ Develop in VSCode with auto-reload  
✅ Build new features  

### Next Steps:
1. **Build Item Generator**: `backend/src/services/TrinityItemGenerator.ts`
2. **Build Boss Generator**: `backend/src/services/BossScriptGenerator.ts`
3. **Add Frontend**: React + TypeScript UI

---

## 📞 If Something Failed

### Server Won't Start
- Check `.env` configuration
- Verify MySQL is running
- Run `npm install` again

### Database Connection Error
```bash
# Test MySQL directly
mysql -h localhost -u trinity -p

# If fails, fix MySQL first
```

### WoWHead Requests Fail
- Check internet connection
- Try again in 5 minutes (rate limiting)
- Check cached data works

### npm install Errors
```bash
# Clear and retry
npm cache clean --force
rm -rf node_modules
npm install
```

---

## 🚀 You're Ready!

**Everything is set up and working!**

Now open VSCode and start building:
```bash
code "D:\Trinity Core\Tools\CompApp\CompApp.code-workspace"
```

**Happy Coding! 🎮**
