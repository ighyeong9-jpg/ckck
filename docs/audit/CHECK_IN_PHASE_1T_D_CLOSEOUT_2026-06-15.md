# Phase 1T-D — Supabase Baseline Apply & App Build Recovery Closeout

> Date: 2026-06-15
> Step: 1T-D (closeout — no code modification)
> Branch: develop
> HEAD: e47acef — fix: resolve typecheck build blockers
> Author: Claude Code (local implementer)
> Reviewer chain: GPT (PM) → Codex (read-only reviewer) → Owner (final gate)

---

## 1. Executive Summary

Check-In new Supabase baseline is applied and verified. The canonical safe SQL baseline (`supabase/canonical-safe-baseline.sql`) was successfully applied to the `check-in-stable-dev` Supabase project via SQL Editor manual paste after two correction cycles (mojibake fix + HNSW dimension limit fix). Post-apply verification confirmed 57 tables with full RLS coverage, 0 protected base-table anon SELECT, 3 storage buckets, and all critical triggers active.

App typecheck/build blockers were fixed. Two pre-existing TypeScript errors (`RiskBadge.tsx` local interface mismatch + `PhotoGallery.tsx` stale field name) were resolved in commit `e47acef`. Both `npm run check` and `npm run build` now pass cleanly.

Current repo is ready for the next safe development phase, subject to remaining risk follow-ups (admin.ts anon fallback, deployment, live smoke).

---

## 2. Completed Milestones

| # | Step | Commit | Description | Verdict |
|---|------|--------|-------------|---------|
| 1 | 8U | `74147f6` | Final Dry Checklist for Supabase Baseline | PASS |
| 2 | 8V | `53176d8` | New Supabase Target/Env Owner Confirmation | PASS |
| 3 | 8W | `ec0cfe6` | Apply-Gate Preflight Plan | PASS |
| 4 | 8X | `c4041ba` | Actual Apply Gate Owner Approval | PASS |
| 5 | 8Y-R1 | `02d882c` | Fix Korean CHECK literals with ASCII (mojibake) | PASS |
| 6 | 8Y-R2 | `fff487d` | Skip unsupported HNSW index for 3072 embeddings | PASS |
| 7 | 8Z | `4788d20` | Post-Apply Verification Closeout | PASS |
| 8 | 1T-A | `97fa2bd` | App/Supabase Connection Smoke Precheck | REVIEW→PASS |
| 9 | 1T-B | `78e3446` | Typecheck/Build Failure Precheck (root cause analysis) | PASS |
| 10 | 1T-C | `e47acef` | Typecheck/Build Fix (RiskBadge + PhotoGallery) | PASS |

---

## 3. Supabase Final State

| Item | Value |
|------|-------|
| Target project | `check-in-stable-dev` |
| Region | `ap-northeast-2` (Seoul) |
| Corrected baseline commit | `fff487d` |
| Apply method | Supabase SQL Editor — manual paste |
| Public tables | **57** |
| RLS enabled | **57** |
| RLS disabled | **0** |
| Protected base-table anon SELECT | **0** |
| Storage buckets | **3** |
| `quote_line_items` amount sync trigger | **confirmed** (`trg_quote_line_items_amount_sync`) |
| Warranty auto user_id trigger | **confirmed** (`trg_warranty_auto_user_id`) |
| Warranty expires trigger | **confirmed** (`trg_warranty_expires`) |
| HNSW 3072 index | **absent by design** (pgvector rejects HNSW on >2000 dimensions) |
| Supabase CLI | **NOT USED** |
| Migration replay | **NOT USED** |
| Secrets exposed | **NO** |
| DB mutation after baseline apply | **NO** |

---

## 4. App Validation Final State

| Item | Value |
|------|-------|
| `npm run check` (tsc + eslint) | **PASS** — 0 errors |
| `npm run build` (next build) | **PASS** — Compiled successfully |
| Fixed file 1 | `src/components/ui/RiskBadge.tsx` — removed local `RiskFlag` interface, imported canonical from `@/lib/estimate/constants`, added `CRITICAL` severity |
| Fixed file 2 | `src/components/gallery/PhotoGallery.tsx` — replaced `photo.category` with `photo.stage` (lines 70-71) |
| DB mutation during 1T-C | **NO** |
| Env mutation during 1T-C | **NO** |
| Security mutation during 1T-C | **NO** |
| Fix commit | `e47acef` |

---

## 5. Remaining Risks / Follow-Ups

| # | Risk | Severity | Status | Action |
|---|------|----------|--------|--------|
| 5.1 | `admin.ts` anon fallback (`serviceRoleKey \|\| anonKey`) | Medium | SERVICE_ROLE_KEY present — fallback not active | Phase 1U-A precheck required |
| 5.2 | `tsconfig.tsbuildinfo` remains modified | None | Generated file, unstaged/excluded | No action needed |
| 5.3 | `CLAUDE.md` remains modified | None | Unrelated, unstaged/excluded | No action needed |
| 5.4 | Public share must remain API projection / service_role server-side only | Medium | No base-table anon SELECT on protected tables confirmed | Monitor during feature development |
| 5.5 | Semantic search performance index for 3072 embeddings | Low | HNSW skipped, IVFFlat or reduced-dimension proxy may be needed | Future design if vector search latency becomes an issue |
| 5.6 | No deployment yet | Medium | Build passes but not deployed | Deploy after admin.ts risk closed |
| 5.7 | No live customer data smoke yet | Medium | No test/smoke script exists | Manual smoke required after deployment |

---

## 6. Next Recommended Phase

### 6.1 Immediate: Security Risk Closure

- **Phase 1U-A**: `admin.ts` anon fallback risk precheck
  - Remove `serviceRoleKey || anonKey` fallback pattern
  - Throw on missing `SUPABASE_SERVICE_ROLE_KEY` instead of silently degrading to anon
  - Precheck → fix → verify → closeout

### 6.2 After Security Risk Closure

- Customer Capture MVP
- Check-In Estimate MVP
- Customer/Contractor dashboard foundation

---

## 7. Final Verdict

| Gate | Decision |
|------|----------|
| Phase 1S-E Supabase baseline apply | **PASS** |
| Phase 1T app build recovery | **PASS** |
| Deployment readiness | **HOLD** |
| Feature development readiness | **PASS_WITH_SECURITY_FOLLOWUP** |
| Next action | Phase 1U-A `admin.ts` anon fallback risk precheck |

---

## Document Integrity

- No code was modified in this step.
- No env values printed.
- No DB mutation.
- No Supabase CLI.
- No SQL executed.
- No secrets exposed.
- CLAUDE.md and tsconfig.tsbuildinfo remain unstaged/excluded.
