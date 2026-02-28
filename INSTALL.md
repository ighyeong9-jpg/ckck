# Check-In — 파일 설치 가이드

## 왜 E 드라이브 루트에 넣으면 안 되나

Claude Code는 **현재 열려있는 프로젝트 폴더 안**에서만 파일을 읽는다.
`E:\` 루트에 넣으면 Claude Code 프로젝트 범위 밖이라 인식을 못 한다.
반드시 `E:\dev\check-in-stable\` 안에 넣어야 한다.

---

## 정확한 파일 배치

```
E:\dev\check-in-stable\          ← 여기가 프로젝트 루트
│
├── CLAUDE.md                    ← ✅ 루트에 (Claude Code 자동 인식)
├── .cursorrules                 ← ✅ 루트에 (Cursor AI 자동 인식)
├── START.md                     ← ✅ 루트에
├── USERFLOW.md                  ← ✅ 루트에
├── DATABASE.md                  ← ✅ 루트에
├── SCREENS.md                   ← ✅ 루트에
├── API.md                       ← ✅ 루트에
├── ERRORS.md                    ← ✅ 루트에
├── COMPONENTS.md                ← ✅ 루트에
├── DECISIONS.md                 ← ✅ 루트에
├── MAINTENANCE.md               ← ✅ 루트에
├── TESTING.md                   ← ✅ 루트에
│
├── supabase\                    ← 폴더 새로 만들기
│   └── migrations\              ← 폴더 새로 만들기
│       └── 001_initial_schema.sql  ← ✅ 여기에
│
├── src\                         ← 기존 소스코드 (건드리지 마라)
├── package.json                 ← 기존
├── next.config.js               ← 기존
└── .env.local                   ← 기존
```

---

## 설치 순서

### 1단계 — 다운로드한 파일 이름 변경

받은 파일 중 `cursorrules.txt` → `.cursorrules` 로 이름 변경
- 탐색기에서 파일 선택 → F2 → `.cursorrules` 입력 → 엔터
- "확장자를 바꾸면 파일이 열리지 않을 수 있습니다" 경고 → 예 클릭
- 이 파일은 점(.)으로 시작하는 숨김 파일이다. 정상이다.

### 2단계 — 파일 복사

`CLAUDE.md`, `START.md`, `USERFLOW.md`, `DATABASE.md`, `SCREENS.md`,
`API.md`, `ERRORS.md`, `COMPONENTS.md`, `DECISIONS.md`,
`MAINTENANCE.md`, `TESTING.md`, `.cursorrules`
→ 전부 `E:\dev\check-in-stable\` 에 붙여넣기

### 3단계 — supabase 폴더 생성

```
E:\dev\check-in-stable\ 안에서
새 폴더 → 이름: supabase
supabase 폴더 안에 새 폴더 → 이름: migrations
migrations 폴더 안에 001_initial_schema.sql 붙여넣기
```

### 4단계 — Supabase DB 마이그레이션

1. Supabase 대시보드 접속 (https://supabase.com)
2. 프로젝트 선택
3. 왼쪽 메뉴 → SQL Editor
4. `001_initial_schema.sql` 파일 열기 → 전체 복사 (Ctrl+A → Ctrl+C)
5. SQL Editor에 붙여넣기 → Run 버튼
6. 오류 없이 완료되면 성공

**이미 일부 테이블이 있다면:**
`IF NOT EXISTS` 구문이 포함돼 있어서 기존 테이블은 건드리지 않는다. 안전하다.

### 5단계 — Claude Code 실행

```
1. VS Code에서 E:\dev\check-in-stable 폴더 열기
2. Claude Code 실행
3. START.md 파일 열기
4. "처음 시작할 때 이 명령어" 섹션의 텍스트 전체 복사
5. Claude Code 채팅창에 붙여넣기 → 실행
```

---

## 확인 방법

Claude Code가 파일을 제대로 읽었는지 확인하는 방법:

```
Claude Code에게 물어보기:
"CLAUDE.md를 읽었나? 이 프로젝트의 8가지 핵심 기능이 뭔지 말해봐라"
```

8가지 기능(사전진단/분쟁예방/비용절감/공정투명화/하자보수/서류자동화/견적적정성/리스크차단)을
정확히 나열하면 CLAUDE.md를 읽은 것이다.

틀리거나 모른다고 하면 파일 위치가 잘못된 것이다.

---

## 문제 상황별 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| Claude Code가 프로젝트 내용 모름 | 파일이 루트에 없음 | `E:\dev\check-in-stable\` 직접 확인 |
| `.cursorrules` 파일 안 보임 | 숨김 파일 | 탐색기 → 보기 → 숨긴 항목 체크 |
| SQL 실행 오류 | 일부 테이블 이미 존재 | 오류 메시지 테이블명 확인 후 해당 CREATE 문 제거 후 재실행 |
| Claude Code가 한국어 응답 안 함 | 언어 설정 | "한국어로 답해라" 한 번 말하면 됨 |
