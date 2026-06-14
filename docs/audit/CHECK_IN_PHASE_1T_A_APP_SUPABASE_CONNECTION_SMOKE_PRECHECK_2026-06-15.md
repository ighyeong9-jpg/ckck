# Phase 1T-A — App ↔ New Supabase Connection Smoke Precheck

> Date: 2026-06-15
> Step: 1T-A (smoke precheck — no DB mutation)
> Branch: develop
> HEAD: 4788d20 — docs: close out supabase baseline apply verification
> Author: Claude Code (local implementer)

---

## 1. Target Baseline Status

| Item | Value |
|------|-------|
| Baseline commit applied | `fff487d` |
| Closeout commit | `4788d20` |
| Supabase project | `check-in-stable-dev` |
| Region | `ap-northeast-2` |
| DB baseline apply | **SUCCESS** |
| Post-apply verification | **PASS** |
| Public tables | 57 |
| RLS enabled | 57 |
| RLS disabled | 0 |
| Protected base-table anon SELECT | 0 |
| Storage buckets | 3 |

---

## 2. Local Repo State

| Item | Value |
|------|-------|
| Branch | `develop` |
| HEAD | `4788d20` |
| Dirty files | `M CLAUDE.md` (unstaged, excluded), `M tsconfig.tsbuildinfo` (unstaged, excluded) |
| tsconfig.tsbuildinfo note | Modified during `npm run check`/`build` validation. Generated/non-scope output. NOT staged. NOT committed. |
| SQL file | unchanged |
| App code | unchanged |

---

## 3. Package Scripts

| Script | Command | Available |
|--------|---------|-----------|
| `dev` | `next dev` | YES |
| `build` | `next build` | YES |
| `start` | `next start` | YES |
| `check` | `tsc --noEmit && eslint src --max-warnings=0` | YES |
| `lint` | — | MISSING (merged into `check`) |
| `typecheck` | — | MISSING (merged into `check`) |
| `test` | — | MISSING |
| `smoke` | — | MISSING |

---

## 4. Env Key Presence (Names Only)

| Key | Status |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | **PRESENT** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **PRESENT** |
| `SUPABASE_SERVICE_ROLE_KEY` | **PRESENT** |
| `GEMINI_API_KEY` | **PRESENT** |
| `ANTHROPIC_API_KEY` | **PRESENT** |

No values printed. No URL host printed. No project ref printed.

---

## 5. Supabase Code-Path Findings

### 5.1 Supabase client usage

- **108 files** reference `supabase` or `createClient` across `src/`
- Supabase client library used throughout dashboard pages, API routes, AI modules, engines

### 5.2 SERVICE_ROLE_KEY usage (server-side only)

| File | Context |
|------|---------|
| `src/app/api/ai/proactive/route.ts` | Server route |
| `src/lib/ai/brain.ts` | Server AI module |
| `src/lib/ai/proactive-engine.ts` | Server engine |
| `src/lib/ai/quote-analyzer.ts` | Server analyzer |
| `src/lib/ai/warranty-tracker.ts` | Server tracker |
| `src/lib/knowledge/embedder.ts` | Server knowledge |
| `src/lib/knowledge/retriever.ts` | Server knowledge |
| `src/lib/supabase/admin.ts` | Admin client factory |

All SERVICE_ROLE_KEY usage is in server-side files (`lib/`, `api/`). No client-side exposure found.

### 5.3 admin.ts anon fallback

**RISK FOUND**: `src/lib/supabase/admin.ts:23`

```
const key = serviceRoleKey || anonKey
```

If `SUPABASE_SERVICE_ROLE_KEY` is missing, `createAdminClient()` falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This means admin operations would run under anon/RLS instead of service_role, potentially failing silently or returning restricted results.

**Current status**: SERVICE_ROLE_KEY is PRESENT, so fallback is not active. However, this is a latent risk if the key is ever removed or misconfigured.

**Recommendation**: Future code fix to remove anon fallback and throw on missing SERVICE_ROLE_KEY. Not modified in this precheck step.

### 5.4 Share/storage paths

| Path | Files |
|------|-------|
| `/api/share/` | `route.ts`, `demo/route.ts` |
| Share pages | `src/app/share/[shareId]/layout.tsx`, `page.tsx` |
| Storage/gallery | Multiple project gallery/evidence pages |
| KakaoShare | `src/components/ui/KakaoShare.tsx` |

Share access appears to use API routes (`/api/share/`), consistent with the API projection pattern (not base-table anon SELECT).

---

## 6. Safe Script Results

| Script | Result |
|--------|--------|
| `npm run check` (tsc + eslint) | **FAIL** — 2 pre-existing type errors (not DB/env related) |
| `npm run build` | **FAIL** — same type errors block build |
| `npm test` | **SKIPPED_MISSING_SCRIPT** |
| `npm run lint` | **SKIPPED_MISSING_SCRIPT** (merged into `check`) |

### Type errors (pre-existing, not caused by DB migration):

1. `src/components/estimate/EstimateResult.tsx:128` — `RiskFlagType` mismatch: `DUMPING_PRICE` not in union type
2. `src/components/gallery/PhotoGallery.tsx:70-71` — `category` property missing on `GalleryPhoto` type

These are app-level type issues unrelated to Supabase connection or baseline apply.

---

## 7. Risks Found

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 7.1 | `admin.ts` anon fallback when SERVICE_ROLE_KEY missing | Medium | SERVICE_ROLE_KEY PRESENT — not active. Future code fix recommended. |
| 7.2 | `npm run build` fails due to pre-existing type errors | Low | Not DB/env related. Must be fixed before deployment. |
| 7.3 | No `test` or `smoke` script exists | Low | Manual smoke testing required after env confirmation. |

---

## 8. HOLD/BLOCK Items

- No secrets printed
- No DB mutation
- No Supabase CLI used
- No SQL executed
- No app code modified
- No SQL modified
- No CLAUDE.md staged
- No `git add .` used
- No destructive git commands

---

## 9. Final Verdict

**REVIEW**

Rationale:
- All 5 required env key names: **PRESENT**
- No client-side service role exposure: **PASS**
- No base-table anon SELECT on protected tables: **PASS** (verified in 8Z)
- Share access uses API projection: **PASS**
- admin.ts anon fallback: **RISK but not active** (SERVICE_ROLE_KEY present)
- Build/check: **FAIL** due to pre-existing type errors (not DB/env related)
- Test script: **MISSING**

REVIEW because build fails on pre-existing type issues that must be resolved before deployment, but these are unrelated to the Supabase baseline connection.

---

## Document Integrity

- No env values printed in this document or during checks.
- No DB mutation performed.
- No Supabase CLI used.
- No SQL executed.
- No app code modified.
- CLAUDE.md excluded.
