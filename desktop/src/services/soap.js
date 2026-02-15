// services/soap.js
// ─────────────────────────────────────────────────────────────
// SOAP SERVICE — Sends commands to TrinityCore's worldserver
//
// WHY: Database changes alone don't affect the running server.
// Changing an NPC's stats in MySQL does nothing until you tell
// the worldserver to reload that data. SOAP is how you do that.
//
// HOW: TrinityCore exposes a SOAP endpoint (default port 7878).
// We send XML-wrapped GM commands and get XML responses back.
// The SOAP user must be a GM account (level 3+) in the auth DB.
// ─────────────────────────────────────────────────────────────

const axios = require('axios');

class SoapService {
  constructor(config = {}) {
    this.host = config.host || 'localhost';
    this.port = config.port || 7878;
    this.user = config.user || '';
    this.password = config.password || '';
  }

  updateConfig(config) {
    this.host = config.host || this.host;
    this.port = config.port || this.port;
    this.user = config.user || this.user;
    this.password = config.password || this.password;
  }

  // Build the SOAP XML envelope around a GM command
  // WHY manual XML? TrinityCore's SOAP is very simple — one
  // endpoint, one method. A full SOAP library is overkill.
  buildEnvelope(command) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
  xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:TC">
  <SOAP-ENV:Body>
    <ns1:executeCommand>
      <command>${this.escapeXml(command)}</command>
    </ns1:executeCommand>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
  }

  // Prevent XML injection in command strings
  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Parse the XML response to extract the result text
  // WHY regex instead of xml2js? The response format is always
  // identical — one result field. Regex is simpler and has no
  // extra dependency.
  parseResponse(xml) {
    const match = xml.match(/<result[^>]*>([\s\S]*?)<\/result>/);
    if (match) return match[1].trim();
    // Fallback: try to find any text content
    const bodyMatch = xml.match(/<SOAP-ENV:Body>([\s\S]*?)<\/SOAP-ENV:Body>/);
    if (bodyMatch) return bodyMatch[1].replace(/<[^>]+>/g, '').trim();
    return xml;
  }

  // Core method — send any GM command via SOAP
  async sendCommand(command) {
    if (!this.host || !this.user) {
      throw new Error('SOAP not configured. Set host, user, and password in Settings → Server Connection.');
    }

    const url = `http://${this.host}:${this.port}/`;

    try {
      const response = await axios.post(url, this.buildEnvelope(command), {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'urn:TC#executeCommand',
        },
        // HTTP Basic Auth — uses your GM account credentials
        auth: {
          username: this.user,
          password: this.password,
        },
        timeout: 10000, // 10s — fail fast if server is down
        // Don't throw on non-2xx responses — we handle errors ourselves
        validateStatus: () => true,
      });

      if (response.status === 401) {
        throw new Error('SOAP authentication failed. Check your SOAP username and password (must be a GM account).');
      }

      if (response.status !== 200) {
        throw new Error(`SOAP request failed with status ${response.status}`);
      }

      return this.parseResponse(response.data);

    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to worldserver at ${this.host}:${this.port}. Is the server running?`);
      }
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        throw new Error(`Connection to ${this.host}:${this.port} timed out. Server may be unreachable.`);
      }
      throw err;
    }
  }

  // ─── Convenience Methods ────────────────────────────────
  // WHY wrap each command? Clean API for the UI, consistent
  // error handling, and the renderer doesn't need to know
  // the exact .command syntax.

  async serverInfo() {
    return this.sendCommand('server info');
  }

  async announce(message) {
    return this.sendCommand(`announce ${message}`);
  }

  async notify(message) {
    return this.sendCommand(`send notification ${message}`);
  }

  async reloadConfig() {
    return this.sendCommand('reload config');
  }

  async reloadCreatureTemplate(entry) {
    return this.sendCommand(`reload creature_template ${entry}`);
  }

  async reloadGameEvent() {
    return this.sendCommand('reload game_event');
  }

  async onlineList() {
    return this.sendCommand('account onlinelist');
  }

  async serverShutdown(seconds, message = '') {
    const cmd = message
      ? `server shutdown ${seconds} ${message}`
      : `server shutdown ${seconds}`;
    return this.sendCommand(cmd);
  }

  async cancelShutdown() {
    return this.sendCommand('server shutdown cancel');
  }

  // Test if the connection works
  async testConnection() {
    try {
      const result = await this.serverInfo();
      return { success: true, message: result };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = SoapService;
