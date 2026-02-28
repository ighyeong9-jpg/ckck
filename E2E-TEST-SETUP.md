# E2E 테스트 설정 가이드

자동화된 브라우저 테스트를 실행하려면 Supabase 이메일 확인 설정이 필요합니다.

---

## 🚫 현재 문제

Supabase는 기본적으로 **이메일 확인(Email Confirmation)**을 요구합니다.
- 신규 회원가입 시 확인 이메일 발송
- 이메일 링크 클릭 전까지 로그인 불가
- 자동화 테스트에서 이메일 확인 불가능

---

## ✅ 해결 방법

### 방법 1: Supabase 이메일 확인 비활성화 (권장)

1. Supabase 대시보드 접속
   - https://supabase.com/dashboard

2. 프로젝트 선택 후 Settings → Auth 이동

3. **Email confirmation** 설정 변경
   ```
   Enable email confirmations: OFF
   ```

4. 변경 사항 저장

5. 테스트 실행
   ```bash
   node e2e-flow-test.mjs
   ```

---

### 방법 2: 사전 확인된 계정 사용

1. 브라우저에서 수동으로 회원가입
   - http://localhost:3000/login
   - 이메일 확인 완료

2. 확인된 계정으로 테스트 실행
   ```bash
   USE_EXISTING_ACCOUNT=true \
   TEST_EMAIL=verified@example.com \
   TEST_PASSWORD=yourpassword \
   node e2e-flow-test.mjs
   ```

---

### 방법 3: Supabase Local Dev (고급)

Supabase 로컬 개발 환경에서는 이메일 확인 자동화 가능

1. Supabase CLI 설치
   ```bash
   npm install -g supabase
   ```

2. 로컬 Supabase 시작
   ```bash
   supabase start
   ```

3. 로컬 환경 변수 설정
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<local_anon_key>
   ```

4. 테스트 실행
   ```bash
   node e2e-flow-test.mjs
   ```

---

## 🧪 간단한 테스트 (인증 불필요)

이메일 확인 없이 실행 가능한 간단한 테스트:

```bash
node e2e-simple-test.mjs
```

이 테스트는 다음을 검증합니다:
- ✅ 페이지 로드
- ✅ UI 컴포넌트 존재
- ✅ 라우팅 정상 동작
- ⏭️ 실제 데이터 플로우 (인증 필요 없음)

---

## 📋 전체 E2E 테스트 체크리스트

### ✅ 자동 검증 가능 (이메일 확인 후)
1. 회원가입
2. 로그인
3. 프로젝트 생성
4. 사전진단 체크
5. 리스크 점수 저장
6. 공유 링크 생성
7. 공유 링크 접근

### ⚠️ 수동 검증 필요
- Supabase 이메일 발송
- 이메일 링크 클릭
- 실제 결제 플로우
- 모바일 디바이스 테스트

---

## 🛠️ 트러블슈팅

### 문제: "이메일 확인 필요" 에러
```
⚠️  Supabase 이메일 확인이 필요합니다.
```

**해결:**
- 방법 1 또는 2 참조

### 문제: "로그인 후 페이지 이동 없음"
```
❌ 3. 로그인: 로그인 후 페이지 이동 없음
```

**원인:**
- 이메일 미확인 계정
- 잘못된 비밀번호
- Supabase 세션 생성 실패

**해결:**
1. 브라우저에서 수동 로그인 테스트
2. Supabase Auth 로그 확인
3. 이메일 확인 상태 확인

---

## 📝 현재 상태

- ✅ Playwright 설치 완료
- ✅ E2E 테스트 스크립트 작성 완료
- ⏳ Supabase 이메일 확인 설정 필요
- ⏳ 테스트 계정 준비 필요

**다음 단계:**
1. Supabase 이메일 확인 비활성화
2. 또는 사전 확인된 계정 준비
3. `node e2e-flow-test.mjs` 실행
