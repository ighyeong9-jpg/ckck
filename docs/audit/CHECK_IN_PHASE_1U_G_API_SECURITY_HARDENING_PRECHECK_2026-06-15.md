# Phase 1U-G API Security Hardening Precheck

> Date: 2026-06-15
> Branch: develop
> HEAD: f198995
> Author: Claude Code (Opus 4.6)
> Scope: Read-only investigation. No code changes, no SQL, no DB mutation, no deployment.

---

## 1. Repo State

| Item | Value |
|------|-------|
| Branch | develop |
| HEAD | f198995 |
| Staged files before task | 0 |
| Dirty files | CLAUDE.md (unstaged), tsconfig.tsbuildinfo (unstaged) |
| CLAUDE.md excluded | YES |
| tsconfig.tsbuildinfo excluded | YES |
| npm run build | PASS |
| npm run check (post-build) | PASS — initial check failed before build due to missing .next/types; re-run after build succeeded |
| git diff --check | Clean |

---

## 2. API Route Inventory (33 total)

### 2A. Authenticated Routes (17)

| # | Route | Methods | Auth | Ownership | Writes DB | Raw err.message | select(*) | IDOR Risk |
|---|-------|---------|------|-----------|-----------|-----------------|-----------|-----------|
| 1 | /api/agent | POST | YES | NO | NO (indirect) | NO | NO | YES |
| 2 | /api/agent/stream | POST | YES | NO | NO | NO | NO | YES |
| 3 | /api/ai/alerts | GET | YES | NO | NO | NO | NO | YES |
| 4 | /api/ai/budget-guide | POST | YES | N/A | YES (quote_analyses) | NO | NO | NO |
| 5 | /api/ai/chat | POST | YES | NO | NO | NO | NO | YES |
| 6 | /api/ai/classify-issue | POST | YES | PARTIAL | YES (site_issues) | NO | NO | YES |
| 7 | /api/ai/notebook | POST | YES | NO | NO (indirect) | NO | NO | YES |
| 8 | /api/ai/predict | POST | YES | **YES** | NO | NO | NO | NO |
| 9 | /api/ai/proactive | GET/POST | YES/CRON | N/A | YES (notifications) | NO | NO | NO |
| 10 | /api/ai/quote-analyze | POST | YES | **YES** | NO | NO | NO | NO |
| 11 | /api/ai/report | POST | YES | **YES** | NO | NO | NO | NO |
| 12 | /api/certificate | POST | YES | DELEGATED | YES (certificates) | YES (result.error) | NO | PARTIAL |
| 13 | /api/dashboard/summary | GET | YES | **YES** | NO | **YES** | NO | NO |
| 14 | /api/estimate/validate | POST | YES | NO | YES (estimate_validations) | **YES** | YES (.select()) | YES |
| 15 | /api/events/emit | POST | YES | **YES** | NO (indirect) | NO | NO | NO |
| 16 | /api/photos/auto-process | POST | YES | **YES** | YES (check results) | YES (per-item) | NO | NO |
| 17 | /api/share | POST | YES | NO | YES (shares) | NO | YES (.select()) | YES |

### 2B. Unauthenticated Routes (13)

| # | Route | Methods | Writes DB | Raw err.message | select(*) | Tables Affected |
|---|-------|---------|-----------|-----------------|-----------|-----------------|
| 18 | /api/ai/check | POST | NO | NO | NO | — |
| 19 | /api/photos/[id]/verify | GET | NO | **YES** | NO | — |
| 20 | /api/projects/[id]/diagnostic/check | POST | **YES** | **YES** | NO | diagnostic_responses, projects, risk_scores |
| 21 | /api/projects/[id]/evidence/merkle | POST | **YES** | **YES** | NO | evidence_files |
| 22 | /api/projects/[id]/evidence/verify | GET | NO | **YES** | NO | — |
| 23 | /api/projects/[id]/go-nogo | GET | NO | **YES** | NO | — |
| 24 | /api/projects/[id]/law-check | POST | **YES** | **YES** | YES (count HEAD) | law_checks, risk_scores, projects |
| 25 | /api/projects/[id]/law-checks | GET | NO | **YES** | NO | — |
| 26 | /api/projects/[id]/photos | POST | **YES** | **YES** | NO | evidence_files, Storage, risk_scores, projects |
| 27 | /api/projects/[id]/risk/calculate | POST | **YES** | **YES** | NO | risk_scores, projects |
| 28 | /api/projects/[id]/risk/history | GET | NO | **YES** | NO | — |
| 29 | /api/projects/[id]/risk | GET | NO | **YES** | YES | — |
| 30 | /api/share/demo | POST/GET | **YES** (POST) | **YES** | YES | projects, quote_line_items, processes, diagnostic_responses, shares |

### 2C. Intentionally Public Routes (3)

| # | Route | Methods | Writes DB | Status |
|---|-------|---------|-----------|--------|
| 31 | /api/share/[shareId] | GET | YES (view_count) | Secured (token + expiry + is_active) |
| 32 | /api/verify/[code] | GET | NO | Secured (code lookup, generic errors) |
| 33 | /auth/callback | GET | NO (session only) | Acceptable (OAuth PKCE) |

---

## 3. Unauthenticated Route Risk Classification

### 3A. Unauthenticated DB-Write Routes — P0 (5)

| # | File | Method | Write Operations | Tables | Intended Public? | Required Fix | Severity |
|---|------|--------|-----------------|--------|-------------------|-------------|----------|
| 1 | projects/[id]/diagnostic/check/route.ts | POST | UPSERT, UPDATE, INSERT | diagnostic_responses, projects, risk_scores | NO — accidental | Require auth + ownership | P0 |
| 2 | projects/[id]/evidence/merkle/route.ts | POST | UPDATE | evidence_files | NO — accidental | Require auth + ownership | P0 |
| 3 | projects/[id]/law-check/route.ts | POST | INSERT, INSERT, UPDATE | law_checks, risk_scores, projects | NO — accidental | Require auth + ownership | P0 |
| 4 | projects/[id]/photos/route.ts | POST | Storage upload, INSERT, INSERT, UPDATE | evidence_files, risk_scores, projects, Storage | NO — accidental | Require auth + ownership | P0 |
| 5 | projects/[id]/risk/calculate/route.ts | POST | INSERT, UPDATE | risk_scores, projects | NO — accidental | Require auth + ownership | P0 |

### 3B. Other Unauthenticated Risks — P1 (2)

| # | File | Method | Risk | Required Fix | Severity |
|---|------|--------|------|-------------|----------|
| 6 | share/demo/route.ts | POST | Dev-only DB-write (INSERT x5 to projects, quote_line_items, processes, diagnostic_responses, shares) | Remove or gate behind auth + feature flag | P1 |
| 7 | ai/check/route.ts | POST | AI quota consumption without auth (no DB write) | Require auth | P1 |

**Fix pattern for #1-5**: Add `createClient()` from server.ts, call `supabase.auth.getUser()`, verify user, then add `.eq('user_id', user.id)` ownership check on the project before proceeding.

**Fix pattern for #6**: Remove endpoint or require auth + env feature flag.

**Fix pattern for #7**: Add auth check to prevent unauthenticated AI API consumption.

---

## 4. IDOR Risk Inventory (8 routes)

| # | Route | Parameter | Table Accessed | Current Check | Missing Check | Exploit Scenario | Fix Pattern |
|---|-------|-----------|----------------|---------------|---------------|------------------|-------------|
| 1 | POST /api/agent | body.projectId | projects (via loadProjectContext) | None | .eq('user_id', user.id) | User A reads User B's full project context in AI prompt | Verify ownership before loadProjectContext |
| 2 | POST /api/agent/stream | body.projectId | — (string in prompt) | None | .eq('user_id', user.id) | User A injects any project ID into AI system prompt | Verify ownership before prompt construction |
| 3 | GET /api/ai/alerts | query.projectId | projects (via collectAlertContext) | None | .eq('user_id', user.id) | User A reads User B's project alert data | Verify ownership before collectAlertContext |
| 4 | POST /api/ai/chat | body.projectId | projects (via loadProjectContext) | None | .eq('user_id', user.id) | Same as /api/agent | Verify ownership before loadProjectContext |
| 5 | POST /api/ai/classify-issue | body.projectId | projects (name lookup) | None | .eq('user_id', user.id) | User A leaks project name of User B | Add ownership filter to project query |
| 6 | POST /api/ai/notebook | body.projectId | — (passed to analyzeDocument) | None | .eq('user_id', user.id) | User A passes any project ID to AI analysis | Verify ownership before analyzeDocument |
| 7 | POST /api/estimate/validate | body.projectId | estimate_validations | None | .eq('user_id', user.id) | User A writes validation record under User B's project | Verify ownership before insert |
| 8 | POST /api/share | body.project_id | shares | None | .eq('user_id', user.id) | User A creates share link for User B's project | Verify project ownership before insert |

**Centralized fix pattern**: Create a `verifyProjectOwnership(supabase, projectId, userId)` helper that returns the project or throws 404/403. Use it at the top of every route that accepts a projectId.

---

## 5. Raw Error Exposure Inventory (15 routes)

### Unauthenticated routes (11)

| # | Route | Pattern | Severity |
|---|-------|---------|----------|
| 1 | /api/photos/[id]/verify | `error.message` in 500 body | P1 |
| 2 | /api/projects/[id]/diagnostic/check | `error.message` in 500 body | P0 (public + writes) |
| 3 | /api/projects/[id]/evidence/merkle | `error.message` in 500 body | P0 (public + writes) |
| 4 | /api/projects/[id]/evidence/verify | `error.message` in 500 body | P1 |
| 5 | /api/projects/[id]/go-nogo | `error.message` in 500 body | P1 |
| 6 | /api/projects/[id]/law-check | `error.message` in 500 body | P0 (public + writes) |
| 7 | /api/projects/[id]/law-checks | `error.message` in 500 body | P1 |
| 8 | /api/projects/[id]/photos | `error.message` in 500 body | P0 (public + writes) |
| 9 | /api/projects/[id]/risk/calculate | `error.message` in 500 body | P0 (public + writes) |
| 10 | /api/projects/[id]/risk/history | `error.message` in 500 body | P1 |
| 11 | /api/projects/[id]/risk | `error.message` in 500 body | P1 |

### Authenticated routes (3)

| # | Route | Pattern | Severity |
|---|-------|---------|----------|
| 12 | /api/dashboard/summary | `error.message` in 500 body | P2 |
| 13 | /api/estimate/validate | `error.message` in 500 body | P2 |
| 14 | /api/photos/auto-process | per-item `(r.reason as Error)?.message` | P2 |

### Additional (1)

| # | Route | Pattern | Severity |
|---|-------|---------|----------|
| 15 | /api/share/demo | `error.message` via `catch (error: any)` | P1 |

**Fix pattern**: Replace `error.message` with `'Internal server error'` or `'서버 오류가 발생했습니다.'` in all catch blocks. Use `console.error` for server-side logging only.

---

## 6. select("*") Inventory

| # | Route/File | Table | Public/Private | Sensitive Fields Risk | Proposed Columns |
|---|------------|-------|----------------|----------------------|------------------|
| 1 | /api/projects/[id]/risk | risk_scores | PUBLIC (no auth) | score, grade, sub-scores, calculated_at | id, score, grade, fp_score, oc_score, ch_score, calculated_at |
| 2 | /api/share/demo | shares | PUBLIC (no auth POST) | share_token, project_id, user_id | id, share_token, expires_at |
| 3 | /api/estimate/validate | estimate_validations (after INSERT) | PRIVATE (auth) | All inserted columns | id, validation_id, created_at |
| 4 | /api/share | shares (after INSERT) | PRIVATE (auth) | share_token, project_id | id, share_token, share_url, expires_at |
| 5 | agent/context.ts (shared) | projects, quote_line_items, cost_analysis, change_orders, evidence_files, agreements, reports, processes, workforce, materials | PRIVATE (auth) | All project sub-tables | Named columns per table |

---

## 7. SERVICE_ROLE_KEY Direct Usage (7 files outside admin.ts)

| # | File | Line(s) | Purpose | Server-only | Client Import Risk | Replace with createAdminClient() | Severity |
|---|------|---------|---------|-------------|-------------------|----------------------------------|----------|
| 1 | src/app/api/ai/proactive/route.ts | 144 | Cron POST admin client | YES | None | YES | P2 |
| 2 | src/lib/ai/brain.ts | 95 | saveDisputeSignalsToDB | YES (practice) | None | YES | P2 |
| 3 | src/lib/ai/proactive-engine.ts | 334 | runProactiveEngine reads | YES (practice) | None | YES | P2 |
| 4 | src/lib/ai/quote-analyzer.ts | 94, 240 | analyzeQuote, getLatestQuoteAnalysis | YES (practice) | None | YES | P2 |
| 5 | src/lib/ai/warranty-tracker.ts | 108, 138, 163 | createWarrantyRecord, getProjectWarranties, getExpiringWarranties | **NO** — dynamically imported in client component | **HIGH** — defects/page.tsx dynamic import | YES + move behind API route | P1 |
| 6 | src/lib/knowledge/embedder.ts | 34 | getSupabaseAdmin() duplicate | YES | None | YES — delete duplicate | P2 |
| 7 | src/lib/knowledge/retriever.ts | 58 | vectorSearch admin client | YES | None | YES | P2 |

**Critical**: warranty-tracker.ts is dynamically imported from a `'use client'` component (defects/page.tsx:176). The SERVICE_ROLE_KEY is `undefined` in the browser so no actual leak occurs, but the pattern is structurally wrong and the function silently fails.

---

## 8. Public Route Allowlist

### /api/share/[shareId] — ACCEPTABLE

- Why public: Share links for clients without Check-In accounts
- Guards: share_token match + expires_at + is_active validation
- Writes DB: YES (view_count increment, intentional)
- Hardening: Rate limiting recommended before production

### /api/verify/[code] — ACCEPTABLE

- Why public: Certificate verification for third parties
- Guards: Code lookup, generic error on failure
- Writes DB: NO
- Hardening: Rate limiting recommended; client_name PII exposure on valid code (brute-force risk on CHK-YYYY-XXXXX space)

### /auth/callback — ACCEPTABLE with gaps

- Why public: OAuth PKCE callback
- Guards: Supabase one-time code exchange
- Writes DB: NO (session only)
- Hardening: Missing error handling on exchangeCodeForSession failure; unconditional redirect to /projects regardless of auth success

---

## 9. Proposed Hardening Phases

### Phase 1U-H: API P0 Hardening

Scope: Fix the 5 P0 unauthenticated DB-write routes + 2 P1 unauthenticated risks + generic error responses

1. Add auth guard (createServerClient + getUser) to all 13 unauth routes
2. Add `.eq('user_id', user.id)` ownership check on project routes
3. Replace raw `error.message` with generic responses in all 15 routes
4. Remove select("*") from public-facing routes (#1, #2)

Estimated files: ~15 route files + 0-1 shared helper
Risk level: L3 (security fix, multiple files, no schema change)

### Phase 1U-I: Ownership / IDOR Hardening

Scope: Fix 8 authenticated routes with missing ownership checks

1. Create shared `verifyProjectOwnership()` helper in lib/
2. Apply to all 8 IDOR-risk routes
3. Fix agent/context.ts select("*") patterns

Estimated files: 8 route files + 1 helper + 1 context file
Risk level: L3

### Phase 1U-J: Service Role Centralization

Scope: Replace 7 direct SERVICE_ROLE_KEY usages with createAdminClient()

1. Replace inline client creation in 6 server-only files
2. Fix warranty-tracker.ts: move behind API route, remove client-side dynamic import
3. Delete duplicate getSupabaseAdmin() in embedder.ts

Estimated files: 7 lib files + 1 new API route + 1 page fix
Risk level: L3

### Phase 1U-K: Local Read-only Smoke

Scope: Verify all routes respond correctly after hardening

1. Start dev server
2. Test unauthenticated access returns 401/403
3. Test share/verify routes still work
4. Test authenticated routes with session
5. Confirm no regressions

---

## 10. Feature Development Impact

**Customer Capture MVP dependency analysis:**

The Customer Capture MVP will likely need:
- New API routes for customer onboarding forms
- New pages for customer capture flow
- Possibly the `/api/share` route (to share project links with customers)

The `/api/share` route has an IDOR risk (any user can create share for any project), but:
- This does NOT block building the Customer Capture MVP
- The IDOR fix can be applied during or before the MVP
- New routes built for Customer Capture should follow the correct auth+ownership pattern from the start

**Verdict: PASS** — Customer Capture MVP can proceed. New routes must be built with auth+ownership from day one. Existing risky routes are production blockers, not feature-development blockers.

---

## 11. Final Verdict

| Dimension | Verdict |
|-----------|---------|
| API security precheck readiness | **PASS** — all issues identified and classified |
| Feature development readiness | **PASS** — no blockers for Customer Capture MVP |
| Production deployment readiness | **HOLD** — 5 P0 unauth DB-write routes, 2 P1 unauth risks, 8 IDOR routes, 15 raw error leaks, 7 SERVICE_ROLE_KEY direct usages |
| Recommended next action | Phase 1U-H API P0 Hardening (auth guards + generic errors) |

### Summary Counts

| Finding | Count |
|---------|-------|
| Total API routes | 33 |
| Unauthenticated DB-write routes (P0) | 5 |
| Other unauthenticated risks (P1) | 2 |
| IDOR risk routes | 8 |
| Raw error exposure routes | 15 |
| select("*") locations | 5 |
| Direct SERVICE_ROLE_KEY files | 7 |
| Intentionally public routes | 3 |
| Production blockers total | 37 individual issues across categories |

No HOLD/BLOCK for feature development.
