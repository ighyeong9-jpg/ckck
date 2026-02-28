/**
 * pdfExporter.ts — 체크인 PDF 출력 유틸리티
 *
 * 출력 가능 문서 4종:
 * 1. 안전 확인 보고서
 * 2. 일일 현장 일보
 * 3. 하자보수 요청 내용통지 양식
 * 4. 기록 보관 요약서
 *
 * 기술: jsPDF (이미 설치됨)
 */

import { jsPDF } from 'jspdf'

const WATERMARK = '체크인 (Check-In) — 기록의 편'
const TODAY = () => new Date().toLocaleDateString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric',
})

// ─── 공통 헬퍼 ────────────────────────────────────────────

function createPDF(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

function addHeader(doc: jsPDF, title: string) {
  doc.setFillColor(79, 70, 229)  // indigo-600
  doc.rect(0, 0, 210, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('체크인 CHECK-IN', 14, 10)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 16)
  doc.text(TODAY(), 196, 10, { align: 'right' })
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text(WATERMARK, 105, 291, { align: 'center' })
    doc.text(`${i} / ${pages}`, 196, 291, { align: 'right' })
  }
}

function addSection(doc: jsPDF, y: number, label: string, value: string, isMultiline = false): number {
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.text(label, 14, y)

  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')

  if (isMultiline) {
    const lines = doc.splitTextToSize(value, 170)
    doc.text(lines, 14, y + 5)
    return y + 5 + lines.length * 5 + 4
  } else {
    doc.text(value || '—', 14, y + 5)
    return y + 14
  }
}

function addDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(230, 230, 230)
  doc.line(14, y, 196, y)
  return y + 4
}

// ─── 1. 안전 확인 보고서 ───────────────────────────────────

export interface GoNoGoData {
  projectName: string
  siteName?: string
  processName: string
  judgment: 'GO' | '위험 확인' | 'CONDITIONAL'
  reason: string
  legalBasis?: string
  inspector?: string
  photos?: string[]  // base64 이미지들
}

export function exportGoNoGoPDF(data: GoNoGoData): void {
  const doc = createPDF()
  addHeader(doc, '안전 현황 확인서')

  let y = 28

  // 확인 결과 뱃지
  const color = data.judgment === 'GO' ? [0, 208, 132] : data.judgment === '위험 확인' ? [255, 59, 92] : [255, 184, 0]
  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(14, y, 60, 14, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(data.judgment, 44, y + 9, { align: 'center' })
  y += 22

  doc.setTextColor(30, 30, 30)
  y = addSection(doc, y, '프로젝트', data.projectName)
  y = addDivider(doc, y)
  y = addSection(doc, y, '공종', data.processName)
  y = addDivider(doc, y)
  y = addSection(doc, y, '확인 근거', data.reason, true)
  y = addDivider(doc, y)
  if (data.legalBasis) {
    y = addSection(doc, y, '법적 근거', data.legalBasis, true)
    y = addDivider(doc, y)
  }
  if (data.inspector) {
    y = addSection(doc, y, '점검자', data.inspector)
    y = addDivider(doc, y)
  }
  y = addSection(doc, y, '확인일', TODAY())

  // 면책 고지
  y += 8
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'italic')
  doc.text('⚠ 이 확인서는 현장 기록 참고용입니다. 법적 효력을 갖는 판단은 전문 기관에 확인하세요.', 14, y)

  addFooter(doc)
  doc.save(`안전현황-확인서_${data.projectName}_${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─── 2. 일일 현장 일보 ────────────────────────────────────

export interface DailyReportData {
  projectName: string
  date: string
  weather?: string
  workers?: number
  completedTasks: string[]
  issues?: string
  nextPlan?: string
  writtenBy?: string
}

export function exportDailyReportPDF(data: DailyReportData): void {
  const doc = createPDF()
  addHeader(doc, '일일 현장 일보')

  let y = 28
  y = addSection(doc, y, '프로젝트명', data.projectName)
  y = addDivider(doc, y)
  y = addSection(doc, y, '작성일', data.date)
  y = addDivider(doc, y)
  if (data.weather) { y = addSection(doc, y, '날씨', data.weather); y = addDivider(doc, y) }
  if (data.workers) { y = addSection(doc, y, '작업 인원', `${data.workers}명`); y = addDivider(doc, y) }

  // 완료 작업 목록
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.text('오늘 완료 작업', 14, y)
  y += 6
  data.completedTasks.forEach((task, i) => {
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.text(`${i + 1}. ${task}`, 18, y)
    y += 6
  })
  y += 2
  y = addDivider(doc, y)

  if (data.issues) { y = addSection(doc, y, '발생 이슈', data.issues, true); y = addDivider(doc, y) }
  if (data.nextPlan) { y = addSection(doc, y, '내일 예정 작업', data.nextPlan, true); y = addDivider(doc, y) }
  if (data.writtenBy) { y = addSection(doc, y, '작성자', data.writtenBy) }

  addFooter(doc)
  doc.save(`일보_${data.projectName}_${data.date}.pdf`)
}

// ─── 3. 하자보수 요청 내용통지 양식 ──────────────────────

export interface WarrantyClaimData {
  projectName: string
  contractorName: string
  contractorAddress?: string
  claimantName: string
  claimantContact: string
  completionDate: string
  defects: Array<{ location: string; description: string; discoveryDate: string }>
  requestDeadline: string
}

export function exportWarrantyClaimPDF(data: WarrantyClaimData): void {
  const doc = createPDF()
  addHeader(doc, '하자보수 요청 내용통지')

  let y = 28

  // 제목
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('하자보수 이행 요청서', 105, y, { align: 'center' })
  y += 12

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('※ 이 문서는 내용통지 발송용 서식입니다. 내용통지으로 발송 시 법적 효력이 발생합니다.', 105, y, { align: 'center' })
  y += 10
  y = addDivider(doc, y)

  y = addSection(doc, y, '수신 (시공사)', data.contractorName + (data.contractorAddress ? `\n${data.contractorAddress}` : ''), true)
  y = addDivider(doc, y)
  y = addSection(doc, y, '발신 (의뢰인)', `${data.claimantName} (${data.claimantContact})`)
  y = addDivider(doc, y)
  y = addSection(doc, y, '공사 완료일', data.completionDate)
  y = addDivider(doc, y)
  y = addSection(doc, y, '현장명', data.projectName)
  y = addDivider(doc, y)

  // 하자 목록
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.text('하자 발생 내용', 14, y)
  y += 6
  data.defects.forEach((d, i) => {
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}. 위치: ${d.location}  (발견일: ${d.discoveryDate})`, 18, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(d.description, 160)
    doc.text(lines, 22, y)
    y += lines.length * 5 + 3
  })
  y = addDivider(doc, y)

  // 법적 근거
  const legalText = '민법 제667조 (수급인의 담보책임), 건설산업기본법 제28조 (하자담보책임)에 따라 수급인은 하자보수 의무가 있습니다.'
  y = addSection(doc, y, '법적 근거', legalText, true)
  y = addDivider(doc, y)
  y = addSection(doc, y, '보수 요청 기한', data.requestDeadline)

  y += 20
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text(`${TODAY()}`, 105, y, { align: 'center' })
  y += 8
  doc.text(`발신인: ${data.claimantName}  (인)`, 105, y, { align: 'center' })

  addFooter(doc)
  doc.save(`하자보수요청_${data.projectName}_${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─── 4. 기록 보관 요약서 ─────────────────────────────────

export interface DisputeSummaryData {
  projectName: string
  disputeType: string
  situation: string
  legalBasis: string[]
  recommendedActions: string[]
  evidenceList: string[]
}

export function exportDisputeSummaryPDF(data: DisputeSummaryData): void {
  const doc = createPDF()
  addHeader(doc, '기록 보관 요약서')

  let y = 28

  doc.setFontSize(8)
  doc.setFillColor(255, 245, 235)
  doc.roundedRect(14, y, 182, 10, 2, 2, 'F')
  doc.setTextColor(255, 107, 43)
  doc.setFont('helvetica', 'bold')
  doc.text(`⚠ 기록 관리 유형: ${data.disputeType}`, 18, y + 6.5)
  y += 16

  doc.setTextColor(30, 30, 30)
  y = addSection(doc, y, '프로젝트명', data.projectName)
  y = addDivider(doc, y)
  y = addSection(doc, y, '상황 요약', data.situation, true)
  y = addDivider(doc, y)

  // 법적 근거
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.text('관련 법적 근거', 14, y)
  y += 6
  data.legalBasis.forEach((basis, i) => {
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(`${i + 1}. ${basis}`, 170)
    doc.text(lines, 18, y)
    y += lines.length * 5 + 2
  })
  y = addDivider(doc, y)

  // 권장 행동
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.text('권장 행동', 14, y)
  y += 6
  data.recommendedActions.forEach((action, i) => {
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(`${i + 1}. ${action}`, 170)
    doc.text(lines, 18, y)
    y += lines.length * 5 + 2
  })
  y = addDivider(doc, y)

  // 시공 기록 목록
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.text('보유 시공 기록 목록', 14, y)
  y += 6
  data.evidenceList.forEach((ev, i) => {
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.text(`✓ ${ev}`, 18, y)
    y += 6
  })

  y += 6
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'italic')
  doc.text('⚠ 이 요약서는 체크인 AI가 생성한 참고용 문서입니다. 법적 조언은 전문 변호사에게 확인하세요.', 14, y)

  addFooter(doc)
  doc.save(`기록 관리대응요약_${data.projectName}_${new Date().toISOString().split('T')[0]}.pdf`)
}
