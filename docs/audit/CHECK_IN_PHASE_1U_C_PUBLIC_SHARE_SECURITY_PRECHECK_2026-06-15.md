# Phase 1U-C — Public Share Security Precheck

> Date: 2026-06-15
> Step: 1U-C (precheck — no code modification)
> Branch: develop
> HEAD: 88c1012 — fix: fail closed supabase admin client
> Author: Claude Code (local implementer)

---

## 1. Repo State

| Item | Value |
|------|-------|
| Branch | `develop` |
| HEAD | `88c1012` |
| Dirty files | `M CLAUDE.md` (unstaged, excluded), `M tsconfig.tsbuildinfo` (unstaged, excluded) |
| Staged files before task | 0 |
| App code | unchanged (no modifications in this step) |

---

## 2. Public Share File Inventory

| File | Type | Client | Purpose |
|------|------|--------|---------|
| `src/app/share/[shareId]/page.tsx` | Client component (`'use client'`) | Browser anon (`client.ts`) | Share viewer page |
| `src/app/share/[shareId]/layout.tsx` | Server component | Server session (`server.ts`) | OG metadata generation |
| `src/app/api/share/route.ts` | API route (server) | Server session (`server.ts`) | Share link creation (auth-gated) |
| `src/app/api/share/demo/route.ts` | API route (server) | Server session (`server.ts`) | Demo share creation |
| `src/components/ui/KakaoShare.tsx` | Client component | N/A (Kakao SDK) | Kakao social sharing |

---

## 3. Share Viewer Page Analysis (`page.tsx`)

### 3.1 Client Type

**Browser anon client** — `createClient()` from `@/lib/supabase/client` which uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` via `createBrowserClient`.

No auth session. No service role. No cookies.

### 3.2 Tables Queried Directly from Browser

| # | Table | Query | Select Columns |
|---|-------|-------|----------------|
| 1 | `shares` | `.from('shares').select('*').eq('share_token', shareId).single()` | `*` (all columns) |
| 2 | `shares` | `.from('shares').update({ view_count: ... }).eq('id', shareLink.id)` | UPDATE (mutation) |
| 3 | `projects` | `.from('projects').select('*').eq('id', shareLink.project_id).single()` | `*` (all columns) |
| 4 | `processes` | `.from('processes').select('id, name, status, progress, start_date, end_date').eq('project_id', ...)` | Named columns |
| 5 | `quote_line_items` | `.from('quote_line_items').select('quantity, unit_price').eq('project_id', ...)` | Named columns |
| 6 | `change_orders` | `.from('change_orders').select('amount').eq('project_id', ...)` | Named columns |
| 7 | `diagnostic_responses` | `.from('diagnostic_responses').select('checked').eq('project_id', ...)` | Named columns |
| 8 | `verification_certificates` | `.from('verification_certificates').select('grade, overall_score').eq('project_id', ...)` | Named columns |

### 3.3 Critical Findings

| Finding | Severity |
|---------|----------|
| 7 of 7 protected base tables are queried directly from browser with anon key | **HIGH** |
| `shares` queried with `select('*')` — all columns exposed if accessible | **HIGH** |
| `projects` queried with `select('*')` — all columns exposed if accessible | **HIGH** |
| `shares` UPDATE mutation from browser (view_count increment) | **MEDIUM** |
| No API route intermediary — browser directly hits Supabase PostgREST | **HIGH** |

### 3.4 Demo Mode

When `shareId === 'demo123'`, the page returns hardcoded mock data without querying the database. This path has no security issue.

---

## 4. Share Layout Analysis (`layout.tsx`)

### 4.1 Client Type

**Server session client** — `createClient()` from `@/lib/supabase/server` which uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookies.

### 4.2 Tables Queried

| Table | Select Columns |
|-------|----------------|
| `shares` | `project_id` |
| `projects` | `name, industry, progress, status` |
| `verification_certificates` | `grade` |

### 4.3 Finding

The layout queries 3 protected tables via server-side with session client. If the visitor is unauthenticated (typical for public share links), `auth.uid()` is NULL and RLS policies requiring `auth.uid()` will block the query. OG metadata would show fallback values.

---

## 5. SQL Baseline vs Code Implementation Comparison

### 5.1 SQL Baseline Intent (canonical-safe-baseline.sql)

Lines 1938-1944 state:

```
-- SECURITY NOTE for 7 tables with NO anon public SELECT:
--   shares, projects, processes, quote_line_items, change_orders,
--   diagnostic_responses, verification_certificates.
-- Public share page does NOT query base tables directly.
-- /api/share/[shareId] API route uses service_role for internal queries.
-- API route validates share_token, is_active, expires_at.
-- API route returns allowlisted projection only.
```

Line 1656: `-- SECURITY NOTE: anon public SELECT on shares is PROHIBITED.`

### 5.2 Actual Implementation

| Target Architecture | Actual Implementation | Match? |
|--------------------|----------------------|--------|
| Public share page does NOT query base tables directly | Page.tsx queries 7 base tables directly from browser | **NO** |
| `/api/share/[shareId]` API route uses service_role | No such API route exists | **NO** |
| API route validates share_token, is_active, expires_at | Validation is in browser client code | **NO** |
| API route returns allowlisted projection only | No API projection — browser gets raw Supabase response | **NO** |
| anon public SELECT on shares is PROHIBITED | Browser attempts anon SELECT on shares | **NO** |

### 5.3 Architecture Gap Summary

The SQL baseline was designed assuming an API-projection architecture. The actual code implements a browser-direct-query architecture. These are fundamentally different security models.

---

## 6. RLS Protection Assessment

### 6.1 Current RLS Policies on 7 Protected Tables

All 7 tables require `auth.uid()` for SELECT access:

| Table | RLS SELECT Policy |
|-------|------------------|
| `shares` | Project owner (`user_id = auth.uid()`) or project member |
| `projects` | Project owner or project member |
| `processes` | Project member |
| `quote_line_items` | Project member |
| `change_orders` | Project member |
| `diagnostic_responses` | Project member |
| `verification_certificates` | Project member |

### 6.2 Effective Behavior for Unauthenticated Share Visitors

When an unauthenticated visitor opens `/share/[shareId]`:

1. Browser uses anon key (no auth session)
2. `auth.uid()` returns NULL
3. All RLS policies requiring `auth.uid()` block the queries
4. All queries return empty results or errors
5. Share page shows error state

**Conclusion**: RLS is currently **protecting** the data by blocking anon access. The share page is **functionally broken** for real (non-demo) share links when viewed by unauthenticated users.

### 6.3 Risk if RLS Were Weakened

If someone were to add anon SELECT policies to "fix" the share page, it would expose all 7 protected base tables to unauthenticated browser access — a severe security regression.

---

## 7. Risk Classification

**REVIEW**

| Risk | Classification |
|------|---------------|
| Data exposure to unauthenticated users | **NOT ACTIVE** — RLS blocks anon access |
| Architecture deviation from SQL baseline intent | **YES** — significant |
| Share feature functionally broken (non-demo) | **YES** — for unauthenticated visitors |
| Risk of future RLS weakening to "fix" share | **MEDIUM** — temptation exists |
| `select('*')` on shares and projects | **MEDIUM** — code-level over-fetch (blocked by RLS currently) |
| Browser UPDATE on shares (view_count) | **MEDIUM** — mutation from browser (blocked by RLS currently) |

### 7.1 Why REVIEW, Not HOLD

- RLS is currently protecting the data (no active exposure)
- The share feature is broken but no data leaks
- The risk is architectural (code ≠ intended design), not an active vulnerability
- Fix is needed before share feature can be used, but no urgency for data safety

---

## 8. Proposed Phase 1U-D Fix Scope

### 8.1 Target Architecture

Create a server-side API route that:
1. Validates share_token, is_active, expires_at
2. Uses service_role (admin client) to fetch data
3. Returns allowlisted projection only
4. Does not expose raw table data to browser

### 8.2 Proposed Files

| File | Action |
|------|--------|
| `src/app/api/share/[shareId]/route.ts` | **CREATE** — server API route with service_role, allowlisted projection |
| `src/app/share/[shareId]/page.tsx` | **MODIFY** — replace direct Supabase queries with `fetch('/api/share/[shareId]')` |
| `src/app/share/[shareId]/layout.tsx` | **MODIFY** — use same API or admin client for OG metadata |

### 8.3 Forbidden Files (must not be modified in 1U-D)

- CLAUDE.md
- tsconfig.tsbuildinfo
- .env*
- supabase/*
- package.json / package-lock.json
- migrations
- DB scripts
- RLS policies (do NOT add anon SELECT policies)
- src/lib/supabase/admin.ts (already fixed)
- src/lib/supabase/client.ts
- src/lib/supabase/server.ts

---

## 9. Verification Plan for Phase 1U-D

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npm run check` | 0 errors |
| 2 | `npm run build` | Build success |
| 3 | grep for `from('shares')` in share page | 0 matches (browser no longer queries shares) |
| 4 | grep for `from('projects')` in share page | 0 matches (browser no longer queries projects) |
| 5 | grep for `createClient` in share page | 0 matches (no direct Supabase from browser) |
| 6 | Confirm API route uses `createAdminClient` | Present in new route |
| 7 | Confirm API route validates share_token + expires_at | Present in new route |
| 8 | Confirm API route returns named columns only | No `select('*')` |
| 9 | `git diff --check` | 0 whitespace errors |
| 10 | No env output | No values printed |
| 11 | No DB mutation | No SQL executed |
| 12 | No Supabase CLI | Not used |
| 13 | No anon SELECT policy added | RLS unchanged |

---

## 10. Final Verdict

**REVIEW**

| Gate | Decision |
|------|----------|
| Browser anon direct queries exist | **YES** — 7 protected base tables queried from browser |
| Service-role API projection exists | **NO** — no `/api/share/[shareId]` route |
| Protected base-table exposure risk | **NOT ACTIVE** — RLS blocks, but code attempts access |
| Target architecture match | **NO** — significant deviation |
| Share feature functional for real links | **NO** — broken for unauthenticated visitors |
| Data leakage | **NO** — RLS is protecting |
| Blocking issues | None (no active data exposure) |
| Non-blocking issues | Architecture gap, broken share feature, over-fetch patterns |
| Recommended next step | Phase 1U-D: create API route projection + refactor share page |

---

## Document Integrity

- No code was modified in this step.
- No env values printed.
- No DB mutation.
- No Supabase CLI.
- No SQL executed.
- No RLS policies examined via live query (SQL baseline file only).
- CLAUDE.md and tsconfig.tsbuildinfo remain unstaged/excluded.
