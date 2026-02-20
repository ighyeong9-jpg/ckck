/**
 * quote-format.ts — 금액 포맷 유틸 (클라이언트에서 사용 가능)
 *
 * quote-generator.ts는 서버 전용(callGemini 포함)
 * 클라이언트 컴포넌트는 이 파일을 import할 것
 */

export function formatAmount(amountInMan: number): string {
  if (amountInMan >= 10000) {
    const eok = Math.floor(amountInMan / 10000)
    const man = amountInMan % 10000
    if (man === 0) return `${eok}억원`
    return `${eok}억 ${man.toLocaleString()}만원`
  }
  return `${amountInMan.toLocaleString()}만원`
}

export function formatRange(min: number, max: number): string {
  return `${formatAmount(min)} ~ ${formatAmount(max)}`
}
