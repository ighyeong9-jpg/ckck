# QR 출역 체크인 사양서

## 개요
현장 입구에 QR 코드를 설치하여 근로자의 출역을 자동 관리합니다.

## 흐름
1. 현장소장이 프로젝트별 QR 코드 생성
2. 현장 입구에 QR 코드 인쇄 게시
3. 근로자가 스마트폰으로 QR 스캔
4. 출근/퇴근 자동 기록
5. 실시간 현장 인력 현황 대시보드 반영

## QR 코드 규격
- 형식: URL 기반 (`/checkin/{projectId}/{token}`)
- 크기: 최소 150×150mm (현장 가시성)
- 오류 보정: Level H (30%)
- 갱신: 일일 자동 갱신 (보안)

## NFC 대안
- NFC 태그: NTAG215 (540바이트)
- 방수등급: IP67 이상
- 설치위치: 현장 출입구 1.2m 높이

## 오프라인 처리
- QR 스캔 시 로컬 IndexedDB에 즉시 저장
- 네트워크 복구 시 Supabase로 자동 동기화
- 충돌 해결: 타임스탬프 기준 Last-Write-Wins

## DB 테이블
```sql
CREATE TABLE checkin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  worker_id UUID REFERENCES workforce(id),
  check_type TEXT CHECK (check_type IN ('in', 'out')),
  checked_at TIMESTAMPTZ DEFAULT now(),
  method TEXT CHECK (method IN ('qr', 'nfc', 'manual')),
  synced BOOLEAN DEFAULT true
);
```
