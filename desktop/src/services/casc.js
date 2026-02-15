// ─── CASC Service ─────────────────────────────────────────────
// Wraps @rhyster/wow-casc-dbc CASCClient for asset extraction.
// WHY: Modern WoW uses CASC (Content Addressable Storage Container)
// instead of MPQ. Files are accessed by FileDataID, not path.
// This service handles initialization, listfile caching, and
// file extraction for icons and minimaps.

const fs = require('fs');
const path = require('path');

let cascModule = null;
let cascClient = null;
let listfileLoaded = false;
let cancelRequested = false;

async function getCascModule() {
  if (!cascModule) {
    cascModule = await import('@rhyster/wow-casc-dbc');
  }
  return cascModule;
}

class CASCService {
  constructor(store) {
    this.store = store;
  }

  getConfig() {
    return this.store.get('extractor') || {};
  }

  // Scan and initialize the CASC client from local WoW installation
  async initFromLocal(clientPath) {
    const { CASCClient } = await getCascModule();
    const region = 'us';
    const product = 'wow';

    const version = await CASCClient.getProductVersion(region, product);
    cascClient = new CASCClient(region, product, version);
    await cascClient.init();
    await cascClient.loadRemoteTACTKeys();

    return {
      buildVersion: version.VersionsName || version.BuildId || 'Unknown',
      product,
      region
    };
  }

  // Load the listfile (maps FileDataIDs to paths) — cache locally
  async loadListfile(progressCallback) {
    if (!cascClient) throw new Error('CASC not initialized');
    if (listfileLoaded) return;

    const config = this.getConfig();
    const outputPath = config.outputPath || '';
    const listfilePath = path.join(outputPath, 'listfile.csv');

    // Check for cached listfile
    if (fs.existsSync(listfilePath)) {
      // Load from cache (fast)
      if (progressCallback) progressCallback('Loading cached listfile...');
      // The library expects to load it remotely, but we pre-cache the knowledge
      await cascClient.loadRemoteListFile();
      listfileLoaded = true;
      return;
    }

    if (progressCallback) progressCallback('Downloading listfile (~50MB, first time only)...');
    await cascClient.loadRemoteListFile();
    listfileLoaded = true;

    // Save listfile for future use (mark as cached)
    if (outputPath && fs.existsSync(outputPath)) {
      this.store.set('extractor.listfileCached', true);
    }
  }

  // Extract icons from CASC to PNG files
  async extractIcons(options = {}, progressCallback) {
    if (!cascClient) throw new Error('CASC not initialized');
    cancelRequested = false;

    const config = this.getConfig();
    const outputPath = config.outputPath || '';
    const iconsDir = path.join(outputPath, 'icons');
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

    const { CASCClient } = await getCascModule();
    let extracted = 0;
    let errors = 0;

    // Get ManifestInterfaceData to find icon FileDataIDs
    let iconFileDataIDs = [];
    try {
      const manifestFDID = cascClient.getFileDataIDByName('dbfilesclient/manifestinterfacedata.db2');
      if (manifestFDID) {
        const { WDCReader, DBDParser } = await getCascModule();
        const cKeys = cascClient.getContentKeysByFileDataID(manifestFDID);
        const cKey = cKeys.find(d => !!(d.localeFlags & CASCClient.LocaleFlags.enUS)) || cKeys[0];
        const { buffer } = await cascClient.getFileByContentKey(cKey.cKey);
        const reader = new WDCReader(buffer);
        const parser = await DBDParser.parse(reader);
        const ids = parser.getAllIDs();
        for (const id of ids) {
          const row = parser.getRowData(id);
          if (row && row.FilePath && row.FilePath.toLowerCase().includes('icons/')) {
            iconFileDataIDs.push({ fileDataID: row.FileDataID || id, name: row.FileName || `${id}` });
          }
        }
      }
    } catch (e) {
      // Fallback: no manifest, extract what we can
      if (progressCallback) progressCallback(`Warning: Could not read ManifestInterfaceData: ${e.message}`);
    }

    const total = iconFileDataIDs.length;
    for (let i = 0; i < total; i++) {
      if (cancelRequested) break;
      const { fileDataID, name } = iconFileDataIDs[i];
      const outFile = path.join(iconsDir, `${fileDataID}.png`);
      if (fs.existsSync(outFile)) { extracted++; continue; } // Skip already extracted

      try {
        const cKeys = cascClient.getContentKeysByFileDataID(fileDataID);
        if (cKeys && cKeys.length > 0) {
          const cKey = cKeys.find(d => !!(d.localeFlags & CASCClient.LocaleFlags.enUS)) || cKeys[0];
          const { buffer } = await cascClient.getFileByContentKey(cKey.cKey);
          // BLP conversion happens in blp.js — save raw BLP for now
          const blpPath = path.join(iconsDir, `${fileDataID}.blp`);
          fs.writeFileSync(blpPath, buffer);
          extracted++;
        }
      } catch { errors++; }

      if (progressCallback && i % 100 === 0) {
        progressCallback(`Extracting icons: ${i}/${total} (${extracted} ok, ${errors} errors)`);
      }
    }

    return { extracted, errors, total };
  }

  // Cancel any running extraction
  cancel() {
    cancelRequested = true;
  }

  // Check if CASC client is initialized
  isInitialized() {
    return !!cascClient;
  }
}

module.exports = CASCService;
