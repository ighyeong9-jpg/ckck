# Vercel 배포 전 체크리스트

> **프로젝트**: Check-In (E:\dev\check-in-stable)  
> **배포 대상**: Vercel (Next.js 14)

---

## 1. 환경 변수

배포 전 Vercel 프로젝트 **Settings → Environment Variables**에서 아래 변수를 설정하세요.

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL (예: https://xxx.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase 익명(공개) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | 서버 전용 키 (서버 액션·백그라운드 작업 시 사용) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 결제 사용 시 | 토스페이먼츠 클라이언트 키 (테스트: test_ck_...) |
| `TOSS_SECRET_KEY` | 결제 사용 시 | 토스페이먼츠 시크릿 키 (테스트: test_sk_...) |
| `NEXT_PUBLIC_APP_URL` | ✅ 권장 | 배포 URL (예: https://your-app.vercel.app) |
| `NEXT_PUBLIC_APP_NAME` | 선택 | 앱 이름 (예: Check-In) |

- **Production / Preview / Development** 중 필요한 환경별로 동일하게 넣거나, Preview만 테스트용 값으로 구분해도 됩니다.
- `.env.example`에 있는 항목과 동일한 이름을 사용하면 로컬과 맞추기 쉽습니다.

---

## 2. Supabase 설정

- [ ] **프로젝트 URL·Anon Key**: 위 환경 변수와 동일한 Supabase 프로젝트 사용
- [ ] **Auth**: 이메일/비밀번호 등 사용할 방식 활성화, 리다이렉트 URL에 `NEXT_PUBLIC_APP_URL` 기반 경로 추가 (예: `/auth/callback`, `/login` 등)
- [ ] **RLS(Row Level Security)**: 테이블별 정책이 배포 환경(anon key / service role)에 맞게 설정되어 있는지 확인
- [ ] **API / DB**: 프로덕션 DB 마이그레이션 완료, 필요한 테이블(projects, diagnostic_responses, change_orders, defects, timeline_events 등) 존재 확인

---

## 3. 빌드·런타임

- [ ] **Node 버전**: `package.json`의 `engines.node` (>=18.17.0)에 맞춰 Vercel에서 Node 18 이상 사용
- [ ] **빌드 명령**: `npm run build` (Next.js 빌드) 성공하는지 로컬에서 한 번 실행
- [ ] **출력 디렉터리**: Vercel 기본값 `.next` 사용 시 별도 설정 불필요
- [ ] **Server Actions**: `next.config.js`의 `serverActions.bodySizeLimit` (10mb) 필요 시 유지

---

## 4. PWA·정적 자원

- [ ] **next-pwa**: 개발 모드에서는 비활성(`disable: process.env.NODE_ENV === 'development'`). 프로덕션 빌드 시 `public`에 서비스 워커 생성되는지 확인
- [ ] **이미지**: Supabase Storage 등 `**.supabase.co` 원격 이미지 사용 시 `next.config.js`의 `images.remotePatterns`에 이미 포함되어 있는지 확인
- [ ] **SASS**: `sassOptions.includePaths`에 `./src/styles` 설정되어 있음. 경로 오류 없이 빌드되는지 확인

---

## 5. 도메인·보안

- [ ] **도메인**: Vercel에 프로덕션 도메인 연결 후 `NEXT_PUBLIC_APP_URL`을 해당 도메인으로 변경
- [ ] **HTTPS**: Vercel 기본 HTTPS 사용
- [ ] **Supabase Redirect URLs**: Supabase 대시보드 Auth 설정에 배포 URL(예: https://your-app.vercel.app/**) 추가

---

## 6. 배포 후 확인

- [ ] **홈(/)**: 로그인·회원가입 링크 동작
- [ ] **로그인/회원가입**: Supabase Auth 연동 정상 (리다이렉트·세션 유지)
- [ ] **대시보드**: 로그인 후 접근 가능, 통계(전체/진행중/완료) 표시
- [ ] **프로젝트 목록·상세**: 데이터 로드, 탭(사전점검·변경사항·하자관리) 이동
- [ ] **결제(토스)**: 사용 시 테스트 결제 한 번 수행해 보기
- [ ] **PWA**: 필요 시 설치·오프라인 동작 확인

---

## 7. 체크리스트 요약

| 구분 | 항목 |
|------|------|
| 환경 변수 | SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL 필수; TOSS 키는 결제 시 |
| Supabase | Auth 리다이렉트, RLS, 테이블 존재 |
| 빌드 | `npm run build` 성공, Node 18+ |
| 앱 동작 | 로그인 → 대시보드 → 프로젝트 → 사전점검/변경/하자 |
| 보안 | HTTPS, Supabase Redirect URL |

이 체크리스트는 **현재 코드·설정 기준**이며, 코드는 수정하지 않았습니다.
