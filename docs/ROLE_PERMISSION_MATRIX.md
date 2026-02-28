# 역할별 권한 매트릭스

## 9개 역할

| 역할 | 한국어 | 접근 가능 세트 | 읽기전용 |
|------|--------|---------------|---------|
| site_manager | 현장소장 | 안전, 공정, 법규, 자재, 인력 | ❌ |
| safety_officer | 안전관리자 | 안전, 법규, 인력 | ❌ |
| team_leader | 작업반장 | 공정, 인력, 안전 | ❌ |
| worker | 일반작업자 | 안전 | ❌ |
| inspector | 감리 | 법규, 공정 | ✅ |
| subcontractor | 하도급대표 | 인력, 자재, 공정 | ❌ |
| specialist | 협력업체 | 안전, 공정, 자재 | ❌ |
| client | 고객/건축주 | 공정, 안전, 자재 | ✅ |
| building_manager | 건물관리자 | 법규, 공정, 인력 | ❌ |

## FeatureSetId 매핑

| FeatureSetId | 한국어 | 포함 메뉴 |
|-------------|--------|-----------|
| safety | 안전관리 | 진단, 사전점검, 현장 이슈 |
| process | 공정관리 | 현장관리, 변경관리, 공정관리, 현장사진, 고객관리 |
| compliance | 법규증빙 | 하자담보, 증빙, 합의, 리포트, 인증서, 하자요청 |
| materials | 자재비용 | 예산가이드, 견적서, 비용분석, 자재관리 |
| workforce | 인력현장 | 인력관리 |

## 사이드바 필터링 로직
```typescript
const filterByRole = <T extends { requiredSet?: FeatureSetId }>(items: T[]): T[] =>
  items.filter(item => !item.requiredSet || allowedSets.includes(item.requiredSet))
```

- `requiredSet`가 없는 메뉴: 모든 역할에 표시 (대시보드, AI채팅, 프로필 등)
- `requiredSet`가 있는 메뉴: 해당 역할의 `allowedSets`에 포함된 경우만 표시
