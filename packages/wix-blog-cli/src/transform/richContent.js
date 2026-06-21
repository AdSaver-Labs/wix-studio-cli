function clone(x) { return JSON.parse(JSON.stringify(x)); }
function collectTextRefs(obj, refs = []) {
  if (!obj || typeof obj !== 'object') return refs;
  if (obj.textData && typeof obj.textData.text === 'string' && obj.textData.text.trim()) refs.push({ obj: obj.textData, key: 'text', text: obj.textData.text, kind: 'body' });
  if (obj.imageData) {
    for (const k of ['altText', 'caption']) if (typeof obj.imageData[k] === 'string' && obj.imageData[k].trim()) refs.push({ obj: obj.imageData, key: k, text: obj.imageData[k], kind: k });
  }
  if (Array.isArray(obj.nodes)) obj.nodes.forEach(n => collectTextRefs(n, refs));
  return refs;
}
function countImages(obj) {
  let n = 0;
  (function walk(o){ if (!o || typeof o !== 'object') return; if (o.imageData) n++; if (Array.isArray(o.nodes)) o.nodes.forEach(walk); })(obj);
  return n;
}
function extractText(obj) { return collectTextRefs(obj, []).map(r => r.obj[r.key]).join('\n'); }
function boundaryNeedsSpace(a = '', b = '') {
  if (!a || !b) return false;
  if (/[\s\n\t]$/.test(a) || /^[\s\n\t.,;:!?—–\-()[\]"'“”‘’]/.test(b)) return false;
  return /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b);
}
function collectInlineSpacingIssues(obj, issues = [], path = 'root') {
  if (!obj || typeof obj !== 'object') return issues;
  if (Array.isArray(obj.nodes)) {
    for (let i = 0; i < obj.nodes.length - 1; i++) {
      const a = obj.nodes[i]?.textData?.text;
      const b = obj.nodes[i + 1]?.textData?.text;
      if (typeof a === 'string' && typeof b === 'string' && boundaryNeedsSpace(a, b)) issues.push({ path: `${path}.nodes[${i}]→[${i + 1}]`, preview: `${a}${b}`.slice(-120) });
    }
    obj.nodes.forEach((n, idx) => collectInlineSpacingIssues(n, issues, `${path}.nodes[${idx}]`));
  }
  return issues;
}
function normalizeInlineSpacing(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj.nodes)) {
    for (let i = 0; i < obj.nodes.length - 1; i++) {
      const left = obj.nodes[i]?.textData;
      const right = obj.nodes[i + 1]?.textData;
      if (left && right && typeof left.text === 'string' && typeof right.text === 'string' && boundaryNeedsSpace(left.text, right.text)) left.text += ' ';
    }
    obj.nodes.forEach(normalizeInlineSpacing);
  }
  return obj;
}
module.exports = { clone, collectTextRefs, countImages, extractText, collectInlineSpacingIssues, normalizeInlineSpacing };
