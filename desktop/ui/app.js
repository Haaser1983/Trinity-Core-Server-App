// ─────────────────────────────────────────────────────────────
// COMPAPP — UI Controller
// Handles navigation, data loading, and Control Panel features.
// All data flows through window.api (defined in preload.js)
// which talks to the main process via IPC.
// ─────────────────────────────────────────────────────────────

// ─── App State ──────────────────────────────────────────────
let currentPage = 'dashboard';
let settings = {};
let itemsPage = 1;
let playersPage = 1;
let broadcastType = 'announce';
let xpRate = 1;
let commandHistory = [];

// Boss Scripting state
let currentBossEntry = null;
let currentBossName = '';
let bossScripts = [];
let editingScriptId = null;

// Loot Table state
let currentLootCreature = null;
let currentLootCreatureName = '';
let currentLootId = null;
let lootEntries = [];
let editingLootItem = null;
let selectedLootItemId = null;
let selectedLootItemName = '';
let selectedLootItemQuality = 1;

// NPC Manager state
let currentNpcEntry = null;
let currentNpcData = null;
let npcSpawns = [];

// Player Manager state
let currentPlayerGuid = null;
let currentPlayerName = '';
let currentPlayerAccount = null;

// Item Editor state
let currentItemEntry = null;
let currentItemData = null;

// Quest Builder state
let currentQuestId = null;
let currentQuestData = null;
let questGivers = [];
let questEnders = [];

// DB2 Browser / Extractor state
let db2CurrentFile = '';
let db2Page = 1;
let db2TotalPages = 1;
let db2Columns = [];
let db2IsSearching = false;

// ─── Initialize ─────────────────────────────────────────────
async function init() {
  await loadSettings();
  setupNavigation();
  setupEventListeners();
  setupControlPanel();
  checkConnections();
  loadDashboard();

  // Auto-refresh connections every 60 seconds
  setInterval(checkConnections, 60000);
}

// ─── Settings ───────────────────────────────────────────────
async function loadSettings() {
  const result = await window.api.getSettings();
  settings = result;
  populateSettingsForm();

  // Load saved XP rate
  xpRate = await window.api.control.getXpRate();
  updateXpDisplay();
}

// ─── Navigation ─────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateToPage(item.dataset.page));
  });
}

function navigateToPage(page) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  currentPage = page;

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'control': loadControlPanel(); break;
    case 'items': loadItems(); break;
    case 'players': loadPlayers(); break;
    case 'boss': break; // No auto-load — user searches first
    case 'loot': break; // No auto-load — user searches first
    case 'quests': break; // No auto-load — user searches first
    case 'npcs': break; // No auto-load — user searches first
    case 'item-editor': break; // No auto-load — user searches first
    case 'player-manager': break; // No auto-load — user searches first
    case 'economy': loadEconomyDashboard(); break;
    case 'events': loadAllGameEvents(); break;
    case 'bots': loadBotSystem(); break;
    case 'extractor': loadExtractorPage(); break;
    case 'wowhead': break; // No auto-load — user searches manually
    case 'settings': populateSettingsForm(); break;
  }
}

// ─── Connection Status Checks ───────────────────────────────
async function checkConnections() {
  const dbStatus = document.getElementById('db-status');
  const dbDetail = document.getElementById('db-status-detail');
  const soapStatus = document.getElementById('soap-status');
  const soapDetail = document.getElementById('soap-status-detail');

  // Database
  try {
    const result = await window.api.getServerStatus();
    if (result.success) {
      dbStatus.className = 'status online';
      dbDetail.textContent = `${result.data.playersOnline} players online`;
    } else {
      throw new Error(result.data?.error || 'Failed');
    }
  } catch {
    dbStatus.className = 'status offline';
    dbDetail.textContent = 'Check settings';
  }

  // SOAP
  const soapConf = settings.soap || {};
  if (soapConf.enabled && soapConf.host && soapConf.user) {
    try {
      const result = await window.api.soap.test();
      if (result.success) {
        soapStatus.className = 'status online';
        soapDetail.textContent = 'Connected';
      } else {
        soapStatus.className = 'status offline';
        soapDetail.textContent = result.message.substring(0, 40);
      }
    } catch {
      soapStatus.className = 'status offline';
      soapDetail.textContent = 'Connection failed';
    }
  } else {
    soapStatus.className = 'status offline';
    soapDetail.textContent = 'Not configured';
  }
}

// ─── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── Dashboard ──────────────────────────────────────────────
async function loadDashboard() {
  try {
    const result = await window.api.getDashboardStats();
    if (result.success) {
      const s = result.data;
      setText('stat-online', s.playersOnline ?? '—');
      setText('stat-chars', s.totalCharacters != null ? s.totalCharacters.toLocaleString() : '—');
      setText('stat-items', s.items != null ? s.items.toLocaleString() : '—');
      setText('stat-creatures', s.creatures != null ? s.creatures.toLocaleString() : '—');
      setText('stat-quests', s.quests != null ? s.quests.toLocaleString() : '—');
      setText('stat-accounts', s.totalAccounts != null ? s.totalAccounts.toLocaleString() : '—');
    }
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

// ═════════════════════════════════════════════════════════════
// CONTROL PANEL
// ═════════════════════════════════════════════════════════════

function setupControlPanel() {
  // ── Broadcast ──
  document.querySelectorAll('[data-btype]').forEach(btn => {
    btn.addEventListener('click', () => {
      broadcastType = btn.dataset.btype;
      document.querySelectorAll('[data-btype]').forEach(b => {
        b.className = b.dataset.btype === broadcastType ? 'btn btn-sm btn-active' : 'btn btn-sm btn-secondary';
      });
      const hints = { announce: 'Yellow server-wide text', notify: 'Blue notification popup', alert: 'Red warning banner' };
      setText('broadcast-hint', hints[broadcastType] || '');
    });
  });

  document.getElementById('btn-broadcast').addEventListener('click', sendBroadcast);

  // ── XP Rate ──
  const slider = document.getElementById('xp-slider');
  slider.addEventListener('input', () => {
    xpRate = parseInt(slider.value);
    updateXpDisplay();
  });

  document.querySelectorAll('[data-xp]').forEach(btn => {
    btn.addEventListener('click', () => {
      xpRate = parseInt(btn.dataset.xp);
      slider.value = xpRate;
      updateXpDisplay();
    });
  });

  document.getElementById('btn-apply-xp').addEventListener('click', applyXpRate);

  // ── SOAP Console ──
  document.getElementById('btn-console-send').addEventListener('click', sendConsoleCommand);
  document.getElementById('console-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendConsoleCommand();
  });

  document.querySelectorAll('.quick-cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('console-input').value = btn.dataset.cmd;
      document.getElementById('console-input').focus();
    });
  });
}

function loadControlPanel() {
  loadGameEvents();
}

// ── Broadcast ──
async function sendBroadcast() {
  const msg = document.getElementById('broadcast-message').value.trim();
  if (!msg) return;

  try {
    const result = await window.api.soap.announce(msg, broadcastType);
    if (result.success) {
      showToast(`${broadcastType.charAt(0).toUpperCase() + broadcastType.slice(1)} sent: "${msg}"`);
      document.getElementById('broadcast-message').value = '';
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

// ── XP Rate ──
function updateXpDisplay() {
  setText('xp-value', `${xpRate}x`);
  const descs = { 1: 'Original experience', 3: 'Relaxed leveling', 5: 'Fast progression', 10: 'Speed run', 50: 'Near-instant levels' };
  setText('xp-desc', descs[xpRate] || `${xpRate}x experience`);

  // Update preset button states
  document.querySelectorAll('[data-xp]').forEach(btn => {
    btn.className = parseInt(btn.dataset.xp) === xpRate ? 'btn btn-sm btn-active' : 'btn btn-sm btn-secondary';
  });

  // Update range background
  const slider = document.getElementById('xp-slider');
  const pct = ((xpRate - 1) / 49) * 100;
  slider.style.background = `linear-gradient(90deg, var(--gold) ${pct}%, var(--bg-panel) ${pct}%)`;
}

async function applyXpRate() {
  try {
    const result = await window.api.control.setXpRate(xpRate);
    if (result.success) {
      showToast(`XP rate set to ${xpRate}x`);
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

// ── Game Events / Holidays ──
// WHY: TrinityCore stores holidays in game_event with a holiday
// column > 0. We fetch those, display toggles, and flip them.
const HOLIDAY_ICONS = {
  'Lunar Festival': '🌙', 'Love is in the Air': '💕', 'Noblegarden': '🥚',
  "Children's Week": '🧸', 'Midsummer': '🔥', 'Brewfest': '🍺',
  "Hallow's End": '🎃', "Pilgrim's Bounty": '🦃', 'Winter Veil': '🎄',
  'Day of the Dead': '💀', "Pirates' Day": '🏴‍☠️', 'Darkmoon Faire': '🎪',
  'Fishing': '🎣', 'Harvest': '🌾', 'New Year': '🎆',
};

function getHolidayIcon(desc) {
  for (const [key, icon] of Object.entries(HOLIDAY_ICONS)) {
    if (desc && desc.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '📅';
}

async function loadGameEvents() {
  const grid = document.getElementById('holiday-grid');
  grid.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">Loading game events...</div>';

  try {
    const result = await window.api.control.getGameEvents();
    if (!result.success || !result.data.length) {
      grid.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">No holiday events found in game_event table.</div>';
      return;
    }

    grid.innerHTML = result.data.map(ev => {
      // Event is "enabled" if end_time is in the future
      const endTime = new Date(ev.end_time);
      const enabled = endTime > new Date();
      const icon = getHolidayIcon(ev.description);

      return `
        <div class="holiday-item ${enabled ? 'enabled' : ''}" data-event="${ev.eventEntry}">
          <div class="holiday-info">
            <span class="holiday-icon">${icon}</span>
            <div>
              <div class="holiday-name">${ev.description || 'Event #' + ev.eventEntry}</div>
              <div class="holiday-season">ID: ${ev.eventEntry} | Holiday: ${ev.holiday}</div>
            </div>
          </div>
          <div class="toggle ${enabled ? 'on' : ''}" data-event-toggle="${ev.eventEntry}" data-enabled="${enabled}">
            <div class="knob"></div>
          </div>
        </div>
      `;
    }).join('');

    // Wire up toggle clicks
    document.querySelectorAll('[data-event-toggle]').forEach(toggle => {
      toggle.addEventListener('click', async () => {
        const entry = parseInt(toggle.dataset.eventToggle);
        const currentlyEnabled = toggle.dataset.enabled === 'true';
        const newState = !currentlyEnabled;

        try {
          const result = await window.api.control.toggleGameEvent(entry, newState);
          if (result.success) {
            toggle.classList.toggle('on', newState);
            toggle.dataset.enabled = String(newState);
            toggle.closest('.holiday-item').classList.toggle('enabled', newState);
            showToast(`Event ${entry} ${newState ? 'enabled' : 'disabled'}`);
          } else {
            showToast(`Failed: ${result.error}`, 'error');
          }
        } catch (e) {
          showToast(`Error: ${e.message}`, 'error');
        }
      });
    });

  } catch (e) {
    grid.innerHTML = `<div style="color:var(--error); padding:20px;">Error loading events: ${e.message}</div>`;
  }
}

// ── SOAP Console ──
async function sendConsoleCommand() {
  const input = document.getElementById('console-input');
  const output = document.getElementById('console-output');
  const cmd = input.value.trim();
  if (!cmd) return;

  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Add command to output
  const cmdDiv = document.createElement('div');
  cmdDiv.innerHTML = `<div class="console-cmd"><span class="console-time">[${time}]</span> &gt; ${escapeHtml(cmd)}</div>`;
  output.appendChild(cmdDiv);

  try {
    const result = await window.api.soap.command(cmd);
    const resultDiv = document.createElement('div');
    if (result.success) {
      resultDiv.innerHTML = `<div class="console-result">${escapeHtml(result.data)}</div>`;
    } else {
      resultDiv.innerHTML = `<div class="console-result" style="color:var(--error);">Error: ${escapeHtml(result.error)}</div>`;
    }
    output.appendChild(resultDiv);
  } catch (e) {
    const errDiv = document.createElement('div');
    errDiv.innerHTML = `<div class="console-result" style="color:var(--error);">Error: ${escapeHtml(e.message)}</div>`;
    output.appendChild(errDiv);
  }

  input.value = '';
  input.focus();
  output.scrollTop = output.scrollHeight;
}

// ═════════════════════════════════════════════════════════════
// EXISTING FEATURES (preserved from original app.js)
// ═════════════════════════════════════════════════════════════

function setupEventListeners() {
  // Dashboard
  document.getElementById('refresh-btn').addEventListener('click', loadDashboard);

  // Quick actions
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
  });

  // Items
  document.getElementById('search-items-btn').addEventListener('click', () => { itemsPage = 1; loadItems(); });
  document.getElementById('item-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') { itemsPage = 1; loadItems(); } });
  document.getElementById('items-prev').addEventListener('click', () => { if (itemsPage > 1) { itemsPage--; loadItems(); } });
  document.getElementById('items-next').addEventListener('click', () => { itemsPage++; loadItems(); });

  // Players
  document.getElementById('refresh-players-btn').addEventListener('click', loadPlayers);
  document.getElementById('online-only').addEventListener('change', () => { playersPage = 1; loadPlayers(); });
  document.getElementById('players-prev').addEventListener('click', () => { if (playersPage > 1) { playersPage--; loadPlayers(); } });
  document.getElementById('players-next').addEventListener('click', () => { playersPage++; loadPlayers(); });

  // WoWHead
  document.getElementById('fetch-wowhead-btn').addEventListener('click', fetchWowheadItem);
  document.getElementById('import-wowhead-btn').addEventListener('click', importWowheadItem);

  // Settings
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.querySelectorAll('.test-btn').forEach(btn => {
    btn.addEventListener('click', () => testDatabase(btn.dataset.db));
  });
  document.getElementById('test-soap-btn').addEventListener('click', testSoapConnection);

  // Boss Scripting
  document.getElementById('boss-search-btn').addEventListener('click', searchBossCreatures);
  document.getElementById('boss-creature-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBossCreatures();
  });
  document.getElementById('boss-change-creature').addEventListener('click', () => {
    document.getElementById('boss-search-results').style.display = 'block';
    document.getElementById('boss-selected-creature').style.display = 'none';
    document.getElementById('boss-scripts-section').style.display = 'none';
    document.getElementById('boss-script-editor').style.display = 'none';
  });
  document.getElementById('boss-add-script').addEventListener('click', () => showScriptEditor('add'));
  document.getElementById('boss-cancel-edit').addEventListener('click', hideScriptEditor);
  document.getElementById('boss-script-form').addEventListener('submit', saveScript);
  document.getElementById('boss-event-type').addEventListener('change', updateEventParams);
  document.getElementById('boss-action-type').addEventListener('change', updateActionParams);
  document.getElementById('boss-export-sql').addEventListener('click', exportScriptsSQL);
  document.getElementById('boss-reload-scripts').addEventListener('click', reloadScriptsSOAP);

  // Loot Tables
  document.getElementById('loot-search-btn').addEventListener('click', searchLootCreatures);
  document.getElementById('loot-creature-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchLootCreatures();
  });
  document.getElementById('loot-change-creature').addEventListener('click', () => {
    document.getElementById('loot-search-results').style.display = 'block';
    document.getElementById('loot-selected-creature').style.display = 'none';
    document.getElementById('loot-table-section').style.display = 'none';
  });
  document.getElementById('loot-create-table').addEventListener('click', createLootTable);
  document.getElementById('loot-add-item').addEventListener('click', () => showLootEditor('add'));
  document.getElementById('loot-cancel-edit').addEventListener('click', hideLootEditor);
  document.getElementById('loot-entry-form').addEventListener('submit', saveLootEntry);
  document.getElementById('loot-simulate-kill').addEventListener('click', simulateLootKill);
  document.getElementById('loot-close-simulation').addEventListener('click', () => {
    document.getElementById('loot-simulation-results').style.display = 'none';
  });
  document.getElementById('loot-item-search').addEventListener('input', debounce(searchLootItems, 300));

  // Quest Builder
  document.getElementById('quest-search-btn').addEventListener('click', searchQuests);
  document.getElementById('quest-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchQuests();
  });
  document.getElementById('quest-change-btn').addEventListener('click', () => {
    document.getElementById('quest-search-results').style.display = 'block';
    document.getElementById('quest-selected-banner').style.display = 'none';
    document.getElementById('quest-editor-section').style.display = 'none';
  });
  document.getElementById('quest-create-new').addEventListener('click', createNewQuest);
  document.getElementById('quest-save-btn').addEventListener('click', saveQuest);
  document.getElementById('quest-export-sql').addEventListener('click', exportQuestSQL);
  document.getElementById('quest-reward-money').addEventListener('input', updateMoneyDisplay);

  // Quest giver/ender NPC search
  document.getElementById('quest-giver-search-btn').addEventListener('click', searchQuestGiverNPC);
  document.getElementById('quest-giver-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchQuestGiverNPC();
  });
  document.getElementById('quest-ender-search-btn').addEventListener('click', searchQuestEnderNPC);
  document.getElementById('quest-ender-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchQuestEnderNPC();
  });

  // Live preview updates (debounced)
  ['quest-log-title', 'quest-description', 'quest-log-description', 'quest-level', 'quest-reward-money'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debounce(updateQuestPreview, 300));
  });

  // Objective/reward name lookups on change
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`quest-req-npc${i}`).addEventListener('change', () => lookupObjectiveNpcName(i));
    document.getElementById(`quest-req-item${i}`).addEventListener('change', () => lookupObjectiveItemName(i));
    document.getElementById(`quest-reward-item${i}`).addEventListener('change', () => lookupRewardItemName(i));
  }
  for (let i = 1; i <= 6; i++) {
    document.getElementById(`quest-choice-item${i}`).addEventListener('change', () => lookupChoiceItemName(i));
  }

  // Chain quest name lookups
  document.getElementById('quest-prev-id').addEventListener('change', lookupChainQuestNames);
  document.getElementById('quest-next-id').addEventListener('change', lookupChainQuestNames);

  // NPC Manager
  document.getElementById('npc-search-btn').addEventListener('click', searchNPCs);
  document.getElementById('npc-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchNPCs();
  });
  document.getElementById('npc-change-btn').addEventListener('click', () => {
    document.getElementById('npc-search-results').style.display = 'block';
    document.getElementById('npc-selected-banner').style.display = 'none';
    document.getElementById('npc-editor-section').style.display = 'none';
  });
  document.getElementById('npc-save-btn').addEventListener('click', saveCreature);
  document.getElementById('npc-export-sql').addEventListener('click', exportCreatureSQL);
  document.getElementById('npc-add-spawn-btn').addEventListener('click', addCreatureSpawn);

  // Item Editor
  document.getElementById('item-ed-search-btn').addEventListener('click', searchItemsForEditor);
  document.getElementById('item-ed-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchItemsForEditor();
  });
  document.getElementById('item-ed-change-btn').addEventListener('click', () => {
    document.getElementById('item-ed-search-results').style.display = 'block';
    document.getElementById('item-ed-selected-banner').style.display = 'none';
    document.getElementById('item-ed-editor-section').style.display = 'none';
  });
  document.getElementById('item-ed-create-new').addEventListener('click', createNewItem);
  document.getElementById('item-ed-save-btn').addEventListener('click', saveItemEditor);
  document.getElementById('item-ed-clone-btn').addEventListener('click', cloneItem);
  document.getElementById('item-ed-delete-btn').addEventListener('click', deleteItem);
  document.getElementById('item-ed-quality').addEventListener('change', updateItemTooltipPreview);
  ['item-ed-name', 'item-ed-description', 'item-ed-itemlevel', 'item-ed-reqlevel',
   'item-ed-armor', 'item-ed-dmgmin', 'item-ed-dmgmax', 'item-ed-delay',
   'item-ed-durability', 'item-ed-sellprice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debounce(updateItemTooltipPreview, 300));
  });

  // Player Manager
  document.getElementById('pm-search-btn').addEventListener('click', searchPlayersManager);
  document.getElementById('pm-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchPlayersManager();
  });
  document.getElementById('pm-change-btn').addEventListener('click', () => {
    document.getElementById('pm-search-results').style.display = 'block';
    document.getElementById('pm-selected-banner').style.display = 'none';
    document.getElementById('pm-detail-section').style.display = 'none';
  });

  // Economy Dashboard
  document.getElementById('eco-refresh-btn').addEventListener('click', loadEconomyDashboard);

  // Event Scheduler
  document.getElementById('evt-filter-input').addEventListener('input', filterGameEvents);
  document.getElementById('evt-create-btn').addEventListener('click', createGameEvent);
  document.getElementById('evt-save-btn').addEventListener('click', saveGameEvent);
  document.getElementById('evt-cancel-btn').addEventListener('click', () => {
    document.getElementById('evt-editor').style.display = 'none';
  });
  document.getElementById('evt-delete-btn').addEventListener('click', deleteGameEvent);

  // Bot System
  document.getElementById('bot-send-cmd-btn').addEventListener('click', sendBotCommand);
  document.getElementById('bot-custom-cmd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendBotCommand();
  });

  // DB2 Browser / Extractor
  document.querySelectorAll('.ext-tab').forEach(tab => {
    tab.addEventListener('click', () => switchExtractorTab(tab.dataset.extTab));
  });
  document.getElementById('db2-load-btn').addEventListener('click', loadDb2File);
  document.getElementById('db2-refresh-list-btn').addEventListener('click', refreshDb2FileList);
  document.getElementById('db2-search-btn').addEventListener('click', searchDb2);
  document.getElementById('db2-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchDb2();
  });
  document.getElementById('db2-clear-search').addEventListener('click', clearDb2Search);
  document.getElementById('db2-prev-page').addEventListener('click', () => { if (db2Page > 1) { db2Page--; loadDb2File(); } });
  document.getElementById('db2-next-page').addEventListener('click', () => { if (db2Page < db2TotalPages) { db2Page++; loadDb2File(); } });
  document.getElementById('db2-export-json').addEventListener('click', () => exportDb2('json'));
  document.getElementById('db2-export-sql').addEventListener('click', () => exportDb2('sql'));
  document.getElementById('spell-search-btn').addEventListener('click', searchSpells);
  document.getElementById('spell-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchSpells();
  });
  document.querySelectorAll('.wizard-run-btn').forEach(btn => {
    btn.addEventListener('click', () => runWizardStep(parseInt(btn.dataset.step)));
  });
  document.getElementById('wizard-cancel-btn').addEventListener('click', cancelWizardStep);
  document.getElementById('casc-init-btn').addEventListener('click', initCasc);
  document.getElementById('casc-extract-icons-btn').addEventListener('click', extractCascIcons);
  document.getElementById('casc-cancel-btn').addEventListener('click', cancelCascExtraction);
  document.getElementById('ext-save-config-btn').addEventListener('click', saveExtractorConfig);
}

function handleQuickAction(action) {
  switch (action) {
    case 'control': navigateToPage('control'); break;
    case 'import-item': navigateToPage('wowhead'); break;
    case 'view-players': navigateToPage('players'); break;
    case 'browse-items': navigateToPage('items'); break;
    case 'settings': navigateToPage('settings'); break;
  }
}

// ── Items ──
async function loadItems() {
  const tbody = document.getElementById('items-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading items...</td></tr>';
  const search = document.getElementById('item-search').value;

  try {
    const result = await window.api.getItems({ page: itemsPage, limit: 50, search });
    if (result.success) {
      const { items, pagination } = result.data;
      tbody.innerHTML = items.map(item => `
        <tr>
          <td>${item.entry}</td>
          <td><span class="quality-${item.Quality}">${escapeHtml(item.name)}</span></td>
          <td><span class="quality-${item.Quality}">${getQualityName(item.Quality)}</span></td>
          <td>${item.ItemLevel}</td>
          <td>${item.RequiredLevel}</td>
          <td><button class="btn btn-sm btn-secondary" onclick="viewItem(${item.entry})">View</button></td>
        </tr>
      `).join('');
      document.getElementById('items-page-info').textContent = `Page ${pagination.page} of ${pagination.pages}`;
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="error">Error: ${result.error}</td></tr>`;
    }
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="error">Error loading items</td></tr>';
  }
}

// ── Players ──
async function loadPlayers() {
  const tbody = document.getElementById('players-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading players...</td></tr>';
  const onlineOnly = document.getElementById('online-only').checked;

  try {
    const result = await window.api.getPlayers({ page: playersPage, limit: 50, onlineOnly });
    if (result.success) {
      const { players, pagination } = result.data;
      tbody.innerHTML = players.map(p => `
        <tr>
          <td>${p.guid}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${getRaceName(p.race)}</td>
          <td>${getClassName(p.class)}</td>
          <td>${p.level}</td>
          <td><span class="status-${p.online ? 'online' : 'offline'}">${p.online ? '● Online' : 'Offline'}</span></td>
          <td><button class="btn btn-sm btn-secondary" onclick="viewPlayer(${p.guid})">View</button></td>
        </tr>
      `).join('');
      document.getElementById('players-page-info').textContent = `Page ${pagination.page} of ${pagination.pages}`;
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="error">Error: ${result.error}</td></tr>`;
    }
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" class="error">Error loading players</td></tr>';
  }
}

// ── WoWHead ──
async function fetchWowheadItem() {
  const itemId = document.getElementById('wowhead-item-id').value;
  if (!itemId) { showToast('Enter an item ID', 'error'); return; }

  const resultDiv = document.getElementById('wowhead-result');
  const previewDiv = document.getElementById('wowhead-item-preview');
  previewDiv.innerHTML = '<p style="color:var(--text-dim);">Fetching from WoWHead...</p>';
  resultDiv.style.display = 'block';

  try {
    const result = await window.api.fetchWowheadItem(parseInt(itemId));
    if (result.success) {
      const item = result.data;
      previewDiv.innerHTML = `
        <div class="item-preview">
          <h4 class="quality-${item.quality}">${escapeHtml(item.name)}</h4>
          <p>Item ID: ${item.id}</p>
          <p>Quality: <span class="quality-${item.quality}">${getQualityName(item.quality)}</span></p>
          <p>Item Level: ${item.itemLevel}</p>
          <p>Required Level: ${item.requiredLevel}</p>
        </div>
      `;
    } else {
      previewDiv.innerHTML = `<p class="error">Error: ${result.error}</p>`;
    }
  } catch (e) {
    previewDiv.innerHTML = '<p class="error">Failed to fetch item</p>';
  }
}

async function importWowheadItem() {
  const itemId = document.getElementById('wowhead-item-id').value;
  if (!itemId) { showToast('No item to import', 'error'); return; }
  try {
    const result = await window.api.itemEditor.create({ entry: parseInt(itemId), name: 'WoWHead Import #' + itemId, Quality: 0, ItemLevel: 1, class: 0 });
    if (result.success) {
      showToast(`Item ${result.data.entry} created in database`, 'success');
    } else {
      showToast(result.error || 'Import failed', 'error');
    }
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
  }
}

// ── Settings ──
function populateSettingsForm() {
  const db = settings.database || {};
  const soapConf = settings.soap || {};

  document.getElementById('setting-db-host').value = db.host || '';
  document.getElementById('setting-db-port').value = db.port || 3306;
  document.getElementById('setting-db-user').value = db.user || '';
  document.getElementById('setting-db-password').value = db.password || '';

  if (db.databases) {
    document.getElementById('setting-db-auth').value = db.databases.auth || '';
    document.getElementById('setting-db-characters').value = db.databases.characters || '';
    document.getElementById('setting-db-world').value = db.databases.world || '';
    document.getElementById('setting-db-hotfixes').value = db.databases.hotfixes || '';
  }

  // SOAP settings
  document.getElementById('setting-soap-enabled').checked = soapConf.enabled || false;
  document.getElementById('setting-soap-host').value = soapConf.host || '';
  document.getElementById('setting-soap-port').value = soapConf.port || 7878;
  document.getElementById('setting-soap-user').value = soapConf.user || '';
  document.getElementById('setting-soap-password').value = soapConf.password || '';

  // Server ports
  const server = settings.server || {};
  document.getElementById('setting-server-world-port').value = server.worldPort || 8085;
  document.getElementById('setting-server-auth-port').value = server.authPort || 3724;
}

async function saveSettings() {
  const newSettings = {
    database: {
      host: document.getElementById('setting-db-host').value,
      port: parseInt(document.getElementById('setting-db-port').value),
      user: document.getElementById('setting-db-user').value,
      password: document.getElementById('setting-db-password').value,
      databases: {
        auth: document.getElementById('setting-db-auth').value,
        characters: document.getElementById('setting-db-characters').value,
        world: document.getElementById('setting-db-world').value,
        hotfixes: document.getElementById('setting-db-hotfixes').value
      }
    },
    server: {
      enabled: true,
      host: document.getElementById('setting-soap-host').value || 'localhost',
      worldPort: parseInt(document.getElementById('setting-server-world-port').value),
      authPort: parseInt(document.getElementById('setting-server-auth-port').value)
    },
    soap: {
      enabled: document.getElementById('setting-soap-enabled').checked,
      host: document.getElementById('setting-soap-host').value,
      port: parseInt(document.getElementById('setting-soap-port').value) || 7878,
      user: document.getElementById('setting-soap-user').value,
      password: document.getElementById('setting-soap-password').value
    }
  };

  const result = await window.api.saveSettings(newSettings);
  if (result.success) {
    settings = { ...settings, ...newSettings };
    showToast('Settings saved successfully');
    checkConnections();
  } else {
    showToast('Failed to save settings', 'error');
  }
}

async function testDatabase(dbName) {
  const result = await window.api.testDatabase(dbName);
  if (result.success) {
    showToast(`${dbName} database — connected!`);
  } else {
    showToast(`${dbName} database — failed: ${result.message}`, 'error');
  }
}

async function testSoapConnection() {
  // Save SOAP settings first so the test uses current values
  const tempSoap = {
    enabled: document.getElementById('setting-soap-enabled').checked,
    host: document.getElementById('setting-soap-host').value,
    port: parseInt(document.getElementById('setting-soap-port').value) || 7878,
    user: document.getElementById('setting-soap-user').value,
    password: document.getElementById('setting-soap-password').value
  };

  // Save just the SOAP portion
  await window.api.saveSettings({ soap: tempSoap });
  settings.soap = tempSoap;

  const result = await window.api.soap.test();
  if (result.success) {
    showToast('SOAP connection successful!');
  } else {
    showToast(`SOAP failed: ${result.message}`, 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// BOSS SCRIPTING / SMARTAI
// WHY: SmartAI uses numeric event/action/target IDs. These
// lookup maps translate them to human-readable names and
// provide contextual parameter labels for the form.
// ═════════════════════════════════════════════════════════════

const SMARTAI_EVENTS = {
  0:  { name: 'Update IC (Timed)',    params: ['InitMin (ms)', 'InitMax (ms)', 'RepeatMin (ms)', 'RepeatMax (ms)'] },
  1:  { name: 'Update OOC (Timed)',   params: ['InitMin (ms)', 'InitMax (ms)', 'RepeatMin (ms)', 'RepeatMax (ms)'] },
  2:  { name: 'Health %',             params: ['HP Min %', 'HP Max %', 'RepeatMin (ms)', 'RepeatMax (ms)'] },
  4:  { name: 'Aggro',                params: [] },
  5:  { name: 'Kill',                 params: ['CooldownMin (ms)', 'CooldownMax (ms)', 'Player Only (0/1)'] },
  6:  { name: 'Death',                params: [] },
  7:  { name: 'Evade',                params: [] },
  8:  { name: 'Spell Hit',            params: ['Spell ID', 'School', 'CooldownMin (ms)', 'CooldownMax (ms)'] },
  9:  { name: 'Range',                params: ['Min Distance', 'Max Distance', 'RepeatMin (ms)', 'RepeatMax (ms)'] },
  11: { name: 'Respawn',              params: [] },
  25: { name: 'Reset',                params: [] },
  34: { name: 'Movement Inform',      params: ['Movement Type', 'Point ID'] },
};

const SMARTAI_ACTIONS = {
  1:  { name: 'Talk',              params: ['Text Group ID', 'Duration (ms)'] },
  11: { name: 'Cast Spell',        params: ['Spell ID', 'Cast Flags', 'Trigger Flags'] },
  12: { name: 'Summon Creature',    params: ['Creature Entry', 'Summon Type', 'Duration (ms)', 'Attack Invoker (0/1)'] },
  17: { name: 'Set Faction',        params: ['Faction ID'] },
  18: { name: 'Morph to Entry',     params: ['Creature Entry'] },
  20: { name: 'Cast Self',          params: ['Spell ID', 'Cast Flags', 'Trigger Flags'] },
  24: { name: 'Evade',              params: [] },
  33: { name: 'Set Phase',          params: ['Phase', 'Mode (0=Set, 1=Add, 2=Remove)'] },
  37: { name: 'Set Data',           params: ['Field', 'Data'] },
  41: { name: 'Flee',               params: ['Flee Assist (0/1)'] },
  44: { name: 'Set HP %',           params: ['HP %'] },
  75: { name: 'Close Gossip',       params: [] },
};

const SMARTAI_TARGETS = {
  0: 'None', 1: 'Self', 2: 'Victim', 5: 'Stored Target',
  6: 'Action Invoker', 7: 'Position', 9: 'Random in Range',
  15: 'Closest Creature', 17: 'Stored Position',
  19: 'Closest Player', 24: 'Farthest Player',
};

// ── Creature Search ──
async function searchBossCreatures() {
  const search = document.getElementById('boss-creature-search').value.trim();
  if (!search) return;

  const container = document.getElementById('boss-results-list');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">Searching...</div>';
  document.getElementById('boss-search-results').style.display = 'block';

  try {
    const result = await window.api.scripts.searchCreatures(search);
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(c => `
        <div class="creature-result-item">
          <div>
            <div class="creature-result-name">${escapeHtml(c.name)}</div>
            <div class="creature-result-meta">
              Entry: ${c.entry} | Level: ${c.minlevel}-${c.maxlevel} |
              ${['Normal', 'Elite', 'Rare Elite', 'World Boss', 'Rare'][c.rank] || 'Rank ' + c.rank}
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="selectBossCreature(${c.entry}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">Select</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">No creatures found.</div>';
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:12px;">Search error: ${e.message}</div>`;
  }
}

async function selectBossCreature(entry, name) {
  currentBossEntry = entry;
  currentBossName = name;

  document.getElementById('boss-creature-name').textContent = name;
  document.getElementById('boss-creature-entry').textContent = `#${entry}`;
  document.getElementById('boss-search-results').style.display = 'none';
  document.getElementById('boss-selected-creature').style.display = 'block';
  document.getElementById('boss-scripts-section').style.display = 'block';
  document.getElementById('boss-script-editor').style.display = 'none';

  await loadBossScripts();
}

// ── Scripts List ──
async function loadBossScripts() {
  if (!currentBossEntry) return;

  const container = document.getElementById('boss-scripts-list');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">Loading scripts...</div>';

  try {
    const result = await window.api.scripts.getScripts(currentBossEntry);
    if (result.success) {
      bossScripts = result.data;
      renderScriptsList();
    } else {
      container.innerHTML = `<div style="color:var(--error); padding:20px;">Error: ${result.error}</div>`;
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:20px;">Error: ${e.message}</div>`;
  }
}

function renderScriptsList() {
  const container = document.getElementById('boss-scripts-list');

  if (bossScripts.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">No scripts found. Click "Add New Script" to create one.</div>';
    return;
  }

  container.innerHTML = bossScripts.map(s => {
    const eventInfo = SMARTAI_EVENTS[s.event_type] || { name: `Event ${s.event_type}`, params: [] };
    const actionInfo = SMARTAI_ACTIONS[s.action_type] || { name: `Action ${s.action_type}`, params: [] };
    const targetName = SMARTAI_TARGETS[s.target_type] || `Target ${s.target_type}`;

    // Build param summaries for context
    const eventParams = eventInfo.params
      .map((label, i) => { const v = s[`event_param${i+1}`]; return v ? `${label}: ${v}` : null; })
      .filter(Boolean).join(', ');
    const actionParams = actionInfo.params
      .map((label, i) => { const v = s[`action_param${i+1}`]; return v ? `${label}: ${v}` : null; })
      .filter(Boolean).join(', ');

    return `
      <div class="script-item">
        <div class="script-id">#${s.id}</div>
        <div class="script-content">
          <div class="script-row">
            <span class="script-label">Event:</span>
            <span class="script-value">${escapeHtml(eventInfo.name)}</span>
            ${eventParams ? `<span class="script-params">(${escapeHtml(eventParams)})</span>` : ''}
            ${s.event_chance < 100 ? `<span class="script-chance">${s.event_chance}%</span>` : ''}
          </div>
          <div class="script-row">
            <span class="script-label">Action:</span>
            <span class="script-value">${escapeHtml(actionInfo.name)}</span>
            ${actionParams ? `<span class="script-params">(${escapeHtml(actionParams)})</span>` : ''}
          </div>
          <div class="script-row">
            <span class="script-label">Target:</span>
            <span class="script-value">${escapeHtml(targetName)}</span>
          </div>
          ${s.comment ? `<div class="script-comment">${escapeHtml(s.comment)}</div>` : ''}
        </div>
        <div class="script-actions">
          <button class="btn btn-sm btn-secondary" onclick="editScript(${s.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteScript(${s.id})">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Script Editor ──
function showScriptEditor(mode, scriptId = null) {
  editingScriptId = scriptId;
  document.getElementById('boss-form-mode').value = mode;
  document.getElementById('boss-form-edit-id').value = scriptId || '';
  document.getElementById('boss-editor-title').textContent = mode === 'add' ? 'Add New Script' : `Edit Script #${scriptId}`;
  document.getElementById('boss-script-editor').style.display = 'block';

  if (mode === 'edit' && scriptId !== null) {
    const script = bossScripts.find(s => s.id === scriptId);
    if (script) populateScriptForm(script);
  } else {
    // Reset form for new script
    document.getElementById('boss-script-form').reset();
    document.getElementById('boss-event-chance').value = 100;
    document.getElementById('boss-event-phase').value = 0;
    document.getElementById('boss-event-params').innerHTML = '';
    document.getElementById('boss-action-params').innerHTML = '';
    document.getElementById('boss-target-params').innerHTML = '';
  }

  // Scroll editor into view
  document.getElementById('boss-script-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideScriptEditor() {
  document.getElementById('boss-script-editor').style.display = 'none';
  editingScriptId = null;
}

function populateScriptForm(s) {
  document.getElementById('boss-event-type').value = s.event_type;
  document.getElementById('boss-action-type').value = s.action_type;
  document.getElementById('boss-target-type').value = s.target_type;
  document.getElementById('boss-event-chance').value = s.event_chance;
  document.getElementById('boss-event-phase').value = s.event_phase_mask || 0;
  document.getElementById('boss-comment').value = s.comment || '';

  // Render dynamic param fields, then populate values
  updateEventParams();
  updateActionParams();

  // Use setTimeout so the DOM updates before we set values
  setTimeout(() => {
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`boss-event-param${i}`);
      if (input) input.value = s[`event_param${i}`] || 0;
    }
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`boss-action-param${i}`);
      if (input) input.value = s[`action_param${i}`] || 0;
    }
    for (let i = 1; i <= 3; i++) {
      const input = document.getElementById(`boss-target-param${i}`);
      if (input) input.value = s[`target_param${i}`] || 0;
    }
  }, 30);
}

// ── Dynamic Parameter Fields ──
// WHY: Each event/action type has different parameters with
// different meanings. We rebuild the inputs dynamically so
// the labels always match what the parameters actually do.

function updateEventParams() {
  const eventType = document.getElementById('boss-event-type').value;
  const container = document.getElementById('boss-event-params');
  if (eventType === '') { container.innerHTML = ''; return; }

  const info = SMARTAI_EVENTS[parseInt(eventType)];
  if (!info || info.params.length === 0) {
    container.innerHTML = '<div class="help-text" style="margin-top:8px;">No parameters for this event.</div>';
    return;
  }

  container.innerHTML = info.params.map((label, i) => `
    <div class="form-group">
      <label>${escapeHtml(label)}</label>
      <input type="number" id="boss-event-param${i+1}" value="0">
    </div>
  `).join('');
}

function updateActionParams() {
  const actionType = document.getElementById('boss-action-type').value;
  const container = document.getElementById('boss-action-params');
  if (actionType === '') { container.innerHTML = ''; return; }

  const info = SMARTAI_ACTIONS[parseInt(actionType)];
  if (!info || info.params.length === 0) {
    container.innerHTML = '<div class="help-text" style="margin-top:8px;">No parameters for this action.</div>';
    return;
  }

  container.innerHTML = info.params.map((label, i) => `
    <div class="form-group">
      <label>${escapeHtml(label)}</label>
      <input type="number" id="boss-action-param${i+1}" value="0">
    </div>
  `).join('');
}

// ── Save Script ──
async function saveScript(e) {
  e.preventDefault();

  const mode = document.getElementById('boss-form-mode').value;
  const scriptData = {
    entryorguid: currentBossEntry,
    link: 0,
    event_type: parseInt(document.getElementById('boss-event-type').value),
    event_phase_mask: parseInt(document.getElementById('boss-event-phase').value) || 0,
    event_chance: parseInt(document.getElementById('boss-event-chance').value) || 100,
    event_flags: 0,
    action_type: parseInt(document.getElementById('boss-action-type').value),
    target_type: parseInt(document.getElementById('boss-target-type').value) || 0,
    target_x: 0, target_y: 0, target_z: 0, target_o: 0,
    comment: document.getElementById('boss-comment').value.trim(),
  };

  // Collect event params (up to 4)
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`boss-event-param${i}`);
    scriptData[`event_param${i}`] = input ? parseInt(input.value) || 0 : 0;
  }
  // Collect action params (up to 6)
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`boss-action-param${i}`);
    scriptData[`action_param${i}`] = input ? parseInt(input.value) || 0 : 0;
  }
  // Collect target params (up to 3)
  for (let i = 1; i <= 3; i++) {
    const input = document.getElementById(`boss-target-param${i}`);
    scriptData[`target_param${i}`] = input ? parseInt(input.value) || 0 : 0;
  }

  try {
    let result;
    if (mode === 'add') {
      result = await window.api.scripts.addScript(scriptData);
    } else {
      const editId = parseInt(document.getElementById('boss-form-edit-id').value);
      result = await window.api.scripts.updateScript(currentBossEntry, editId, scriptData);
    }

    if (result.success) {
      showToast(`Script ${mode === 'add' ? 'added' : 'updated'} successfully`);
      hideScriptEditor();
      await loadBossScripts();
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error saving script: ${e.message}`, 'error');
  }
}

// ── Delete Script ──
async function deleteScript(id) {
  if (!confirm(`Delete script #${id} for ${currentBossName}?`)) return;

  try {
    const result = await window.api.scripts.deleteScript(currentBossEntry, id);
    if (result.success) {
      showToast('Script deleted');
      // If we were editing this script, close the editor
      if (editingScriptId === id) hideScriptEditor();
      await loadBossScripts();
    } else {
      showToast(`Delete failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

function editScript(id) {
  showScriptEditor('edit', id);
}

// ── Export SQL ──
// WHY: Standard TrinityCore practice is DELETE then INSERT
// for SmartAI scripts. This generates copy-paste SQL.
function exportScriptsSQL() {
  if (bossScripts.length === 0) {
    showToast('No scripts to export', 'error');
    return;
  }

  let sql = `-- SmartAI Scripts for ${currentBossName} (Entry: ${currentBossEntry})\n`;
  sql += `-- Generated by CompApp on ${new Date().toLocaleString()}\n\n`;
  sql += `DELETE FROM \`smart_scripts\` WHERE \`entryorguid\` = ${currentBossEntry} AND \`source_type\` = 0;\n\n`;
  sql += `INSERT INTO \`smart_scripts\` (\`entryorguid\`, \`source_type\`, \`id\`, \`link\`, \`event_type\`, \`event_phase_mask\`, \`event_chance\`, \`event_flags\`, \`event_param1\`, \`event_param2\`, \`event_param3\`, \`event_param4\`, \`action_type\`, \`action_param1\`, \`action_param2\`, \`action_param3\`, \`action_param4\`, \`action_param5\`, \`action_param6\`, \`target_type\`, \`target_param1\`, \`target_param2\`, \`target_param3\`, \`target_x\`, \`target_y\`, \`target_z\`, \`target_o\`, \`comment\`) VALUES\n`;

  sql += bossScripts.map((s, i) => {
    const comment = (s.comment || '').replace(/'/g, "''");
    const vals = `(${s.entryorguid}, ${s.source_type}, ${s.id}, ${s.link}, ${s.event_type}, ${s.event_phase_mask}, ${s.event_chance}, ${s.event_flags}, ${s.event_param1}, ${s.event_param2}, ${s.event_param3}, ${s.event_param4}, ${s.action_type}, ${s.action_param1}, ${s.action_param2}, ${s.action_param3}, ${s.action_param4}, ${s.action_param5}, ${s.action_param6}, ${s.target_type}, ${s.target_param1}, ${s.target_param2}, ${s.target_param3}, ${s.target_x}, ${s.target_y}, ${s.target_z}, ${s.target_o}, '${comment}')`;
    return vals + (i < bossScripts.length - 1 ? ',' : ';');
  }).join('\n');

  // Copy to clipboard
  navigator.clipboard.writeText(sql).then(() => {
    showToast('SQL exported to clipboard!');
  }).catch(() => {
    // Fallback: log to console
    console.log(sql);
    showToast('SQL generated — check DevTools console (Ctrl+Shift+I)', 'error');
  });
}

// ── SOAP Reload ──
async function reloadScriptsSOAP() {
  try {
    const result = await window.api.scripts.reloadScripts();
    if (result.success) {
      showToast('Smart scripts reloaded on worldserver!');
    } else {
      showToast(result.error, 'error');
    }
  } catch (e) {
    showToast(`SOAP error: ${e.message}`, 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// LOOT TABLE BUILDER
// ═════════════════════════════════════════════════════════════

// ── Creature Search (reuses existing handler) ──
async function searchLootCreatures() {
  const search = document.getElementById('loot-creature-search').value.trim();
  if (!search) return;

  const container = document.getElementById('loot-results-list');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">Searching...</div>';
  document.getElementById('loot-search-results').style.display = 'block';

  try {
    // Reuse the creature search from Boss Scripting
    const result = await window.api.scripts.searchCreatures(search);
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(c => `
        <div class="creature-result-item">
          <div>
            <div class="creature-result-name">${escapeHtml(c.name)}</div>
            <div class="creature-result-meta">
              Entry: ${c.entry} | Level: ${c.minlevel}-${c.maxlevel} |
              ${['Normal', 'Elite', 'Rare Elite', 'World Boss', 'Rare'][c.rank] || 'Rank ' + c.rank}
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="selectLootCreature(${c.entry}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">Select</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">No creatures found.</div>';
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:12px;">Search error: ${e.message}</div>`;
  }
}

async function selectLootCreature(entry, name) {
  currentLootCreature = entry;
  currentLootCreatureName = name;

  // Fetch creature's lootid from creature_template
  const result = await window.api.loot.getCreatureLootId(entry);
  if (!result.success) {
    showToast(`Error: ${result.error}`, 'error');
    return;
  }

  currentLootId = result.data.lootid;

  document.getElementById('loot-creature-name').textContent = name;
  document.getElementById('loot-creature-entry').textContent = `#${entry}`;
  document.getElementById('loot-lootid-badge').textContent = `Loot ID: ${currentLootId}`;
  document.getElementById('loot-search-results').style.display = 'none';
  document.getElementById('loot-selected-creature').style.display = 'block';
  document.getElementById('loot-table-section').style.display = 'block';
  document.getElementById('loot-entry-editor').style.display = 'none';
  document.getElementById('loot-simulation-results').style.display = 'none';

  if (currentLootId === 0) {
    document.getElementById('loot-no-table').style.display = 'block';
    document.getElementById('loot-table-display').style.display = 'none';
  } else {
    document.getElementById('loot-no-table').style.display = 'none';
    document.getElementById('loot-table-display').style.display = 'block';
    await loadLootEntries();
  }
}

async function createLootTable() {
  if (!currentLootCreature) return;

  // Standard: use creature entry as lootid
  const newLootId = currentLootCreature;

  try {
    const result = await window.api.loot.createLootTable(currentLootCreature, newLootId);
    if (result.success) {
      showToast(`Loot table created (ID: ${newLootId})`);
      currentLootId = newLootId;
      document.getElementById('loot-lootid-badge').textContent = `Loot ID: ${newLootId}`;
      document.getElementById('loot-no-table').style.display = 'none';
      document.getElementById('loot-table-display').style.display = 'block';
      await loadLootEntries();
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

// ── Loot Entries Display ──
async function loadLootEntries() {
  if (!currentLootId) return;

  const container = document.getElementById('loot-cards-container');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">Loading loot...</div>';

  try {
    const result = await window.api.loot.getCreatureLoot(currentLootId);
    if (result.success) {
      lootEntries = result.data;
      renderLootCards();
    } else {
      container.innerHTML = `<div style="color:var(--error); padding:20px;">Error: ${result.error}</div>`;
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:20px;">Error: ${e.message}</div>`;
  }
}

function getChanceClass(chance) {
  if (chance >= 100) return 'chance-100';
  if (chance >= 50) return 'chance-50-99';
  if (chance >= 10) return 'chance-10-49';
  if (chance >= 1) return 'chance-1-9';
  return 'chance-0-1';
}

function renderLootCards() {
  const container = document.getElementById('loot-cards-container');

  if (lootEntries.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">No loot entries. Click "+ Add Item" to create one.</div>';
    return;
  }

  container.innerHTML = lootEntries.map(entry => {
    const chanceClass = getChanceClass(entry.Chance);
    const itemName = entry.name || `Item #${entry.Item}`;
    const quality = entry.Quality ?? 1;
    const isRef = entry.Reference > 0;

    return `
      <div class="loot-card">
        ${entry.GroupId > 0 ? `<div class="loot-group-indicator">${entry.GroupId}</div>` : ''}
        <div class="loot-card-header">
          <div>
            <div class="loot-item-name quality-${quality}">${escapeHtml(itemName)}</div>
            <div class="loot-item-meta">
              ID: ${entry.Item}
              ${entry.QuestRequired === 1 ? '<span class="loot-badge quest">Quest</span>' : ''}
              ${isRef ? '<span class="loot-badge reference">Ref ' + entry.Reference + '</span>' : ''}
            </div>
          </div>
          <div class="loot-card-actions">
            <button class="btn btn-sm btn-secondary" onclick="editLootEntry(${entry.Item})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteLootEntry(${entry.Item})">×</button>
          </div>
        </div>
        <div class="loot-chance-bar-container">
          <div class="loot-chance-bar ${chanceClass}" style="width: ${Math.min(entry.Chance, 100)}%"></div>
          <div class="loot-chance-text">${entry.Chance}%</div>
        </div>
        <div class="loot-details">
          <div class="loot-detail-item">
            <span class="loot-detail-label">Count</span>
            <span class="loot-detail-value">${entry.MinCount}${entry.MinCount !== entry.MaxCount ? '-' + entry.MaxCount : ''}</span>
          </div>
          <div class="loot-detail-item">
            <span class="loot-detail-label">Group</span>
            <span class="loot-detail-value">${entry.GroupId === 0 ? 'Independent' : 'Group ' + entry.GroupId}</span>
          </div>
          <div class="loot-detail-item">
            <span class="loot-detail-label">Mode</span>
            <span class="loot-detail-value">${entry.LootMode}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Loot Entry Editor ──
function showLootEditor(mode, itemId = null) {
  editingLootItem = itemId;
  document.getElementById('loot-form-mode').value = mode;
  document.getElementById('loot-form-edit-item').value = itemId || '';
  document.getElementById('loot-editor-title').textContent = mode === 'add' ? 'Add Loot Entry' : 'Edit Loot Entry';
  document.getElementById('loot-entry-editor').style.display = 'block';

  if (mode === 'edit' && itemId !== null) {
    const entry = lootEntries.find(e => e.Item === itemId);
    if (entry) populateLootForm(entry);
  } else {
    document.getElementById('loot-entry-form').reset();
    document.getElementById('loot-chance').value = 100;
    document.getElementById('loot-min-count').value = 1;
    document.getElementById('loot-max-count').value = 1;
    document.getElementById('loot-group-id').value = 0;
    document.getElementById('loot-mode').value = 1;
    document.getElementById('loot-reference').value = 0;
    document.getElementById('loot-selected-item').style.display = 'none';
    document.getElementById('loot-item-results').style.display = 'none';
    document.getElementById('loot-item-search').value = '';
    selectedLootItemId = null;
  }

  document.getElementById('loot-entry-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideLootEditor() {
  document.getElementById('loot-entry-editor').style.display = 'none';
  editingLootItem = null;
  selectedLootItemId = null;
}

function populateLootForm(entry) {
  selectedLootItemId = entry.Item;
  selectedLootItemName = entry.name || `Item ${entry.Item}`;
  selectedLootItemQuality = entry.Quality ?? 1;
  document.getElementById('loot-selected-item-name').textContent = selectedLootItemName;
  document.getElementById('loot-selected-item-name').className = `quality-${selectedLootItemQuality}`;
  document.getElementById('loot-selected-item-id').textContent = `#${entry.Item}`;
  document.getElementById('loot-selected-item').style.display = 'block';
  document.getElementById('loot-item-search').value = '';
  document.getElementById('loot-item-results').style.display = 'none';

  document.getElementById('loot-chance').value = entry.Chance;
  document.getElementById('loot-min-count').value = entry.MinCount;
  document.getElementById('loot-max-count').value = entry.MaxCount;
  document.getElementById('loot-group-id').value = entry.GroupId;
  document.getElementById('loot-quest-required').checked = entry.QuestRequired === 1;
  document.getElementById('loot-mode').value = entry.LootMode;
  document.getElementById('loot-reference').value = entry.Reference || 0;
}

// ── Item Search (debounced autocomplete) ──
async function searchLootItems() {
  const search = document.getElementById('loot-item-search').value.trim();
  const resultsDiv = document.getElementById('loot-item-results');

  if (search.length < 2) {
    resultsDiv.style.display = 'none';
    return;
  }

  try {
    const result = await window.api.loot.searchItems(search);
    if (result.success && result.data.length > 0) {
      resultsDiv.innerHTML = result.data.map(item => `
        <div class="item-result-item" onclick="selectLootItem(${item.entry}, '${escapeHtml(item.name).replace(/'/g, "\\'")}', ${item.Quality})">
          <div>
            <div class="item-result-name quality-${item.Quality}">${escapeHtml(item.name)}</div>
            <div class="item-result-meta">ID: ${item.entry} | iLvl: ${item.ItemLevel}</div>
          </div>
        </div>
      `).join('');
      resultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:10px;">No items found</div>';
      resultsDiv.style.display = 'block';
    }
  } catch (e) {
    resultsDiv.style.display = 'none';
  }
}

function selectLootItem(itemId, itemName, quality) {
  selectedLootItemId = itemId;
  selectedLootItemName = itemName;
  selectedLootItemQuality = quality;

  document.getElementById('loot-selected-item-name').textContent = itemName;
  document.getElementById('loot-selected-item-name').className = `quality-${quality}`;
  document.getElementById('loot-selected-item-id').textContent = `#${itemId}`;
  document.getElementById('loot-selected-item').style.display = 'block';
  document.getElementById('loot-item-search').value = '';
  document.getElementById('loot-item-results').style.display = 'none';
}

// ── Save Loot Entry ──
async function saveLootEntry(e) {
  e.preventDefault();

  if (!selectedLootItemId) {
    showToast('Select an item first', 'error');
    return;
  }

  const mode = document.getElementById('loot-form-mode').value;
  const lootData = {
    entry: currentLootId,
    item: selectedLootItemId,
    chance: parseFloat(document.getElementById('loot-chance').value) || 100,
    minCount: parseInt(document.getElementById('loot-min-count').value) || 1,
    maxCount: parseInt(document.getElementById('loot-max-count').value) || 1,
    groupId: parseInt(document.getElementById('loot-group-id').value) || 0,
    questRequired: document.getElementById('loot-quest-required').checked ? 1 : 0,
    lootMode: parseInt(document.getElementById('loot-mode').value) || 1,
    reference: parseInt(document.getElementById('loot-reference').value) || 0,
  };

  try {
    let result;
    if (mode === 'add') {
      result = await window.api.loot.addEntry(lootData);
    } else {
      const editItem = parseInt(document.getElementById('loot-form-edit-item').value);
      result = await window.api.loot.updateEntry(currentLootId, editItem, lootData);
    }

    if (result.success) {
      showToast(`Loot entry ${mode === 'add' ? 'added' : 'updated'}`);
      hideLootEditor();
      await loadLootEntries();
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

// ── Delete Loot Entry ──
async function deleteLootEntry(itemId) {
  const entry = lootEntries.find(e => e.Item === itemId);
  const itemName = entry?.name || `Item ${itemId}`;
  if (!confirm(`Remove ${itemName} from loot table?`)) return;

  try {
    const result = await window.api.loot.deleteEntry(currentLootId, itemId);
    if (result.success) {
      showToast('Loot entry removed');
      if (editingLootItem === itemId) hideLootEditor();
      await loadLootEntries();
    } else {
      showToast(`Delete failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

function editLootEntry(itemId) {
  showLootEditor('edit', itemId);
}

// ── Loot Kill Simulation ──
// WHY: TrinityCore loot algorithm —
// Group 0: each item rolls independently (Chance% to drop)
// GroupId > 0: one item per group, weighted by Chance values
function simulateLootKill() {
  if (lootEntries.length === 0) {
    showToast('No loot to simulate', 'error');
    return;
  }

  const drops = [];

  // Group 0: independent rolls
  lootEntries.filter(e => e.GroupId === 0 && e.Reference === 0).forEach(entry => {
    const roll = Math.random() * 100;
    if (roll <= entry.Chance) {
      const count = randomInt(entry.MinCount, entry.MaxCount);
      drops.push({ ...entry, droppedCount: count });
    }
  });

  // Grouped items: one winner per group
  const groups = {};
  lootEntries.filter(e => e.GroupId > 0 && e.Reference === 0).forEach(entry => {
    if (!groups[entry.GroupId]) groups[entry.GroupId] = [];
    groups[entry.GroupId].push(entry);
  });

  Object.values(groups).forEach(group => {
    const totalChance = group.reduce((sum, e) => sum + e.Chance, 0);
    let roll = Math.random() * totalChance;
    for (const entry of group) {
      roll -= entry.Chance;
      if (roll <= 0) {
        const count = randomInt(entry.MinCount, entry.MaxCount);
        drops.push({ ...entry, droppedCount: count });
        break;
      }
    }
  });

  renderSimulationResults(drops);
}

function renderSimulationResults(drops) {
  const container = document.getElementById('loot-simulation-drops');
  const panel = document.getElementById('loot-simulation-results');

  if (drops.length === 0) {
    container.innerHTML = '<div class="simulation-empty">No loot dropped this time!</div>';
  } else {
    container.innerHTML = drops.map(drop => {
      const itemName = drop.name || `Item ${drop.Item}`;
      const quality = drop.Quality ?? 1;
      return `
        <div class="simulation-drop-item">
          <div class="simulation-item-info">
            <div class="simulation-item-name quality-${quality}">${escapeHtml(itemName)}</div>
            <div class="simulation-item-count">x${drop.droppedCount} (${drop.Chance}% chance)</div>
          </div>
        </div>
      `;
    }).join('');
  }

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ═════════════════════════════════════════════════════════════
// NPC MANAGER
// ═════════════════════════════════════════════════════════════

const NPC_RANKS = { 0: 'Normal', 1: 'Elite', 2: 'Rare Elite', 3: 'Boss', 4: 'Rare' };
const NPC_TYPES = { 0: 'None', 1: 'Beast', 2: 'Dragonkin', 3: 'Demon', 4: 'Elemental', 5: 'Giant', 6: 'Undead', 7: 'Humanoid', 8: 'Critter', 9: 'Mechanical', 10: 'Uncategorized' };
const MAP_NAMES = { 0: 'Eastern Kingdoms', 1: 'Kalimdor', 530: 'Outland', 571: 'Northrend' };

async function searchNPCs() {
  const search = document.getElementById('npc-search-input').value.trim();
  const minLevel = document.getElementById('npc-min-level').value;
  const maxLevel = document.getElementById('npc-max-level').value;
  if (!search && !minLevel && !maxLevel) return;

  const container = document.getElementById('npc-results-list');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">Searching...</div>';
  document.getElementById('npc-search-results').style.display = 'block';

  try {
    const result = await window.api.npcs.search(search, minLevel || undefined, maxLevel || undefined);
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(c => `
        <div class="creature-result-item">
          <div>
            <div class="creature-result-name">${escapeHtml(c.name)}</div>
            <div class="creature-result-meta">
              Entry: ${c.entry} | Lvl ${c.minlevel}-${c.maxlevel} | ${NPC_RANKS[c.rank] || 'Normal'} | ${NPC_TYPES[c.type] || 'Unknown'}
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="selectNPC(${c.entry})">Select</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">No creatures found.</div>';
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:12px;">Error: ${e.message}</div>`;
  }
}

async function selectNPC(entry) {
  try {
    const result = await window.api.npcs.get(entry);
    if (!result.success) { showToast(`Error: ${result.error}`, 'error'); return; }

    currentNpcEntry = entry;
    currentNpcData = result.data;

    document.getElementById('npc-selected-name').textContent = result.data.name;
    document.getElementById('npc-selected-id').textContent = `#${entry}`;
    document.getElementById('npc-rank-badge').textContent = NPC_RANKS[result.data.rank] || 'Normal';

    document.getElementById('npc-search-results').style.display = 'none';
    document.getElementById('npc-selected-banner').style.display = 'block';
    document.getElementById('npc-editor-section').style.display = 'block';

    populateNPCForm(result.data);
    await loadCreatureSpawns();
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

function populateNPCForm(c) {
  document.getElementById('npc-name').value = c.name || '';
  document.getElementById('npc-subname').value = c.subname || '';
  document.getElementById('npc-modelid1').value = c.modelid1 || 0;
  document.getElementById('npc-modelid2').value = c.modelid2 || 0;
  document.getElementById('npc-minlevel').value = c.minlevel || 1;
  document.getElementById('npc-maxlevel').value = c.maxlevel || 1;
  document.getElementById('npc-rank').value = c.rank || 0;
  document.getElementById('npc-faction').value = c.faction || 0;
  document.getElementById('npc-unit-class').value = c.unit_class || 1;
  document.getElementById('npc-health-mod').value = c.HealthModifier || 1;
  document.getElementById('npc-mana-mod').value = c.ManaModifier || 1;
  document.getElementById('npc-armor-mod').value = c.ArmorModifier || 1;
  document.getElementById('npc-damage-mod').value = c.DamageModifier || 1;
  document.getElementById('npc-xp-mod').value = c.ExperienceModifier || 1;
  document.getElementById('npc-speed-walk').value = c.speed_walk || 1;
  document.getElementById('npc-speed-run').value = c.speed_run || 1.14286;
  document.getElementById('npc-base-attack').value = c.BaseAttackTime || 2000;
  document.getElementById('npc-range-attack').value = c.RangeAttackTime || 2000;
  document.getElementById('npc-npcflag').value = c.npcflag || 0;
  document.getElementById('npc-unit-flags').value = c.unit_flags || 0;
  document.getElementById('npc-type').value = c.type || 0;
  document.getElementById('npc-type-flags').value = c.type_flags || 0;
  document.getElementById('npc-lootid').value = c.lootid || 0;
  document.getElementById('npc-mingold').value = c.mingold || 0;
  document.getElementById('npc-maxgold').value = c.maxgold || 0;
  document.getElementById('npc-ainame').value = c.AIName || '';
  document.getElementById('npc-scriptname').value = c.ScriptName || '';
}

function collectNPCFormData() {
  return {
    name: document.getElementById('npc-name').value.trim(),
    subname: document.getElementById('npc-subname').value.trim(),
    modelid1: parseInt(document.getElementById('npc-modelid1').value) || 0,
    modelid2: parseInt(document.getElementById('npc-modelid2').value) || 0,
    minlevel: parseInt(document.getElementById('npc-minlevel').value) || 1,
    maxlevel: parseInt(document.getElementById('npc-maxlevel').value) || 1,
    rank: parseInt(document.getElementById('npc-rank').value) || 0,
    faction: parseInt(document.getElementById('npc-faction').value) || 0,
    unit_class: parseInt(document.getElementById('npc-unit-class').value) || 1,
    HealthModifier: parseFloat(document.getElementById('npc-health-mod').value) || 1,
    ManaModifier: parseFloat(document.getElementById('npc-mana-mod').value) || 1,
    ArmorModifier: parseFloat(document.getElementById('npc-armor-mod').value) || 1,
    DamageModifier: parseFloat(document.getElementById('npc-damage-mod').value) || 1,
    ExperienceModifier: parseFloat(document.getElementById('npc-xp-mod').value) || 1,
    speed_walk: parseFloat(document.getElementById('npc-speed-walk').value) || 1,
    speed_run: parseFloat(document.getElementById('npc-speed-run').value) || 1.14286,
    BaseAttackTime: parseInt(document.getElementById('npc-base-attack').value) || 2000,
    RangeAttackTime: parseInt(document.getElementById('npc-range-attack').value) || 2000,
    npcflag: parseInt(document.getElementById('npc-npcflag').value) || 0,
    unit_flags: parseInt(document.getElementById('npc-unit-flags').value) || 0,
    type: parseInt(document.getElementById('npc-type').value) || 0,
    type_flags: parseInt(document.getElementById('npc-type-flags').value) || 0,
    lootid: parseInt(document.getElementById('npc-lootid').value) || 0,
    mingold: parseInt(document.getElementById('npc-mingold').value) || 0,
    maxgold: parseInt(document.getElementById('npc-maxgold').value) || 0,
    AIName: document.getElementById('npc-ainame').value.trim(),
    ScriptName: document.getElementById('npc-scriptname').value.trim(),
  };
}

async function saveCreature() {
  if (!currentNpcEntry) return;
  const cd = collectNPCFormData();
  try {
    const result = await window.api.npcs.update(currentNpcEntry, cd);
    if (result.success) {
      showToast('Creature saved & reloaded');
      document.getElementById('npc-selected-name').textContent = cd.name;
    } else { showToast(`Save failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function loadCreatureSpawns() {
  if (!currentNpcEntry) return;
  try {
    const result = await window.api.npcs.getSpawns(currentNpcEntry);
    npcSpawns = result.success ? result.data : [];
    renderSpawnsTable();
  } catch (e) { console.error('Error loading spawns:', e); }
}

function renderSpawnsTable() {
  const tbody = document.getElementById('npc-spawns-body');
  if (npcSpawns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-dim);">No spawn points</td></tr>';
    return;
  }
  tbody.innerHTML = npcSpawns.map(s => `
    <tr>
      <td>${s.guid}</td>
      <td>${MAP_NAMES[s.map] || 'Map ' + s.map}</td>
      <td>${Number(s.position_x).toFixed(1)}</td>
      <td>${Number(s.position_y).toFixed(1)}</td>
      <td>${Number(s.position_z).toFixed(1)}</td>
      <td>${Number(s.orientation).toFixed(2)}</td>
      <td>${s.spawntimesecs}s</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteCreatureSpawn(${s.guid})">Del</button></td>
    </tr>
  `).join('');
}

async function addCreatureSpawn() {
  if (!currentNpcEntry) return;
  const spawn = {
    id: currentNpcEntry,
    map: parseInt(document.getElementById('npc-spawn-map').value),
    position_x: parseFloat(document.getElementById('npc-spawn-x').value) || 0,
    position_y: parseFloat(document.getElementById('npc-spawn-y').value) || 0,
    position_z: parseFloat(document.getElementById('npc-spawn-z').value) || 0,
    orientation: parseFloat(document.getElementById('npc-spawn-orient').value) || 0,
    spawntimesecs: parseInt(document.getElementById('npc-spawn-time').value) || 300,
  };
  try {
    const result = await window.api.npcs.addSpawn(spawn);
    if (result.success) {
      showToast('Spawn point added');
      await loadCreatureSpawns();
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function deleteCreatureSpawn(guid) {
  if (!confirm(`Delete spawn point ${guid}?`)) return;
  try {
    const result = await window.api.npcs.deleteSpawn(guid);
    if (result.success) {
      showToast('Spawn deleted');
      await loadCreatureSpawns();
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

function exportCreatureSQL() {
  if (!currentNpcEntry) { showToast('No creature loaded', 'error'); return; }
  const cd = collectNPCFormData();
  const esc = (s) => (s || '').replace(/'/g, "''");
  let sql = `-- Creature: ${esc(cd.name)} (Entry: ${currentNpcEntry})\n`;
  sql += `-- Generated by CompApp on ${new Date().toLocaleString()}\n\n`;
  sql += `UPDATE \`creature_template\` SET\n`;
  sql += `  \`name\` = '${esc(cd.name)}', \`subname\` = '${esc(cd.subname)}',\n`;
  sql += `  \`minlevel\` = ${cd.minlevel}, \`maxlevel\` = ${cd.maxlevel}, \`rank\` = ${cd.rank},\n`;
  sql += `  \`faction\` = ${cd.faction}, \`unit_class\` = ${cd.unit_class},\n`;
  sql += `  \`HealthModifier\` = ${cd.HealthModifier}, \`ManaModifier\` = ${cd.ManaModifier},\n`;
  sql += `  \`ArmorModifier\` = ${cd.ArmorModifier}, \`DamageModifier\` = ${cd.DamageModifier},\n`;
  sql += `  \`ExperienceModifier\` = ${cd.ExperienceModifier},\n`;
  sql += `  \`speed_walk\` = ${cd.speed_walk}, \`speed_run\` = ${cd.speed_run},\n`;
  sql += `  \`BaseAttackTime\` = ${cd.BaseAttackTime}, \`RangeAttackTime\` = ${cd.RangeAttackTime},\n`;
  sql += `  \`npcflag\` = ${cd.npcflag}, \`unit_flags\` = ${cd.unit_flags},\n`;
  sql += `  \`type\` = ${cd.type}, \`type_flags\` = ${cd.type_flags},\n`;
  sql += `  \`lootid\` = ${cd.lootid}, \`mingold\` = ${cd.mingold}, \`maxgold\` = ${cd.maxgold},\n`;
  sql += `  \`AIName\` = '${esc(cd.AIName)}', \`ScriptName\` = '${esc(cd.ScriptName)}',\n`;
  sql += `  \`modelid1\` = ${cd.modelid1}, \`modelid2\` = ${cd.modelid2}\n`;
  sql += `WHERE \`entry\` = ${currentNpcEntry};\n`;

  if (npcSpawns.length > 0) {
    sql += `\n-- Spawn points\n`;
    npcSpawns.forEach(s => {
      sql += `DELETE FROM \`creature\` WHERE \`guid\` = ${s.guid};\n`;
      sql += `INSERT INTO \`creature\` (\`id\`, \`map\`, \`position_x\`, \`position_y\`, \`position_z\`, \`orientation\`, \`spawntimesecs\`) VALUES (${currentNpcEntry}, ${s.map}, ${s.position_x}, ${s.position_y}, ${s.position_z}, ${s.orientation}, ${s.spawntimesecs});\n`;
    });
  }

  navigator.clipboard.writeText(sql).then(() => {
    showToast('Creature SQL exported to clipboard!');
  }).catch(() => {
    console.log(sql);
    showToast('SQL generated — check DevTools console', 'error');
  });
}

// ═════════════════════════════════════════════════════════════
// ITEM EDITOR
// ═════════════════════════════════════════════════════════════

const QUALITY_COLORS = { 0: '#9d9d9d', 1: '#ffffff', 2: '#1eff00', 3: '#0070dd', 4: '#a335ee', 5: '#ff8000', 6: '#e6cc80' };
const QUALITY_NAMES_ED = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact'];
const BONDING_NAMES = { 0: '', 1: 'Binds when picked up', 2: 'Binds when equipped', 3: 'Binds when used', 4: 'Quest Item' };
const INVTYPE_NAMES = { 0: '', 1: 'Head', 2: 'Neck', 3: 'Shoulder', 5: 'Chest', 6: 'Waist', 7: 'Legs', 8: 'Feet', 9: 'Wrist', 10: 'Hands', 11: 'Finger', 12: 'Trinket', 13: 'One-Hand', 14: 'Shield', 15: 'Ranged', 16: 'Back', 17: 'Two-Hand', 21: 'Main Hand', 22: 'Off Hand', 23: 'Held In Off-Hand', 25: 'Thrown', 26: 'Wand' };
const STAT_TYPES = { 0: 'Mana', 1: 'Health', 3: 'Agility', 4: 'Strength', 5: 'Intellect', 6: 'Spirit', 7: 'Stamina' };

async function searchItemsForEditor() {
  const search = document.getElementById('item-ed-search-input').value.trim();
  if (!search) return;
  const container = document.getElementById('item-ed-results-list');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">Searching...</div>';
  document.getElementById('item-ed-search-results').style.display = 'block';
  try {
    const result = await window.api.loot.searchItems(search);
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(i => `
        <div class="creature-result-item">
          <div>
            <div class="creature-result-name quality-${i.Quality}">${escapeHtml(i.name)}</div>
            <div class="creature-result-meta">Entry: ${i.entry} | iLvl: ${i.ItemLevel} | ${QUALITY_NAMES_ED[i.Quality] || 'Unknown'}</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="selectItemForEditor(${i.entry})">Edit</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">No items found.</div>';
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:12px;">Error: ${e.message}</div>`;
  }
}

async function selectItemForEditor(entry) {
  try {
    const result = await window.api.itemEditor.get(entry);
    if (!result.success) { showToast(`Error: ${result.error}`, 'error'); return; }
    currentItemEntry = entry;
    currentItemData = result.data;
    document.getElementById('item-ed-selected-name').textContent = result.data.name;
    document.getElementById('item-ed-selected-name').style.color = QUALITY_COLORS[result.data.Quality] || '#fff';
    document.getElementById('item-ed-selected-id').textContent = `#${entry}`;
    document.getElementById('item-ed-search-results').style.display = 'none';
    document.getElementById('item-ed-selected-banner').style.display = 'block';
    document.getElementById('item-ed-editor-section').style.display = 'block';
    populateItemEditorForm(result.data);
    updateItemTooltipPreview();
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function createNewItem() {
  try {
    const result = await window.api.itemEditor.create({ name: 'New Item', Quality: 1, ItemLevel: 1, class: 0 });
    if (result.success) {
      showToast(`Item #${result.data.entry} created`);
      await selectItemForEditor(result.data.entry);
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function cloneItem() {
  if (!currentItemEntry) return;
  try {
    const result = await window.api.itemEditor.clone(currentItemEntry);
    if (result.success) {
      showToast(`Cloned to #${result.data.entry}`);
      await selectItemForEditor(result.data.entry);
    } else { showToast(`Clone failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function deleteItem() {
  if (!currentItemEntry) return;
  if (!confirm(`Delete item #${currentItemEntry}? This cannot be undone.`)) return;
  try {
    const result = await window.api.itemEditor.delete(currentItemEntry);
    if (result.success) {
      showToast('Item deleted');
      currentItemEntry = null;
      currentItemData = null;
      document.getElementById('item-ed-selected-banner').style.display = 'none';
      document.getElementById('item-ed-editor-section').style.display = 'none';
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

function populateItemEditorForm(item) {
  document.getElementById('item-ed-name').value = item.name || '';
  document.getElementById('item-ed-description').value = item.description || '';
  document.getElementById('item-ed-quality').value = item.Quality || 0;
  document.getElementById('item-ed-itemlevel').value = item.ItemLevel || 1;
  document.getElementById('item-ed-reqlevel').value = item.RequiredLevel || 0;
  document.getElementById('item-ed-class').value = item.class || 0;
  document.getElementById('item-ed-subclass').value = item.subclass || 0;
  document.getElementById('item-ed-invtype').value = item.InventoryType || 0;
  document.getElementById('item-ed-bonding').value = item.bonding || 0;
  document.getElementById('item-ed-allowclass').value = item.AllowableClass ?? -1;
  document.getElementById('item-ed-allowrace').value = item.AllowableRace ?? -1;
  document.getElementById('item-ed-dmgmin').value = item.dmg_min1 || 0;
  document.getElementById('item-ed-dmgmax').value = item.dmg_max1 || 0;
  document.getElementById('item-ed-dmgtype').value = item.dmg_type1 || 0;
  document.getElementById('item-ed-delay').value = item.delay || 0;
  document.getElementById('item-ed-armor').value = item.armor || 0;
  document.getElementById('item-ed-holy').value = item.holy_res || 0;
  document.getElementById('item-ed-fire').value = item.fire_res || 0;
  document.getElementById('item-ed-nature').value = item.nature_res || 0;
  document.getElementById('item-ed-frost').value = item.frost_res || 0;
  document.getElementById('item-ed-shadow').value = item.shadow_res || 0;
  document.getElementById('item-ed-arcane').value = item.arcane_res || 0;
  document.getElementById('item-ed-buyprice').value = item.BuyPrice || 0;
  document.getElementById('item-ed-sellprice').value = item.SellPrice || 0;
  document.getElementById('item-ed-stackable').value = item.stackable || 1;
  document.getElementById('item-ed-maxcount').value = item.maxcount || 0;
  document.getElementById('item-ed-durability').value = item.MaxDurability || 0;
  document.getElementById('item-ed-socket1').value = item.socketColor_1 || 0;
  document.getElementById('item-ed-socket2').value = item.socketColor_2 || 0;
  document.getElementById('item-ed-socket3').value = item.socketColor_3 || 0;
  document.getElementById('item-ed-socketbonus').value = item.socketBonus || 0;

  // Build stats grid dynamically
  const statsGrid = document.getElementById('item-ed-stats-grid');
  let statsHTML = '';
  for (let i = 1; i <= 10; i++) {
    const st = item[`stat_type${i}`] || 0;
    const sv = item[`stat_value${i}`] || 0;
    statsHTML += `<div class="stat-row">
      <select id="item-ed-stattype${i}" onchange="updateItemTooltipPreview()">
        <option value="0" ${st===0?'selected':''}>None/Mana</option>
        <option value="1" ${st===1?'selected':''}>Health</option>
        <option value="3" ${st===3?'selected':''}>Agility</option>
        <option value="4" ${st===4?'selected':''}>Strength</option>
        <option value="5" ${st===5?'selected':''}>Intellect</option>
        <option value="6" ${st===6?'selected':''}>Spirit</option>
        <option value="7" ${st===7?'selected':''}>Stamina</option>
      </select>
      <input type="number" id="item-ed-statval${i}" value="${sv}" onchange="updateItemTooltipPreview()">
    </div>`;
  }
  statsGrid.innerHTML = statsHTML;
}

function collectItemEditorData() {
  const id = {};
  id.name = document.getElementById('item-ed-name').value.trim();
  id.description = document.getElementById('item-ed-description').value;
  id.Quality = parseInt(document.getElementById('item-ed-quality').value) || 0;
  id.ItemLevel = parseInt(document.getElementById('item-ed-itemlevel').value) || 1;
  id.RequiredLevel = parseInt(document.getElementById('item-ed-reqlevel').value) || 0;
  id.class = parseInt(document.getElementById('item-ed-class').value) || 0;
  id.subclass = parseInt(document.getElementById('item-ed-subclass').value) || 0;
  id.InventoryType = parseInt(document.getElementById('item-ed-invtype').value) || 0;
  id.bonding = parseInt(document.getElementById('item-ed-bonding').value) || 0;
  id.AllowableClass = parseInt(document.getElementById('item-ed-allowclass').value);
  id.AllowableRace = parseInt(document.getElementById('item-ed-allowrace').value);
  for (let i = 1; i <= 10; i++) {
    id[`stat_type${i}`] = parseInt(document.getElementById(`item-ed-stattype${i}`)?.value) || 0;
    id[`stat_value${i}`] = parseInt(document.getElementById(`item-ed-statval${i}`)?.value) || 0;
  }
  id.dmg_min1 = parseFloat(document.getElementById('item-ed-dmgmin').value) || 0;
  id.dmg_max1 = parseFloat(document.getElementById('item-ed-dmgmax').value) || 0;
  id.dmg_type1 = parseInt(document.getElementById('item-ed-dmgtype').value) || 0;
  id.delay = parseInt(document.getElementById('item-ed-delay').value) || 0;
  id.armor = parseInt(document.getElementById('item-ed-armor').value) || 0;
  id.holy_res = parseInt(document.getElementById('item-ed-holy').value) || 0;
  id.fire_res = parseInt(document.getElementById('item-ed-fire').value) || 0;
  id.nature_res = parseInt(document.getElementById('item-ed-nature').value) || 0;
  id.frost_res = parseInt(document.getElementById('item-ed-frost').value) || 0;
  id.shadow_res = parseInt(document.getElementById('item-ed-shadow').value) || 0;
  id.arcane_res = parseInt(document.getElementById('item-ed-arcane').value) || 0;
  id.bonding = parseInt(document.getElementById('item-ed-bonding').value) || 0;
  id.MaxDurability = parseInt(document.getElementById('item-ed-durability').value) || 0;
  id.socketColor_1 = parseInt(document.getElementById('item-ed-socket1').value) || 0;
  id.socketColor_2 = parseInt(document.getElementById('item-ed-socket2').value) || 0;
  id.socketColor_3 = parseInt(document.getElementById('item-ed-socket3').value) || 0;
  id.socketBonus = parseInt(document.getElementById('item-ed-socketbonus').value) || 0;
  id.BuyPrice = parseInt(document.getElementById('item-ed-buyprice').value) || 0;
  id.SellPrice = parseInt(document.getElementById('item-ed-sellprice').value) || 0;
  id.stackable = parseInt(document.getElementById('item-ed-stackable').value) || 1;
  id.maxcount = parseInt(document.getElementById('item-ed-maxcount').value) || 0;
  return id;
}

async function saveItemEditor() {
  if (!currentItemEntry) return;
  const itemData = collectItemEditorData();
  try {
    const result = await window.api.itemEditor.update(currentItemEntry, itemData);
    if (result.success) {
      showToast('Item saved');
      document.getElementById('item-ed-selected-name').textContent = itemData.name;
      document.getElementById('item-ed-selected-name').style.color = QUALITY_COLORS[itemData.Quality] || '#fff';
    } else { showToast(`Save failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

function renderItemTooltip(item) {
  const qc = QUALITY_COLORS[item.Quality] || '#ffffff';
  let html = `<div class="tooltip-name" style="color:${qc}">${escapeHtml(item.name || 'Unknown')}</div>`;
  if (item.bonding && BONDING_NAMES[item.bonding]) html += `<div class="tooltip-line">${BONDING_NAMES[item.bonding]}</div>`;
  if (item.InventoryType && INVTYPE_NAMES[item.InventoryType]) html += `<div class="tooltip-line">${INVTYPE_NAMES[item.InventoryType]}</div>`;
  if (item.armor > 0) html += `<div class="tooltip-line">${item.armor} Armor</div>`;
  if (item.dmg_min1 > 0 && item.dmg_max1 > 0) {
    html += `<div class="tooltip-line">${item.dmg_min1} - ${item.dmg_max1} Damage`;
    if (item.delay > 0) html += `&nbsp;&nbsp;Speed ${(item.delay / 1000).toFixed(2)}`;
    html += '</div>';
    if (item.delay > 0) {
      const dps = ((item.dmg_min1 + item.dmg_max1) / 2) / (item.delay / 1000);
      html += `<div class="tooltip-line">(${dps.toFixed(1)} damage per second)</div>`;
    }
  }
  for (let i = 1; i <= 10; i++) {
    const st = item[`stat_type${i}`] || 0;
    const sv = item[`stat_value${i}`] || 0;
    if (sv !== 0 && STAT_TYPES[st]) {
      html += `<div class="tooltip-stat">+${sv} ${STAT_TYPES[st]}</div>`;
    }
  }
  const resNames = { holy_res: 'Holy', fire_res: 'Fire', nature_res: 'Nature', frost_res: 'Frost', shadow_res: 'Shadow', arcane_res: 'Arcane' };
  for (const [key, name] of Object.entries(resNames)) {
    if (item[key] > 0) html += `<div class="tooltip-stat">+${item[key]} ${name} Resistance</div>`;
  }
  if (item.MaxDurability > 0) html += `<div class="tooltip-line">Durability ${item.MaxDurability} / ${item.MaxDurability}</div>`;
  if (item.RequiredLevel > 0) html += `<div class="tooltip-line">Requires Level ${item.RequiredLevel}</div>`;
  html += `<div class="tooltip-line tooltip-dim">Item Level ${item.ItemLevel || 1}</div>`;
  if (item.SellPrice > 0) html += `<div class="tooltip-line">Sell Price: ${formatMoneyHTML(item.SellPrice)}</div>`;
  if (item.description) html += `<div class="tooltip-flavor">"${escapeHtml(item.description)}"</div>`;
  return html;
}

function updateItemTooltipPreview() {
  const item = collectItemEditorData();
  document.getElementById('item-ed-tooltip-preview').innerHTML = renderItemTooltip(item);
}

// ═════════════════════════════════════════════════════════════
// QUEST BUILDER
// ═════════════════════════════════════════════════════════════

const QUEST_TYPES = { 0: 'Normal', 1: 'Group', 81: 'Dungeon', 82: 'Raid' };

async function searchQuests() {
  const search = document.getElementById('quest-search-input').value.trim();
  if (!search) return;

  const container = document.getElementById('quest-results-list');
  container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">Searching...</div>';
  document.getElementById('quest-search-results').style.display = 'block';

  try {
    const result = await window.api.quests.search(search);
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(q => `
        <div class="creature-result-item">
          <div>
            <div class="creature-result-name">${escapeHtml(q.LogTitle || 'Unnamed Quest')}</div>
            <div class="creature-result-meta">
              ID: ${q.ID} | Level: ${q.QuestLevel} | Min: ${q.MinLevel} |
              ${QUEST_TYPES[q.QuestType] || 'Type ' + q.QuestType}
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="selectQuest(${q.ID})">Select</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:12px;">No quests found.</div>';
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error); padding:12px;">Search error: ${e.message}</div>`;
  }
}

async function selectQuest(questId) {
  try {
    const result = await window.api.quests.getQuest(questId);
    if (!result.success) {
      showToast(`Error: ${result.error}`, 'error');
      return;
    }

    currentQuestId = questId;
    currentQuestData = result.data;

    document.getElementById('quest-selected-name').textContent = result.data.LogTitle || 'Unnamed Quest';
    document.getElementById('quest-selected-id').textContent = `#${questId}`;
    document.getElementById('quest-type-badge').textContent = QUEST_TYPES[result.data.QuestType] || 'Type ' + result.data.QuestType;

    document.getElementById('quest-search-results').style.display = 'none';
    document.getElementById('quest-selected-banner').style.display = 'block';
    document.getElementById('quest-editor-section').style.display = 'block';

    populateQuestForm(result.data);
    await loadQuestGiversEnders();
    updateQuestPreview();
  } catch (e) {
    showToast(`Error loading quest: ${e.message}`, 'error');
  }
}

async function createNewQuest() {
  try {
    const result = await window.api.quests.createQuest({
      LogTitle: 'New Quest',
      QuestLevel: 1,
      MinLevel: 1,
      QuestType: 0
    });
    if (result.success) {
      showToast(`Quest #${result.data.ID} created`);
      await selectQuest(result.data.ID);
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

function populateQuestForm(q) {
  document.getElementById('quest-log-title').value = q.LogTitle || '';
  document.getElementById('quest-level').value = q.QuestLevel ?? 1;
  document.getElementById('quest-min-level').value = q.MinLevel ?? 1;
  document.getElementById('quest-max-level').value = q.MaxLevel ?? 0;
  document.getElementById('quest-type').value = q.QuestType ?? 0;

  document.getElementById('quest-description').value = q.QuestDescription || '';
  document.getElementById('quest-log-description').value = q.LogDescription || '';
  document.getElementById('quest-completion-log').value = q.QuestCompletionLog || '';
  document.getElementById('quest-area-description').value = q.AreaDescription || '';

  for (let i = 1; i <= 4; i++) {
    document.getElementById(`quest-req-npc${i}`).value = q[`RequiredNpcOrGo${i}`] || 0;
    document.getElementById(`quest-req-npc-count${i}`).value = q[`RequiredNpcOrGoCount${i}`] || 0;
    lookupObjectiveNpcName(i);
  }
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`quest-req-item${i}`).value = q[`RequiredItemId${i}`] || 0;
    document.getElementById(`quest-req-item-count${i}`).value = q[`RequiredItemCount${i}`] || 0;
    lookupObjectiveItemName(i);
  }

  document.getElementById('quest-reward-xp').value = q.RewardXPDifficulty || 0;
  document.getElementById('quest-reward-money').value = q.RewardMoney || 0;
  updateMoneyDisplay();

  for (let i = 1; i <= 4; i++) {
    document.getElementById(`quest-reward-item${i}`).value = q[`RewardItem${i}`] || 0;
    document.getElementById(`quest-reward-amount${i}`).value = q[`RewardAmount${i}`] || 0;
    lookupRewardItemName(i);
  }
  for (let i = 1; i <= 6; i++) {
    document.getElementById(`quest-choice-item${i}`).value = q[`RewardChoiceItemID${i}`] || 0;
    document.getElementById(`quest-choice-qty${i}`).value = q[`RewardChoiceItemQuantity${i}`] || 0;
    lookupChoiceItemName(i);
  }

  for (let i = 1; i <= 5; i++) {
    document.getElementById(`quest-rep-faction${i}`).value = q[`RewardFactionID${i}`] || 0;
    document.getElementById(`quest-rep-value${i}`).value = q[`RewardFactionValue${i}`] || 0;
  }

  document.getElementById('quest-prev-id').value = q.PrevQuestID || 0;
  document.getElementById('quest-next-id').value = q.NextQuestID || 0;
  document.getElementById('quest-exclusive-group').value = q.ExclusiveGroup || 0;
  lookupChainQuestNames();
}

function collectQuestFormData() {
  const qd = {};
  qd.LogTitle = document.getElementById('quest-log-title').value.trim();
  qd.QuestLevel = parseInt(document.getElementById('quest-level').value) || 1;
  qd.MinLevel = parseInt(document.getElementById('quest-min-level').value) || 1;
  qd.MaxLevel = parseInt(document.getElementById('quest-max-level').value) || 0;
  qd.QuestType = parseInt(document.getElementById('quest-type').value) || 0;

  qd.QuestDescription = document.getElementById('quest-description').value;
  qd.LogDescription = document.getElementById('quest-log-description').value;
  qd.QuestCompletionLog = document.getElementById('quest-completion-log').value;
  qd.AreaDescription = document.getElementById('quest-area-description').value;

  for (let i = 1; i <= 4; i++) {
    qd[`RequiredNpcOrGo${i}`] = parseInt(document.getElementById(`quest-req-npc${i}`).value) || 0;
    qd[`RequiredNpcOrGoCount${i}`] = parseInt(document.getElementById(`quest-req-npc-count${i}`).value) || 0;
    qd[`RequiredItemId${i}`] = parseInt(document.getElementById(`quest-req-item${i}`).value) || 0;
    qd[`RequiredItemCount${i}`] = parseInt(document.getElementById(`quest-req-item-count${i}`).value) || 0;
    qd[`RewardItem${i}`] = parseInt(document.getElementById(`quest-reward-item${i}`).value) || 0;
    qd[`RewardAmount${i}`] = parseInt(document.getElementById(`quest-reward-amount${i}`).value) || 0;
  }
  for (let i = 1; i <= 6; i++) {
    qd[`RewardChoiceItemID${i}`] = parseInt(document.getElementById(`quest-choice-item${i}`).value) || 0;
    qd[`RewardChoiceItemQuantity${i}`] = parseInt(document.getElementById(`quest-choice-qty${i}`).value) || 0;
  }

  qd.RewardXPDifficulty = parseInt(document.getElementById('quest-reward-xp').value) || 0;
  qd.RewardMoney = parseInt(document.getElementById('quest-reward-money').value) || 0;

  for (let i = 1; i <= 5; i++) {
    qd[`RewardFactionID${i}`] = parseInt(document.getElementById(`quest-rep-faction${i}`).value) || 0;
    qd[`RewardFactionValue${i}`] = parseInt(document.getElementById(`quest-rep-value${i}`).value) || 0;
  }

  qd.PrevQuestID = parseInt(document.getElementById('quest-prev-id').value) || 0;
  qd.NextQuestID = parseInt(document.getElementById('quest-next-id').value) || 0;
  qd.ExclusiveGroup = parseInt(document.getElementById('quest-exclusive-group').value) || 0;

  return qd;
}

async function saveQuest() {
  if (!currentQuestId) return;
  const questData = collectQuestFormData();

  try {
    const result = await window.api.quests.updateQuest(currentQuestId, questData);
    if (result.success) {
      showToast('Quest saved successfully');
      document.getElementById('quest-selected-name').textContent = questData.LogTitle;
    } else {
      showToast(`Save failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
  }
}

function updateMoneyDisplay() {
  const copper = parseInt(document.getElementById('quest-reward-money').value) || 0;
  const display = document.getElementById('quest-money-display');
  if (copper === 0) { display.innerHTML = ''; return; }
  display.innerHTML = formatMoneyHTML(copper);
}

function formatMoneyHTML(copper) {
  if (!copper || copper === 0) return '';
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const cop = copper % 100;
  let html = '';
  if (gold > 0) html += `<span class="money-gold">${gold}g</span> `;
  if (silver > 0) html += `<span class="money-silver">${silver}s</span> `;
  if (cop > 0) html += `<span class="money-copper">${cop}c</span>`;
  return html;
}

// ── Name Lookups ──

async function lookupObjectiveNpcName(slot) {
  const entry = parseInt(document.getElementById(`quest-req-npc${slot}`).value) || 0;
  const nameEl = document.getElementById(`quest-req-npc-name${slot}`);
  if (entry === 0) { nameEl.textContent = ''; return; }
  try {
    const result = await window.api.scripts.searchCreatures(String(entry));
    if (result.success && result.data.length > 0) {
      const match = result.data.find(c => c.entry === entry);
      nameEl.textContent = match ? match.name : result.data[0].name;
    } else { nameEl.textContent = '(not found)'; }
  } catch { nameEl.textContent = ''; }
  updateQuestPreview();
}

async function lookupObjectiveItemName(slot) {
  const entry = parseInt(document.getElementById(`quest-req-item${slot}`).value) || 0;
  const nameEl = document.getElementById(`quest-req-item-name${slot}`);
  if (entry === 0) { nameEl.textContent = ''; return; }
  try {
    const result = await window.api.loot.searchItems(String(entry));
    if (result.success && result.data.length > 0) {
      const match = result.data.find(i => i.entry === entry);
      nameEl.textContent = match ? match.name : result.data[0].name;
    } else { nameEl.textContent = '(not found)'; }
  } catch { nameEl.textContent = ''; }
  updateQuestPreview();
}

async function lookupRewardItemName(slot) {
  const entry = parseInt(document.getElementById(`quest-reward-item${slot}`).value) || 0;
  const nameEl = document.getElementById(`quest-reward-item-name${slot}`);
  if (entry === 0) { nameEl.textContent = ''; return; }
  try {
    const result = await window.api.loot.searchItems(String(entry));
    if (result.success && result.data.length > 0) {
      const match = result.data.find(i => i.entry === entry);
      nameEl.textContent = match ? match.name : result.data[0].name;
    } else { nameEl.textContent = '(not found)'; }
  } catch { nameEl.textContent = ''; }
  updateQuestPreview();
}

async function lookupChoiceItemName(slot) {
  const entry = parseInt(document.getElementById(`quest-choice-item${slot}`).value) || 0;
  const nameEl = document.getElementById(`quest-choice-item-name${slot}`);
  if (entry === 0) { nameEl.textContent = ''; return; }
  try {
    const result = await window.api.loot.searchItems(String(entry));
    if (result.success && result.data.length > 0) {
      const match = result.data.find(i => i.entry === entry);
      nameEl.textContent = match ? match.name : result.data[0].name;
    } else { nameEl.textContent = '(not found)'; }
  } catch { nameEl.textContent = ''; }
  updateQuestPreview();
}

async function lookupChainQuestNames() {
  const prevId = parseInt(document.getElementById('quest-prev-id').value) || 0;
  const nextId = parseInt(document.getElementById('quest-next-id').value) || 0;
  const prevName = document.getElementById('quest-prev-name');
  const nextName = document.getElementById('quest-next-name');
  const chainVisual = document.getElementById('quest-chain-visual');

  prevName.textContent = '';
  nextName.textContent = '';

  if (prevId > 0) {
    try {
      const result = await window.api.quests.getQuest(prevId);
      if (result.success) prevName.textContent = result.data.LogTitle || '';
    } catch {}
  }
  if (nextId > 0) {
    try {
      const result = await window.api.quests.getQuest(nextId);
      if (result.success) nextName.textContent = result.data.LogTitle || '';
    } catch {}
  }

  if (prevId > 0 || nextId > 0) {
    let chainHTML = '<div class="quest-chain-flow">';
    if (prevId > 0) {
      chainHTML += `<div class="chain-node chain-prev" onclick="selectQuest(${prevId})"><div class="chain-id">#${prevId}</div><div class="chain-name">${escapeHtml(prevName.textContent)}</div></div>`;
      chainHTML += '<div class="chain-arrow">&rarr;</div>';
    }
    chainHTML += `<div class="chain-node chain-current"><div class="chain-id">#${currentQuestId}</div><div class="chain-name">${escapeHtml(document.getElementById('quest-log-title').value)}</div></div>`;
    if (nextId > 0) {
      chainHTML += '<div class="chain-arrow">&rarr;</div>';
      chainHTML += `<div class="chain-node chain-next" onclick="selectQuest(${nextId})"><div class="chain-id">#${nextId}</div><div class="chain-name">${escapeHtml(nextName.textContent)}</div></div>`;
    }
    chainHTML += '</div>';
    chainVisual.innerHTML = chainHTML;
    chainVisual.style.display = 'block';
  } else {
    chainVisual.style.display = 'none';
  }
}

// ── Quest Givers & Enders ──

async function loadQuestGiversEnders() {
  if (!currentQuestId) return;
  try {
    const [giversResult, endersResult] = await Promise.all([
      window.api.quests.getQuestGivers(currentQuestId),
      window.api.quests.getQuestEnders(currentQuestId)
    ]);
    questGivers = giversResult.success ? giversResult.data : [];
    questEnders = endersResult.success ? endersResult.data : [];
    renderQuestGivers();
    renderQuestEnders();
  } catch (e) {
    console.error('Error loading quest NPCs:', e);
  }
}

function renderQuestGivers() {
  const container = document.getElementById('quest-givers-list');
  if (questGivers.length === 0) {
    container.innerHTML = '<div style="color: var(--text-dim); font-size: 12px;">No quest givers assigned</div>';
    return;
  }
  container.innerHTML = questGivers.map(npc => `
    <div class="npc-assignment-item">
      <div>
        <span class="npc-name">${escapeHtml(npc.name || 'Unknown')}</span>
        <span class="npc-entry">#${npc.entry}</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeQuestGiver(${npc.entry})">×</button>
    </div>
  `).join('');
}

function renderQuestEnders() {
  const container = document.getElementById('quest-enders-list');
  if (questEnders.length === 0) {
    container.innerHTML = '<div style="color: var(--text-dim); font-size: 12px;">No quest enders assigned</div>';
    return;
  }
  container.innerHTML = questEnders.map(npc => `
    <div class="npc-assignment-item">
      <div>
        <span class="npc-name">${escapeHtml(npc.name || 'Unknown')}</span>
        <span class="npc-entry">#${npc.entry}</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeQuestEnder(${npc.entry})">×</button>
    </div>
  `).join('');
}

async function searchQuestGiverNPC() {
  const search = document.getElementById('quest-giver-search').value.trim();
  if (!search) return;
  const resultsDiv = document.getElementById('quest-giver-results');
  try {
    const result = await window.api.scripts.searchCreatures(search);
    if (result.success && result.data.length > 0) {
      resultsDiv.innerHTML = result.data.map(c => `
        <div class="item-result-item" onclick="addQuestGiver(${c.entry}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">
          <div class="item-result-name">${escapeHtml(c.name)}</div>
          <div class="item-result-meta">Entry: ${c.entry} | Level: ${c.minlevel}-${c.maxlevel}</div>
        </div>
      `).join('');
      resultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:10px;">No NPCs found</div>';
      resultsDiv.style.display = 'block';
    }
  } catch (e) { resultsDiv.style.display = 'none'; }
}

async function searchQuestEnderNPC() {
  const search = document.getElementById('quest-ender-search').value.trim();
  if (!search) return;
  const resultsDiv = document.getElementById('quest-ender-results');
  try {
    const result = await window.api.scripts.searchCreatures(search);
    if (result.success && result.data.length > 0) {
      resultsDiv.innerHTML = result.data.map(c => `
        <div class="item-result-item" onclick="addQuestEnder(${c.entry}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">
          <div class="item-result-name">${escapeHtml(c.name)}</div>
          <div class="item-result-meta">Entry: ${c.entry} | Level: ${c.minlevel}-${c.maxlevel}</div>
        </div>
      `).join('');
      resultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:10px;">No NPCs found</div>';
      resultsDiv.style.display = 'block';
    }
  } catch (e) { resultsDiv.style.display = 'none'; }
}

async function addQuestGiver(creatureEntry, name) {
  try {
    const result = await window.api.quests.setQuestGiver(currentQuestId, creatureEntry);
    if (result.success) {
      showToast(`${name} set as quest giver`);
      document.getElementById('quest-giver-search').value = '';
      document.getElementById('quest-giver-results').style.display = 'none';
      await loadQuestGiversEnders();
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function addQuestEnder(creatureEntry, name) {
  try {
    const result = await window.api.quests.setQuestEnder(currentQuestId, creatureEntry);
    if (result.success) {
      showToast(`${name} set as quest ender`);
      document.getElementById('quest-ender-search').value = '';
      document.getElementById('quest-ender-results').style.display = 'none';
      await loadQuestGiversEnders();
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function removeQuestGiver(creatureEntry) {
  if (!confirm('Remove this quest giver?')) return;
  try {
    const result = await window.api.quests.removeQuestGiver(currentQuestId, creatureEntry);
    if (result.success) {
      showToast('Quest giver removed');
      await loadQuestGiversEnders();
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function removeQuestEnder(creatureEntry) {
  if (!confirm('Remove this quest ender?')) return;
  try {
    const result = await window.api.quests.removeQuestEnder(currentQuestId, creatureEntry);
    if (result.success) {
      showToast('Quest ender removed');
      await loadQuestGiversEnders();
    } else { showToast(`Failed: ${result.error}`, 'error'); }
  } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

// ── WoW-Style Quest Preview ──

function updateQuestPreview() {
  const title = document.getElementById('quest-log-title').value || 'Quest Title';
  const level = document.getElementById('quest-level').value || '1';
  const description = document.getElementById('quest-description').value || '';
  const objSummary = document.getElementById('quest-log-description').value || '';
  const money = parseInt(document.getElementById('quest-reward-money').value) || 0;

  document.getElementById('preview-title').textContent = title;
  document.getElementById('preview-level').textContent = `Level ${level}`;
  document.getElementById('preview-description').textContent = description || 'Quest description will appear here...';
  document.getElementById('preview-obj-summary').textContent = objSummary;

  const objList = document.getElementById('preview-obj-list');
  objList.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const npcId = parseInt(document.getElementById(`quest-req-npc${i}`).value) || 0;
    const npcCount = parseInt(document.getElementById(`quest-req-npc-count${i}`).value) || 0;
    if (npcId > 0 && npcCount > 0) {
      const name = document.getElementById(`quest-req-npc-name${i}`).textContent || `Creature ${npcId}`;
      objList.innerHTML += `<li class="preview-obj-incomplete">${escapeHtml(name)}: 0/${npcCount}</li>`;
    }
  }
  for (let i = 1; i <= 4; i++) {
    const itemId = parseInt(document.getElementById(`quest-req-item${i}`).value) || 0;
    const itemCount = parseInt(document.getElementById(`quest-req-item-count${i}`).value) || 0;
    if (itemId > 0 && itemCount > 0) {
      const name = document.getElementById(`quest-req-item-name${i}`).textContent || `Item ${itemId}`;
      objList.innerHTML += `<li class="preview-obj-incomplete">${escapeHtml(name)}: 0/${itemCount}</li>`;
    }
  }

  const moneyDiv = document.getElementById('preview-money');
  if (money > 0) {
    moneyDiv.innerHTML = 'Money: ' + formatMoneyHTML(money);
    moneyDiv.style.display = 'block';
  } else { moneyDiv.style.display = 'none'; }

  const rewardItemsDiv = document.getElementById('preview-reward-items');
  let rewardHTML = '';
  for (let i = 1; i <= 4; i++) {
    const itemId = parseInt(document.getElementById(`quest-reward-item${i}`).value) || 0;
    const qty = parseInt(document.getElementById(`quest-reward-amount${i}`).value) || 0;
    if (itemId > 0 && qty > 0) {
      const name = document.getElementById(`quest-reward-item-name${i}`).textContent || `Item ${itemId}`;
      rewardHTML += `<div class="preview-reward-item">${escapeHtml(name)} x${qty}</div>`;
    }
  }
  rewardItemsDiv.innerHTML = rewardHTML;

  const choiceContainer = document.getElementById('preview-choice-items');
  const choiceList = document.getElementById('preview-choice-list');
  let choiceHTML = '';
  for (let i = 1; i <= 6; i++) {
    const itemId = parseInt(document.getElementById(`quest-choice-item${i}`).value) || 0;
    const qty = parseInt(document.getElementById(`quest-choice-qty${i}`).value) || 0;
    if (itemId > 0 && qty > 0) {
      const name = document.getElementById(`quest-choice-item-name${i}`).textContent || `Item ${itemId}`;
      choiceHTML += `<div class="preview-choice-item">${escapeHtml(name)} x${qty}</div>`;
    }
  }
  if (choiceHTML) {
    choiceList.innerHTML = choiceHTML;
    choiceContainer.style.display = 'block';
  } else { choiceContainer.style.display = 'none'; }
}

// ── Export SQL ──

function exportQuestSQL() {
  if (!currentQuestId || !currentQuestData) {
    showToast('No quest loaded', 'error');
    return;
  }

  const qd = collectQuestFormData();
  const esc = (s) => (s || '').replace(/'/g, "''");
  let sql = `-- Quest: ${esc(qd.LogTitle)} (ID: ${currentQuestId})\n`;
  sql += `-- Generated by CompApp on ${new Date().toLocaleString()}\n\n`;
  sql += `DELETE FROM \`quest_template\` WHERE \`ID\` = ${currentQuestId};\n`;
  sql += `INSERT INTO \`quest_template\` (\`ID\`, \`LogTitle\`, \`QuestLevel\`, \`MinLevel\`, \`MaxLevel\`, \`QuestType\`,\n`;
  sql += `  \`QuestDescription\`, \`LogDescription\`, \`QuestCompletionLog\`,\n`;
  sql += `  \`RewardXPDifficulty\`, \`RewardMoney\`,\n`;
  sql += `  \`RewardItem1\`, \`RewardAmount1\`, \`RewardItem2\`, \`RewardAmount2\`,\n`;
  sql += `  \`RewardItem3\`, \`RewardAmount3\`, \`RewardItem4\`, \`RewardAmount4\`,\n`;
  sql += `  \`RequiredNpcOrGo1\`, \`RequiredNpcOrGoCount1\`, \`RequiredNpcOrGo2\`, \`RequiredNpcOrGoCount2\`,\n`;
  sql += `  \`RequiredNpcOrGo3\`, \`RequiredNpcOrGoCount3\`, \`RequiredNpcOrGo4\`, \`RequiredNpcOrGoCount4\`,\n`;
  sql += `  \`RequiredItemId1\`, \`RequiredItemCount1\`, \`RequiredItemId2\`, \`RequiredItemCount2\`,\n`;
  sql += `  \`RequiredItemId3\`, \`RequiredItemCount3\`, \`RequiredItemId4\`, \`RequiredItemCount4\`,\n`;
  sql += `  \`PrevQuestID\`, \`NextQuestID\`, \`ExclusiveGroup\`) VALUES\n`;
  sql += `(${currentQuestId}, '${esc(qd.LogTitle)}', ${qd.QuestLevel}, ${qd.MinLevel}, ${qd.MaxLevel}, ${qd.QuestType},\n`;
  sql += ` '${esc(qd.QuestDescription)}', '${esc(qd.LogDescription)}', '${esc(qd.QuestCompletionLog)}',\n`;
  sql += ` ${qd.RewardXPDifficulty}, ${qd.RewardMoney},\n`;
  sql += ` ${qd.RewardItem1}, ${qd.RewardAmount1}, ${qd.RewardItem2}, ${qd.RewardAmount2},\n`;
  sql += ` ${qd.RewardItem3}, ${qd.RewardAmount3}, ${qd.RewardItem4}, ${qd.RewardAmount4},\n`;
  sql += ` ${qd.RequiredNpcOrGo1}, ${qd.RequiredNpcOrGoCount1}, ${qd.RequiredNpcOrGo2}, ${qd.RequiredNpcOrGoCount2},\n`;
  sql += ` ${qd.RequiredNpcOrGo3}, ${qd.RequiredNpcOrGoCount3}, ${qd.RequiredNpcOrGo4}, ${qd.RequiredNpcOrGoCount4},\n`;
  sql += ` ${qd.RequiredItemId1}, ${qd.RequiredItemCount1}, ${qd.RequiredItemId2}, ${qd.RequiredItemCount2},\n`;
  sql += ` ${qd.RequiredItemId3}, ${qd.RequiredItemCount3}, ${qd.RequiredItemId4}, ${qd.RequiredItemCount4},\n`;
  sql += ` ${qd.PrevQuestID}, ${qd.NextQuestID}, ${qd.ExclusiveGroup});\n\n`;

  if (questGivers.length > 0) {
    sql += `DELETE FROM \`creature_queststarter\` WHERE \`quest\` = ${currentQuestId};\n`;
    questGivers.forEach(g => {
      sql += `INSERT INTO \`creature_queststarter\` (\`id\`, \`quest\`) VALUES (${g.entry}, ${currentQuestId});\n`;
    });
    sql += '\n';
  }
  if (questEnders.length > 0) {
    sql += `DELETE FROM \`creature_questender\` WHERE \`quest\` = ${currentQuestId};\n`;
    questEnders.forEach(g => {
      sql += `INSERT INTO \`creature_questender\` (\`id\`, \`quest\`) VALUES (${g.entry}, ${currentQuestId});\n`;
    });
  }

  navigator.clipboard.writeText(sql).then(() => {
    showToast('Quest SQL exported to clipboard!');
  }).catch(() => {
    console.log(sql);
    showToast('SQL generated — check DevTools console (Ctrl+Shift+I)', 'error');
  });
}

// ═════════════════════════════════════════════════════════════
// PLAYER MANAGER
// ═════════════════════════════════════════════════════════════

const SLOT_NAMES = {
  0: 'Head', 1: 'Neck', 2: 'Shoulders', 3: 'Shirt', 4: 'Chest',
  5: 'Waist', 6: 'Legs', 7: 'Feet', 8: 'Wrists', 9: 'Hands',
  10: 'Ring 1', 11: 'Ring 2', 12: 'Trinket 1', 13: 'Trinket 2',
  14: 'Back', 15: 'Main Hand', 16: 'Off Hand', 17: 'Ranged', 18: 'Tabard'
};

const TELEPORT_COORDS = {
  mall:      '.tele gmisland',
  stormwind: '.tele stormwind',
  orgrimmar: '.tele orgrimmar',
  dalaran:   '.tele dalaran',
  shattrath: '.tele shattrath'
};

async function searchPlayersManager() {
  const search = document.getElementById('pm-search-input').value.trim();
  if (!search) return;

  const container = document.getElementById('pm-results-list');
  container.innerHTML = '<div style="padding:12px; color:var(--text-dim);">Searching...</div>';
  document.getElementById('pm-search-results').style.display = 'block';

  const result = await window.api.playerManager.search(search);
  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<div style="padding:12px; color:var(--text-dim);">No players found.</div>';
    return;
  }

  container.innerHTML = result.data.map(p => `
    <div class="quest-result-item" onclick="selectPlayerManager(${p.guid}, '${escapeHtml(p.name)}')">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <span class="creature-id">#${p.guid}</span>
          ${p.online ? '<span class="pm-online-badge pm-online">Online</span>' : ''}
        </div>
        <div style="color:var(--text-dim); font-size:13px;">
          Lv${p.level} ${getRaceName(p.race)} ${getClassName(p.class)}
        </div>
      </div>
    </div>
  `).join('');
}

async function selectPlayerManager(guid, name) {
  currentPlayerGuid = guid;
  currentPlayerName = name;

  document.getElementById('pm-search-results').style.display = 'none';
  document.getElementById('pm-selected-banner').style.display = 'block';
  document.getElementById('pm-selected-name').textContent = name;
  document.getElementById('pm-selected-id').textContent = `#${guid}`;
  document.getElementById('pm-detail-section').style.display = 'block';

  // Show loading state in all panels
  document.getElementById('pm-info-content').innerHTML = '<div style="color:var(--text-dim);">Loading...</div>';
  document.getElementById('pm-account-content').innerHTML = '<div style="color:var(--text-dim);">Loading...</div>';
  document.getElementById('pm-guild-content').innerHTML = '<div style="color:var(--text-dim);">Loading...</div>';
  document.getElementById('pm-equipment-content').innerHTML = '<div style="color:var(--text-dim);">Loading...</div>';

  // Load all details in parallel
  await Promise.all([
    loadPlayerInfo(guid),
    loadPlayerAccount(guid),
    loadPlayerGuild(guid),
    loadPlayerEquipment(guid),
  ]);
}

async function loadPlayerInfo(guid) {
  const result = await window.api.playerManager.getDetail(guid);
  const el = document.getElementById('pm-info-content');
  if (!result.success) {
    el.innerHTML = `<div style="color:var(--color-error);">${escapeHtml(result.error)}</div>`;
    return;
  }
  const p = result.data;

  // Update online badge
  const badge = document.getElementById('pm-online-badge');
  badge.textContent = p.online ? 'Online' : 'Offline';
  badge.className = `pm-online-badge ${p.online ? 'pm-online' : ''}`;

  const goldTotal = Math.floor((p.money || 0) / 10000);
  const silver = Math.floor(((p.money || 0) % 10000) / 100);
  const copper = (p.money || 0) % 100;

  el.innerHTML = `
    <div class="pm-info-row"><span class="pm-info-label">Name</span><span>${escapeHtml(p.name)}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Level</span><span>${p.level}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Race</span><span>${getRaceName(p.race)}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Class</span><span>${getClassName(p.class)}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Map</span><span>${p.map || 0}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Zone</span><span>${p.zone || 0}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Position</span><span>${(p.position_x || 0).toFixed(1)}, ${(p.position_y || 0).toFixed(1)}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Money</span><span><span class="money-gold">${goldTotal}g</span> <span class="money-silver">${silver}s</span> <span class="money-copper">${copper}c</span></span></div>
    <div class="pm-info-row"><span class="pm-info-label">Total Time</span><span>${Math.floor((p.totaltime || 0) / 3600)}h</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Online</span><span>${p.online ? 'Yes' : 'No'}</span></div>
  `;
}

async function loadPlayerAccount(guid) {
  const result = await window.api.playerManager.getAccount(guid);
  const el = document.getElementById('pm-account-content');
  if (!result.success) {
    el.innerHTML = `<div style="color:var(--color-error);">${escapeHtml(result.error)}</div>`;
    return;
  }
  const a = result.data;
  currentPlayerAccount = a.id;

  el.innerHTML = `
    <div class="pm-info-row"><span class="pm-info-label">Account ID</span><span>${a.id || 'N/A'}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Username</span><span>${escapeHtml(a.username || 'N/A')}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Email</span><span>${escapeHtml(a.email || 'N/A')}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Last Login</span><span>${a.last_login || 'Never'}</span></div>
    <div class="pm-info-row"><span class="pm-info-label">Status</span><span class="${a.banned ? 'pm-banned' : 'pm-good'}">${a.banned ? 'BANNED' : 'Good Standing'}</span></div>
  `;
}

async function loadPlayerGuild(guid) {
  const result = await window.api.playerManager.getGuild(guid);
  const el = document.getElementById('pm-guild-content');
  if (!result.success) {
    el.innerHTML = `<div style="color:var(--color-error);">${escapeHtml(result.error)}</div>`;
    return;
  }
  if (!result.data) {
    el.innerHTML = '<div style="color:var(--text-dim);">No guild</div>';
    return;
  }
  const g = result.data;
  const rankNames = ['Guild Master', 'Officer', 'Veteran', 'Member', 'Initiate'];
  el.innerHTML = `
    <div class="pm-info-list">
      <div class="pm-info-row"><span class="pm-info-label">Guild</span><span style="color:var(--color-success);">${escapeHtml(g.guildName)}</span></div>
      <div class="pm-info-row"><span class="pm-info-label">Rank</span><span>${rankNames[g.rank] || `Rank ${g.rank}`}</span></div>
    </div>
  `;
}

async function loadPlayerEquipment(guid) {
  const result = await window.api.playerManager.getInventory(guid);
  const el = document.getElementById('pm-equipment-content');
  if (!result.success) {
    el.innerHTML = `<div style="color:var(--color-error);">${escapeHtml(result.error)}</div>`;
    return;
  }
  if (result.data.length === 0) {
    el.innerHTML = '<div style="color:var(--text-dim);">No equipment found</div>';
    return;
  }

  el.innerHTML = result.data.map(item => {
    const qualityColor = QUALITY_COLORS[item.Quality] || QUALITY_COLORS[0];
    const slotName = SLOT_NAMES[item.slot] || `Slot ${item.slot}`;
    return `
      <div class="pm-equip-slot">
        <span class="pm-equip-slot-name">${slotName}</span>
        <span style="color:${qualityColor};">${escapeHtml(item.name)}</span>
        <span class="creature-id">#${item.itemEntry}</span>
      </div>
    `;
  }).join('');
}

async function playerAction(action) {
  if (!currentPlayerGuid || !currentPlayerName) {
    showToast('No player selected', 'error');
    return;
  }

  let cmd = '';
  let confirmMsg = '';

  switch (action) {
    case 'teleport': {
      const loc = document.getElementById('pm-tele-location').value;
      const teleCmd = TELEPORT_COORDS[loc];
      if (!teleCmd) { showToast('Unknown location', 'error'); return; }
      // Teleport via SOAP: .character erase or pinfo first, then summon or tele
      cmd = `.teleport name ${currentPlayerName} ${teleCmd.replace('.tele ', '')}`;
      confirmMsg = `Teleporting ${currentPlayerName}...`;
      break;
    }
    case 'grantitem': {
      const itemId = document.getElementById('pm-grant-item-id').value;
      const count = document.getElementById('pm-grant-item-count').value || 1;
      if (!itemId) { showToast('Enter an item ID', 'error'); return; }
      cmd = `.send items ${currentPlayerName} "GM Gift" "Here is your item" ${itemId}:${count}`;
      confirmMsg = `Sending ${count}x item #${itemId}...`;
      break;
    }
    case 'setlevel': {
      const level = document.getElementById('pm-set-level').value;
      cmd = `.character level ${currentPlayerName} ${level}`;
      confirmMsg = `Setting level to ${level}...`;
      break;
    }
    case 'ban': {
      const duration = document.getElementById('pm-ban-duration').value || '0';
      const reason = document.getElementById('pm-ban-reason').value || 'No reason';
      cmd = `.ban account ${currentPlayerAccount} ${duration} ${reason}`;
      confirmMsg = `Banning account...`;
      break;
    }
    case 'unban': {
      cmd = `.unban account ${currentPlayerAccount}`;
      confirmMsg = `Unbanning account...`;
      break;
    }
    case 'sendmail': {
      const subject = document.getElementById('pm-mail-subject').value;
      const body = document.getElementById('pm-mail-body').value;
      if (!subject) { showToast('Enter a subject', 'error'); return; }
      cmd = `.send mail ${currentPlayerName} "${subject}" "${body || 'No message'}"`;
      confirmMsg = `Sending mail...`;
      break;
    }
    default:
      showToast('Unknown action', 'error');
      return;
  }

  showToast(confirmMsg);
  const result = await window.api.playerManager.command(cmd);
  if (result.success) {
    showToast(`Command executed: ${result.data || 'OK'}`);
    // Refresh details if it was a modify action
    if (['setlevel', 'ban', 'unban'].includes(action)) {
      await selectPlayerManager(currentPlayerGuid, currentPlayerName);
    }
  } else {
    showToast(`Command failed: ${result.error}`, 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// ECONOMY DASHBOARD
// ═════════════════════════════════════════════════════════════

function formatGoldFromCopper(copper) {
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const cop = copper % 100;
  return `<span class="money-gold">${gold.toLocaleString()}g</span> <span class="money-silver">${silver}s</span> <span class="money-copper">${cop}c</span>`;
}

async function loadEconomyDashboard() {
  // Show loading state
  document.getElementById('eco-total-gold').textContent = 'Loading...';
  document.getElementById('eco-avg-gold').textContent = '...';
  document.getElementById('eco-online-gold').textContent = '...';
  document.getElementById('eco-ah-count').textContent = '...';

  // Load economy overview and AH stats in parallel
  const [ecoResult, ahResult] = await Promise.all([
    window.api.economy.getOverview(),
    window.api.economy.getAhStats(),
  ]);

  if (ecoResult.success) {
    const d = ecoResult.data;
    document.getElementById('eco-total-gold').innerHTML = formatGoldFromCopper(d.totalMoney);
    document.getElementById('eco-avg-gold').innerHTML = formatGoldFromCopper(d.avgMoney);
    document.getElementById('eco-online-gold').innerHTML =
      `${formatGoldFromCopper(d.onlineMoney)} <span style="font-size:13px; color:var(--text-dim);">(${d.onlineCount} online)</span>`;

    // Richest players
    const richEl = document.getElementById('eco-richest-list');
    if (d.richest.length === 0) {
      richEl.innerHTML = '<div style="color:var(--text-dim);">No players found</div>';
    } else {
      richEl.innerHTML = `<table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Level</th><th>Class</th><th>Gold</th></tr></thead><tbody>` +
        d.richest.map((p, i) => `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${p.level}</td>
          <td>${getClassName(p.class)}</td>
          <td>${formatGoldFromCopper(p.money)}</td>
        </tr>`).join('') + '</tbody></table>';
    }

    // Distribution
    const distEl = document.getElementById('eco-distribution');
    if (d.distribution.length === 0) {
      distEl.innerHTML = '<div style="color:var(--text-dim);">No data</div>';
    } else {
      const maxGold = Math.max(...d.distribution.map(r => Number(r.totalGold) || 0), 1);
      distEl.innerHTML = d.distribution.map(r => {
        const pct = Math.max(1, Math.round((Number(r.totalGold) / maxGold) * 100));
        return `<div class="eco-dist-row">
          <span class="eco-dist-label">Lv ${r.levelRange}</span>
          <div class="eco-dist-bar-bg">
            <div class="eco-dist-bar" style="width:${pct}%;"></div>
          </div>
          <span class="eco-dist-value">${formatGoldFromCopper(Number(r.totalGold))} (${r.playerCount} players)</span>
        </div>`;
      }).join('');
    }
  } else {
    document.getElementById('eco-total-gold').textContent = 'Error loading';
  }

  if (ahResult.success) {
    const ah = ahResult.data;
    document.getElementById('eco-ah-count').textContent = ah.totalAuctions.toLocaleString();

    const topEl = document.getElementById('eco-ah-top-items');
    if (ah.topItems.length === 0) {
      topEl.innerHTML = '<div style="color:var(--text-dim);">No auctions or auction house not available</div>';
    } else {
      topEl.innerHTML = `<table class="data-table"><thead><tr><th>Item</th><th>Listings</th></tr></thead><tbody>` +
        ah.topItems.map(item => {
          const qc = QUALITY_COLORS[item.Quality] || QUALITY_COLORS[0];
          return `<tr>
            <td><span style="color:${qc};">${escapeHtml(item.name)}</span> <span class="creature-id">#${item.itemEntry}</span></td>
            <td>${item.cnt}</td>
          </tr>`;
        }).join('') + '</tbody></table>';
    }
  } else {
    document.getElementById('eco-ah-count').textContent = 'N/A';
    document.getElementById('eco-ah-top-items').innerHTML =
      '<div style="color:var(--text-dim);">Auction house data unavailable</div>';
  }
}

// ═════════════════════════════════════════════════════════════
// EVENT SCHEDULER
// ═════════════════════════════════════════════════════════════

let allGameEvents = [];
let editingEventEntry = null;

function formatSeconds(seconds) {
  if (!seconds) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ') || `${seconds}s`;
}

async function loadAllGameEvents() {
  const tbody = document.getElementById('evt-table-body');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-dim);">Loading events...</td></tr>';

  const result = await window.api.events.getAll();
  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--color-error);">${escapeHtml(result.error)}</td></tr>`;
    return;
  }
  allGameEvents = result.data;
  renderGameEvents(allGameEvents);
}

function renderGameEvents(events) {
  const tbody = document.getElementById('evt-table-body');
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-dim);">No events found</td></tr>';
    return;
  }
  tbody.innerHTML = events.map(e => `<tr>
    <td>${e.eventEntry}</td>
    <td>${escapeHtml(e.description || '')}</td>
    <td style="font-size:12px;">${e.start_time || '—'}</td>
    <td style="font-size:12px;">${e.end_time || '—'}</td>
    <td>${formatSeconds(e.occurence)}</td>
    <td>${formatSeconds(e.length)}</td>
    <td>${e.holiday || 0}</td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="editGameEvent(${e.eventEntry})">Edit</button>
      <button class="btn btn-sm btn-primary" onclick="triggerGameEvent(${e.eventEntry}, 'start')">Start</button>
      <button class="btn btn-sm btn-danger" onclick="triggerGameEvent(${e.eventEntry}, 'stop')">Stop</button>
    </td>
  </tr>`).join('');
}

function filterGameEvents() {
  const filter = document.getElementById('evt-filter-input').value.toLowerCase();
  if (!filter) {
    renderGameEvents(allGameEvents);
    return;
  }
  const filtered = allGameEvents.filter(e =>
    (e.description || '').toLowerCase().includes(filter) ||
    String(e.eventEntry).includes(filter)
  );
  renderGameEvents(filtered);
}

function editGameEvent(eventEntry) {
  const evt = allGameEvents.find(e => e.eventEntry === eventEntry);
  if (!evt) return;

  editingEventEntry = eventEntry;
  document.getElementById('evt-editor-title').textContent = `Edit Event #${eventEntry}`;
  document.getElementById('evt-id').value = eventEntry;
  document.getElementById('evt-description').value = evt.description || '';
  document.getElementById('evt-start').value = evt.start_time || '';
  document.getElementById('evt-end').value = evt.end_time || '';
  document.getElementById('evt-occurence').value = evt.occurence || 0;
  document.getElementById('evt-length').value = evt.length || 0;
  document.getElementById('evt-holiday').value = evt.holiday || 0;
  document.getElementById('evt-delete-btn').style.display = 'inline-block';
  document.getElementById('evt-editor').style.display = 'block';
}

async function createGameEvent() {
  showToast('Creating new event...');
  const result = await window.api.events.create({
    description: 'New Custom Event',
    start_time: '2024-01-01 00:00:00',
    end_time: '2030-12-31 23:59:59',
    occurence: 5184000,
    length: 2592000,
    holiday: 0,
  });
  if (result.success) {
    showToast(`Event #${result.data} created!`);
    editingEventEntry = result.data;
    await loadAllGameEvents();
    editGameEvent(result.data);
  } else {
    showToast(`Failed: ${result.error}`, 'error');
  }
}

async function saveGameEvent() {
  if (!editingEventEntry) return;
  const eventData = {
    description: document.getElementById('evt-description').value,
    start_time: document.getElementById('evt-start').value,
    end_time: document.getElementById('evt-end').value,
    occurence: parseInt(document.getElementById('evt-occurence').value) || 0,
    length: parseInt(document.getElementById('evt-length').value) || 0,
    holiday: parseInt(document.getElementById('evt-holiday').value) || 0,
  };

  const result = await window.api.events.update(editingEventEntry, eventData);
  if (result.success) {
    showToast('Event saved!');
    document.getElementById('evt-editor').style.display = 'none';
    await loadAllGameEvents();
  } else {
    showToast(`Save failed: ${result.error}`, 'error');
  }
}

async function deleteGameEvent() {
  if (!editingEventEntry) return;
  if (!confirm(`Delete event #${editingEventEntry}?`)) return;

  const result = await window.api.events.delete(editingEventEntry);
  if (result.success) {
    showToast('Event deleted');
    document.getElementById('evt-editor').style.display = 'none';
    editingEventEntry = null;
    await loadAllGameEvents();
  } else {
    showToast(`Delete failed: ${result.error}`, 'error');
  }
}

async function triggerGameEvent(eventEntry, action) {
  showToast(`${action === 'start' ? 'Starting' : 'Stopping'} event #${eventEntry}...`);
  const result = await window.api.events.trigger(eventEntry, action);
  if (result.success) {
    showToast(`Event #${eventEntry} ${action === 'start' ? 'started' : 'stopped'}!`);
  } else {
    showToast(`Failed: ${result.error}`, 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// BOT SYSTEM
// ═════════════════════════════════════════════════════════════

async function loadBotSystem() {
  document.getElementById('bot-count').textContent = 'Loading...';
  document.getElementById('bot-module-status').textContent = '...';

  const [statsResult, configResult] = await Promise.all([
    window.api.bots.getStats(),
    window.api.bots.getConfig(),
  ]);

  if (statsResult.success) {
    document.getElementById('bot-count').textContent = statsResult.data.botCount.toLocaleString();
  } else {
    document.getElementById('bot-count').textContent = 'N/A';
  }

  const configEl = document.getElementById('bot-config-content');
  if (configResult.success && configResult.data !== null) {
    document.getElementById('bot-module-status').innerHTML =
      '<span style="color:var(--color-success);">Installed</span>';
    const entries = Object.entries(configResult.data);
    if (entries.length === 0) {
      configEl.innerHTML = '<div style="color:var(--text-dim);">Config table exists but is empty</div>';
    } else {
      configEl.innerHTML = `<table class="data-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>` +
        entries.map(([name, value]) => `<tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(String(value))}</td>
        </tr>`).join('') + '</tbody></table>';
    }
  } else {
    document.getElementById('bot-module-status').innerHTML =
      '<span style="color:var(--text-dim);">Not Installed</span>';
    configEl.innerHTML = `
      <div style="padding:20px; text-align:center; color:var(--text-dim);">
        <p>mod-playerbots is not installed on this server.</p>
        <p style="font-size:13px; margin-top:8px;">
          You can still send bot commands via SOAP if you have a compatible bot module.
        </p>
      </div>`;
  }
}

async function botQuickCommand(cmd) {
  showToast(`Sending: ${cmd}`);
  const resultEl = document.getElementById('bot-cmd-result');
  resultEl.style.display = 'block';
  resultEl.textContent = 'Executing...';

  const result = await window.api.bots.command(cmd);
  if (result.success) {
    resultEl.textContent = result.data || 'Command executed successfully';
    resultEl.className = 'bot-cmd-result bot-cmd-success';
    showToast('Command executed!');
  } else {
    resultEl.textContent = `Error: ${result.error}`;
    resultEl.className = 'bot-cmd-result bot-cmd-error';
    showToast(`Failed: ${result.error}`, 'error');
  }
}

async function sendBotCommand() {
  const cmd = document.getElementById('bot-custom-cmd').value.trim();
  if (!cmd) return;
  await botQuickCommand(cmd);
}

// ── Utility Helpers ──
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ═════════════════════════════════════════════════════════════
// DB2 BROWSER / EXTRACTOR / SETUP WIZARD
// ═════════════════════════════════════════════════════════════

async function loadExtractorPage() {
  // Load config into the config form
  const result = await window.api.extractor.getConfig();
  if (result.success && result.data) {
    const c = result.data;
    document.getElementById('ext-client-path').value = c.clientPath || '';
    document.getElementById('ext-output-path').value = c.outputPath || '';
    document.getElementById('ext-bin-path').value = c.extractorBinPath || '';
    document.getElementById('ext-db2-path').value = c.db2SourcePath || '';
  }
  // Load DB2 file list
  refreshDb2FileList();
}

function switchExtractorTab(tabName) {
  document.querySelectorAll('.ext-tab').forEach(t => t.classList.toggle('active', t.dataset.extTab === tabName));
  document.querySelectorAll('.ext-panel').forEach(p => p.classList.toggle('active', p.id === `ext-panel-${tabName}`));
}

// ── DB2 File List & Loading ──

async function refreshDb2FileList() {
  const select = document.getElementById('db2-file-select');
  const result = await window.api.db2.listFiles();
  if (!result.success) {
    showToast(result.error || 'Failed to list DB2 files', 'error');
    return;
  }
  const files = result.data;
  select.innerHTML = '<option value="">-- Select a DB2 file (' + files.length + ' available) --</option>';
  files.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    select.appendChild(opt);
  });
}

async function loadDb2File() {
  const filename = document.getElementById('db2-file-select').value;
  if (!filename) { showToast('Select a DB2 file first', 'error'); return; }

  db2CurrentFile = filename;
  db2IsSearching = false;
  const result = await window.api.db2.readFile({ filename, page: db2Page, limit: 100 });
  if (!result.success) {
    showToast(result.error || 'Failed to read DB2 file', 'error');
    return;
  }

  const data = result.data;
  db2Columns = data.columns;
  db2TotalPages = data.pages;

  // Update info badges
  document.getElementById('db2-file-info').style.display = 'block';
  document.getElementById('db2-file-name').textContent = data.filename;
  document.getElementById('db2-row-count').textContent = `${data.rowCount} rows`;
  document.getElementById('db2-col-count').textContent = `${data.columns.length} columns`;

  // Populate column filter in search
  const colSelect = document.getElementById('db2-search-column');
  colSelect.innerHTML = '<option value="">All Columns</option>';
  data.columns.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    colSelect.appendChild(opt);
  });

  document.getElementById('db2-search-panel').style.display = 'block';
  document.getElementById('db2-table-panel').style.display = 'block';
  renderDb2Table(data.columns, data.rows);
  document.getElementById('db2-page-info').textContent = `Page ${db2Page} of ${db2TotalPages}`;
}

function renderDb2Table(columns, rows) {
  const thead = document.getElementById('db2-table-head');
  const tbody = document.getElementById('db2-table-body');

  // Limit displayed columns to first 12 for readability
  const displayCols = columns.slice(0, 12);
  const hasMore = columns.length > 12;

  thead.innerHTML = '<tr>' + displayCols.map(c => `<th>${escapeHtml(c)}</th>`).join('') +
    (hasMore ? `<th class="text-muted">+${columns.length - 12} more</th>` : '') + '</tr>';

  tbody.innerHTML = rows.map(row => {
    const cells = displayCols.map(c => {
      const val = row[c];
      if (val === null || val === undefined) return '<td class="text-muted">—</td>';
      const str = String(val);
      return `<td title="${escapeHtml(str)}">${escapeHtml(str.length > 40 ? str.slice(0, 40) + '...' : str)}</td>`;
    }).join('');
    const extra = hasMore ? '<td></td>' : '';
    return `<tr>${cells}${extra}</tr>`;
  }).join('');
}

async function searchDb2() {
  const query = document.getElementById('db2-search-input').value.trim();
  if (!query || !db2CurrentFile) return;

  const column = document.getElementById('db2-search-column').value || undefined;
  const result = await window.api.db2.search({ filename: db2CurrentFile, query, column });
  if (!result.success) {
    showToast(result.error || 'Search failed', 'error');
    return;
  }

  db2IsSearching = true;
  renderDb2Table(db2Columns, result.data);
  document.getElementById('db2-page-info').textContent = `${result.data.length} results`;
}

function clearDb2Search() {
  document.getElementById('db2-search-input').value = '';
  if (db2CurrentFile) {
    db2IsSearching = false;
    db2Page = 1;
    loadDb2File();
  }
}

async function exportDb2(format) {
  if (!db2CurrentFile) return;
  const result = await window.api.db2.export({ filename: db2CurrentFile, format });
  if (!result.success) { showToast(result.error, 'error'); return; }

  try {
    await navigator.clipboard.writeText(result.data);
    showToast(`${format.toUpperCase()} copied to clipboard (${db2CurrentFile})`, 'success');
  } catch {
    // Fallback: show in a text area
    showToast(`Export generated (${result.data.length} chars) — clipboard not available`, 'error');
  }
}

// ── Spell Viewer ──

async function searchSpells() {
  const query = document.getElementById('spell-search-input').value.trim();
  if (!query) return;

  // Search SpellName.db2 for matching spells
  const result = await window.api.db2.search({ filename: 'SpellName.db2', query, column: isNaN(query) ? 'Name' : '' });
  if (!result.success) {
    showToast(result.error || 'Spell search failed — is SpellName.db2 available?', 'error');
    return;
  }

  const tbody = document.getElementById('spell-search-body');
  tbody.innerHTML = result.data.slice(0, 50).map(row => {
    const id = row._ID || row.ID;
    const name = escapeHtml(row.Name || 'Unknown');
    return `<tr>
      <td>${id}</td>
      <td>${name}</td>
      <td><button class="btn btn-primary btn-sm" onclick="viewSpellDetail(${id})">View</button></td>
    </tr>`;
  }).join('');

  document.getElementById('spell-search-results').style.display = 'block';
}

async function viewSpellDetail(spellId) {
  const result = await window.api.db2.getFullSpell({ spellId });
  if (!result.success) {
    showToast(result.error || 'Failed to load spell', 'error');
    return;
  }

  const s = result.data;
  document.getElementById('spell-detail-name').textContent = s.name;
  document.getElementById('spell-detail-id').textContent = `Spell ID: ${s.id}`;
  document.getElementById('spell-detail-desc').textContent = s.description || '(no description)';
  document.getElementById('spell-detail-aura').textContent = s.auraDescription || '';

  const POWER_TYPES = ['Mana', 'Rage', 'Focus', 'Energy', 'Combo', 'Runes', 'Runic Power', 'Soul Shards', 'Lunar Power', 'Holy Power', 'Alternate', 'Maelstrom', 'Chi', 'Insanity', 'Fury', 'Pain'];

  document.getElementById('spell-detail-cast').textContent = s.castTime > 0 ? `${(s.castTime / 1000).toFixed(1)}s` : 'Instant';
  document.getElementById('spell-detail-range').textContent = s.rangeMax > 0 ? `${s.rangeMin}-${s.rangeMax} yd` : 'Self';
  document.getElementById('spell-detail-cost').textContent = s.manaCost > 0 ? `${s.manaCost} ${POWER_TYPES[s.powerType] || 'Power'}` : 'None';
  document.getElementById('spell-detail-cd').textContent = s.cooldown > 0 ? `${(s.cooldown / 1000).toFixed(1)}s` : 'None';
  document.getElementById('spell-detail-duration').textContent = s.duration > 0 ? `${(s.duration / 1000).toFixed(1)}s` : 'Instant';
  document.getElementById('spell-detail-icon').textContent = s.iconFileDataID || '—';

  // Render effects
  const effectsDiv = document.getElementById('spell-effects-list');
  if (s.effects && s.effects.length > 0) {
    effectsDiv.innerHTML = s.effects.map((e, i) => {
      if (!e) return '';
      return `<div class="spell-effect-row">
        <span class="spell-effect-idx">#${e.EffectIndex !== undefined ? e.EffectIndex : i}</span>
        <span>Effect: <strong>${e.Effect || 0}</strong></span>
        <span>Base: <strong>${e.EffectBasePoints || e.EffectBasePointsF || 0}</strong></span>
        <span>Aura: ${e.EffectAura || 0}</span>
        <span>Misc: ${e.EffectMiscValue?.[0] || e.EffectMiscValue || 0}</span>
      </div>`;
    }).join('');
  } else {
    effectsDiv.innerHTML = '<div class="text-muted">No effect data found</div>';
  }

  document.getElementById('spell-detail-panel').style.display = 'block';
}

// ── Setup Wizard ──

async function runWizardStep(step) {
  const statusEl = document.getElementById(`wizard-status-${step}`);
  const outputEl = document.getElementById(`wizard-output-${step}`);
  statusEl.textContent = 'Running...';
  statusEl.className = 'wizard-step-status running';
  outputEl.textContent = '';
  outputEl.style.display = 'block';

  // Listen for progress
  const progressHandler = (data) => {
    if (data.step === step) {
      outputEl.textContent += data.line;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  };
  window.api.wizard.onProgress(progressHandler);

  const config = await window.api.extractor.getConfig();
  const cfg = config.data || {};
  const result = await window.api.wizard.runStep({
    step,
    clientPath: cfg.clientPath,
    outputPath: cfg.outputPath
  });

  if (result.success) {
    statusEl.textContent = 'Complete!';
    statusEl.className = 'wizard-step-status complete';
    showToast(`Step ${step} complete`, 'success');
  } else {
    statusEl.textContent = `Failed: ${result.error}`;
    statusEl.className = 'wizard-step-status failed';
    if (result.data?.output) outputEl.textContent += '\n' + result.data.output;
    showToast(`Step ${step} failed: ${result.error}`, 'error');
  }
}

async function cancelWizardStep() {
  const result = await window.api.wizard.cancel();
  if (result.success) {
    showToast('Wizard step cancelled', 'success');
  } else {
    showToast(result.error || 'Nothing to cancel', 'error');
  }
}

// ── Asset Extractor (CASC) ──

async function initCasc() {
  document.getElementById('casc-status').textContent = 'Initializing CASC...';
  const result = await window.api.extractor.scanCasc();
  if (result.success) {
    document.getElementById('casc-status').textContent = `CASC initialized — Build: ${result.data.buildVersion}`;
    document.getElementById('casc-extract-icons-btn').disabled = false;
    document.getElementById('casc-cancel-btn').disabled = false;
    showToast('CASC initialized', 'success');
  } else {
    document.getElementById('casc-status').textContent = `Failed: ${result.error}`;
    showToast(result.error, 'error');
  }
}

async function extractCascIcons() {
  document.getElementById('casc-progress').style.display = 'block';
  document.getElementById('casc-progress-text').textContent = 'Starting...';

  window.api.extractor.onProgress((msg) => {
    document.getElementById('casc-progress-text').textContent = msg;
    // Parse progress percentage from "N/M" format
    const match = msg.match(/(\d+)\/(\d+)/);
    if (match) {
      const pct = Math.min(100, Math.round((parseInt(match[1]) / parseInt(match[2])) * 100));
      document.getElementById('casc-progress-fill').style.width = pct + '%';
    }
  });

  const result = await window.api.extractor.extractIcons({});
  document.getElementById('casc-progress').style.display = 'none';

  const resultDiv = document.getElementById('casc-result');
  resultDiv.style.display = 'block';
  if (result.success) {
    resultDiv.innerHTML = `<div class="ext-badge">Extracted: ${result.data.extracted}</div>
      <div class="ext-badge ext-badge-dim">Errors: ${result.data.errors}</div>
      <div class="ext-badge ext-badge-dim">Total: ${result.data.total}</div>`;
    showToast('Icon extraction complete', 'success');
  } else {
    resultDiv.innerHTML = `<div class="text-muted">Error: ${escapeHtml(result.error)}</div>`;
    showToast(result.error, 'error');
  }
}

async function cancelCascExtraction() {
  await window.api.extractor.cancel();
  showToast('Extraction cancelled', 'success');
}

// ── Extractor Config ──

async function saveExtractorConfig() {
  const config = {
    clientPath: document.getElementById('ext-client-path').value.trim(),
    outputPath: document.getElementById('ext-output-path').value.trim(),
    extractorBinPath: document.getElementById('ext-bin-path').value.trim(),
    db2SourcePath: document.getElementById('ext-db2-path').value.trim(),
    dataSource: 'extracted',
    listfileCached: false
  };
  const result = await window.api.extractor.saveConfig(config);
  if (result.success) {
    showToast('Extractor config saved', 'success');
    refreshDb2FileList();
  } else {
    showToast(result.error || 'Failed to save config', 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getQualityName(q) {
  return ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact', 'Heirloom'][q] || 'Unknown';
}

function getRaceName(r) {
  return ['', 'Human', 'Orc', 'Dwarf', 'Night Elf', 'Undead', 'Tauren', 'Gnome', 'Troll', 'Goblin', 'Blood Elf', 'Draenei'][r] || `Race ${r}`;
}

function getClassName(c) {
  return ['', 'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Monk', 'Druid'][c] || `Class ${c}`;
}

function viewItem(itemId) {
  // TODO: Item detail modal
  showToast(`Item ${itemId} — detail view coming soon`);
}

function viewPlayer(guid) {
  // TODO: Player detail modal
  showToast(`Player ${guid} — detail view coming soon`);
}

// ─── Start ──────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
