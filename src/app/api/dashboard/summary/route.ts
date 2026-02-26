/**
 * GET /api/dashboard/summary
 * 인증된 사용자의 전체 프로젝트 리스크 요약
 *
 * 응답:
 *   total_projects       — 총 프로젝트 수
 *   projects_by_risk     — 등급별 프로젝트 수 (safe/caution/warning/danger)
 *   average_risk_score   — 평균 리스크 점수
 *   urgent_issues        — 법령 위반 긴급 이슈 목록 (최대 5개)
 *   upcoming_warranty_expiries — 90일 내 만료 예정 하자담보
 *   recent_go_nogo       — GO/NO-GO 현황 { go, nogo }
 *   risk_trend           — 최근 30일 리스크 추이 [{ date, avg_score }]
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toGrade(score: number): string {
  if (score <= 25) return 'safe'
  if (score <= 50) return 'caution'
  if (score <= 75) return 'warning'
  return 'danger'
}

export async function GET() {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 })
    }

    // ── 1. 사용자 프로젝트 전체 조회 ────────────────────────
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, risk_score')
      .eq('user_id', user.id)

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_projects: 0,
          projects_by_risk: { safe: 0, caution: 0, warning: 0, danger: 0 },
          average_risk_score: 0,
          urgent_issues: [],
          upcoming_warranty_expiries: [],
          recent_go_nogo: { go: 0, nogo: 0 },
          risk_trend: [],
        },
      })
    }

    const projectIds = projects.map(p => p.id)

    // ── 2. 프로젝트별 최신 리스크 점수 ──────────────────────
    const { data: allScores } = await supabase
      .from('risk_scores')
      .select('project_id, score, grade, calculated_at')
      .in('project_id', projectIds)
      .order('calculated_at', { ascending: false })

    const latestByProject = new Map<string, { score: number; grade: string }>()
    for (const s of allScores || []) {
      if (!latestByProject.has(s.project_id)) {
        latestByProject.set(s.project_id, { score: s.score, grade: s.grade })
      }
    }

    // risk_scores 이력 없으면 projects.risk_score 폴백
    const effectiveScores = projects.map(p => {
      const latest = latestByProject.get(p.id)
      const score = latest?.score ?? p.risk_score ?? 0
      return {
        id: p.id,
        name: p.name,
        effective_score: score,
        effective_grade: latest?.grade ?? toGrade(score),
      }
    })

    // ── 3. 등급별 카운트 + 평균 점수 ────────────────────────
    const projectsByRisk = { safe: 0, caution: 0, warning: 0, danger: 0 }
    for (const p of effectiveScores) {
      const g = p.effective_grade as keyof typeof projectsByRisk
      if (g in projectsByRisk) projectsByRisk[g]++
    }

    const avgRiskScore =
      Math.round(
        (effectiveScores.reduce((sum, p) => sum + p.effective_score, 0) /
          effectiveScores.length) *
          10
      ) / 10

    // ── 4. 긴급 이슈: 최신 violated law_checks ───────────────
    const { data: violatedChecks } = await supabase
      .from('law_checks')
      .select('project_id, law_id, status, checked_at, laws(name, article)')
      .in('project_id', projectIds)
      .eq('status', 'violated')
      .order('checked_at', { ascending: false })
      .limit(30)

    const seenViolation = new Set<string>()
    const urgentIssues: {
      project_id: string
      project_name: string
      issue: string
      risk_grade: string
    }[] = []
    const violatedCountByProject: Record<string, number> = {}

    for (const vc of violatedChecks || []) {
      const key = `${vc.project_id}_${vc.law_id}`
      if (seenViolation.has(key)) continue
      seenViolation.add(key)

      // 프로젝트별 위반 카운트
      violatedCountByProject[vc.project_id] = (violatedCountByProject[vc.project_id] || 0) + 1

      const lawData = vc.laws as unknown as { name: string; article: string } | null
      const project = effectiveScores.find(p => p.id === vc.project_id)

      urgentIssues.push({
        project_id: vc.project_id,
        project_name: project?.name ?? '알 수 없음',
        issue: lawData ? `${lawData.name} ${lawData.article} 위반` : '법령 위반',
        risk_grade: project?.effective_grade ?? 'safe',
      })
    }

    // ── 5. 하자담보 만료 임박 (90일 내) ─────────────────────
    const today = new Date()
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

    const { data: warranties } = await supabase
      .from('warranties')
      .select('project_id, category, end_date')
      .in('project_id', projectIds)
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', in90Days.toISOString().split('T')[0])
      .order('end_date', { ascending: true })
      .limit(10)

    const upcomingExpiries = (warranties || []).map(w => {
      const endDate = new Date(w.end_date)
      const daysRemaining = Math.ceil(
        (endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
      )
      const project = effectiveScores.find(p => p.id === w.project_id)
      return {
        project_name: project?.name ?? '알 수 없음',
        category: w.category,
        days_remaining: daysRemaining,
        end_date: w.end_date,
      }
    })

    // ── 6. GO/NO-GO 현황 ─────────────────────────────────────
    const { data: goNogoRows } = await supabase
      .from('law_checks')
      .select('project_id, go_nogo, checked_at')
      .in('project_id', projectIds)
      .neq('go_nogo', 'pending')
      .order('checked_at', { ascending: false })
      .limit(100)

    const latestGoNogo = new Map<string, string>()
    for (const lc of goNogoRows || []) {
      if (!latestGoNogo.has(lc.project_id)) {
        latestGoNogo.set(lc.project_id, lc.go_nogo)
      }
    }

    let goCount = 0
    let nogoCount = 0
    for (const [, status] of latestGoNogo) {
      if (status === 'go') goCount++
      else if (status === 'nogo') nogoCount++
    }

    // ── 7. 리스크 추이 (최근 30일) ───────────────────────────
    const thirtyDaysAgo = new Date(
      today.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: trendRows } = await supabase
      .from('risk_scores')
      .select('score, calculated_at')
      .in('project_id', projectIds)
      .gte('calculated_at', thirtyDaysAgo)
      .order('calculated_at', { ascending: true })

    const scoresByDate = new Map<string, number[]>()
    for (const s of trendRows || []) {
      const date = s.calculated_at.split('T')[0]
      if (!scoresByDate.has(date)) scoresByDate.set(date, [])
      scoresByDate.get(date)!.push(s.score)
    }

    const riskTrend = Array.from(scoresByDate.entries()).map(([date, scores]) => ({
      date,
      avg_score: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      ),
    }))

    // ── 응답 ────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        total_projects: projects.length,
        projects_by_risk: projectsByRisk,
        average_risk_score: avgRiskScore,
        urgent_issues: urgentIssues.slice(0, 5),
        violated_by_project: violatedCountByProject,
        upcoming_warranty_expiries: upcomingExpiries,
        recent_go_nogo: { go: goCount, nogo: nogoCount },
        risk_trend: riskTrend,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
