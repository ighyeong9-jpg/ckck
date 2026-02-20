/**
 * warranty-pdf.ts — 하자담보 안내서 PDF
 *
 * 공종별 하자담보기간 + 법적 근거 + 만료일 달력 출력
 */

import { getJsPDF, getAutoTable, A4, drawHeader, drawFooter, formatDateKr } from './pdf-core'

export interface WarrantyItem {
  processName: string       // 공종명
  completedDate: string     // 완료일 (YYYY-MM-DD)
  warrantyMonths: number    // 담보기간 (개월)
  expiryDate: string        // 만료일 (YYYY-MM-DD)
  legalBasis: string        // 법적 근거
  status: 'active' | 'expiring_soon' | 'expired'
  daysLeft: number          // 남은 일수
}

// 공종별 기본 하자담보기간 (건산법 제28조)
export const WARRANTY_STANDARDS: Array<{
  category: string
  processes: string[]
  months: number
  law: string
}> = [
  {
    category: '마감·도배·도장',
    processes: ['도배', '도장', '벽지', '바닥재', '타일(마감)', '가구'],
    months: 12,
    law: '건산법 제28조 제1항 — 마감공사 1년',
  },
  {
    category: '방수·창호·설비',
    processes: ['방수', '창호', '유리', '전기', '통신', '냉난방'],
    months: 36,
    law: '건산법 제28조 제2항 — 방수·설비공사 3년',
  },
  {
    category: '구조·골조',
    processes: ['철거', '골조', '기초', '콘크리트', '철근'],
    months: 120,
    law: '건산법 제28조 제3항 — 구조물 10년',
  },
]

function daysToExpiry(expiryDate: string): number {
  const now = new Date()
  const exp = new Date(expiryDate)
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000)
}

function getStatus(days: number): WarrantyItem['status'] {
  if (days < 0) return 'expired'
  if (days <= 90) return 'expiring_soon'
  return 'active'
}

const STATUS_CONFIG = {
  active:         { label: 'Active',         color: [16, 185, 129] as [number, number, number],  bg: [240, 253, 244] as [number, number, number] },
  expiring_soon:  { label: 'Expiring Soon',  color: [245, 158, 11] as [number, number, number],  bg: [255, 251, 235] as [number, number, number] },
  expired:        { label: 'Expired',        color: [220, 38, 38]  as [number, number, number],  bg: [254, 242, 242] as [number, number, number] },
}

export async function exportWarrantyPdf(
  items: WarrantyItem[],
  projectName: string,
  contractorName?: string,
): Promise<void> {
  const jsPDF = await getJsPDF()
  const autoTable = await getAutoTable()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { margin, contentWidth } = A4
  const today = formatDateKr()

  drawHeader(doc, 'Warranty Certificate', `${projectName} | ${today}`)

  let y = 30

  // ── 프로젝트 정보 박스 ──
  doc.setFillColor(245, 243, 255)
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F')
  doc.setTextColor(79, 70, 229)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('WARRANTY CERTIFICATE', margin + contentWidth / 2, y + 7, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  const subtitle = contractorName
    ? `Project: ${projectName}  |  Contractor: ${contractorName}  |  Date: ${today}`
    : `Project: ${projectName}  |  Issued: ${today}`
  doc.text(subtitle, margin + contentWidth / 2, y + 13, { align: 'center' })
  y += 22

  // ── 통계 요약 ──
  const activeCount = items.filter(i => i.status === 'active').length
  const soonCount = items.filter(i => i.status === 'expiring_soon').length
  const expiredCount = items.filter(i => i.status === 'expired').length

  const stats = [
    { label: 'ACTIVE', value: activeCount, color: STATUS_CONFIG.active.color },
    { label: 'EXPIRING', value: soonCount, color: STATUS_CONFIG.expiring_soon.color },
    { label: 'EXPIRED', value: expiredCount, color: STATUS_CONFIG.expired.color },
    { label: 'TOTAL', value: items.length, color: [79, 70, 229] as [number, number, number] },
  ]

  const statW = contentWidth / 4
  stats.forEach((s, i) => {
    const x = margin + i * statW
    doc.setFillColor(...s.color)
    doc.roundedRect(x, y, statW - 2, 14, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(String(s.value), x + statW / 2 - 1, y + 8, { align: 'center' })
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(s.label, x + statW / 2 - 1, y + 12, { align: 'center' })
  })
  y += 18

  // ── 하자담보 목록 표 ──
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text('Warranty Items', margin, y)
  y += 4

  const rows = items.map(item => [
    item.processName,
    formatDateKr(item.completedDate),
    `${item.warrantyMonths}mo`,
    formatDateKr(item.expiryDate),
    item.daysLeft < 0 ? `D+${Math.abs(item.daysLeft)}` : `D-${item.daysLeft}`,
    STATUS_CONFIG[item.status].label,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Process', 'Completed', 'Period', 'Expires', 'D-Day', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 24 },
      2: { cellWidth: 18 },
      3: { cellWidth: 24 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (d: any) => {
      if (d.section === 'body') {
        const status = items[d.row.index]?.status
        const cfg = STATUS_CONFIG[status]
        if (d.column.index === 5 && cfg) {
          d.cell.styles.textColor = cfg.color
          d.cell.styles.fontStyle = 'bold'
        }
        if (d.column.index === 4) {
          const days = items[d.row.index]?.daysLeft ?? 0
          d.cell.styles.textColor = days < 0 ? [220, 38, 38] : days <= 90 ? [245, 158, 11] : [16, 185, 129]
          d.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── 법적 근거 섹션 ──
  if (y > 230) { doc.addPage(); drawHeader(doc, 'Warranty Certificate', `${projectName} — Legal Basis`); y = 28 }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text('Legal Basis (Korean Construction Industry Basic Act Art.28)', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Processes', 'Period', 'Legal Basis']],
    body: WARRANTY_STANDARDS.map(s => [
      s.category,
      s.processes.slice(0, 4).join(', '),
      `${s.months / 12}yr`,
      s.law,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 45 }, 2: { cellWidth: 16 }, 3: { cellWidth: 91 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── 만료 임박 경고 ──
  const expiringSoon = items.filter(i => i.status === 'expiring_soon')
  if (expiringSoon.length > 0) {
    if (y > 250) { doc.addPage(); y = 28 }
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(margin, y, contentWidth, expiringSoon.length * 8 + 10, 2, 2, 'F')
    doc.setDrawColor(245, 158, 11)
    doc.roundedRect(margin, y, contentWidth, expiringSoon.length * 8 + 10, 2, 2, 'S')
    doc.setTextColor(146, 64, 14)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('⚠ Expiring Within 90 Days', margin + 3, y + 6)
    expiringSoon.forEach((item, i) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(
        `• ${item.processName}: ${formatDateKr(item.expiryDate)} (D-${item.daysLeft})`,
        margin + 6,
        y + 12 + i * 8,
      )
    })
  }

  // ── 푸터 ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages)
  }

  const filename = `warranty-${projectName.replace(/\s+/g, '-')}-${today.replace(/\./g, '')}.pdf`
  doc.save(filename)
}

// ── 헬퍼: WarrantyTracking DB 데이터 → WarrantyItem 변환 ──
export function toWarrantyItems(trackings: any[]): WarrantyItem[] {
  return trackings.map(t => {
    const days = daysToExpiry(t.warranty_expires_date)
    return {
      processName: t.process_name,
      completedDate: t.completed_date,
      warrantyMonths: t.warranty_period_months,
      expiryDate: t.warranty_expires_date,
      legalBasis: `건산법 제28조 (${t.warranty_period_months}개월)`,
      status: getStatus(days),
      daysLeft: days,
    }
  })
}
