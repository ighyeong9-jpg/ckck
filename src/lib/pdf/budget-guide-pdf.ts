/**
 * budget-guide-pdf.ts — 예산 가이드 PDF 출력
 *
 * 방식: html2canvas → 이미지 → PDF (한글 완벽 지원)
 * 또는 DOM 없을 경우: jsPDF 직접 텍스트 작성 (폴백)
 */

import type { BudgetGuideResult } from '@/lib/ai/quote-chat'
import { getJsPDF, getAutoTable, A4, drawHeader, drawFooter, formatDateKr } from './pdf-core'

// ─── 예산 가이드 PDF 생성 (텍스트 직접 작성) ───────────────

export async function exportBudgetGuidePdf(result: BudgetGuideResult): Promise<void> {
  const jsPDF = await getJsPDF()
  const autoTable = await getAutoTable()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { margin, contentWidth } = A4
  const today = formatDateKr()

  // ── 헤더 ──
  drawHeader(doc, 'AI Budget Guide', `${today} | ${result.area_pyeong}pyeong`)

  let y = 32

  // ── 요약 배너 ──
  doc.setFillColor(237, 233, 254)
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F')
  doc.setTextColor(79, 70, 229)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('AI Summary', margin + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  // 한글 요약은 ASCII로 대체 표기
  doc.text(`Space: ${result.space_type} | Grade: ${result.grade} | Schedule: ${result.schedule}`, margin + 4, y + 11)
  y += 18

  // ── 3등급 비교표 ──
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Grade Comparison', margin, y)
  y += 5

  const gradeRows = [
    ['Economy', `${result.grades.economy.min.toLocaleString()}~${result.grades.economy.max.toLocaleString()} man`, result.grades.economy.per_pyeong, result.grades.economy.good_for],
    ['Standard', `${result.grades.standard.min.toLocaleString()}~${result.grades.standard.max.toLocaleString()} man`, result.grades.standard.per_pyeong, result.grades.standard.good_for],
    ['Premium', `${result.grades.premium.min.toLocaleString()}~${result.grades.premium.max.toLocaleString()} man`, result.grades.premium.per_pyeong, result.grades.premium.good_for],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Grade', 'Budget (10K KRW)', 'Per Pyeong', 'Best For']],
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
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Hidden Costs to Watch', margin, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item']],
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
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Pre-Construction Checklist', margin, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['', 'Check Item']],
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
  doc.setFont('helvetica', 'bold')
  doc.text('[DISCLAIMER]', margin + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text('This is an AI-generated reference budget. Not a legal contract.', margin + 3, y + 10)
  doc.text('Actual costs may vary. Please consult a professional for accurate quotes.', margin + 3, y + 14)

  // ── 전체 페이지 푸터 ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages)
  }

  const filename = `budget-guide-${result.space_type}-${result.area_pyeong}pyeong-${today.replace(/\./g, '')}.pdf`
  doc.save(filename)
}
