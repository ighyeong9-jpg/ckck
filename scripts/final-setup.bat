@echo off
echo ========================================
echo 최종 설정 - 데이터 채우기
echo ========================================
echo.

echo 신규 테이블에 데이터 생성 중...
node scripts\seed-new-tables.js
echo.

echo 최종 상태 확인...
node scripts\check-all-tables.js
echo.

echo ========================================
echo 완료!
echo ========================================
pause
