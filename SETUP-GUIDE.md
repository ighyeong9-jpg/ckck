# 체크인 DB 100% 완벽 설정 가이드

## 📊 현재 상태

```
전체 테이블: 24개
데이터 있음: 17개 (71%)
비어있음: 7개 (29%)
총 데이터: 225개 row
```

## 🎯 목표

**모든 테이블에 데이터를 채워 100% 완성**

---

## ⚡ 빠른 실행 (권장)

### Step 1: 누락된 테이블 생성

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트: `kilvdxrtmcxvycqevalv`

2. **SQL Editor 열기**
   - 왼쪽 메뉴 → SQL Editor
   - New Query 클릭

3. **SQL 복사 & 실행**
   ```
   파일: E:\dev\check-in-stable\supabase\create-missing-tables.sql
   ```
   - 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - **Run** 클릭 (또는 Ctrl+Enter)

4. **실행 결과 확인**
   ```sql
   -- 마지막에 나오는 결과:
   table_name           | column_count
   ---------------------+-------------
   photos               | 13
   certificates         | 11
   share_codes          | 11
   activities           | 10
   risk_history         | 11
   evidence_packages    | 12
   project_invites      | 10
   ```

   ✅ 7개 테이블 모두 생성되면 성공!

---

### Step 2: 생성된 테이블에 데이터 채우기

터미널에서 실행:

```bash
cd E:\dev\check-in-stable
node scripts/seed-new-tables.js
```

---

### Step 3: 검증

```bash
node scripts/check-all-tables.js
```

**예상 결과:**
```
전체 테이블: 24개
비어있는 테이블: 0개 ✅
총 데이터: 250+개 row
```

---

## 📝 상세 가이드

### 생성될 테이블 목록

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| **photos** | 사진 갤러리 | file_name, file_url, category, taken_at |
| **certificates** | 준공 증명서 | certificate_type, certificate_number, issued_date |
| **share_codes** | 외부 공유 코드 | share_code, expires_at, max_uses |
| **activities** | 활동 로그 | user_id, activity_type, action, resource_type |
| **risk_history** | 리스크 이력 | risk_score, risk_grade, financial_risk |
| **evidence_packages** | 증거 패키지 | merkle_root, verification_code, status |
| **project_invites** | 프로젝트 초대 | email, invite_code, status, expires_at |

### RLS (Row Level Security) 정책

모든 테이블에 자동으로 RLS 정책이 적용됩니다:
- ✅ 프로젝트 멤버만 데이터 조회 가능
- ✅ 본인이 초대받은 invite만 조회 가능
- ✅ Service Role Key는 모든 데이터 접근 가능

---

## 🚨 문제 해결

### 1. SQL 실행 시 "permission denied" 에러

**원인:** Service Role 권한 부족

**해결:**
1. Supabase Dashboard → Settings → Database
2. Connection String 복사
3. PostgreSQL 클라이언트(pgAdmin, DBeaver 등)로 직접 연결
4. SQL 실행

### 2. "table already exists" 에러

**원인:** 테이블이 이미 존재

**해결:**
```sql
-- SQL 파일 상단에 추가
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
-- ...
```

### 3. 컬럼명 불일치 에러

**원인:** 실제 DB와 스키마 파일 불일치

**해결:**
```bash
# 실제 DB 스키마 확인
node scripts/inspect-schema.js

# 또는 Supabase Dashboard → Database → Tables에서 수동 확인
```

---

## 🔧 대안: CLI 사용

Supabase CLI가 설치되어 있다면:

```bash
# 1. 로그인
npx supabase login

# 2. 프로젝트 연결
npx supabase link --project-ref kilvdxrtmcxvycqevalv

# 3. 마이그레이션 실행
npx supabase db push --db-url "postgresql://..."

# 또는 직접 SQL 실행
npx supabase db reset
```

---

## ✅ 검증 체크리스트

- [ ] 7개 테이블 생성 완료
- [ ] 모든 테이블에 1개 이상 데이터 있음
- [ ] RLS 정책 적용 확인
- [ ] 인덱스 생성 확인
- [ ] FK 제약조건 확인
- [ ] 전체 워크플로우 테스트

---

## 📞 지원

문제가 계속되면:
1. `scripts/check-all-tables.js` 실행 결과 확인
2. Supabase Dashboard → Logs에서 에러 확인
3. GitHub Issue 생성: 에러 메시지 + 실행 로그 첨부

---

**최종 업데이트:** 2026-03-06
**버전:** 1.0.0
