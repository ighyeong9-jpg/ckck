/**
 * issue-report-pdf.ts — 현장 이슈 내역 PDF
 *
 * 선택된 이슈 목록을 PDF 표로 출력
 * 심각도별 색상 강조
 */

import { getJsPDF, getAutoTable, A4, drawHeader, drawFooter, formatDateKr } from './pdf-core'
import type { SiteIssue } from '@/components/issues/IssueCard'

const SEV_COLORS: Record<string, [number, number, number]> = {
  critical: [220, 38, 38],
  high:     [234, 88, 12],
  medium:   [202, 138, 4],
  low:      [22, 163, 74],
}

const SEV_LABELS: Record<string, string> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW',
}

const CAT_LABELS: Record<string, string> = {
  safety: 'Safety', quality: 'Quality', cost: 'Cost', schedule: 'Schedule',
  legal: 'Legal', material: 'Material', labor: 'Labor', weather: 'Weather',
  design_change: 'Design', other: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', reviewing: 'Reviewing', approved: 'Approved',
  rejected: 'Rejected', resolved: 'Resolved',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export async function exportIssueReportPdf(
  issues: SiteIssue[],
  projectName?: string,
): Promise<void> {
  const jsPDF = await getJsPDF()
  const autoTable = await getAutoTable()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { margin } = A4
  const today = formatDateKr()

  const subtitle = projectName
    ? `Project: ${projectName} | ${today} | Total: ${issues.length}`
    : `${today} | Total: ${issues.length} issues`

  drawHeader(doc, 'Site Issue Report', subtitle)

  // ── 통계 요약 ──
  const critical = issues.filter(i => i.severity === 'critical').length
  const high = issues.filter(i => i.severity === 'high').length
  const open = issues.filter(i => i.status === 'open').length
  const resolved = issues.filter(i => i.status === 'resolved').length

  let y = 32

  const statCols = [
    { label: 'CRITICAL', value: critical, color: SEV_COLORS.critical },
    { label: 'HIGH', value: high, color: SEV_COLORS.high },
    { label: 'OPEN', value: open, color: [59, 130, 246] as [number, number, number] },
    { label: 'RESOLVED', value: resolved, color: [16, 185, 129] as [number, number, number] },
  ]
  const colW = A4.contentWidth / 4
  statCols.forEach((s, i) => {
    const x = margin + i * colW
    doc.setFillColor(...s.color)
    doc.roundedRect(x, y, colW - 3, 16, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(String(s.value), x + colW / 2 - 1.5, y + 9, { align: 'center' })
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(s.label, x + colW / 2 - 1.5, y + 14, { align: 'center' })
  })
  y += 22

  // ── 이슈 목록 표 ──
  const rows = issues.map(issue => [
    formatDate(issue.created_at),
    SEV_LABELS[issue.severity] ?? issue.severity,
    CAT_LABELS[issue.category] ?? issue.category,
    issue.title,
    issue.summary ?? '',
    STATUS_LABELS[issue.status] ?? issue.status,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Severity', 'Category', 'Title', 'Summary', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 36 },
      4: { cellWidth: 62 },
      5: { cellWidth: 18 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        const sev = issues[data.row.index]?.severity
        if (sev && SEV_COLORS[sev]) {
          const [r, g, b] = SEV_COLORS[sev]
          data.cell.styles.textColor = [r, g, b]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // ── 상세 내용 (resolved 제외 이슈) ──
  const activeIssues = issues.filter(i => i.status !== 'resolved').slice(0, 10)
  if (activeIssues.length > 0) {
    doc.addPage()
    drawHeader(doc, 'Site Issue Report', 'Action Items')
    y = 28

    activeIssues.forEach((issue, idx) => {
      if (y > 250) {
        doc.addPage()
        drawHeader(doc, 'Site Issue Report', 'Action Items (cont.)')
        y = 28
      }

      const [r, g, b] = SEV_COLORS[issue.severity] ?? [107, 114, 128]
      doc.setFillColor(r, g, b)
      doc.rect(margin, y, 3, 20, 'F')

      doc.setTextColor(31, 41, 55)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${idx + 1}. ${issue.title}`, margin + 6, y + 6)

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(`${SEV_LABELS[issue.severity]} | ${CAT_LABELS[issue.category]} | ${formatDate(issue.created_at)}`, margin + 6, y + 11)

      if (issue.summary) {
        doc.setTextColor(55, 65, 81)
        doc.text(issue.summary.substring(0, 90), margin + 6, y + 16)
      }

      if (issue.recommended_actions?.length > 0) {
        y += 22
        issue.recommended_actions.slice(0, 3).forEach((action, ai) => {
          doc.setFillColor(240, 253, 244)
          doc.rect(margin + 6, y, A4.contentWidth - 6, 6, 'F')
          doc.setTextColor(22, 101, 52)
          doc.setFontSize(7)
          doc.text(`${ai + 1}. ${action.substring(0, 100)}`, margin + 10, y + 4)
          y += 7
        })
      } else {
        y += 24
      }

      y += 4
    })
  }

  // ── 푸터 ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages)
  }

  const filename = `issue-report-${today.replace(/\./g, '')}.pdf`
  doc.save(filename)
}
