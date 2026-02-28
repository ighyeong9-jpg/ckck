/**
 * 리스크 점수 엔진 계산식 검증
 * node scripts/test_risk_engine.mjs
 *
 * 프롬프트 2 테스트 케이스:
 * - 법령 12개 중 2개 위반, 공정 10% 지연, 체크리스트 70% 완료
 * - 예상: Fp=16.67, Oc=20, Ch=30, R=21.5 → safe
 */

const Wf = 0.45
const Wo = 0.25
const Wc = 0.30

function toGrade(score) {
  if (score <= 25) return 'safe'
  if (score <= 50) return 'caution'
  if (score <= 75) return 'warning'
  return 'danger'
}

// ── 테스트 케이스 1 (프롬프트 2 예시) ────────────────────
console.log('=== 테스트 케이스 1: 프롬프트 2 예시 ===')

const fp1 = (2 / 12) * 100       // 16.667
const oc1 = Math.min(100, 10 * 2) // 20
const ch1 = (9 / 30) * 100        // 30  (70% 완료 → 30% 미완료)

const r1 = fp1 * Wf + oc1 * Wo + ch1 * Wc
const score1 = Math.round(r1)

console.log(`Fp = (2/12)×100 = ${fp1.toFixed(2)}`)
console.log(`Oc = min(100, 10×2) = ${oc1}`)
console.log(`Ch = (9/30)×100 = ${ch1.toFixed(2)}  ← 30개 항목 중 9개 미완료`)
console.log(`R  = ${fp1.toFixed(2)}×${Wf} + ${oc1}×${Wo} + ${ch1.toFixed(2)}×${Wc}`)
console.log(`   = ${(fp1*Wf).toFixed(2)} + ${(oc1*Wo).toFixed(2)} + ${(ch1*Wc).toFixed(2)}`)
console.log(`   = ${r1.toFixed(2)} → 반올림 ${score1}점`)
console.log(`등급: ${toGrade(score1)}`)
console.log()

const pass1 = score1 === 22 && toGrade(score1) === 'safe'
console.log(`결과: ${pass1 ? '✅ PASS' : '❌ FAIL'} (기대: 21~22점, safe)`)
console.log()

// ── 테스트 케이스 2: 위험 등급 ────────────────────────────
console.log('=== 테스트 케이스 2: 위험 등급 ===')

const fp2 = (8 / 12) * 100       // 66.67 (12개 중 8개 위반)
const oc2 = Math.min(100, 40 * 2) // 80   (40% 지연)
const ch2 = (20 / 20) * 100       // 100  (전혀 체크 안 함)

const r2 = fp2 * Wf + oc2 * Wo + ch2 * Wc
const score2 = Math.round(r2)

console.log(`Fp = ${fp2.toFixed(2)}, Oc = ${oc2}, Ch = ${ch2}`)
console.log(`R  = ${r2.toFixed(2)} → ${score2}점, ${toGrade(score2)}`)
console.log(`결과: ${toGrade(score2) === 'danger' ? '✅ PASS' : '❌ FAIL'} (기대: danger)`)
console.log()

// ── 테스트 케이스 3: 완벽한 상태 ─────────────────────────
console.log('=== 테스트 케이스 3: 완벽한 상태 ===')

const fp3 = 0    // 위반 없음
const oc3 = 0    // 지연 없음
const ch3 = 0    // 체크리스트 100% 완료

const r3 = fp3 * Wf + oc3 * Wo + ch3 * Wc
const score3 = Math.round(r3)

console.log(`Fp=${fp3}, Oc=${oc3}, Ch=${ch3} → R=${score3}점, ${toGrade(score3)}`)
console.log(`결과: ${score3 === 0 && toGrade(score3) === 'safe' ? '✅ PASS' : '❌ FAIL'} (기대: 0점, safe)`)
