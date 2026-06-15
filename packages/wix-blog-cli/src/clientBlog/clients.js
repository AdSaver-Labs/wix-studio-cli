const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const WORKSPACE = process.env.WIX_BLOG_WORKSPACE || PACKAGE_ROOT;
const CLIENT_ROOT = process.env.WIX_BLOG_CLIENT_ROOT || path.join(WORKSPACE, 'clients');
const RECEIPTS_ROOT = process.env.WIX_BLOG_RECEIPTS_ROOT || path.join(WORKSPACE, 'receipts');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function clientPackPath(clientId) { return path.join(CLIENT_ROOT, clientId, 'client-pack.json'); }
function loadClientPack(clientId) {
  const p = clientPackPath(clientId);
  if (!fs.existsSync(p)) throw new Error(`CLIENT_PACK_NOT_FOUND: ${clientId}`);
  const pack = readJson(p);
  if (!pack.clientId || !pack.clientName || !pack.website) throw new Error(`CLIENT_PACK_INVALID: ${p}`);
  return pack;
}
function requireWixConfig(pack) {
  const wix = pack.wix || {};
  if (!wix.siteId || !wix.dashboardPostsUrl) {
    const status = wix.status || 'CONFIG_MISSING';
    throw new Error(`${status}: Wix siteId/dashboardPostsUrl missing for ${pack.clientId}. Access may exist; discover and save config first.`);
  }
  return wix;
}
function wixConfigFromClient(clientId) {
  const pack = loadClientPack(clientId);
  const wix = requireWixConfig(pack);
  return {
    clientId: pack.clientId,
    clientName: pack.clientName,
    baseUrl: wix.baseUrl || pack.website,
    siteId: wix.siteId,
    dashboardPostsUrl: wix.dashboardPostsUrl,
    primaryLanguage: wix.primaryLanguage || pack.primaryLanguage || 'bg',
    secondaryLanguages: wix.secondaryLanguages || [],
    publishingGate: pack.publishingGate || 'approval-first',
    storagePolicy: wix.storagePolicy || 'wix-first-receipts-only',
  };
}
module.exports = { PACKAGE_ROOT, WORKSPACE, CLIENT_ROOT, RECEIPTS_ROOT, clientPackPath, loadClientPack, requireWixConfig, wixConfigFromClient };
