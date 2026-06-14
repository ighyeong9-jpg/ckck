# Phase 1S-E Step 8W — Apply-Gate Preflight Plan

> Date: 2026-06-15
> Step: 8W (documentation/preflight plan only — no DB action)
> Branch: develop
> HEAD: 53176d8 — docs: confirm new supabase target env readiness
> Author: Claude Code (local implementer)
> Reviewer chain: GPT (PM) → Codex (read-only reviewer) → Owner (final gate)

---

## 1. Current State

| Item | Value |
|------|-------|
| Step 8U | **PASS** — commit `74147f6` pushed to `origin/develop` |
| Step 8V | **PASS** — commit `53176d8` pushed to `origin/develop` |
| canonical-safe-baseline.sql | Exists at `supabase/canonical-safe-baseline.sql` |
| Codex SQL review | **PASS** before commit `4fd2fc9` (Step 8T-R3) |
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
| `53176d8` | docs: confirm new supabase target env readiness |

---

## 2. Step 8W Scope

This step is **documentation and preflight plan only**.

- No DB action
- No SQL execution
- No Supabase CLI usage
- No env value output or display
- No code modification
- No SQL modification
- No migration execution
- No deployment
- No approval to apply baseline

Step 8W defines the future apply-gate plan and stop conditions. It does not open the gate.

---

## 3. Required Owner Confirmations Before Any Later Apply Gate

| # | Confirmation Item | Required Evidence | Verification Method | Status |
|---|------------------|-------------------|---------------------|--------|
| 3.1 | New Supabase project exists | Project visible in dashboard | Dashboard → Projects list | PENDING_OWNER_CONFIRMATION |
| 3.2 | Project name is `check-in-stable-dev` | Name matches exactly | Dashboard → Project Settings | PENDING_OWNER_CONFIRMATION |
| 3.3 | Region is `ap-northeast-2` | Seoul region confirmed | Dashboard → Project Settings | PENDING_OWNER_CONFIRMATION |
| 3.4 | Target is not old paused/ref-mismatched project | Old project remains paused/deleted | Dashboard → confirm old project status | PENDING_OWNER_CONFIRMATION |
| 3.5 | Target has no production/customer data | Zero rows in all tables | Dashboard → Table Editor | PENDING_OWNER_CONFIRMATION |
| 3.6 | Owner/org/billing context confirmed | Correct organization and billing | Dashboard → Settings → Organization | PENDING_OWNER_CONFIRMATION |
| 3.7 | Local env privately updated for 3 Supabase keys only | Keys replaced by owner | Owner confirms privately | PENDING_OWNER_CONFIRMATION |
| 3.8 | `GEMINI_API_KEY` preserved | Key unchanged | Owner confirms privately | PENDING_OWNER_CONFIRMATION |
| 3.9 | `ANTHROPIC_API_KEY` preserved | Key unchanged | Owner confirms privately | PENDING_OWNER_CONFIRMATION |
| 3.10 | Toss/Kakao/App URL related values preserved | Keys unchanged | Owner confirms privately | PENDING_OWNER_CONFIRMATION |
| 3.11 | No env values pasted into chat | Zero env values in conversation | Chat history review | HOLD |
| 3.12 | No env files committed | `.env*` not in git history | `git log --all -- .env*` returns empty | HOLD |
| 3.13 | `.env.local.bak` remains private local-only and untracked | Not in git, not staged | `git status` shows no `.env*` files | HOLD |

---

## 4. Future Apply-Gate Safe Sequence Draft

**This sequence is NOT EXECUTED in Step 8W. It is a plan for a later explicitly owner-approved gate.**

| # | Step | Description | Status |
|---|------|-------------|--------|
| 4.1 | Owner opens explicit apply gate | Owner writes "apply" or equivalent explicit approval | NOT_EXECUTED_IN_8W |
| 4.2 | Reconfirm branch and latest commit | `git branch --show-current` = develop, `git log --oneline -1` | NOT_EXECUTED_IN_8W |
| 4.3 | Reconfirm staged/working tree safety | `git status --short` shows no unexpected staged files | NOT_EXECUTED_IN_8W |
| 4.4 | Reconfirm target project manually | Owner verifies project name/region/ref in dashboard | NOT_EXECUTED_IN_8W |
| 4.5 | Reconfirm env key names only | Verify 3 Supabase key names present, never print values | NOT_EXECUTED_IN_8W |
| 4.6 | Final read-only review of canonical-safe-baseline.sql | Read and verify SQL file content matches Codex-reviewed version | NOT_EXECUTED_IN_8W |
| 4.7 | Final Codex review of apply plan | Codex reviews the apply plan document | NOT_EXECUTED_IN_8W |
| 4.8 | Owner gives explicit approval | Owner confirms "apply now" after all preflight checks | NOT_EXECUTED_IN_8W |
| 4.9 | Apply baseline by controlled manual method only | Paste SQL into Supabase SQL Editor manually, not via CLI migration | NOT_EXECUTED_IN_8W |
| 4.10 | Immediately verify RLS/storage/public share assumptions | Dashboard verification of policies, storage rules, share access | NOT_EXECUTED_IN_8W |
| 4.11 | Record apply result in a separate closeout document | Create Step 8X or equivalent closeout with apply results | NOT_EXECUTED_IN_8W |

---

## 5. Hard Stop Conditions

If any of the following conditions are encountered, the apply gate must **BLOCK** immediately:

| # | Condition | Severity |
|---|----------|----------|
| 5.1 | Wrong Supabase project targeted | BLOCK |
| 5.2 | Unknown target project/ref | BLOCK |
| 5.3 | Old paused/ref-mismatched project selected | BLOCK |
| 5.4 | Any production/customer data exists in target | BLOCK |
| 5.5 | `.env` values exposed in chat or logs | BLOCK |
| 5.6 | `.env.local` or `.env.local.bak` staged or committed | BLOCK |
| 5.7 | Supabase CLI run without explicit later approval | BLOCK |
| 5.8 | SQL run without explicit later approval | BLOCK |
| 5.9 | Migration replay attempted | BLOCK |
| 5.10 | `canonical-safe-baseline.sql` modified during apply step | BLOCK |
| 5.11 | CLAUDE.md staged | BLOCK |
| 5.12 | App/source/package/migration files modified | BLOCK |
| 5.13 | `git add .` used | BLOCK |
| 5.14 | `git clean`, `git reset`, or `git rm` used | BLOCK |

---

## 6. Future Post-Apply Verification Checklist

**All items below are FUTURE_ONLY. None are executed in Step 8W.**

| # | Verification Item | Expected | Status |
|---|------------------|----------|--------|
| 6.1 | Tables exist | 57 tables created | NOT_EXECUTED_IN_8W |
| 6.2 | RLS enabled on protected tables | All 57 tables have `ENABLE ROW LEVEL SECURITY` | NOT_EXECUTED_IN_8W |
| 6.3 | No unrestricted anon base-table SELECT on public share tables | 7 protected tables: shares, projects, processes, quote_line_items, change_orders, diagnostic_responses, verification_certificates | NOT_EXECUTED_IN_8W |
| 6.4 | Shares public access only through API projection | No base-table anon SELECT; API route + service_role + allowlist only | NOT_EXECUTED_IN_8W |
| 6.5 | project-files storage not broadly readable by authenticated users | Scoped to project membership, not broad authenticated read | NOT_EXECUTED_IN_8W |
| 6.6 | Avatars public read and owner-folder write/update only | Public read, owner-scoped write | NOT_EXECUTED_IN_8W |
| 6.7 | warranty_tracking user_id auto-fill trigger exists | `trg_warranty_auto_user_id` → `auto_fill_warranty_user_id()` | NOT_EXECUTED_IN_8W |
| 6.8 | quote_line_items amount/total_price sync trigger exists | `trg_quote_line_items_amount_sync` → `sync_quote_line_item_amount()` | NOT_EXECUTED_IN_8W |
| 6.9 | proactive_notifications insert scoped to user_id = auth.uid() | INSERT WITH CHECK (user_id = auth.uid()) | NOT_EXECUTED_IN_8W |
| 6.10 | verification_certificates overall_score generated from total_score | `overall_score GENERATED ALWAYS AS (total_score) STORED` | NOT_EXECUTED_IN_8W |
| 6.11 | custom_checklist_items does not allow unrestricted USING(true)/WITH CHECK(true) | Project_members scoped RLS only | NOT_EXECUTED_IN_8W |
| 6.12 | No DISABLE RLS migration applied | Zero DISABLE RLS statements | NOT_EXECUTED_IN_8W |
| 6.13 | Admin anon fallback risk remains blocked | admin.ts uses service_role only, no anon fallback | NOT_EXECUTED_IN_8W |

---

## 7. Gate Result

| Gate | Decision |
|------|----------|
| Step 8W Document | **PASS candidate** (pending validation: this doc is the only staged file) |
| Future Apply Gate | **NOT OPENED** |
| DB Apply | **HOLD** |
| SQL Execution | **HOLD** |
| Supabase CLI | **HOLD** |
| Migration Replay | **BLOCKED** |
| Env Value Exposure | **BLOCKED** |
| Commit Scope | Step 8W markdown document only |

---

## Document Integrity

- This document is a preflight plan. It does not execute any action.
- The future apply-gate sequence (Section 4) is a draft plan, not an execution log.
- All owner confirmations remain PENDING_OWNER_CONFIRMATION until explicitly confirmed.
- All post-apply verifications are FUTURE_ONLY / NOT_EXECUTED_IN_8W.
- No secrets, env values, or project refs appear in this document.
