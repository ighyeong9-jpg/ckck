/**
 * pdf-core.ts — jsPDF 공통 유틸
 *
 * 한글 지원: html2canvas → 이미지 → PDF 삽입 방식
 * 텍스트 전용: jsPDF 직접 작성 (영숫자+기호만)
 */

// ─── jsPDF는 브라우저 전용이므로 dynamic import 사용 ─────
export async function getJsPDF() {
  const { jsPDF } = await import('jspdf')
  return jsPDF
}

export async function getAutoTable(): Promise<(doc: any, options: any) => void> {
  const mod = await import('jspdf-autotable')
  return ((mod as any).default ?? mod) as (doc: any, options: any) => void
}

// ─── html2canvas ────────────────────────────────────────
export async function getHtml2Canvas(): Promise<(el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>> {
  const mod = await import('html2canvas')
  return ((mod as any).default ?? mod) as (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>
}

// ─── DOM 요소 → PDF 이미지 삽입 ─────────────────────────

export async function elementToPdfImage(
  element: HTMLElement,
  opts?: { scale?: number },
): Promise<{ dataUrl: string; width: number; height: number }> {
  const html2canvas = await getHtml2Canvas()
  const canvas = await html2canvas(element, {
    scale: opts?.scale ?? 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.95),
    width: canvas.width,
    height: canvas.height,
  }
}

// ─── A4 크기 상수 ────────────────────────────────────────
export const A4 = {
  width: 210,   // mm
  height: 297,  // mm
  margin: 14,   // mm
  contentWidth: 182,  // 210 - 14*2
}

// ─── 공통 헤더 그리기 ────────────────────────────────────

export function drawHeader(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  title: string,
  subtitle?: string,
) {
  const { margin } = A4

  // 상단 바
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, A4.width, 18, 'F')

  // 로고
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('CHECK-IN', margin, 11)

  // 제목
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(title, A4.width - margin, 11, { align: 'right' })

  if (subtitle) {
    doc.setFillColor(245, 243, 255)
    doc.rect(0, 18, A4.width, 10, 'F')
    doc.setTextColor(79, 70, 229)
    doc.setFontSize(8)
    doc.text(subtitle, margin, 24)
  }
}

// ─── 공통 푸터 ────────────────────────────────────────────

export function drawFooter(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  pageNum: number,
  totalPages: number,
) {
  const y = A4.height - 8
  doc.setDrawColor(229, 231, 235)
  doc.line(A4.margin, y - 2, A4.width - A4.margin, y - 2)

  doc.setTextColor(156, 163, 175)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `AI 예상 참고용 | 실측 후 확인 필요 | 계약서 효력 없음`,
    A4.margin,
    y + 1,
  )
  doc.text(
    `${pageNum} / ${totalPages}`,
    A4.width - A4.margin,
    y + 1,
    { align: 'right' },
  )
}

// ─── 날짜 포맷 ───────────────────────────────────────────

export function formatDateKr(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── 금액 포맷 ───────────────────────────────────────────

export function formatAmountPdf(amountInMan: number): string {
  if (amountInMan >= 10000) {
    const eok = Math.floor(amountInMan / 10000)
    const man = amountInMan % 10000
    if (man === 0) return `${eok}ok`  // 억 → 'ok' (ASCII)
    return `${eok}ok ${man.toLocaleString()}man`
  }
  return `${amountInMan.toLocaleString()}man`
}
