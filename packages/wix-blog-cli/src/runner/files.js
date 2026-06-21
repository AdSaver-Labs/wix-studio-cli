const fs = require('fs'); const path = require('path'); const config = require('../config');
function ensure(p){ fs.mkdirSync(p,{recursive:true}); return p; }
function writeJson(p,obj){ ensure(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(obj,null,2)); return p; }
function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function ts(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
module.exports={ensure,writeJson,readJson,ts,dataDir:config.dataDir};
