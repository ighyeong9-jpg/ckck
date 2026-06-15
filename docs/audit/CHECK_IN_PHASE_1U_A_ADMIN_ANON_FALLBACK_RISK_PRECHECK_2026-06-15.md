# Phase 1U-A — admin.ts Anon Fallback Risk Precheck

> Date: 2026-06-15
> Step: 1U-A (precheck — no code modification)
> Branch: develop
> HEAD: a45c93e — docs: close out supabase baseline and build recovery
> Author: Claude Code (local implementer)

---

## 1. Repo State

| Item | Value |
|------|-------|
| Branch | `develop` |
| HEAD | `a45c93e` |
| Dirty files | `M CLAUDE.md` (unstaged, excluded), `M tsconfig.tsbuildinfo` (unstaged, excluded) |
| Staged files before task | 0 |
| App code | unchanged (no modifications in this step) |

---

## 2. Supabase Client Architecture

Three separate Supabase client factories exist:

| Factory | File | Key Used | Context |
|---------|------|----------|---------|
| Browser client | `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side (browser), RLS-subject |
| Server client | `src/lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookies | Server-side with auth session, RLS-subject |
| Admin client | `src/lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` **with anon fallback** | Server-side, RLS-bypass intended |

---

## 3. admin.ts Risk Analysis

### 3.1 Code (line 23)

```typescript
const key = serviceRoleKey || anonKey
```

**Behavior**: If `SUPABASE_SERVICE_ROLE_KEY` is undefined/empty, `createAdminClient()` silently falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The resulting client would operate under anon/RLS constraints instead of service_role/RLS-bypass.

### 3.2 Failure Mode Classification

| Property | Value |
|----------|-------|
| Failure mode | **fail-weak** (degrades to anon instead of throwing) |
| Current status | SERVICE_ROLE_KEY is **PRESENT** — fallback is **NOT ACTIVE** |
| Reachability | Reachable if SERVICE_ROLE_KEY is removed, empty, or misconfigured |
| Client-side exposure | **NO** — admin.ts uses `process.env.SUPABASE_SERVICE_ROLE_KEY` (server-only, not `NEXT_PUBLIC_`) |
| Singleton cached | YES — `adminClient` is module-level singleton. Once created with wrong key, persists for process lifetime |

### 3.3 Risk if Fallback Activates

| Impact | Description |
|--------|-------------|
| RLS bypass lost | Admin operations would be subject to RLS policies instead of bypassing |
| Silent degradation | No error thrown, no log warning — caller has no indication of degraded access |
| Data access restriction | Queries may return empty results or subset of expected data |
| Mutation failure | Admin-intended writes may be silently blocked by RLS |
| Singleton persistence | Bad client cached for entire process — restart required to recover |

---

## 4. admin.ts Consumers

| File | Function | Usage | Mutation? |
|------|----------|-------|-----------|
| `src/lib/verification/certificateService.ts` | `issueCertificate()` | Reads/writes verification data | YES |
| `src/lib/verification/certificateService.ts` | `verifyCertificate()` | Reads verification data | NO (read) |
| `src/lib/verification/certificateService.ts` | (line 192) | Additional admin query | YES |
| `src/lib/verification/scoreEngine.ts` | `calculateScore()` (line 284) | Reads project data for scoring | NO (read) |

### 4.1 API Routes Using admin.ts Consumers

| API Route | Consumer | Auth Required |
|-----------|----------|---------------|
| `src/app/api/certificate/route.ts` | `issueCertificate` | YES (server route) |
| `src/app/api/verify/[code]/route.ts` | `verifyCertificate` | YES (server route) |

Both are server-only API routes. No client-side import of admin.ts found.

---

## 5. Other SERVICE_ROLE_KEY Usage (Direct, Not via admin.ts)

These files use `process.env.SUPABASE_SERVICE_ROLE_KEY` directly (not through admin.ts):

| File | Fallback Pattern | Failure Mode |
|------|-----------------|--------------|
| `src/app/api/ai/proactive/route.ts` | `if (!url \|\| !key)` → return 500 | **fail-closed** |
| `src/lib/ai/brain.ts` | `if (!url \|\| !key \|\| ...)` → return | **fail-closed** |
| `src/lib/ai/proactive-engine.ts` | `if (!url \|\| !key)` → early return | **fail-closed** |
| `src/lib/ai/quote-analyzer.ts` | `if (!url \|\| !key)` → throw / return null | **fail-closed** |
| `src/lib/ai/warranty-tracker.ts` | `if (!url \|\| !key)` → throw / return [] | **fail-closed** |
| `src/lib/knowledge/embedder.ts` | `if (!url \|\| !key)` → throw | **fail-closed** |
| `src/lib/knowledge/retriever.ts` | `if (!url \|\| !key)` → throw | **fail-closed** |

**All 7 direct-usage files are fail-closed.** Only `admin.ts` is fail-weak.

---

## 6. Public Share Path Assessment

### 6.1 Share API Routes

| Route | Client | Auth |
|-------|--------|------|
| `POST /api/share` | `createClient()` from `server.ts` (session-based, anon key + cookies) | Requires `user` auth |
| `POST /api/share/demo` | `createClient()` from `server.ts` | No auth required (demo) |
| `GET /api/share/demo` | Static JSON response | No DB access |

Share creation uses the **server client** (not admin client). Auth-gated for real shares.

### 6.2 Share Viewer Page

**Location**: `src/app/share/[shareId]/page.tsx`

| Property | Value |
|----------|-------|
| Directive | `'use client'` |
| Client | `createClient()` from `client.ts` (browser client, anon key) |
| Tables accessed | `shares`, `projects`, `processes`, `quote_line_items`, `change_orders`, `diagnostic_responses`, `verification_certificates` |
| Access pattern | Direct client-side queries via anon key |
| Demo mode | `shareId === 'demo123'` returns hardcoded mock data (no DB query) |

**Finding**: The share viewer page queries 7 tables directly from the browser using the anon key. This relies on RLS policies being configured to allow share-token-based access. This is a **separate concern** from the admin.ts fallback — it is an architectural pattern choice (client-side share viewing via RLS) rather than a security defect in admin.ts.

### 6.3 Share Path vs Admin Path Isolation

- Share creation: uses `server.ts` (anon + session) — **does NOT use admin.ts**
- Share viewing: uses `client.ts` (anon) — **does NOT use admin.ts**
- Admin consumers (certificate/verification): **do NOT touch share data**

The admin.ts anon fallback risk and the share path are **independent**.

---

## 7. Risk Classification

### 7.1 admin.ts Anon Fallback

**REVIEW**

Rationale:
- Anon fallback **exists** in code (line 23: `serviceRoleKey || anonKey`)
- Fallback is **NOT currently active** (SERVICE_ROLE_KEY is present)
- Failure mode is **fail-weak** (silent degradation, no error)
- All other SERVICE_ROLE_KEY consumers are **fail-closed**
- admin.ts is the **only inconsistent** pattern
- admin.ts is used by mutation paths (certificate issuance)
- No client-side exposure of SERVICE_ROLE_KEY

### 7.2 Share Page Client-Side Direct Query

**Noted but out of scope for 1U-A.** The share page client-side query pattern relies on RLS policies for access control. This is separate from admin.ts and should be evaluated in a future share-path-specific audit if needed.

---

## 8. Proposed Phase 1U-B Fix Scope

### 8.1 Allowed Fix File

| File | Change |
|------|--------|
| `src/lib/supabase/admin.ts` | Replace `serviceRoleKey \|\| anonKey` with `serviceRoleKey` only. Throw if `serviceRoleKey` is missing. Remove anon fallback. |

### 8.2 Proposed Safe Behavior

```
Before (current):
  const key = serviceRoleKey || anonKey  // fail-weak

After (proposed):
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured — admin client requires service role key')
  }
  const key = serviceRoleKey  // fail-closed
```

### 8.3 Forbidden Files (must not be modified in 1U-B)

- CLAUDE.md
- tsconfig.tsbuildinfo
- .env*
- supabase/*
- package.json / package-lock.json
- migrations
- DB scripts
- API routes (no change needed — they don't use admin.ts fallback)
- lib/ai/* (already fail-closed)
- lib/knowledge/* (already fail-closed)

---

## 9. Verification Plan for Phase 1U-B

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npm run check` | 0 errors |
| 2 | `npm run build` | Build success |
| 3 | `grep -n "anonKey\|ANON_KEY" src/lib/supabase/admin.ts` | 0 matches (anon fallback removed) |
| 4 | `grep -n "serviceRoleKey \|\|" src/lib/supabase/admin.ts` | 0 matches (OR fallback removed) |
| 5 | `git diff --check` | 0 whitespace errors |
| 6 | `git diff --name-only` | Only admin.ts + CLAUDE.md + tsconfig.tsbuildinfo |
| 7 | No env output | No values printed |
| 8 | No DB mutation | No SQL executed |
| 9 | No Supabase CLI | Not used |

---

## 10. Final Verdict

**REVIEW**

| Gate | Decision |
|------|----------|
| Anon fallback exists | **YES** — line 23 of admin.ts |
| Fallback currently active | **NO** — SERVICE_ROLE_KEY is present |
| Failure mode | **fail-weak** (silent degradation) |
| Service role client-side exposure | **NO** |
| Other SERVICE_ROLE_KEY users fail-closed | **YES** (all 7) |
| admin.ts used by mutation APIs | **YES** (certificate issuance) |
| Public share depends on admin.ts | **NO** (independent paths) |
| Blocking issues | None (key is present, fallback not active) |
| Non-blocking issues | fail-weak pattern should be converted to fail-closed |
| Recommended next step | Phase 1U-B: fix admin.ts to fail-closed (1 file change) |

---

## Document Integrity

- No code was modified in this step.
- No env values printed.
- No DB mutation.
- No Supabase CLI.
- No SQL executed.
- CLAUDE.md and tsconfig.tsbuildinfo remain unstaged/excluded.
