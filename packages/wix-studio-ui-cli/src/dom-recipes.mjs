export function inspectScript() {
  return `(() => ({
    title: document.title,
    url: location.href,
    isLikelyWixStudio: /wix|editorx|studio/i.test(location.href + ' ' + document.title),
    buttons: Array.from(document.querySelectorAll('button,[role="button"],a')).slice(0, 80).map((el, i) => ({
      index: i,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().slice(0, 120),
      aria: el.getAttribute('aria-label'),
      role: el.getAttribute('role'),
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true'
    }))
  }))()`;
}

export function elementMapScript() {
  return `(() => Array.from(document.querySelectorAll('button,[role="button"],a,input,textarea,[contenteditable="true"],[aria-label]')).slice(0, 250).map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      index: i,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || null,
      label: (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || '').trim().slice(0, 160),
      selectorHint: el.id ? '#' + CSS.escape(el.id) : null,
      visible: r.width > 0 && r.height > 0,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
  }))()`;
}

export function clickByLabelScript(label) {
  const safe = JSON.stringify(label);
  return `(() => {
    const wanted = ${safe}.toLowerCase();
    const candidates = Array.from(document.querySelectorAll('button,[role="button"],a,[aria-label]'));
    const el = candidates.find((node) => ((node.getAttribute('aria-label') || node.innerText || node.title || '').trim().toLowerCase()).includes(wanted));
    if (!el) return { ok: false, reason: 'label_not_found', label: ${safe} };
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.click();
    return { ok: true, clicked: (el.getAttribute('aria-label') || el.innerText || el.title || '').trim().slice(0, 160) };
  })()`;
}

export function textEditScript({ selector, label, text }) {
  const safeSelector = selector ? JSON.stringify(selector) : 'null';
  const safeLabel = label ? JSON.stringify(label) : 'null';
  const safeText = JSON.stringify(text ?? '');
  return `(() => {
    let el = ${safeSelector} ? document.querySelector(${safeSelector}) : null;
    if (!el && ${safeLabel}) {
      const wanted = ${safeLabel}.toLowerCase();
      el = Array.from(document.querySelectorAll('input,textarea,[contenteditable="true"],[aria-label]')).find((node) => ((node.getAttribute('aria-label') || node.placeholder || node.innerText || '').trim().toLowerCase()).includes(wanted));
    }
    if (!el) return { ok: false, reason: 'editable_not_found' };
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.focus();
    if (el.isContentEditable) el.innerText = ${safeText};
    else el.value = ${safeText};
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${safeText} }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, edited: (el.getAttribute('aria-label') || el.placeholder || el.tagName).slice(0, 160), chars: ${safeText}.length };
  })()`;
}

export function saveStateDetectScript() {
  return `(() => {
    const text = document.body.innerText.slice(0, 50000);
    const matches = Array.from(new Set((text.match(/Saved|Saving|Unsaved|All changes saved|Draft|Publish|Preview/gi) || [])));
    return { title: document.title, url: location.href, matches, likelyUnsaved: /unsaved|saving/i.test(matches.join(' ')) };
  })()`;
}
