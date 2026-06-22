export const QA_TWO_STEP_GATES = [
  {
    id: 'editor-preview-inspection',
    label: 'Editor/preview inspection',
    requiredEvidence: [
      'selected Wix Studio editor URL/title',
      'before screenshot for existing-page mutations',
      'after editor or preview screenshot',
      'save-state evidence',
      'preview URL or preview-rendered page proof',
      'responsive-audit result for preview/editor-rendered surface'
    ]
  },
  {
    id: 'published-wix-domain-inspection',
    label: 'Published Wix-domain inspection',
    requiredEvidence: [
      'published Wix-domain URL, not only editor or preview URL',
      'browser-rendered screenshots as a real user sees the site',
      'responsive-audit result against the published Wix-domain URL',
      'public SEO/content sanity proof',
      'navigation/CTA/link click sanity proof',
      'console/runtime warning scan where available'
    ]
  }
];

export const RESPONSIVE_VIEWPORTS = [
  { name: 'desktop-27in', label: '27-inch / large desktop', width: 2560, height: 1440, mobile: false, category: 'large-desktop', required: true },
  { name: 'desktop-wide', label: '24-inch / full HD desktop', width: 1920, height: 1080, mobile: false, category: 'desktop', required: true },
  { name: 'desktop', label: 'standard desktop', width: 1440, height: 900, mobile: false, category: 'desktop', required: true },
  { name: 'desktop-laptop', label: 'small laptop', width: 1366, height: 768, mobile: false, category: 'desktop', required: true },
  { name: 'breakpoint-1280', label: 'desktop minimum breakpoint edge', width: 1280, height: 900, mobile: false, category: 'breakpoint-edge', required: true },
  { name: 'breakpoint-1279', label: 'pre-desktop breakpoint edge', width: 1279, height: 900, mobile: false, category: 'breakpoint-edge', required: true },
  { name: 'tablet-landscape', label: 'tablet landscape / small desktop edge', width: 1024, height: 768, mobile: true, category: 'tablet', required: true },
  { name: 'breakpoint-1024', label: 'tablet landscape breakpoint edge', width: 1024, height: 768, mobile: true, category: 'breakpoint-edge', required: true },
  { name: 'breakpoint-1023', label: 'pre-tablet-landscape breakpoint edge', width: 1023, height: 900, mobile: true, category: 'breakpoint-edge', required: true },
  { name: 'tablet', label: 'tablet portrait', width: 768, height: 1024, mobile: true, category: 'tablet', required: true },
  { name: 'breakpoint-768', label: 'tablet portrait breakpoint edge', width: 768, height: 1024, mobile: true, category: 'breakpoint-edge', required: true },
  { name: 'breakpoint-767', label: 'pre-tablet breakpoint edge', width: 767, height: 1024, mobile: true, category: 'breakpoint-edge', required: true },
  { name: 'breakpoint-480', label: 'large phone breakpoint edge', width: 480, height: 900, mobile: true, category: 'breakpoint-edge', phonePrimary: true, required: true },
  { name: 'phone-large', label: 'large phone', width: 430, height: 932, mobile: true, category: 'phone', phonePrimary: true, required: true },
  { name: 'phone', label: 'standard phone', width: 390, height: 844, mobile: true, category: 'phone', phonePrimary: true, required: true },
  { name: 'phone-iphone12', label: 'iPhone 12/13 mini-class phone', width: 375, height: 812, mobile: true, category: 'phone', phonePrimary: true, required: true },
  { name: 'phone-small', label: 'small phone', width: 360, height: 800, mobile: true, category: 'phone', phonePrimary: true, required: true },
  { name: 'breakpoint-320', label: 'minimum phone edge', width: 320, height: 800, mobile: true, category: 'breakpoint-edge', phonePrimary: true, required: true }
];

export function viewportNames() {
  return RESPONSIVE_VIEWPORTS.map((viewport) => `${viewport.name}:${viewport.width}x${viewport.height}`);
}

export function viewportMatrixSummary() {
  return {
    policy: 'Expanded matrix required: large desktop/27-inch, desktop, laptop, tablet, phones, and breakpoint edges. Phone remains primary pass/fail; large desktop and breakpoint edges are blocking for professional completion when layout breaks.',
    viewports: RESPONSIVE_VIEWPORTS.map(({ name, label, width, height, category, phonePrimary, required }) => ({ name, label, width, height, category, phonePrimary: !!phonePrimary, required: !!required }))
  };
}

export function selectResponsiveViewports(requested = null) {
  if (!requested || requested === 'expanded' || requested === 'all') return RESPONSIVE_VIEWPORTS;
  if (requested === 'core') return RESPONSIVE_VIEWPORTS.filter((v) => ['desktop', 'tablet', 'phone', 'phone-small', 'breakpoint-320'].includes(v.name));
  const names = String(requested).split(',').map((x) => x.trim()).filter(Boolean);
  return names.map((name) => RESPONSIVE_VIEWPORTS.find((v) => v.name === name)).filter(Boolean);
}

export function twoStepQaContract() {
  return {
    status: 'REQUIRED',
    gates: QA_TWO_STEP_GATES,
    completionRule: 'A Wix website/change cannot be called done until both editor/preview inspection and published Wix-domain inspection pass, or a named gate is explicitly BLOCKED with the missing proof.'
  };
}

export function qaProofRequirements() {
  return [
    'typed spec and routed plan',
    'editor-preview-inspection PASS',
    'published-wix-domain-inspection PASS',
    'responsive-audit PASS with expanded viewport matrix',
    'phone-primary checks PASS',
    'large desktop / 27-inch checks PASS',
    'breakpoint-edge checks PASS',
    'content/placeholder scan PASS',
    'SEO/content sanity proof PASS where page-level change applies',
    'rollback note or restore path captured'
  ];
}
