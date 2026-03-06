# 한글 PDF 폰트 설치 가이드

PDF 문서에서 한글을 올바르게 표시하려면 **NanumGothic** 폰트 파일이 필요합니다.

## 설치 방법

### 방법 1: Google Fonts에서 다운로드 (권장)

1. **Google Fonts 나눔고딕 페이지 방문**
   - https://fonts.google.com/specimen/Nanum+Gothic

2. **다운로드 버튼 클릭**
   - 페이지 우측 상단 "Download family" 클릭
   - ZIP 파일이 다운로드됩니다

3. **폰트 파일 압축 해제**
   - 다운로드된 `Nanum_Gothic.zip` 파일 압축 해제
   - `NanumGothic-Regular.ttf` 파일 찾기

4. **이 폴더에 복사**
   - `NanumGothic-Regular.ttf` 파일을
   - `public/fonts/` 폴더에 복사

### 방법 2: Windows 시스템 폰트 사용

Windows에 기본 설치된 나눔고딕을 사용할 수 있습니다:

1. **시스템 폰트 폴더 열기**
   ```
   C:\Windows\Fonts\
   ```

2. **나눔고딕 찾기**
   - `NanumGothic.ttf` 또는 `NanumGothicRegular.ttf` 찾기

3. **복사**
   - 파일을 이 폴더(`public/fonts/`)에 복사
   - 파일명을 `NanumGothic-Regular.ttf`로 변경

### 방법 3: 직접 다운로드

나눔글꼴 공식 GitHub 저장소에서 다운로드:

```bash
# PowerShell 또는 Git Bash에서 실행
cd public/fonts
curl -L "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Regular.ttf" -o "NanumGothic-Regular.ttf"
```

## 설치 확인

폰트 파일이 다음 경로에 있어야 합니다:

```
check-in-stable/
└── public/
    └── fonts/
        └── NanumGothic-Regular.ttf  ✅ 필수
```

## 설치 후

폰트 파일을 설치한 후:

1. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

2. PDF 내보내기 기능 테스트:
   - 일일 보고서 PDF
   - 이슈 보고서 PDF
   - 하자담보 증명서 PDF
   - 예산 가이드 PDF

3. 한글이 정상적으로 표시되는지 확인

## 문제 해결

### 한글이 여전히 깨진다면

1. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete
   - 캐시 및 쿠키 삭제

2. **폰트 파일 확인**
   - 파일 크기가 0KB가 아닌지 확인
   - 파일명이 정확한지 확인 (`NanumGothic-Regular.ttf`)

3. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 폰트 로드 에러 메시지 확인

4. **대체 폰트 사용**
   - Noto Sans KR 또는 다른 한글 폰트 사용 가능
   - `src/lib/pdf/korean-font.ts` 파일에서 폰트 경로 수정

## 라이선스

- **NanumGothic**: OFL (Open Font License)
- 상업적 사용 가능
- 무료 배포 가능
