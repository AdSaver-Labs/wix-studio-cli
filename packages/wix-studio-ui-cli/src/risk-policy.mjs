export const BLOCKED_INTENTS = [
  { pattern: /\bpublish\b/i, reason: 'Publishing live site changes requires explicit operator approval.' },
  { pattern: /\bdelete\b|\bremove\b|\bdestroy\b|\btruncate\b/i, reason: 'Destructive Wix actions require explicit operator approval.' },
  { pattern: /\bdomain\b|\bdns\b|\btransfer\b/i, reason: 'Domain/DNS changes require explicit operator approval and rollback plan.' },
  { pattern: /\bpayment\b|\bcheckout\b|\border\b|\bbooking\b/i, reason: 'Payment/checkout/order/booking mutations require explicit approval and test/sandbox evidence.' },
  { pattern: /\bseo\b|\bcanonical\b|\bindex\b|\bnoindex\b|\bredirect\b/i, reason: 'SEO/indexing mutations require explicit approval and before/after proof.' }
];

export function classifyAction(command, options = {}) {
  const haystack = [command, options.label, options.text, options.intent, options.mode, options.selector]
    .filter(Boolean)
    .join(' ');
  const hits = BLOCKED_INTENTS.filter((rule) => rule.pattern.test(haystack));
  return {
    risk: hits.length ? 'approval_required' : command === 'inspect' || command === 'snapshot' || command === 'element-map' || command === 'save-state-detect' || command === 'verification' ? 'read_only' : 'reversible_ui_candidate',
    approvalRequired: hits.length > 0,
    reasons: hits.map((hit) => hit.reason)
  };
}

export function assertAllowed({ command, options, execute }) {
  const classification = classifyAction(command, options);
  if (!execute) {
    return { allowed: true, dryRun: true, classification };
  }
  if (classification.approvalRequired && !options.approvalToken) {
    const err = new Error(`Approval required: ${classification.reasons.join(' ')}`);
    err.code = 'APPROVAL_REQUIRED';
    err.classification = classification;
    throw err;
  }
  return { allowed: true, dryRun: false, classification };
}
