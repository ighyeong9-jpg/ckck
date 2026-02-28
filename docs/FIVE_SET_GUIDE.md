# 5종 세트 관리 가이드

## 개요
체키의 5종 세트는 건설 현장 관리의 5대 핵심 영역을 통합 관리합니다.

## 1. 안전관리 (Safety)
- 매일 TBM 10개 항목
- 주간 점검 10개 항목
- 4단계 안전 현황 (안전/주의/경고/위험)
- AI 위험성평가 자동 생성

## 2. 공정관리 (Process)
- 공정별 진행률 추적
- 변경관리 이력
- 일정 지연 자동 알림
- 공정표 시각화

## 3. 인력현장 (Workforce)
- QR/NFC 출역 체크인
- 일일 출역 현황
- 근로자 안전교육 이수 관리
- 외국인 근로자 다국어 지원

## 4. 자재비용 (Materials)
- 자재 입출고 관리
- 예산 대비 실집행 비교
- 비용 조정 계산 (ΔC = Cb × (1 + Σ(Wi × Fi)))
- 견적서 자동 생성

## 5. 법규증빙 (Compliance)
- 12개 법규 자동 확인
- 중처법 필수서류 10종 관리
- SHA-256 Merkle Tree 증빙 무결성
- AI 검증 인증서 발급
- 하자담보기간 자동 추적

## FeatureSetId 매핑
```typescript
type FeatureSetId = 'safety' | 'process' | 'workforce' | 'materials' | 'compliance'
```
