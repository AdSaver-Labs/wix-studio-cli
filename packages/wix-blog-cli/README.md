# Wix Blog CLI

Public-safe baseline for repeatable Wix blog planning workflows.

This package currently exposes deterministic local planning commands only. It does **not** include private browser-session header extraction, client data, credentials, or live publish automation.

```bash
npm run check
npm run smoke
node bin/blogctl.mjs --help
```

Planned public roadmap:
- official Wix Blog API adapter
- draft-safe create/update commands
- preview/readback QA
- explicit approval gate for publish
