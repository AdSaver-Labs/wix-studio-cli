const fs = require('fs');
const path = require('path');
const { RECEIPTS_ROOT } = require('./clients');
function ensureDir(p){ fs.mkdirSync(path.dirname(p), {recursive:true}); }
function writeJson(p, obj){ ensureDir(p); fs.writeFileSync(p, JSON.stringify(obj,null,2)+'\n'); return p; }
function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function receiptPath(clientId, name){ return path.join(RECEIPTS_ROOT, clientId, name); }
module.exports = { writeJson, readJson, receiptPath };
