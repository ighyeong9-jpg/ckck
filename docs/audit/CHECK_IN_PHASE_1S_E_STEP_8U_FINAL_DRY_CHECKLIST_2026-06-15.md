# Phase 1S-E Step 8U — Final Dry Checklist Before New Supabase Baseline Apply

> Date: 2026-06-15
> Step: 8U (documentation/checklist only)
> Branch: develop
> HEAD: 4fd2fc9 — sql: correct canonical safe baseline
> Author: Claude Code (local implementer)
> Reviewer chain: GPT (PM) → Codex (read-only reviewer) → Owner (final gate)

---

## 1. Current State

| Item | Value |
|------|-------|
| Step 8T-R3 | **PASS** (Codex SQL diff re-review) |
| Commit | `4fd2fc9` pushed to `origin/develop` |
| canonical-safe-baseline.sql | Exists, reviewed PASS by Codex |
| SQL Applied | **NO** |
| DB Executed | **NO** |
| CLAUDE.md | Unrelated modified, excluded from all stages/commits |

### Commit chain (Step 8 series)

| Commit | Description |
|--------|-------------|
| `d90abda` | feat: write canonical safe SQL baseline for new Supabase DB |
| `2c26070` | docs: map schema code compatibility gaps |
| `0638c98` | docs: plan canonical baseline correction |
| `4fd2fc9` | sql: correct canonical safe baseline |

---

## 2. Step 8U Scope

This document is **documentation/checklist only**.

- No DB action
- No SQL execution
- No Supabase CLI usage
- No env value output or display
- No code modification
- No SQL modification
- No migration execution
- No deployment

---

## 3. New Supabase Target Verification Checklist

| # | Check Item | Expected | Verification Method | Status |
|---|-----------|----------|---------------------|--------|
| 3.1 | Project name | `check-in-stable-dev` | Supabase dashboard visual | PENDING |
| 3.2 | Region | `ap-northeast-2` (Seoul) | Supabase dashboard visual | PENDING |
| 3.3 | Project is newly created | Fresh project, no pre-existing tables | Dashboard → Table Editor empty | PENDING |
| 3.4 | Not reusing old paused/ref-mismatched project | Old project ref differs from new | Owner confirms old project is paused/deleted | PENDING |
| 3.5 | Target project ref verification | Correct ref string | Supabase dashboard only — never print ref/secrets in chat | PENDING |
| 3.6 | Billing/organization ownership | Owner's Supabase org | Dashboard → Settings → Organization | PENDING |
| 3.7 | No production/customer data present | Zero rows in all tables | Dashboard → Table Editor before baseline apply | PENDING |

---

## 4. Env Replacement Checklist

### Keys to replace (later, manually by owner)

| Key | Action |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Replace with new project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Replace with new project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Replace with new project service role key |

### Keys to NOT replace

| Key | Rule |
|-----|------|
| `GEMINI_API_KEY` | Do not touch |
| `ANTHROPIC_API_KEY` | Do not touch |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Do not touch |
| `NEXT_PUBLIC_KAKAO_APP_KEY` | Do not touch |
| `NEXT_PUBLIC_APP_URL` | Do not touch |
| `NEXT_PUBLIC_APP_NAME` | Do not touch |
| `PORT` | Do not touch |

### Env safety rules

- Never paste key values into chat or terminal output
- Never commit `.env.local` or `.env.local.bak`
- Never print env values into terminal logs
- Verify by key names/presence only, never by value output
- Owner performs replacement privately outside of Claude Code session

---

## 5. Baseline Application Preconditions (Later Gate)

DB application remains **HOLD** until ALL of the following are satisfied:

| # | Precondition | Status |
|---|-------------|--------|
| 5.1 | Owner confirms new Supabase project exists | PENDING |
| 5.2 | Owner confirms correct target project and region | PENDING |
| 5.3 | Owner confirms local env keys are updated privately | PENDING |
| 5.4 | Final Codex review of this dry checklist is PASS | PENDING |
| 5.5 | A separate explicit DB-apply gate is opened by owner | HOLD |
| 5.6 | Apply plan uses controlled SQL application only after final approval | HOLD |

---

## 6. Must-Not-Do List for Later Apply Gate

When the DB-apply gate is eventually opened, the following are **prohibited**:

| # | Prohibition | Reason |
|---|------------|--------|
| 6.1 | No direct migration replay | Baseline SQL is the single source; old migrations must not be replayed |
| 6.2 | No accidental old project target | Env must point to new project before any SQL execution |
| 6.3 | No public unrestricted SELECT on protected base tables | 7 tables protected: shares, projects, processes, quote_line_items, change_orders, diagnostic_responses, verification_certificates |
| 6.4 | No project-files broad authenticated read | Storage RLS must not allow cross-user file access |
| 6.5 | No custom_checklist_items USING(true)/WITH CHECK(true) | Canonical baseline uses project_members scoped RLS |
| 6.6 | No DISABLE RLS migration | All 57 tables must have RLS enabled |
| 6.7 | No admin.ts anon fallback path | Admin operations must use service_role only |
| 6.8 | No secret logging | No console.log/print of keys, tokens, or service role values |
| 6.9 | No anon public SELECT on shares | Shares access via API route + service_role + allowlist only |
| 6.10 | No WITH CHECK(true) on user data tables | INSERT/UPDATE policies must scope to auth.uid() or project_members |

---

## 7. Manual Owner Checklist Table

| # | Check Item | Expected Value / Rule | Verification Method | Status |
|---|-----------|----------------------|---------------------|--------|
| 7.1 | New Supabase project created | `check-in-stable-dev` in `ap-northeast-2` | Dashboard visual | PENDING |
| 7.2 | Old project paused/not reused | Old ref no longer active | Dashboard confirmation | PENDING |
| 7.3 | `.env.local` keys replaced | 3 Supabase keys only | Owner private replacement | PENDING |
| 7.4 | `.env.local.bak` backup exists | Backup before replacement | Owner creates backup | PENDING |
| 7.5 | Non-Supabase keys preserved | GEMINI, ANTHROPIC, TOSS, KAKAO, APP_URL, PORT unchanged | Key name comparison only | PENDING |
| 7.6 | canonical-safe-baseline.sql committed | `4fd2fc9` on `origin/develop` | `git log --oneline -1` | PASS |
| 7.7 | Codex SQL review | Step 8T-R3 PASS | Codex review record | PASS |
| 7.8 | No SQL applied to any DB | Zero tables in new project | Dashboard → Table Editor | PENDING |
| 7.9 | No secrets in git history | `.env*` in `.gitignore` | `git log --all -- .env*` returns empty | PENDING |
| 7.10 | DB-apply gate explicitly opened | Owner says "apply" | Chat/message record | HOLD |
| 7.11 | Post-apply RLS verification planned | 57 tables ENABLE, ~130 policies | Dashboard → Auth Policies | HOLD |
| 7.12 | Post-apply smoke test planned | Auth login → project CRUD → RLS block | Manual E2E | HOLD |

---

## 8. Final Gate Decision

| Gate | Decision |
|------|----------|
| Step 8U document creation | **PASS candidate** (pending validation) |
| DB Apply | **HOLD** |
| SQL execution | **HOLD** |
| Supabase CLI | **HOLD** |
| Env value exposure | **BLOCKED** |

### Next steps after Step 8U PASS

1. Owner creates new Supabase project (`check-in-stable-dev`, `ap-northeast-2`)
2. Owner replaces 3 env keys privately
3. Owner confirms readiness in chat
4. Separate DB-apply gate (Step 9) is opened with explicit approval
5. Controlled SQL application with post-apply verification

---

## Document Integrity

- This document is read-only checklist. It does not execute any action.
- All PENDING/HOLD items require owner action or explicit gate opening.
- PASS items are backed by committed repo state (`4fd2fc9`).
- No secrets, env values, or project refs appear in this document.
