# Phase 1T-B — Typecheck/Build Failure Precheck

> Date: 2026-06-15
> Step: 1T-B (precheck — no code modification)
> Branch: develop
> HEAD: 97fa2bd — docs: precheck app supabase connection smoke
> Author: Claude Code (local implementer)

---

## 1. Repo State

| Item | Value |
|------|-------|
| Branch | `develop` |
| HEAD | `97fa2bd` |
| Dirty files | `M CLAUDE.md` (unstaged, excluded), `M tsconfig.tsbuildinfo` (unstaged, excluded) |
| SQL file | unchanged |
| App code | unchanged (no modifications in this step) |

---

## 2. Error Reproduction

### npm run check

```
src/components/estimate/EstimateResult.tsx(128,36): error TS2322
  Type 'RiskFlagType' is not assignable to type '"MISSING_PROCESS" | "HIGH_PRICE" | "SUSPICIOUS_PROCESS" | "UNBALANCED"'.
  Type '"DUMPING_PRICE"' is not assignable to type '"MISSING_PROCESS" | "HIGH_PRICE" | "SUSPICIOUS_PROCESS" | "UNBALANCED"'.

src/components/gallery/PhotoGallery.tsx(70,26): error TS2339
  Property 'category' does not exist on type 'GalleryPhoto'.
src/components/gallery/PhotoGallery.tsx(71,67): error TS2339
  Property 'category' does not exist on type 'GalleryPhoto'.
```

### npm run build

Same errors. Build fails at type checking phase.

---

## 3. Root Cause Analysis

### Error 1: EstimateResult.tsx — RiskFlag type mismatch

**Location**: `src/components/estimate/EstimateResult.tsx:128`

**Root cause**: Two separate `RiskFlag` interfaces exist with incompatible `type` unions.

| File | `RiskFlag.type` union |
|------|-----------------------|
| `src/lib/estimate/constants.ts:126-131` | `'DUMPING_PRICE' \| 'OVERCHARGE' \| 'MISSING_PROCESS' \| 'ABNORMAL_LABOR' \| 'OLD_BUILDING_RISK'` |
| `src/components/ui/RiskBadge.tsx:7-8` | `'HIGH_PRICE' \| 'MISSING_PROCESS' \| 'SUSPICIOUS_PROCESS' \| 'UNBALANCED'` |

The `RiskBadge` component defines its own local `RiskFlag` interface (line 7-8) that does not match the canonical `RiskFlag` from `constants.ts`. The validator generates flags with types like `DUMPING_PRICE` that do not exist in the `RiskBadge` local interface.

Additionally, `RiskBadge.tsx` uses `severity: 'HIGH' | 'MEDIUM' | 'LOW'` while `constants.ts` uses `severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`.

**Pre-existing**: YES. Unrelated to DB baseline apply.

**Fix**: RiskBadge.tsx should import `RiskFlag` from `@/lib/estimate/constants` instead of defining its own local interface. The component body only uses `flag.severity` and `flag.message`, so it does not depend on the `type` field for rendering.

### Error 2: PhotoGallery.tsx — missing `category` property

**Location**: `src/components/gallery/PhotoGallery.tsx:70-71`

**Root cause**: `GalleryPhoto` interface was refactored from `category` to `stage`.

| File | Field |
|------|-------|
| `src/types/photoGallery.ts:56` | `stage: ConstructionStage` (comment: `category → stage로 변경`) |
| `src/components/gallery/PhotoGallery.tsx:70` | `photo.category` (old field name, not updated) |

**Pre-existing**: YES. Unrelated to DB baseline apply.

**Fix**: Replace `photo.category` with `photo.stage` in PhotoGallery.tsx (lines 70-71).

---

## 4. Scope Proposal

### Allowed fix files

| File | Change |
|------|--------|
| `src/components/ui/RiskBadge.tsx` | Remove local `RiskFlag` interface, import from `@/lib/estimate/constants`. Add `CRITICAL` to `severityConfig`. |
| `src/components/gallery/PhotoGallery.tsx` | Replace `photo.category` with `photo.stage` on lines 70-71. |

### Forbidden files (must not be modified)

- CLAUDE.md
- tsconfig.tsbuildinfo
- .env*
- supabase/*
- package.json / package-lock.json
- migrations
- DB scripts
- API routes
- lib/estimate/constants.ts (canonical source, no change needed)
- types/photoGallery.ts (canonical source, no change needed)

---

## 5. Verification Plan After Fix

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npm run check` | 0 errors |
| 2 | `npm run build` | Build success |
| 3 | `git diff --check` | 0 whitespace errors |
| 4 | `git diff --name-only` | Only RiskBadge.tsx + PhotoGallery.tsx + CLAUDE.md + tsconfig.tsbuildinfo |
| 5 | No env output | No values printed |
| 6 | No DB mutation | No SQL executed |
| 7 | No Supabase CLI | Not used |

---

## 6. Final Verdict

**PASS candidate**

Rationale:
- Both errors are pre-existing type mismatches unrelated to DB baseline apply
- Root causes are clear and isolated
- Fix scope is minimal (2 files, no DB/env/security impact)
- No secrets, DB mutation, or Supabase CLI involvement

---

## Document Integrity

- No code was modified in this step.
- No env values printed.
- No DB mutation.
- No Supabase CLI.
- CLAUDE.md and tsconfig.tsbuildinfo remain unstaged/excluded.
