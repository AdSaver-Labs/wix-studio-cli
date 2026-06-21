const path = require('path'); const fs = require('fs'); const { ensure, writeJson, dataDir } = require('./files');
function checkpointPath(postId){ return path.join(dataDir,'checkpoints',`${postId}.json`); }
function loadCheckpoint(postId){ const p=checkpointPath(postId); return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null; }
function saveCheckpoint(postId, patch){ const prev=loadCheckpoint(postId)||{sourcePostId:postId,steps:{},attempts:0}; const next={...prev,...patch,steps:{...(prev.steps||{}),...(patch.steps||{})},updatedAt:new Date().toISOString()}; writeJson(checkpointPath(postId), next); return next; }
module.exports={checkpointPath,loadCheckpoint,saveCheckpoint};
