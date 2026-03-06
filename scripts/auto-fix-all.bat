@echo off
echo ========================================
echo 체크인 DB 100%% 자동 수정
echo ========================================
echo.

echo Step 1: 현재 상태 확인
node scripts\check-all-tables.js
echo.

echo Step 2: 기존 테이블 데이터 채우기
node scripts\seed-all-tables.js
echo.

echo Step 3: 누락된 테이블 안내
echo.
echo [수동 작업 필요]
echo 1. Supabase Dashboard 접속
echo    https://supabase.com/dashboard/project/kilvdxrtmcxvycqevalv/sql
echo.
echo 2. SQL Editor에서 실행:
echo    파일: supabase\create-missing-tables.sql
echo.
echo 3. 실행 후 아래 명령어로 데이터 채우기:
echo    node scripts\seed-new-tables.js
echo.

echo Step 4: 최종 확인
node scripts\check-all-tables.js
echo.

echo ========================================
echo 완료!
echo ========================================
echo.
echo 비어있는 테이블이 남아있다면:
echo - SETUP-GUIDE.md 파일을 확인하세요
echo - supabase/create-missing-tables.sql을 수동 실행하세요
echo.

pause
