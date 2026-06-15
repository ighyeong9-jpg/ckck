# Phase 1U-F Foundation QA Sweep

> Date: 2026-06-15
> Branch: develop
> HEAD: 0f3b434
> Author: Claude Code (Opus 4.6)
> Scope: Read-only investigation. No code changes, no SQL, no DB mutation, no deployment.

---

## 1. Repo State

| Item | Value |
|------|-------|
| Branch | develop |
| HEAD | 0f3b434 |
| Staged files before task | 0 |
| Dirty files | CLAUDE.md (unstaged), tsconfig.tsbuildinfo (unstaged) |
| CLAUDE.md excluded | YES |
| tsconfig.tsbuildinfo excluded | YES |

Recent commits:
```
0f3b434 docs: close out foundation before feature development
d2622c6 fix: route public share through api projection
2dc7e58 docs: precheck public share security
88c1012 fix: fail closed supabase admin client
063085e docs: precheck admin anon fallback risk
a45c93e docs: close out supabase baseline and build recovery
e47acef fix: resolve typecheck build blockers
78e3446 docs: precheck typecheck build failures
97fa2bd docs: precheck app supabase connection smoke
4788d20 docs: close out supabase baseline apply verification
fff487d sql: skip unsupported hnsw index for 3072 embeddings
02d882c fix: replace korean CHECK literals with ASCII to prevent mojibake
c4041ba docs: record supabase apply gate approval
ec0cfe6 docs: plan supabase apply gate preflight
53176d8 docs: confirm new supabase target env readiness
```

---

## 2. Package/Test Capability Inventory

| Script | Exists |
|--------|--------|
| dev | YES |
| build | YES |
| check (tsc + eslint) | YES |
| lint (standalone) | NO (bundled in check) |
| test | NO |
| e2e/smoke | NO (playwright in devDeps but no script) |
| coverage | NO |

**Current automated coverage level**: Zero. No test runner (Jest/Vitest) configured. No test scripts. Playwright installed as devDep but no test script or config.

**Missing test coverage**: All application code has zero automated test coverage.

**Tests to add later** (prioritized):
1. API route auth guard tests (critical for security)
2. Share API projection tests
3. Supabase client creation tests
4. Component smoke render tests
5. E2E smoke with Playwright

---

## 3. Hardcoding / Demo / Mock / Static Data Sweep

### 3.1 Demo Data & Routes

| # | File | Finding | Category | Severity |
|---|------|---------|----------|----------|
| 1 | src/app/api/share/demo/route.ts | Full demo endpoint: creates real DB entries with hardcoded data. Hardcoded shareToken='demo123', project name='데모 카페 인테리어', client='김고객'. Falls back to nil UUID for unauthenticated users. select('*') on shares. | demo-data / production-risk | BLOCKER before production |
| 2 | src/app/share/[shareId]/page.tsx:38-65 | DEMO_DATA const with hardcoded demo project. shareId==='demo123' branch bypasses API. | demo-data | NON-BLOCKING (client-only fallback) |
| 3 | src/lib/demo/demoData.ts | Full demo data module: SAMPLE_PROJECTS, hardcoded names ('홍길동 대표'), addresses ('서울 강남구 역삼동 123-4'), localStorage demo mode. | demo-data | BLOCKER before production |
| 4 | src/app/(dashboard)/projects/page.tsx | Demo mode banner, `?demo=true` query param activates demo state, imports exitDemoMode. | demo-data / dev-only | CLEANUP before production |

### 3.2 Hardcoded Placeholders

| # | File | Finding | Category | Severity |
|---|------|---------|----------|----------|
| 5 | src/app/pricing/page.tsx:88 | `process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY \|\| 'test_ck_placeholder'` — falls back to test placeholder. | hardcoded-value / production-risk | BLOCKER before production |
| 6 | src/app/api/share/demo/route.ts:23 | `user?.id \|\| '00000000-0000-0000-0000-000000000000'` — nil UUID fallback for unauthenticated demo writes. | hardcoded-value / production-risk | BLOCKER before production |

### 3.3 Mock/Fallback Patterns

| # | File | Finding | Category | Severity |
|---|------|---------|----------|----------|
| 7 | src/app/api/agent/mockRouter.ts | Full mock router: keyword-based tool selection when API keys missing. Math.random() cost factors. | mock-pattern / dev-only | CLEANUP before production |
| 8 | src/app/api/agent/tools.ts:230 | `Math.random() * 0.3 + 0.1` — randomized cost impact factor. | mock-pattern | CLEANUP before production |
| 9 | src/app/(dashboard)/payment/page.tsx:125 | `// 결제 내역 (UI 전용 mock)` — payment history is UI-only mock, not persisted. | mock-pattern | CLEANUP before production |

### 3.4 TODO / FIXME

| # | File | Finding | Severity |
|---|------|---------|----------|
| — | (none found) | No TODO/FIXME/HACK/XXX markers found in source code. | N/A |

Note: XXX patterns found in src/lib/ai/gemini-provider.ts lines 85/95/108 are Korean example prompts in AI system instructions ("XXX 현황 파악해서 보고해"), not code markers.

### 3.5 Console.log Statements

| # | File | Context |
|---|------|---------|
| 1 | src/app/(dashboard)/projects/[id]/diagnostic/page.tsx:310 | Share link creation log |
| 2 | src/app/api/agent/mockRouter.ts:755 | Fallback model success |
| 3 | src/app/layout.tsx:51 | Service worker registration failure |
| 4 | src/lib/ai/brain.ts:219 | Claude fallback execution |
| 5 | src/lib/ai/gemini-provider.ts:732,734 | Model attempt/success |
| 6 | src/lib/knowledge/embedder.ts:78-114 | Embedding progress (4 calls) |
| 7 | src/lib/pdf/korean-font.ts:51 | Font load completion |

Count: 10+ console.log statements. Severity: CLEANUP before production.

### 3.6 `any` Type Usage

11+ instances across: issues/page.tsx, notebook/page.tsx, changes/page.tsx, diagnostic/page.tsx, agent/route.ts, tools-auto.ts, and 15+ catch blocks using `catch (err: any)`.

Severity: CLEANUP (non-blocking for feature development).

### Summary Counts

| Category | Count |
|----------|-------|
| Demo data/routes | 4 |
| Hardcoded placeholders | 2 |
| Mock/fallback patterns | 3 |
| TODO/FIXME | 0 |
| Console.log | 10+ |
| `any` type usage | 11+ |

---

## 4. Route/Page Inventory

### 4.1 Public/Auth Routes

| Path | File | Type | Status | Smoke |
|------|------|------|--------|-------|
| / | src/app/page.tsx | Server | Usable foundation | YES |
| /login | src/app/login/page.tsx | Client | Usable foundation | YES |
| /signup | src/app/signup/page.tsx | Static | Usable foundation | YES |
| /pricing | src/app/pricing/page.tsx | Static | Has test placeholder fallback | YES |
| /offline | src/app/offline/page.tsx | Static | Usable foundation | YES |
| /share/[shareId] | src/app/share/[shareId]/page.tsx | Client | Fixed (1U-D), has demo123 fallback | YES |
| /verify/[code] | src/app/verify/[code]/page.tsx | Server | Usable foundation | YES |
| /profile/[token] | src/app/profile/[token]/page.tsx | Server | Usable foundation | YES |
| /auth/callback | src/app/auth/callback/route.ts | Server | Usable foundation | YES |

### 4.2 Dashboard Routes (auth required)

| Path | File | Type | Status | Smoke |
|------|------|------|--------|-------|
| /dashboard | page.tsx | Server | Usable foundation | YES (with auth) |
| /projects | page.tsx | Client | Has demo mode banner | YES |
| /projects/new | page.tsx | Client | Usable foundation | YES |
| /projects/[id] | page.tsx | Client | Redirect page | YES |
| /projects/[id]/overview | page.tsx | Server | Usable foundation | YES |
| /projects/[id]/process | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/gallery | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/estimate | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/diagnostic | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/certificate | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/changes | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/defects | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/issues | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/cost-analysis | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/fire-safety | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/law-check | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/materials | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/workforce | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/report | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/evidence-package | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/sow | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/agreement | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/warranty | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/precheck | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/client-view | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/settings/members | page.tsx | Client | Usable foundation | YES |
| /projects/[id]/issues/[issueId] | page.tsx | Client | Usable foundation | YES |
| /clients | page.tsx | Client | Usable foundation | YES |
| /quotes | page.tsx | Client | Usable foundation | YES |
| /quotes/new | page.tsx | Client | Usable foundation | YES |
| /reports | page.tsx | Client | Usable foundation | YES |
| /issues | page.tsx | Client | Usable foundation | YES |
| /notebook | page.tsx | Client | Usable foundation | YES |
| /ai-chat | page.tsx | Client | Usable foundation | YES |
| /payment | page.tsx | Client | Has mock payment history | YES |
| /settings | page.tsx | Client | Usable foundation | YES |
| /profile | page.tsx | Client | Usable foundation | YES |
| /features/safety-status | page.tsx | Client | Usable foundation | YES |
| /warranty | page.tsx | Client | Usable foundation | YES |

### 4.3 Client Portal Routes

| Path | File | Type | Status | Smoke |
|------|------|------|--------|-------|
| /client | page.tsx | Static | Usable foundation | YES |
| /client/dashboard | page.tsx | Client | Usable foundation | YES |
| /client/project/[id]/changes | page.tsx | Client | Usable foundation | YES |
| /client/project/[id]/defects | page.tsx | Client | Usable foundation | YES |
| /client/project/[id]/photos | page.tsx | Client | Usable foundation | YES |
| /client/project/[id]/quote | page.tsx | Client | Usable foundation | YES |

Total pages: ~50. All routes compile and build successfully.

---

## 5. API Route Inventory

### 5.1 Routes WITH Authentication

| Route | Method | Reads DB | Writes DB | Admin Client | Raw Error Leak | Safe for Smoke |
|-------|--------|----------|-----------|-------------|---------------|----------------|
| /api/agent | POST | YES | indirect | NO | NO | YES |
| /api/agent/stream | POST | NO | NO | NO | NO | YES |
| /api/ai/alerts | GET | YES | NO | NO | NO | YES |
| /api/ai/budget-guide | POST | NO | YES | NO | NO | YES |
| /api/ai/chat | POST | YES | NO | NO | NO | YES |
| /api/ai/classify-issue | POST | YES | YES | NO | NO | YES |
| /api/ai/notebook | POST | NO | NO | NO | NO | YES |
| /api/ai/predict | POST | YES | NO | NO | NO | YES |
| /api/ai/quote-analyze | POST | YES | NO | NO | NO | YES |
| /api/ai/report | POST | YES | NO | NO | NO | YES |
| /api/certificate | POST | YES | YES | NO | NO | YES |
| /api/dashboard/summary | GET | YES | NO | NO | **YES** | YES |
| /api/estimate/validate | POST | NO | YES | NO | **YES** | YES |
| /api/events/emit | POST | YES | indirect | NO | NO | YES |
| /api/photos/auto-process | POST | YES | YES | NO | partial | YES |
| /api/share | POST | NO | YES | NO | NO | YES |
| /api/ai/proactive | GET/POST | YES | YES(POST) | YES(POST) | NO | YES(GET) |

### 5.2 Routes WITHOUT Authentication (P0 security risk)

| Route | Method | Reads DB | Writes DB | Admin Client | Raw Error Leak | GET Mutates |
|-------|--------|----------|-----------|-------------|---------------|-------------|
| /api/ai/check | POST | NO | NO | NO | NO | N/A |
| /api/photos/[id]/verify | GET | YES | NO | delegated | **YES** | NO |
| /api/projects/[id]/diagnostic/check | POST | YES | **YES** | NO | **YES** | N/A |
| /api/projects/[id]/evidence/merkle | POST | YES | **YES** | delegated | **YES** | N/A |
| /api/projects/[id]/evidence/verify | GET | YES | NO | delegated | **YES** | NO |
| /api/projects/[id]/go-nogo | GET | YES | NO | delegated | **YES** | NO |
| /api/projects/[id]/law-check | POST | YES | **YES** | delegated | **YES** | N/A |
| /api/projects/[id]/law-checks | GET | YES | NO | server | **YES** | NO |
| /api/projects/[id]/photos | POST | NO | **YES** | delegated | **YES** | N/A |
| /api/projects/[id]/risk/calculate | POST | YES | **YES** | delegated | **YES** | N/A |
| /api/projects/[id]/risk/history | GET | YES | NO | server | **YES** | NO |
| /api/projects/[id]/risk | GET | YES | NO | server | **YES** | NO |
| /api/share/demo | GET/POST | YES | **YES**(POST) | NO | **YES** | NO |

### 5.3 Intentionally Public Routes (by design)

| Route | Method | Notes |
|-------|--------|-------|
| /api/share/[shareId] | GET | Public share viewer. Uses admin client. Well-implemented. GET increments view_count (intentional). |
| /api/verify/[code] | GET | Public certificate verification. Generic errors. Clean. |
| /auth/callback | GET | OAuth callback. Hardcoded redirect to /projects. |

### 5.4 IDOR Risks (authenticated but no ownership check)

| Route | Detail |
|-------|--------|
| POST /api/agent | loadProjectContext(projectId) with body-supplied projectId, no ownership check |
| POST /api/ai/chat | Same — loadProjectContext with body-supplied projectId |
| GET /api/ai/alerts | collectAlertContext(projectId) with query-param projectId |
| POST /api/share | Any authenticated user can create share for any project_id |

### 5.5 select('*') Usage in API

| Route/File | Table |
|------------|-------|
| /api/projects/[id]/risk | risk_scores |
| /api/share/demo | shares |
| agent/context.ts (shared) | projects, quote_line_items, cost_analysis, change_orders, evidence_files, agreements, reports, processes, workforce, materials |

---

## 6. Supabase Access Pattern Inventory

### 6.1 Client Instantiation

| File | Type | Classification |
|------|------|---------------|
| src/lib/supabase/client.ts | createBrowserClient (ANON_KEY) | browser-read/write — acceptable |
| src/lib/supabase/server.ts | createServerClient (ANON_KEY) | server-read/write — acceptable |
| src/lib/supabase/admin.ts | createClient (SERVICE_ROLE_KEY) | admin — acceptable (centralized) |
| src/lib/supabase/middleware.ts | createServerClient (ANON_KEY) | server-read — acceptable |

### 6.2 SERVICE_ROLE_KEY Direct Access (outside admin.ts)

| File | Classification |
|------|---------------|
| src/lib/ai/brain.ts:16 | NEEDS-REVIEW — creates own client |
| src/lib/ai/proactive-engine.ts:16 | NEEDS-REVIEW — creates own client |
| src/lib/ai/quote-analyzer.ts:16 | NEEDS-REVIEW — creates own client |
| src/lib/ai/warranty-tracker.ts:16 | NEEDS-REVIEW — creates own client (3x) |
| src/lib/knowledge/embedder.ts:33 | NEEDS-REVIEW — own getSupabaseAdmin() |
| src/lib/knowledge/retriever.ts:34 | NEEDS-REVIEW — own getSupabaseAdmin() |
| src/app/api/ai/proactive/route.ts:18 | NEEDS-REVIEW — direct createClient(url, serviceRoleKey) |

**Risk**: 7 files access SERVICE_ROLE_KEY directly instead of through admin.ts. These create their own Supabase clients, bypassing the centralized factory. Not a client-side exposure risk (all are server-only files), but inconsistent and harder to audit.

### 6.3 Browser-Side Access

- ~38 dashboard pages use createClient() from client.ts (browser)
- Mix of select/insert/update/delete operations
- All rely on RLS policies for access control
- Some use select('*') — over-fetching risk
- One `user?.id || 'anonymous'` fallback in clients/page.tsx:72

### 6.4 Summary

| Classification | Count | Risk |
|----------------|-------|------|
| browser-read | ~300 ops | Medium (RLS-dependent) |
| browser-write | ~80 ops | Medium (RLS + anonymous fallback) |
| server-read | ~50 ops | Low-Medium |
| server-write | ~20 ops | Medium |
| admin-read/write (via admin.ts) | ~10 ops | Low (acceptable) |
| admin-read/write (direct SERVICE_ROLE_KEY) | ~15 ops | Needs review |

---

## 7. Error / Runtime Risk Inventory

| Risk Category | Instances | Severity |
|--------------|-----------|----------|
| API routes with no auth guard (write) | 7 routes | P0 — BLOCKER before production |
| API routes with no auth guard (read) | 6 routes | P0 — BLOCKER before production |
| Raw err.message returned to client | 12+ routes | P1 — BLOCKER before production |
| IDOR — no ownership check on projectId | 4 routes | P1 — BLOCKER before production |
| select('*') in API routes | 3 routes + agent context | P1 — CLEANUP before production |
| SERVICE_ROLE_KEY outside admin.ts | 7 files | P2 — CLEANUP before production |
| Anonymous user fallback | 1 location (clients/page.tsx) | P2 — CLEANUP before production |
| SSRF risk in photo auto-process | 1 route | P2 — BLOCKER before production |
| Demo endpoint writes real DB | 1 route | P2 — BLOCKER before production |
| Console.log in production code | 10+ locations | P3 — CLEANUP |
| `any` type usage | 11+ locations | P3 — CLEANUP |
| No test coverage at all | Entire codebase | P2 — Needs plan |

---

## 8. Local Validation

| Check | Result |
|-------|--------|
| npm run check | PASS |
| npm run build | PASS |
| git diff --check | Clean (CRLF warning on CLAUDE.md only) |
| Local smoke readiness | YES for read-only page rendering |
| DB mutation in this sweep | NO |
| Secrets exposed | NO |

---

## 9. Smoke Test Plan

### A. Read-Only Local Smoke (can run now)

- [ ] App loads at localhost:3000
- [ ] Landing page (/) renders
- [ ] Login page (/login) renders
- [ ] Pricing page (/pricing) renders
- [ ] Offline page (/offline) renders
- [ ] Share page (/share/demo123) renders demo data
- [ ] Share page (/share/invalid) shows safe error state
- [ ] Verify page (/verify/invalid) shows safe error state
- [ ] 404 page renders for unknown routes
- [ ] API /api/share/invalid returns 404 JSON
- [ ] API /api/verify/invalid returns safe error response

### B. Dev DB Smoke (requires owner approval)

- [ ] Create test user account
- [ ] Create test project
- [ ] Upload test photo
- [ ] Run diagnostic check
- [ ] Generate certificate
- [ ] Create share link
- [ ] Open share link in incognito
- [ ] Verify role-based access (contractor vs client)

### C. Staging/Host Smoke (later, after deployment)

- [ ] Deploy preview
- [ ] Env presence check (without printing values)
- [ ] All routes return expected HTTP status
- [ ] Supabase auth flow works end-to-end
- [ ] Storage upload/download works
- [ ] Public share opens correctly
- [ ] Certificate verification works

---

## 10. Classification Lists

### Must Fix Before Customer Capture MVP

None. The Customer Capture MVP can proceed because:
- All existing pages compile and build.
- Foundation security fixes (admin.ts, share projection) are complete.
- The unauthenticated API routes are existing legacy — they do not block new feature development.
- Demo data is isolated and does not interfere with new features.

### Can Fix During Customer Capture MVP

| Item | Scope |
|------|-------|
| Remove DEMO_DATA from share page | Small |
| Remove demo123 branch from share page | Small |
| Add test runner (Jest/Vitest) to package.json | Medium |
| Add API route smoke tests | Medium |

### Must Fix Before Production Deployment

| # | Item | Priority |
|---|------|----------|
| 1 | Add auth guards to 13 unprotected API routes | P0 |
| 2 | Replace raw err.message with generic errors in 12+ routes | P1 |
| 3 | Add ownership verification to 4 IDOR-vulnerable routes | P1 |
| 4 | Remove /api/share/demo endpoint or gate behind feature flag | P1 |
| 5 | Remove demo data module (lib/demo/demoData.ts) | P1 |
| 6 | Remove demo mode banner from projects page | P1 |
| 7 | Replace test_ck_placeholder with error throw | P1 |
| 8 | Replace select('*') with named columns in API routes | P1 |
| 9 | Centralize SERVICE_ROLE_KEY through admin.ts | P2 |
| 10 | Remove anonymous user fallback in clients page | P2 |
| 11 | Add URL validation to photo auto-process (SSRF) | P2 |
| 12 | Remove console.log statements | P3 |
| 13 | Replace `any` types with proper types | P3 |
| 14 | Add automated test coverage | P2 |

---

## 11. Final Verdict

| Dimension | Verdict |
|-----------|---------|
| Hardcoding cleanup readiness | **REVIEW** — demo/mock data exists but does not block feature development |
| Runtime smoke readiness | **PASS** — read-only local smoke is safe to run |
| Feature development readiness | **PASS** — no blockers for Customer Capture MVP |
| Production deployment readiness | **HOLD** — 14 items must be addressed before production |

**Feature development may proceed.** No BLOCKER before feature development items found.

Production remains HOLD with 14 tracked remediation items.

---

## 12. Next Phase Recommendation

1. **Phase 1V-A**: Customer Capture MVP precheck
2. Customer Capture MVP implementation
3. API auth guard hardening sprint (before production)
4. Error handling standardization sprint (before production)
5. Test coverage foundation
