import { useState } from "react";

const FEATURE_SETS = [
  {
    id: 1,
    icon: "🛡️",
    title: "안전관리",
    subtitle: "Safety Management",
    color: "#DC2626",
    bgGrad: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
    desc: "현장 안전의 핵심. 매일 쓰는 기능",
    items: [
      { name: "안전 현황 확인", desc: "12개 법규 기반 작업 가능 여부 자동 확인", priority: "핵심", icon: "⚡" },
      { name: "안전 체크리스트", desc: "13업종 419개 항목 점검 실행", priority: "핵심", icon: "✅" },
      { name: "사고/위험 보고", desc: "사진+위치+영상 포함 즉시 보고", priority: "핵심", icon: "🚨" },
      { name: "안전교육 이력", desc: "작업자별 교육 이수 현황 현황 확인", priority: "중요", icon: "📚" },
      { name: "위험성 평가", desc: "공종별 위험요인 사전 평가", priority: "중요", icon: "⚠️" },
      { name: "안전회의(TBM)", desc: "Toolbox Meeting 기록 및 서명", priority: "일반", icon: "🤝" },
    ],
  },
  {
    id: 2,
    icon: "📋",
    title: "공정관리",
    subtitle: "Process Control",
    color: "#2563EB",
    bgGrad: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
    desc: "공사 진행을 한눈에. 일정·진척 관리",
    items: [
      { name: "공정 현황 대시보드", desc: "전체 진척률, 공정별 상태 한눈에", priority: "핵심", icon: "📊" },
      { name: "공정 일정표 일정표", desc: "공정별 시작/종료/선후행 관계 표시", priority: "핵심", icon: "📅" },
      { name: "일일 작업 지시서", desc: "작업지시서 자동 생성, 당일 작업 내용 배포", priority: "중요", icon: "📝" },
      { name: "공정 사진 기록", desc: "날짜·공종별 시공 전/중/후 사진 보관", priority: "핵심", icon: "📷" },
      { name: "지연 알림", desc: "일정 지연 시 자동 경고 및 원인 기록", priority: "중요", icon: "🔔" },
      { name: "준공 검수 체크", desc: "공종별 완료 기준 확인 및 승인", priority: "일반", icon: "🏁" },
    ],
  },
  {
    id: 3,
    icon: "👷",
    title: "인력·현장",
    subtitle: "Workforce & Site",
    color: "#059669",
    bgGrad: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    desc: "누가 어디서 일하는지. 인력 출역 관리",
    items: [
      { name: "QR 체크인/아웃", desc: "작업자 출퇴근 QR코드 기록", priority: "핵심", icon: "📱" },
      { name: "출역 현황판", desc: "현장별 금일 투입 인원 실시간 표시", priority: "핵심", icon: "👥" },
      { name: "하도급 업체 관리", desc: "협력사 정보, 계약, 보험 현황", priority: "중요", icon: "🏢" },
      { name: "자격증·면허 관리", desc: "작업자 보유 자격 및 만료일 현황 확인", priority: "중요", icon: "🪪" },
      { name: "비상 연락망", desc: "현장별 비상 연락처 즉시 조회", priority: "일반", icon: "📞" },
      { name: "현장 지도/배치도", desc: "구역별 작업 위치 및 위험 구역 표시", priority: "일반", icon: "🗺️" },
    ],
  },
  {
    id: 4,
    icon: "📦",
    title: "자재·비용",
    subtitle: "Materials & Cost",
    color: "#D97706",
    bgGrad: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
    desc: "자재 입출고, 비용 산출. 돈 관리",
    items: [
      { name: "자재 입고/재고", desc: "자재별 입고 수량, 현재 재고 현황", priority: "핵심", icon: "📥" },
      { name: "자재 QR 스캔", desc: "QR코드로 자재 입고 확인 및 현황 확인", priority: "중요", icon: "🔍" },
      { name: "비용 자동 산출(ΔC)", desc: "공종별 실행 예산 vs 실비 비교", priority: "핵심", icon: "💰" },
      { name: "견적 비교", desc: "업체별 견적 비교표 자동 생성", priority: "중요", icon: "📑" },
      { name: "발주 요청", desc: "부족 자재 발주 요청서 생성", priority: "일반", icon: "🛒" },
      { name: "정산 리포트", desc: "월별/공종별 비용 정산 PDF 출력", priority: "일반", icon: "🧾" },
    ],
  },
  {
    id: 5,
    icon: "⚖️",
    title: "법규·증빙",
    subtitle: "Compliance & Evidence",
    color: "#7C3AED",
    bgGrad: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
    desc: "중대재해처벌법 대응. 법적 보호막",
    items: [
      { name: "법규 준수 현황판", desc: "12개 법규 191개 규칙 자동 체크 현황", priority: "핵심", icon: "📋" },
      { name: "시공 기록 패키징", desc: "머클트리 기반 시공 증빙 무결성 보장", priority: "핵심", icon: "🔐" },
      { name: "안전보건계획서", desc: "법정 서류 자동 생성 및 이력 관리", priority: "중요", icon: "📄" },
      { name: "감리 점검 연동", desc: "감리자 점검 결과 연동 및 조치 현황 확인", priority: "중요", icon: "🔗" },
      { name: "기록 보관 패키지", desc: "사진+서명+로그 PDF 일괄 출력", priority: "일반", icon: "📁" },
      { name: "AI 법규 비서(체키)", desc: "법규 질문 시 원문 인용 답변", priority: "일반", icon: "🤖" },
    ],
  },
];

const PRIORITY_STYLES = {
  "핵심": { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
  "중요": { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
  "일반": { bg: "#F0F9FF", color: "#2563EB", border: "#BAE6FD" },
};

export default function CheckInFeatureSets() {
  const [activeSet, setActiveSet] = useState(0);
  const [hoveredItem, setHoveredItem] = useState(null);

  const active = FEATURE_SETS[activeSet];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F172A",
      fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
      color: "#F8FAFC",
      padding: "32px 24px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          background: "rgba(99, 102, 241, 0.15)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          color: "#818CF8",
          marginBottom: 16,
        }}>
          CHECK-IN FEATURE ARCHITECTURE
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          margin: "0 0 8px",
          background: "linear-gradient(135deg, #F8FAFC, #94A3B8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          5종 30개 기능 세트
        </h1>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
          건설 현장 바인더처럼 — 상황에 맞는 기능이 앞으로 나온다
        </p>
      </div>

      {/* 5 Category Tabs */}
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        marginBottom: 32,
        flexWrap: "wrap",
      }}>
        {FEATURE_SETS.map((set, i) => (
          <button
            key={set.id}
            onClick={() => setActiveSet(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 12,
              border: activeSet === i ? `2px solid ${set.color}` : "2px solid #1E293B",
              background: activeSet === i ? `${set.color}15` : "#1E293B",
              color: activeSet === i ? set.color : "#94A3B8",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 20 }}>{set.icon}</span>
            <span>{set.title}</span>
          </button>
        ))}
      </div>

      {/* Active Set Header */}
      <div style={{
        background: active.bgGrad,
        borderRadius: 16,
        padding: "28px 32px",
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{active.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
            {active.title}
            <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 10, opacity: 0.8 }}>
              {active.subtitle}
            </span>
          </h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>{active.desc}</p>
        </div>
        <div style={{
          display: "flex",
          gap: 12,
        }}>
          {["핵심", "중요", "일반"].map(p => {
            const count = active.items.filter(item => item.priority === p).length;
            return (
              <div key={p} style={{
                textAlign: "center",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "10px 16px",
                minWidth: 60,
              }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{count}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{p}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Items */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 12,
        marginBottom: 40,
      }}>
        {active.items.map((item, i) => {
          const ps = PRIORITY_STYLES[item.priority];
          const isHovered = hoveredItem === `${activeSet}-${i}`;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredItem(`${activeSet}-${i}`)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                background: isHovered ? "#1E293B" : "#151F32",
                border: `1px solid ${isHovered ? active.color + "60" : "#1E293B"}`,
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "default",
                transition: "all 0.2s",
                transform: isHovered ? "translateY(-2px)" : "none",
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                </div>
                <span style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: ps.bg,
                  color: ps.color,
                  border: `1px solid ${ps.border}`,
                  whiteSpace: "nowrap",
                }}>
                  {item.priority}
                </span>
              </div>
              <p style={{
                margin: 0,
                fontSize: 13,
                color: "#94A3B8",
                lineHeight: 1.5,
              }}>
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary Bar */}
      <div style={{
        background: "#1E293B",
        borderRadius: 14,
        padding: "24px 28px",
        border: "1px solid #334155",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: "#F8FAFC" }}>
          📐 전체 구조 요약
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}>
          {FEATURE_SETS.map((set, i) => (
            <div
              key={set.id}
              onClick={() => setActiveSet(i)}
              style={{
                background: activeSet === i ? `${set.color}20` : "#0F172A",
                border: `1px solid ${activeSet === i ? set.color + "50" : "#1E293B"}`,
                borderRadius: 10,
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span>{set.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: set.color }}>{set.title}</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                {set.items.filter(x => x.priority === "핵심").length}개 핵심 ·{" "}
                {set.items.filter(x => x.priority === "중요").length}개 중요 ·{" "}
                {set.items.filter(x => x.priority === "일반").length}개 일반
              </div>
            </div>
          ))}
          <div style={{
            background: "#0F172A",
            border: "1px solid #334155",
            borderRadius: 10,
            padding: "14px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#F8FAFC" }}>30</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>총 기능 수</div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              핵심 {FEATURE_SETS.reduce((a, s) => a + s.items.filter(x => x.priority === "핵심").length, 0)} ·
              중요 {FEATURE_SETS.reduce((a, s) => a + s.items.filter(x => x.priority === "중요").length, 0)} ·
              일반 {FEATURE_SETS.reduce((a, s) => a + s.items.filter(x => x.priority === "일반").length, 0)}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 20,
          padding: "16px 20px",
          background: "rgba(16, 185, 129, 0.08)",
          borderLeft: "4px solid #10B981",
          borderRadius: "0 10px 10px 0",
          fontSize: 13,
          color: "#94A3B8",
          lineHeight: 1.7,
        }}>
          <strong style={{ color: "#10B981" }}>상황 인식형 UI 원칙:</strong><br />
          현장 감독이 앱 열면 오늘 날씨·공정 단계·인력 현황에 맞춰 <strong style={{ color: "#F8FAFC" }}>지금 필요한 기능이 먼저 나온다.</strong><br />
          419개 체크리스트를 줄이는 게 아니라, 오늘 해당되는 항목만 앞에 보여주는 것.
        </div>
      </div>
    </div>
  );
}
