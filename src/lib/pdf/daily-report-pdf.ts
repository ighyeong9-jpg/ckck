/**
 * daily-report-pdf.ts — 현장 일보 PDF
 *
 * 프로젝트 공정·인력·자재 데이터를 하루 단위로 출력
 */

import { createKoreanPDF, getAutoTable, A4, drawHeader, drawFooter, formatDateKr } from './pdf-core'

export interface DailyReportData {
  projectName: string
  reportDate: string         // YYYY-MM-DD
  weather?: string
  temperature?: string
  supervisor?: string
  // 공정
  processes: Array<{
    name: string
    status: string           // 진행중/완료/대기
    progress: number         // 0~100
    note?: string
  }>
  // 인력
  workforce: Array<{
    name: string
    role: string
    hours: number
    note?: string
  }>
  // 자재
  materials: Array<{
    name: string
    quantity: string
    unit: string
    status: string
  }>
  // 이슈/특이사항
  issues?: string[]
  tomorrowPlan?: string
  aiSummary?: string
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  '완료': [16, 185, 129],
  '진행중': [79, 70, 229],
  '대기': [156, 163, 175],
  'completed': [16, 185, 129],
  'in_progress': [79, 70, 229],
  'pending': [156, 163, 175],
}

export async function exportDailyReportPdf(data: DailyReportData): Promise<void> {
  const autoTable = await getAutoTable()

  const doc = await createKoreanPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { margin, contentWidth } = A4
  const today = formatDateKr(data.reportDate)

  drawHeader(doc, '현장 일일 보고서', `${data.projectName} | ${today}`)

  let y = 30

  // ── 기본 정보 바 ──
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F')
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'S')

  const infoItems = [
    `날짜: ${today}`,
    data.weather ? `날씨: ${data.weather}` : '',
    data.temperature ? `온도: ${data.temperature}` : '',
    data.supervisor ? `담당자: ${data.supervisor}` : '',
  ].filter(Boolean)

  doc.setTextColor(55, 65, 81)
  doc.setFontSize(8)
  doc.setFont('NanumGothic', 'normal')
  const itemW = contentWidth / infoItems.length
  infoItems.forEach((item, i) => {
    doc.text(item, margin + i * itemW + 4, y + 8)
  })
  y += 18

  // ── AI 요약 ──
  if (data.aiSummary) {
    doc.setFillColor(237, 233, 254)
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F')
    doc.setTextColor(79, 70, 229)
    doc.setFontSize(7.5)
    doc.setFont('NanumGothic', 'normal')
    doc.text('AI 요약  ', margin + 3, y + 5)
    doc.setFont('NanumGothic', 'normal')
    doc.text(data.aiSummary.substring(0, 110), margin + 22, y + 5)
    y += 16
  }

  // ── 공정 현황 ──
  if (data.processes.length > 0) {
    doc.setFontSize(9)
    doc.setFont('NanumGothic', 'normal')
    doc.setTextColor(31, 41, 55)
    doc.text('공정 현황', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['공정명', '상태', '진척도', '비고']],
      body: data.processes.map(p => [
        p.name,
        p.status,
        `${p.progress}%`,
        p.note ?? '',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 75 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 1) {
          const status = data.processes[d.row.index]?.status
          const color = STATUS_COLORS[status]
          if (color) {
            d.cell.styles.textColor = color
            d.cell.styles.fontStyle = 'bold'
          }
        }
        if (d.section === 'body' && d.column.index === 2) {
          const pct = data.processes[d.row.index]?.progress ?? 0
          d.cell.styles.textColor = pct === 100 ? [16, 185, 129] : pct >= 50 ? [79, 70, 229] : [245, 158, 11]
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── 인력 현황 ──
  if (data.workforce.length > 0) {
    if (y > 220) { doc.addPage(); drawHeader(doc, '현장 일일 보고서', `${data.projectName} | ${today} (계속)`); y = 28 }

    doc.setFontSize(9)
    doc.setFont('NanumGothic', 'normal')
    doc.setTextColor(31, 41, 55)
    doc.text('인력 현황', margin, y)
    y += 4

    const totalHours = data.workforce.reduce((s, w) => s + (w.hours ?? 0), 0)

    autoTable(doc, {
      startY: y,
      head: [['이름', '역할', '시간', '비고']],
      body: [
        ...data.workforce.map(w => [w.name, w.role, `${w.hours}h`, w.note ?? '']),
        ['', '합계', `${totalHours}h`, ''],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
      margin: { left: margin, right: margin },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.row.index === data.workforce.length) {
          d.cell.styles.fontStyle = 'bold'
          d.cell.styles.fillColor = [243, 244, 246]
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── 자재 현황 ──
  if (data.materials.length > 0) {
    if (y > 220) { doc.addPage(); drawHeader(doc, '현장 일일 보고서', `${data.projectName} | ${today} (계속)`); y = 28 }

    doc.setFontSize(9)
    doc.setFont('NanumGothic', 'normal')
    doc.setTextColor(31, 41, 55)
    doc.text('자재 현황', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['자재명', '수량', '단위', '상태']],
      body: data.materials.map(m => [m.name, m.quantity, m.unit, m.status]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── 이슈 / 특이사항 ──
  if (data.issues && data.issues.length > 0) {
    if (y > 240) { doc.addPage(); drawHeader(doc, '현장 일일 보고서', `${data.projectName} | ${today} (계속)`); y = 28 }

    doc.setFontSize(9)
    doc.setFont('NanumGothic', 'normal')
    doc.setTextColor(220, 38, 38)
    doc.text('이슈 / 특이사항', margin, y)
    y += 5

    data.issues.forEach((issue, i) => {
      doc.setFillColor(254, 242, 242)
      doc.rect(margin, y, contentWidth, 7, 'F')
      doc.setTextColor(153, 27, 27)
      doc.setFontSize(7.5)
      doc.setFont('NanumGothic', 'normal')
      doc.text(`${i + 1}. ${issue.substring(0, 110)}`, margin + 3, y + 5)
      y += 9
    })
  }

  // ── 내일 계획 ──
  if (data.tomorrowPlan) {
    if (y > 255) { doc.addPage(); drawHeader(doc, '현장 일일 보고서', `계속`); y = 28 }
    y += 2
    doc.setFillColor(240, 249, 255)
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F')
    doc.setTextColor(3, 105, 161)
    doc.setFontSize(8)
    doc.setFont('NanumGothic', 'normal')
    doc.text("내일 계획: ", margin + 3, y + 7)
    doc.setFont('NanumGothic', 'normal')
    doc.text(data.tomorrowPlan.substring(0, 120), margin + 36, y + 7)
    y += 14
  }

  // ── 푸터 ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages)
  }

  const filename = `daily-report-${data.reportDate.replace(/-/g, '')}.pdf`
  doc.save(filename)
}
