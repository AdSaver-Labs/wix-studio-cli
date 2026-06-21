export function inspectScript() {
  return `(() => ({
    title: document.title,
    url: location.href,
    isLikelyWixStudio: /wix|editorx|studio/i.test(location.href + ' ' + document.title),
    activeElement: document.activeElement ? {
      tag: document.activeElement.tagName.toLowerCase(),
      label: (document.activeElement.getAttribute('aria-label') || document.activeElement.innerText || document.activeElement.value || document.activeElement.placeholder || '').trim().slice(0, 120)
    } : null,
    frames: Array.from(document.querySelectorAll('iframe')).map((frame, i) => {
      const r = frame.getBoundingClientRect();
      return { index: i, title: frame.title || null, name: frame.name || null, src: frame.src || null, visible: r.width > 0 && r.height > 0, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    }).slice(0, 40),
    buttons: Array.from(document.querySelectorAll('button,[role="button"],a')).slice(0, 100).map((el, i) => ({
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
  return `(() => Array.from(document.querySelectorAll('button,[role="button"],a,input,textarea,[contenteditable="true"],[aria-label],[data-hook],[data-testid]')).map((el, originalIndex) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const visible = r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0;
    const label = ((el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || '').trim() || el.getAttribute('data-hook') || el.getAttribute('data-testid') || '').slice(0, 180);
    const selectorHint = el.id ? '#' + CSS.escape(el.id) : (el.getAttribute('data-testid') ? '[data-testid="' + CSS.escape(el.getAttribute('data-testid')) + '"]' : (el.getAttribute('data-hook') ? '[data-hook="' + CSS.escape(el.getAttribute('data-hook')) + '"]' : null));
    const selectorStability = el.id || el.getAttribute('data-testid') || el.getAttribute('data-hook') ? 'stable_hint' : (el.getAttribute('aria-label') ? 'aria_label' : 'visible_text');
    return {
      originalIndex,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || null,
      label,
      aria: el.getAttribute('aria-label') || null,
      dataHook: el.getAttribute('data-hook') || null,
      dataTestId: el.getAttribute('data-testid') || null,
      selectorHint,
      selectorStability,
      editable: el.matches('input,textarea,[contenteditable="true"]') || el.isContentEditable,
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      visible,
      actionable: visible && !(!!el.disabled || el.getAttribute('aria-disabled') === 'true'),
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
  }).filter((item) => item.visible || item.selectorHint).slice(0, 350).map((item, index) => ({ index, ...item })))()`;
}

export function frameMapScript() {
  return `(() => Array.from(document.querySelectorAll('iframe')).map((frame, i) => {
    const r = frame.getBoundingClientRect();
    let accessible = false;
    let innerTitle = null;
    let innerControls = null;
    try {
      accessible = !!frame.contentDocument;
      innerTitle = frame.contentDocument?.title || null;
      innerControls = accessible ? Array.from(frame.contentDocument.querySelectorAll('button,[role="button"],input,textarea,[contenteditable="true"],[aria-label]')).slice(0, 40).map((el, j) => ({ index: j, tag: el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || '').trim().slice(0, 120) })) : null;
    } catch { accessible = false; }
    return {
      index: i,
      title: frame.title || null,
      name: frame.name || null,
      src: frame.src || null,
      accessible,
      innerTitle,
      innerControls,
      visible: r.width > 0 && r.height > 0,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
  }))()`;
}

export function selectorResolveScript(label) {
  const safe = JSON.stringify(label);
  return `(() => {
    const wanted = ${safe}.trim().toLowerCase();
    const nodes = Array.from(document.querySelectorAll('button,[role="button"],a,[aria-label],[data-hook],[data-testid]'));
    const scored = nodes.map((node, index) => {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const visible = r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0;
      const disabled = !!node.disabled || node.getAttribute('aria-disabled') === 'true';
      const label = (node.getAttribute('aria-label') || node.innerText || node.title || node.getAttribute('data-hook') || node.getAttribute('data-testid') || '').trim();
      const normalized = label.toLowerCase();
      let score = 0;
      if (normalized === wanted) score += 80;
      else if (normalized.startsWith(wanted)) score += 55;
      else if (normalized.includes(wanted)) score += 35;
      if (node.getAttribute('data-testid') || node.getAttribute('data-hook')) score += 10;
      if (node.getAttribute('aria-label')) score += 5;
      if (visible) score += 10;
      if (disabled) score -= 40;
      return { index, label: label.slice(0, 160), tag: node.tagName.toLowerCase(), role: node.getAttribute('role') || null, visible, disabled, confidence: Math.max(0, Math.min(100, score)), selectorStability: node.getAttribute('data-testid') || node.getAttribute('data-hook') ? 'stable_hint' : (node.getAttribute('aria-label') ? 'aria_label' : 'visible_text'), box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    }).filter((item) => item.confidence > 0).sort((a, b) => b.confidence - a.confidence).slice(0, 10);
    const high = scored.filter((item) => item.confidence >= 70 && item.visible && !item.disabled);
    return { ok: high.length === 1, label: ${safe}, candidateCount: scored.length, confidence: high[0]?.confidence || scored[0]?.confidence || 0, targetMatchedBy: high.length === 1 ? high[0].selectorStability : null, candidates: scored };
  })()`;
}

export function clickByLabelScript(label) {
  return `(() => {
    const resolved = ${selectorResolveScript(label)};
    if (!resolved.ok) return { ok: false, reason: resolved.candidateCount ? 'ambiguous_or_low_confidence_label' : 'label_not_found', ...resolved };
    const target = resolved.candidates[0];
    const nodes = Array.from(document.querySelectorAll('button,[role="button"],a,[aria-label],[data-hook],[data-testid]'));
    const el = nodes[target.index];
    if (!el) return { ok: false, reason: 'resolved_target_missing', target };
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.click();
    return { ok: true, clicked: target.label, confidence: target.confidence, targetMatchedBy: target.selectorStability };
  })()`;
}

export function textEditScript({ selector, label, text }) {
  const safeSelector = selector ? JSON.stringify(selector) : 'null';
  const safeLabel = label ? JSON.stringify(label) : 'null';
  const safeText = JSON.stringify(text ?? '');
  return `(async () => {
    const stableValue = (node) => node.isContentEditable ? node.innerText : node.value;
    const waitForUi = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 120))));
    let el = ${safeSelector} ? document.querySelector(${safeSelector}) : null;
    if (!el && ${safeLabel}) {
      const wanted = ${safeLabel}.toLowerCase();
      el = Array.from(document.querySelectorAll('input,textarea,[contenteditable="true"],[aria-label]')).find((node) => ((node.getAttribute('aria-label') || node.placeholder || node.innerText || node.getAttribute('data-hook') || '').trim().toLowerCase()).includes(wanted));
    }
    if (!el) return { ok: false, reason: 'editable_not_found' };
    const before = stableValue(el);
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.focus();
    try { document.execCommand('selectAll', false, null); } catch {}
    if (el.isContentEditable) {
      el.innerText = ${safeText};
    } else {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, ${safeText});
      else el.value = ${safeText};
    }
    el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: ${safeText} }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${safeText} }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
    const immediateAfter = stableValue(el);
    await waitForUi();
    const stableAfter = stableValue(el);
    const accepted = stableAfter === ${safeText};
    return {
      ok: accepted,
      edited: (el.getAttribute('aria-label') || el.placeholder || el.tagName).slice(0, 160),
      chars: ${safeText}.length,
      beforeHashChanged: before !== stableAfter,
      immediateValueCommitted: immediateAfter === ${safeText},
      stableValueCommitted: accepted,
      localValueCommitted: accepted,
      reason: accepted ? undefined : 'ui_reverted_or_rejected_value',
      warning: accepted ? 'Stable local DOM value changed. Run save-state-detect and verification; Wix model commit can still fail if editor RTE state did not accept the input.' : 'Input appeared to change immediately but did not remain committed after UI processing; do not treat as a successful mutation.'
    };
  })()`;
}

export function saveStateDetectScript() {
  return `(() => {
    const text = document.body.innerText.slice(0, 80000);
    const matches = Array.from(new Set((text.match(/Saved|Saving|Unsaved|All changes saved|Changes saved|Draft|Publish|Published|Preview|Autosave|Error saving|Try again/gi) || [])));
    const state = /error saving|try again/i.test(text) ? 'save_error' : /unsaved/i.test(text) ? 'unsaved' : /saving/i.test(text) ? 'saving' : /all changes saved|changes saved|saved/i.test(text) ? 'saved_visible' : 'unknown';
    return { title: document.title, url: location.href, state, matches, likelyUnsaved: /unsaved|saving|error saving|try again/i.test(matches.join(' ')) };
  })()`;
}

export function diagnosticsScript() {
  return `(() => {
    const text = document.body.innerText.slice(0, 100000);
    const frames = Array.from(document.querySelectorAll('iframe')).map((frame, i) => {
      const r = frame.getBoundingClientRect();
      return { index: i, title: frame.title || null, name: frame.name || null, src: frame.src || null, visible: r.width > 0 && r.height > 0, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    });
    const buttons = Array.from(document.querySelectorAll('button,[role="button"],a,[aria-label]')).map((el) => (el.getAttribute('aria-label') || el.innerText || el.title || '').trim()).filter(Boolean).slice(0, 150);
    const hazards = buttons.filter((label) => /publish|delete|remove|domain|dns|payment|checkout|seo|redirect|canonical|index/i.test(label));
    const symptoms = [];
    if (/saving/i.test(text) && !/all changes saved|changes saved/i.test(text)) symptoms.push('saving_or_unsaved_visible');
    if (/cms|content manager/i.test(text) && /try again|loading|error/i.test(text)) symptoms.push('cms_panel_possible_inert_or_error');
    if (/locked|being edited|another tab|take over/i.test(text)) symptoms.push('possible_stale_tab_or_edit_lock');
    if (frames.length) symptoms.push('iframe_boundaries_present');
    return { title: document.title, url: location.href, wixLikely: /wix|editorx|studio/i.test(location.href + ' ' + document.title), frames, hazards, symptoms, visibleButtonSample: buttons };
  })()`;
}
