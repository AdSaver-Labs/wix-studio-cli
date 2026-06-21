# Client Blog System

Low-token, multi-client blog production system for Ad Saver Agency.

Purpose: reliably generate niche-specific client articles with minimal token waste, strong SEO structure, human-readable tone, approval gates, and future Notion/Wix/n8n integration.

## Architecture

Client Content Pack → Signal/Research Collector → Topic Planner → Draft Brief Generator → Humanized Article Prompt Pack → QA Gate → Approval Package → Publisher Adapter → Notion/Content DB Sync

## Core principles
- Reuse client packs instead of re-prompting full context.
- Use scripts/templates for structure, QA, status, file generation, ledgers, and checklists.
- Spend tokens only on judgment-heavy steps: topic synthesis, outline, article prose, revision, and nuanced QA.
- Approval-first by default. Publishing requires explicit approval per client/batch unless a client has a written auto-publish rule.
- Every article must be tracked in a ledger/Notion-compatible format.
- Voice-message ambiguity: if client/topic is unclear, ask before acting.

## Main commands
```bash
node bin/blogctl.mjs list-clients
node bin/blogctl.mjs plan-week --client topkvartiri --week 2026-W23
node bin/blogctl.mjs validate-pack --client topkvartiri
```

## Directories
- `clients/` — client content packs and article ledgers.
- `templates/` — reusable prompts, outlines, QA gates, article package templates.
- `schemas/` — JSON schema-ish field specs.
- `runs/` — generated weekly run packages.
- `n8n/` — n8n-ready wireframe/specs.
- `notion/` — Notion database mapping plan.
- `qa/` — validation rubrics and smoke checks.
