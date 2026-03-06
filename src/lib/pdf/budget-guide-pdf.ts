/**
 * budget-guide-pdf.ts — 예산 가이드 PDF 출력
 *
 * 방식: html2canvas → 이미지 → PDF (한글 완벽 지원)
 * 또는 DOM 없을 경우: jsPDF 직접 텍스트 작성 (폴백)
 */

import type { BudgetGuideResult } from '@/lib/ai/quote-chat'
import { createKoreanPDF, getAutoTable, A4, drawHeader, drawFooter, formatDateKr } from './pdf-core'

// ─── 예산 가이드 PDF 생성 (텍스트 직접 작성) ───────────────

export async function exportBudgetGuidePdf(result: BudgetGuideResult): Promise<void> {
  const autoTable = await getAutoTable()

  const doc = await createKoreanPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { margin, contentWidth } = A4
  const today = formatDateKr()

  // ── 헤더 ──
  drawHeader(doc, 'AI 예산 가이드', `${today} | ${result.area_pyeong}평`)

  let y = 32

  // ── 요약 배너 ──
  doc.setFillColor(237, 233, 254)
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F')
  doc.setTextColor(79, 70, 229)
  doc.setFontSize(9)
  doc.setFont('NanumGothic', 'bold')
  doc.text('AI 요약', margin + 4, y + 6)
  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(8)
  // 한글 요약은 ASCII로 대체 표기
  doc.text(`공간: ${result.space_type} | 등급: ${result.grade} | 일정: ${result.schedule}`, margin + 4, y + 11)
  y += 18

  // ── 3등급 비교표 ──
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(10)
  doc.setFont('NanumGothic', 'bold')
  doc.text('등급별 비교', margin, y)
  y += 5

  const gradeRows = [
    ['보급형', `${result.grades.economy.min.toLocaleString()}~${result.grades.economy.max.toLocaleString()}만원`, result.grades.economy.per_pyeong, result.grades.economy.good_for],
    ['표준형', `${result.grades.standard.min.toLocaleString()}~${result.grades.standard.max.toLocaleString()}만원`, result.grades.standard.per_pyeong, result.grades.standard.good_for],
    ['프리미엄', `${result.grades.premium.min.toLocaleString()}~${result.grades.premium.max.toLocaleString()}만원`, result.grades.premium.per_pyeong, result.grades.premium.good_for],
  ]

  autoTable(doc, {
    startY: y,
    head: [['등급', '예산 (만원)', '평당단가', '추천대상']],
    body: gradeRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 }, 1: { cellWidth: 44 }, 2: { cellWidth: 30 } },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 1) {
        data.cell.styles.fillColor = [245, 243, 255]
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── 숨겨진 비용 ──
  if (result.hidden_costs.length > 0) {
    doc.setFontSize(10)
    doc.setFont('NanumGothic', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('주의할 숨은 비용', margin, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['#', '항목']],
      body: result.hidden_costs.map((c, i) => [i + 1, c]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: margin, right: margin },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── 체크리스트 ──
  if (result.checklist.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(10)
    doc.setFont('NanumGothic', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('착공 전 체크리스트', margin, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['', '점검항목']],
      body: result.checklist.map((item, i) => [`${i + 1}`, item]),
      theme: 'plain',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
      margin: { left: margin, right: margin },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── 면책 고지 ──
  if (y > 260) {
    doc.addPage()
    y = 20
  }
  doc.setFillColor(255, 251, 235)
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F')
  doc.setDrawColor(245, 158, 11)
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'S')
  doc.setTextColor(146, 64, 14)
  doc.setFontSize(7.5)
  doc.setFont('NanumGothic', 'bold')
  doc.text('[면책 고지]', margin + 3, y + 5)
  doc.setFont('NanumGothic', 'normal')
  doc.text('본 자료는 AI 기반 참고용 예산이며, 법적 계약서가 아닙니다.', margin + 3, y + 10)
  doc.text('실제 비용은 달라질 수 있으니, 정확한 견적은 전문가와 상담하시기 바랍니다.', margin + 3, y + 14)

  // ── 전체 페이지 푸터 ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages)
  }

  const filename = `budget-guide-${result.space_type}-${result.area_pyeong}pyeong-${today.replace(/\./g, '')}.pdf`
  doc.save(filename)
}
