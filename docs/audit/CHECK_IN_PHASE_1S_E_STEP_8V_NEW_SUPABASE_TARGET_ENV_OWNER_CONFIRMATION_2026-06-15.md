# Phase 1S-E Step 8V — New Supabase Target & Env Owner Confirmation

> Date: 2026-06-15
> Step: 8V (owner/manual confirmation + documentation only)
> Branch: develop
> HEAD: 74147f6 — docs: add final dry checklist for supabase baseline
> Author: Claude Code (local implementer)
> Reviewer chain: GPT (PM) → Codex (read-only reviewer) → Owner (final gate)

---

## 1. Current State

| Item | Value |
|------|-------|
| Step 8U | **PASS** — dry checklist committed and reviewed |
| Commit | `74147f6` pushed to `origin/develop` |
| canonical-safe-baseline.sql | Exists in repo, Codex SQL review PASS (Step 8T-R3) |
| SQL Applied | **NO** |
| DB Executed | **NO** |
| Supabase CLI | **NO** |
| Env values exposed | **NO** |
| CLAUDE.md | Unrelated modified, excluded from all stages/commits |

### Commit chain (Step 8 series)

| Commit | Description |
|--------|-------------|
| `d90abda` | feat: write canonical safe SQL baseline for new Supabase DB |
| `2c26070` | docs: map schema code compatibility gaps |
| `0638c98` | docs: plan canonical baseline correction |
| `4fd2fc9` | sql: correct canonical safe baseline |
| `74147f6` | docs: add final dry checklist for supabase baseline |

---

## 2. Step 8V Scope

This step is **owner/manual confirmation and documentation only**.

- No DB action
- No SQL execution
- No Supabase CLI usage
- No env value output or display
- No code modification
- No SQL modification
- No migration execution
- No deployment
- No secret exposure

---

## 3. New Supabase Target — Owner Confirmation Checklist

| # | Check Item | Expected Value / Rule | Owner Verification Method | Status |
|---|-----------|----------------------|--------------------------|--------|
| 3.1 | New project exists | Project visible in Supabase dashboard | Dashboard → Projects list | PENDING_OWNER_CONFIRMATION |
| 3.2 | Project name | `check-in-stable-dev` | Dashboard → Project Settings → General | PENDING_OWNER_CONFIRMATION |
| 3.3 | Region | `ap-northeast-2` (Seoul) | Dashboard → Project Settings → General | PENDING_OWNER_CONFIRMATION |
| 3.4 | Project is clean baseline target | Newly created or intentionally selected as clean dev baseline | Owner judgment + Dashboard → Table Editor empty | PENDING_OWNER_CONFIRMATION |
| 3.5 | Old paused/ref-mismatched project not reused | Old project remains paused/deleted, not recycled | Dashboard → confirm old project status | PENDING_OWNER_CONFIRMATION |
| 3.6 | Owner/org/billing context confirmed | Correct Supabase organization and billing | Dashboard → Settings → Organization | PENDING_OWNER_CONFIRMATION |
| 3.7 | No production/customer data in target | Zero rows in all tables before baseline apply | Dashboard → Table Editor → verify empty | PENDING_OWNER_CONFIRMATION |
| 3.8 | Project ref confirmed by owner | Correct ref string verified privately | Dashboard only — never paste ref into chat | PENDING_OWNER_CONFIRMATION |
| 3.9 | SQL Editor not used for baseline apply yet | No manual SQL executed in new project | Dashboard → SQL Editor → History empty | PENDING_OWNER_CONFIRMATION |
| 3.10 | Migrations not replayed | No Supabase migration history in new project | Dashboard → Database → Migrations empty | PENDING_OWNER_CONFIRMATION |
| 3.11 | Supabase CLI not run against new project | CLI has not been linked or executed | Owner confirms no `supabase link` or `supabase db push` performed | PENDING_OWNER_CONFIRMATION |

---

## 4. Env — Owner Confirmation Checklist

### 4.1 Replacement Target Keys

| Env Key | Action | Rule | Status |
|---------|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Replace with new project URL | Owner replaces privately, never paste value into chat | PENDING_OWNER_CONFIRMATION |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Replace with new project anon key | Owner replaces privately, never paste value into chat | PENDING_OWNER_CONFIRMATION |
| `SUPABASE_SERVICE_ROLE_KEY` | Replace with new project service role key | Owner replaces privately, never paste value into chat | PENDING_OWNER_CONFIRMATION |

### 4.2 Preserve / No-Touch Keys

| Env Key | Action | Rule | Status |
|---------|--------|------|--------|
| `GEMINI_API_KEY` | Do not touch | Must remain unchanged | HOLD |
| `ANTHROPIC_API_KEY` | Do not touch | Must remain unchanged | HOLD |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Do not touch | Must remain unchanged | HOLD |
| `NEXT_PUBLIC_KAKAO_APP_KEY` | Do not touch | Must remain unchanged | HOLD |
| `NEXT_PUBLIC_APP_URL` | Do not touch | Must remain unchanged | HOLD |
| `NEXT_PUBLIC_APP_NAME` | Do not touch | Must remain unchanged | HOLD |
| `PORT` | Do not touch | Must remain unchanged | HOLD |

### 4.3 Env Safety Rules

- Never paste key values into chat or terminal output
- Never commit `.env.local` or `.env.local.bak` to git
- Never print env values into terminal logs
- Verify by key names/presence only, never by value output
- `.env.local.bak`, if created, must remain private local-only and untracked
- This document does not contain any actual env values

---

## 5. Gate Result

| Gate | Decision |
|------|----------|
| Step 8V Document | **PASS candidate** (pending validation: this doc is the only staged file) |
| Owner target confirmation | **PENDING_OWNER_CONFIRMATION** |
| Owner env confirmation | **PENDING_OWNER_CONFIRMATION** |
| DB Apply | **HOLD** |
| SQL Execution | **HOLD** |
| Supabase CLI | **HOLD** |
| Migration Replay | **BLOCKED** |
| Env Value Exposure | **BLOCKED** |

---

## 6. Later Gate Preview

The next possible step after Step 8V is:

**Phase 1S-E Step 8W — Apply Gate Preflight Plan**

Step 8W must still **not** apply DB unless separately approved. Actual DB application requires a separate explicit owner approval gate. Step 8W is a preflight plan document, not an execution step.

---

## Document Integrity

- This document records required owner confirmations. It does not execute any action.
- All PENDING_OWNER_CONFIRMATION items require the owner to verify and confirm in writing.
- HOLD items are preserved keys that must not be modified.
- BLOCKED items are actions that are prohibited at this stage and require separate explicit gates.
- No secrets, env values, or project refs appear in this document.
