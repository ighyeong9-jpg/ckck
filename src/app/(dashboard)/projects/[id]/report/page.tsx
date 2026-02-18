'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Report } from '@/types/report'
import { REPORT_TYPES } from '@/types/report'
import styles from './page.module.scss'

interface ProjectData {
  diagnosticScore: number
  diagnosticData: any
  quoteSubtotal: number
  quoteVat: number
  quoteTotal: number
  quoteItemCount: number
  quoteItems: any[]
  costBase: number
  costAdjusted: number
  costDifference: number
  costAnalysis: any
}

export default function ReportPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const reportRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [projectData, setProjectData] = useState<ProjectData>({
    diagnosticScore: 0,
    diagnosticData: null,
    quoteSubtotal: 0,
    quoteVat: 0,
    quoteTotal: 0,
    quoteItemCount: 0,
    quoteItems: [],
    costBase: 0,
    costAdjusted: 0,
    costDifference: 0,
    costAnalysis: null,
  })

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('name, risk_score')
          .eq('id', projectId)
          .single()

        if (project) {
          setProjectName(project.name)
          setProjectData(prev => ({
            ...prev,
            diagnosticScore: project.risk_score || 0,
          }))
        }

        // 진단 데이터
        const { data: diagnosticResponses } = await supabase
          .from('diagnostic_responses')
          .select('*')
          .eq('project_id', projectId)

        // 견적 항목
        const { data: quoteItems } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('project_id', projectId)
          .order('category')

        if (quoteItems && quoteItems.length > 0) {
          const subtotal = quoteItems.reduce(
            (sum, item) => sum + (Number(item.quantity) * item.unit_price),
            0
          )
          const vat = Math.round(subtotal * 0.1)
          setProjectData(prev => ({
            ...prev,
            diagnosticData: diagnosticResponses,
            quoteSubtotal: subtotal,
            quoteVat: vat,
            quoteTotal: subtotal + vat,
            quoteItemCount: quoteItems.length,
            quoteItems: quoteItems,
          }))
        }

        // 비용분석 데이터
        const { data: costAnalysis } = await supabase
          .from('cost_analysis')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle()

        if (costAnalysis) {
          setProjectData(prev => ({
            ...prev,
            costBase: costAnalysis.base_cost,
            costAdjusted: costAnalysis.adjusted_cost,
            costDifference: costAnalysis.cost_difference,
            costAnalysis: costAnalysis,
          }))
        }

        // 기존 리포트 목록
        const { data: existingReports } = await supabase
          .from('reports')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (existingReports) {
          setReports(existingReports)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  const formatAmount = (amount: number) => {
    return `${(amount || 0).toLocaleString()}원`
  }

  // 리스크 등급 계산
  const getRiskGrade = (score: number) => {
    if (score >= 70) return { grade: 'A', label: '고위험', color: '#ef4444' }
    if (score >= 40) return { grade: 'B', label: '중위험', color: '#f59e0b' }
    return { grade: 'C', label: '저위험', color: '#10b981' }
  }

  // 리포트 생성
  const generateReport = async (reportType: string) => {
    setGenerating(true)
    try {
      const typeInfo = REPORT_TYPES.find(t => t.id === reportType)
      const title = `${projectName} - ${typeInfo?.name || '리포트'}`

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          project_id: projectId,
          report_type: reportType,
          title,
          diagnostic_score: projectData.diagnosticScore,
          diagnostic_data: projectData.diagnosticData,
          quote_subtotal: projectData.quoteSubtotal,
          quote_vat: projectData.quoteVat,
          quote_total: projectData.quoteTotal,
          quote_item_count: projectData.quoteItemCount,
          cost_base: projectData.costBase,
          cost_adjusted: projectData.costAdjusted,
          cost_difference: projectData.costDifference,
        }])
        .select()
        .single()

      if (error) throw error

      setReports(prev => [data, ...prev])
      alert('리포트가 생성되었습니다.')
    } catch (err: any) {
      console.error('Error generating report:', err)
      alert(`리포트 생성 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setGenerating(false)
    }
  }

  // 리포트 삭제
  const deleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id)

      if (error) throw error

      setReports(prev => prev.filter(r => r.id !== id))
      if (selectedReport?.id === id) {
        setShowModal(false)
        setSelectedReport(null)
      }
    } catch (err: any) {
      console.error('Error deleting report:', err)
      alert(`삭제 오류: ${err?.message || JSON.stringify(err)}`)
    }
  }

  // PDF 다운로드
  const downloadPDF = async () => {
    if (!reportRef.current) return
    setPdfLoading(true)

    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`${selectedReport?.title || 'report'}.pdf`)
    } catch (err) {
      console.error('PDF Error:', err)
      alert('PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  // 리포트 클릭
  const openReportDetail = (report: Report) => {
    setSelectedReport(report)
    setShowModal(true)
  }

  const getReportTypeInfo = (id: string) => REPORT_TYPES.find(t => t.id === id)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  const riskGrade = getRiskGrade(projectData.diagnosticScore)

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Current Data Summary */}
        <section className={styles.dataSummary}>
          <h2 className={styles.sectionTitle}>현재 프로젝트 데이터</h2>

          <div className={styles.dataGrid}>
            <div className={styles.dataCard}>
              <div className={styles.dataHeader}>
                <span className={styles.dataIcon}>🔍</span>
                <span>진단결과</span>
              </div>
              <div className={styles.dataValue}>
                리스크 점수: <strong>{projectData.diagnosticScore}점</strong>
              </div>
            </div>

            <div className={styles.dataCard}>
              <div className={styles.dataHeader}>
                <span className={styles.dataIcon}>💰</span>
                <span>견적서</span>
              </div>
              <div className={styles.dataValue}>
                <p>항목: {projectData.quoteItemCount}개</p>
                <p>총액: <strong>{formatAmount(projectData.quoteTotal)}</strong></p>
              </div>
            </div>

            <div className={styles.dataCard}>
              <div className={styles.dataHeader}>
                <span className={styles.dataIcon}>📈</span>
                <span>비용분석</span>
              </div>
              <div className={styles.dataValue}>
                <p>조정비용: <strong>{formatAmount(projectData.costAdjusted)}</strong></p>
              </div>
            </div>
          </div>
        </section>

        {/* Generate Report */}
        <section className={styles.generateSection}>
          <h2 className={styles.sectionTitle}>리포트 생성</h2>
          <div className={styles.reportTypes}>
            {REPORT_TYPES.map((type) => (
              <button
                key={type.id}
                className={styles.reportTypeBtn}
                onClick={() => generateReport(type.id)}
                disabled={generating}
              >
                <span className={styles.typeIcon}>{type.icon}</span>
                <span className={styles.typeName}>{type.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Report History */}
        <section className={styles.historySection}>
          <h2 className={styles.sectionTitle}>리포트 이력 (클릭하여 상세보기)</h2>

          {reports.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📄</span>
              <h3>생성된 리포트가 없습니다</h3>
              <p>위에서 리포트를 생성하면<br/>이력이 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className={styles.reportsList}>
              {reports.map((report) => {
                const typeInfo = getReportTypeInfo(report.report_type)
                return (
                  <div
                    key={report.id}
                    className={styles.reportCard}
                    onClick={() => openReportDetail(report)}
                  >
                    <div className={styles.reportInfo}>
                      <div className={styles.reportHeader}>
                        <span className={styles.reportIcon}>{typeInfo?.icon}</span>
                        <span className={styles.reportType}>{typeInfo?.name}</span>
                      </div>
                      <h3 className={styles.reportTitle}>{report.title}</h3>
                      <div className={styles.reportMeta}>
                        <span>{new Date(report.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                    <div className={styles.reportActions}>
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => deleteReport(report.id, e)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Report Detail Modal */}
      {showModal && selectedReport && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>리포트 상세</h2>
              <div className={styles.modalActions}>
                <button
                  className={styles.pdfBtn}
                  onClick={downloadPDF}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? '생성 중...' : '📥 PDF 다운로드'}
                </button>
                <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.modalContent} ref={reportRef}>
              {/* Report Header */}
              <div className={styles.reportDetailHeader}>
                <h1>{selectedReport.title}</h1>
                <p>생성일: {new Date(selectedReport.created_at).toLocaleString('ko-KR')}</p>
              </div>

              {/* Risk Grade */}
              <div className={styles.riskSection}>
                <h3>리스크 등급</h3>
                <div className={styles.riskGrade}>
                  <div
                    className={styles.riskBadge}
                    style={{ background: getRiskGrade(selectedReport.diagnostic_score || 0).color }}
                  >
                    {getRiskGrade(selectedReport.diagnostic_score || 0).grade}
                  </div>
                  <div className={styles.riskInfo}>
                    <span className={styles.riskLabel}>
                      {getRiskGrade(selectedReport.diagnostic_score || 0).label}
                    </span>
                    <span className={styles.riskScore}>
                      {selectedReport.diagnostic_score || 0}점
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnostic Summary */}
              <div className={styles.detailSection}>
                <h3>📋 진단결과 요약</h3>
                <div className={styles.detailCard}>
                  <div className={styles.detailRow}>
                    <span>리스크 점수</span>
                    <strong>{selectedReport.diagnostic_score || 0}점</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>진단 항목</span>
                    <strong>
                      {Array.isArray(selectedReport.diagnostic_data)
                        ? selectedReport.diagnostic_data.length
                        : 0}개 체크
                    </strong>
                  </div>
                </div>
              </div>

              {/* Quote Summary */}
              <div className={styles.detailSection}>
                <h3>💰 견적서 내역</h3>
                <div className={styles.detailCard}>
                  <div className={styles.detailRow}>
                    <span>항목 수</span>
                    <strong>{selectedReport.quote_item_count || 0}개</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>공급가액</span>
                    <strong>{formatAmount(selectedReport.quote_subtotal || 0)}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>부가세 (10%)</span>
                    <strong>{formatAmount(selectedReport.quote_vat || 0)}</strong>
                  </div>
                  <div className={`${styles.detailRow} ${styles.total}`}>
                    <span>총 합계</span>
                    <strong>{formatAmount(selectedReport.quote_total || 0)}</strong>
                  </div>
                </div>

                {/* Quote Items */}
                {projectData.quoteItems.length > 0 && (
                  <div className={styles.quoteItemsList}>
                    <h4>항목별 내역</h4>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th>항목명</th>
                          <th>수량</th>
                          <th>단가</th>
                          <th>금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.quoteItems.slice(0, 10).map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.item_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatAmount(item.unit_price)}</td>
                            <td>{formatAmount(item.quantity * item.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {projectData.quoteItems.length > 10 && (
                      <p className={styles.moreItems}>
                        외 {projectData.quoteItems.length - 10}개 항목...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Cost Analysis */}
              <div className={styles.detailSection}>
                <h3>📈 비용분석 결과</h3>
                <div className={styles.detailCard}>
                  <div className={styles.detailRow}>
                    <span>기본비용 (Cb)</span>
                    <strong>{formatAmount(selectedReport.cost_base || 0)}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>조정비용</span>
                    <strong>{formatAmount(selectedReport.cost_adjusted || 0)}</strong>
                  </div>
                  <div className={`${styles.detailRow} ${styles.difference}`}>
                    <span>차액 (ΔC)</span>
                    <strong>+{formatAmount(selectedReport.cost_difference || 0)}</strong>
                  </div>
                </div>

                {projectData.costAnalysis && (
                  <div className={styles.costFactors}>
                    <h4>비용 조정 요인</h4>
                    <div className={styles.factorsList}>
                      <div className={styles.factorItem}>
                        <span>공사 복잡도</span>
                        <span>{((projectData.costAnalysis.complexity_factor || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className={styles.factorItem}>
                        <span>일정 압박</span>
                        <span>{((projectData.costAnalysis.timeline_factor || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className={styles.factorItem}>
                        <span>자재 변동</span>
                        <span>{((projectData.costAnalysis.material_factor || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className={styles.factorItem}>
                        <span>인건비 변동</span>
                        <span>{((projectData.costAnalysis.labor_factor || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className={styles.factorItem}>
                        <span>리스크 요인</span>
                        <span>{((projectData.costAnalysis.risk_factor || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={styles.reportFooter}>
                <p>Check-In 프로젝트 관리 시스템</p>
                <p>Generated: {new Date().toLocaleString('ko-KR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
