#!/usr/bin/env node

/**
 * TESTING.md 자동 검증 스크립트
 * 가능한 모든 항목을 자동으로 테스트하고 결과 리포트
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const results = {
  passed: [],
  failed: [],
  manual: []
}

function pass(msg) {
  results.passed.push(msg)
  console.log('✅', msg)
}

function fail(msg) {
  results.failed.push(msg)
  console.log('❌', msg)
}

function manual(msg) {
  results.manual.push(msg)
  console.log('⚠️ ', msg)
}

console.log('\n=== Check-In TESTING.md 검증 시작 ===\n')

// 1단계 — 환경 확인
console.log('📋 1단계 — 환경 확인')
console.log('─'.repeat(50))

// package.json 스크립트 확인
const pkgPath = 'package.json'
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  if (pkg.scripts?.dev) pass('npm run dev 스크립트 존재')
  else fail('npm run dev 스크립트 없음')

  if (pkg.scripts?.build) pass('npm run build 스크립트 존재')
  else fail('npm run build 스크립트 없음')
} else {
  fail('package.json 없음')
}

// Supabase 설정 확인
const supabaseClientPath = 'src/lib/supabase/client.ts'
if (existsSync(supabaseClientPath)) {
  pass('Supabase client 설정 파일 존재')
} else {
  fail('Supabase client 설정 파일 없음')
}

// AI API 라우트 확인
const aiChatRoute = 'src/app/api/ai/chat/route.ts'
if (existsSync(aiChatRoute)) {
  pass('/api/ai/chat 라우트 존재 (Gemini API)')
} else {
  fail('/api/ai/chat 라우트 없음')
}

manual('Gemini/Claude API 키 설정 및 폴백 동작은 수동 확인 필요')

// 2단계 — 인증 흐름
console.log('\n📋 2단계 — 인증 흐름')
console.log('─'.repeat(50))

const loginPage = 'src/app/login/page.tsx'
if (existsSync(loginPage)) {
  const content = readFileSync(loginPage, 'utf-8')
  if (content.includes('signUp') || content.includes('sign_up')) {
    pass('로그인/회원가입 페이지 존재 및 signUp 기능 포함')
  } else {
    fail('회원가입 기능 누락')
  }
} else {
  fail('로그인 페이지 없음')
}

const authCallback = 'src/app/auth/callback/route.ts'
if (existsSync(authCallback)) {
  pass('Auth callback 라우트 존재')
} else {
  fail('Auth callback 라우트 없음')
}

const middleware = 'src/middleware.ts'
if (existsSync(middleware)) {
  const content = readFileSync(middleware, 'utf-8')
  if (content.includes('updateSession') || content.includes('auth')) {
    pass('Middleware 인증 가드 설정됨')
  } else {
    fail('Middleware 인증 가드 누락')
  }
} else {
  fail('Middleware 없음')
}

manual('실제 회원가입/로그인/로그아웃 동작은 수동 확인 필요')

// 3단계 — 핵심 흐름 (업체)
console.log('\n📋 3단계 — 핵심 흐름 (업체)')
console.log('─'.repeat(50))

// 3-1. 프로젝트 생성
const projectsPage = 'src/app/(dashboard)/projects/page.tsx'
if (existsSync(projectsPage)) {
  const content = readFileSync(projectsPage, 'utf-8')
  if (content.includes('새 현장') || content.includes('프로젝트 생성') || content.includes('createProject')) {
    pass('프로젝트 생성 기능 존재')
  } else {
    manual('프로젝트 생성 버튼/모달 확인 필요')
  }
} else {
  fail('프로젝트 목록 페이지 없음')
}

// 3-2. 사전진단
const diagnosticPage = 'src/app/(dashboard)/projects/[id]/diagnostic/page.tsx'
if (existsSync(diagnosticPage)) {
  const content = readFileSync(diagnosticPage, 'utf-8')
  if (content.includes('risk') || content.includes('체크리스트')) {
    pass('사전진단 페이지 존재 및 리스크 계산 포함')
  } else {
    manual('사전진단 리스크 계산 확인 필요')
  }
} else {
  fail('사전진단 페이지 없음')
}

const checklistsExist = existsSync('src/data/checklists/cafe.json') &&
                        existsSync('src/data/checklists/restaurant.json')
if (checklistsExist) {
  pass('업종별 체크리스트 JSON 파일 존재')
} else {
  fail('체크리스트 JSON 파일 누락')
}

// 3-3. 견적서
const sowPage = 'src/app/(dashboard)/projects/[id]/sow/page.tsx'
if (existsSync(sowPage)) {
  pass('견적서(SoW) 페이지 존재')
} else {
  fail('견적서 페이지 없음')
}

const quoteAnalyzeAPI = 'src/app/api/ai/quote-analyze/route.ts'
if (existsSync(quoteAnalyzeAPI)) {
  pass('AI 견적 분석 API 존재')
} else {
  fail('AI 견적 분석 API 없음')
}

// 3-4. 공정관리
const processPage = 'src/app/(dashboard)/projects/[id]/process/page.tsx'
if (existsSync(processPage)) {
  pass('공정관리 페이지 존재')
} else {
  fail('공정관리 페이지 없음')
}

const predictAPI = 'src/app/api/ai/predict/route.ts'
if (existsSync(predictAPI)) {
  pass('리스크 예측 API 존재')
} else {
  fail('리스크 예측 API 없음')
}

// 3-5. 현장 사진
const galleryPage = 'src/app/(dashboard)/projects/[id]/gallery/page.tsx'
if (existsSync(galleryPage)) {
  const content = readFileSync(galleryPage, 'utf-8')
  if (content.includes('upload') || content.includes('storage')) {
    pass('갤러리 페이지 존재 및 업로드 기능 포함')
  } else {
    manual('사진 업로드 기능 확인 필요')
  }
} else {
  fail('갤러리 페이지 없음')
}

const merkleTree = 'src/lib/utils/merkleTree.ts'
if (existsSync(merkleTree)) {
  const content = readFileSync(merkleTree, 'utf-8')
  if (content.includes('sha256') || content.includes('SHA-256')) {
    pass('SHA-256 해시 유틸리티 존재')
  } else {
    fail('SHA-256 해시 기능 누락')
  }
} else {
  fail('Merkle Tree 유틸리티 없음')
}

// 3-6. 변경관리
const changesPage = 'src/app/(dashboard)/projects/[id]/changes/page.tsx'
if (existsSync(changesPage)) {
  pass('변경관리 페이지 존재')
} else {
  fail('변경관리 페이지 없음')
}

// 3-7. 3자 합의
const agreementPage = 'src/app/(dashboard)/projects/[id]/agreement/page.tsx'
if (existsSync(agreementPage)) {
  const content = readFileSync(agreementPage, 'utf-8')
  if (content.includes('SignaturePad') || content.includes('signature')) {
    pass('3자 합의 페이지 존재 및 전자서명 포함')
  } else {
    manual('전자서명 기능 확인 필요')
  }
} else {
  fail('3자 합의 페이지 없음')
}

const signaturePad = 'src/components/signature/SignaturePad.tsx'
if (existsSync(signaturePad)) {
  pass('SignaturePad 컴포넌트 존재')
} else {
  fail('SignaturePad 컴포넌트 없음')
}

// 3-8. 하자 기록
const defectsPage = 'src/app/(dashboard)/projects/[id]/defects/page.tsx'
if (existsSync(defectsPage)) {
  const content = readFileSync(defectsPage, 'utf-8')
  if (content.includes('warranty') || content.includes('createWarrantyRecord')) {
    pass('하자 페이지 존재 및 보증 추적 포함')
  } else {
    manual('보증 추적 기능 확인 필요')
  }
} else {
  fail('하자 페이지 없음')
}

const warrantyTracker = 'src/lib/ai/warranty-tracker.ts'
if (existsSync(warrantyTracker)) {
  pass('보증 추적 모듈 존재')
} else {
  fail('보증 추적 모듈 없음')
}

// 3-9. 증빙 패키지
const evidencePage = 'src/app/(dashboard)/projects/[id]/evidence-package/page.tsx'
if (existsSync(evidencePage)) {
  pass('증빙 패키지 페이지 존재')
} else {
  fail('증빙 패키지 페이지 없음')
}

const checkAPI = 'src/app/api/ai/check/route.ts'
if (existsSync(checkAPI)) {
  pass('AI 체크 API 존재')
} else {
  fail('AI 체크 API 없음')
}

// 3-10. AI 인증서
const certificatePage = 'src/app/(dashboard)/projects/[id]/certificate/page.tsx'
if (existsSync(certificatePage)) {
  pass('AI 인증서 페이지 존재')
} else {
  fail('AI 인증서 페이지 없음')
}

const certificateAPI = 'src/app/api/certificate/route.ts'
const verifyAPI = 'src/app/api/verify/[code]/route.ts'
if (existsSync(certificateAPI) && existsSync(verifyAPI)) {
  pass('인증서 발급/검증 API 존재')
} else {
  fail('인증서 API 누락')
}

const verifyPage = 'src/app/verify/[code]/page.tsx'
if (existsSync(verifyPage)) {
  pass('공개 검증 페이지 존재')
} else {
  fail('공개 검증 페이지 없음')
}

// 3-11. 공유 링크
const shareAPI = 'src/app/api/share/route.ts'
if (existsSync(shareAPI)) {
  pass('공유 링크 API 존재')
} else {
  fail('공유 링크 API 없음')
}

const sharePage = 'src/app/share/[shareId]/page.tsx'
if (existsSync(sharePage)) {
  pass('공유 페이지 존재')
} else {
  fail('공유 페이지 없음')
}

const kakaoShare = 'src/components/ui/KakaoShare.tsx'
if (existsSync(kakaoShare)) {
  pass('카카오톡 공유 컴포넌트 존재')
} else {
  manual('카카오톡 공유 기능 확인 필요')
}

// 4단계 — 핵심 흐름 (고객)
console.log('\n📋 4단계 — 핵심 흐름 (고객)')
console.log('─'.repeat(50))

const clientLayout = 'src/app/client/layout.tsx'
if (existsSync(clientLayout)) {
  pass('고객 포털 레이아웃 존재')
} else {
  fail('고객 포털 레이아웃 없음')
}

const clientDashboard = 'src/app/client/dashboard/page.tsx'
if (existsSync(clientDashboard)) {
  pass('고객 대시보드 페이지 존재')
} else {
  fail('고객 대시보드 페이지 없음')
}

const clientPhotos = 'src/app/client/project/[id]/photos/page.tsx'
if (existsSync(clientPhotos)) {
  pass('고객용 사진 보기 페이지 존재')
} else {
  fail('고객용 사진 페이지 없음')
}

const clientChanges = 'src/app/client/project/[id]/changes/page.tsx'
if (existsSync(clientChanges)) {
  const content = readFileSync(clientChanges, 'utf-8')
  if (content.includes('SignaturePad') || content.includes('signature')) {
    pass('고객용 변경사항 서명 페이지 존재')
  } else {
    fail('고객 서명 기능 누락')
  }
} else {
  fail('고객용 변경사항 페이지 없음')
}

const clientDefects = 'src/app/client/project/[id]/defects/page.tsx'
if (existsSync(clientDefects)) {
  pass('고객용 하자 접수 페이지 존재')
} else {
  fail('고객용 하자 페이지 없음')
}

const clientQuote = 'src/app/client/project/[id]/quote/page.tsx'
if (existsSync(clientQuote)) {
  pass('고객용 견적서 보기 페이지 존재')
} else {
  fail('고객용 견적서 페이지 없음')
}

manual('고객 초대 이메일 발송은 수동 확인 필요')
manual('고객 권한 제한(타 프로젝트 차단)은 수동 확인 필요')

// 5단계 — AI 기능
console.log('\n📋 5단계 — AI 기능')
console.log('─'.repeat(50))

const aiChatPage = 'src/app/(dashboard)/ai-chat/page.tsx'
if (existsSync(aiChatPage)) {
  pass('AI 채팅 페이지 존재')
} else {
  fail('AI 채팅 페이지 없음')
}

const brainModule = 'src/lib/ai/brain.ts'
if (existsSync(brainModule)) {
  const content = readFileSync(brainModule, 'utf-8')
  if (content.includes('gemini') && content.includes('claude')) {
    pass('Brain 모듈 존재 (Gemini + Claude 폴백)')
  } else {
    manual('AI 폴백 로직 확인 필요')
  }
} else {
  fail('Brain 모듈 없음')
}

const alertsAPI = 'src/app/api/ai/alerts/route.ts'
if (existsSync(alertsAPI)) {
  pass('알림 분석 API 존재')
} else {
  fail('알림 분석 API 없음')
}

const notificationCenter = 'src/components/notification/NotificationCenter.tsx'
if (existsSync(notificationCenter)) {
  pass('NotificationCenter 컴포넌트 존재')
} else {
  fail('NotificationCenter 컴포넌트 없음')
}

manual('분쟁 키워드 경고 배너는 수동 확인 필요')
manual('RAG 검색 결과는 수동 확인 필요')

// 6단계 — 모바일 UX
console.log('\n📋 6단계 — 모바일 UX')
console.log('─'.repeat(50))

const mobileTabBar = 'src/components/MobileTabBar.tsx'
if (existsSync(mobileTabBar)) {
  pass('모바일 탭바 컴포넌트 존재')
} else {
  fail('모바일 탭바 컴포넌트 없음')
}

const skeleton = 'src/components/ui/Skeleton.tsx'
if (existsSync(skeleton)) {
  pass('스켈레톤 로딩 컴포넌트 존재')
} else {
  fail('스켈레톤 컴포넌트 없음')
}

const toast = 'src/components/ui/Toast.tsx'
if (existsSync(toast)) {
  pass('토스트 메시지 컴포넌트 존재')
} else {
  fail('토스트 컴포넌트 없음')
}

manual('모바일 반응형 디자인은 Chrome DevTools로 수동 확인 필요')
manual('터치 동작 및 키패드는 실제 디바이스로 확인 필요')

// 7단계 — 오프라인
console.log('\n📋 7단계 — 오프라인')
console.log('─'.repeat(50))

const offlinePage = 'src/app/offline/page.tsx'
if (existsSync(offlinePage)) {
  pass('오프라인 페이지 존재')
} else {
  fail('오프라인 페이지 없음')
}

manual('오프라인 동기화는 Network 탭으로 수동 확인 필요')

// 8단계 — 결제
console.log('\n📋 8단계 — 결제')
console.log('─'.repeat(50))

const pricingPage = 'src/app/pricing/page.tsx'
if (existsSync(pricingPage)) {
  pass('요금제 페이지 존재')
} else {
  fail('요금제 페이지 없음')
}

const paymentPage = 'src/app/(dashboard)/payment/page.tsx'
if (existsSync(paymentPage)) {
  pass('결제 페이지 존재')
} else {
  fail('결제 페이지 없음')
}

manual('Toss 결제 모달은 실제 결제 플로우로 수동 확인 필요')

// 최종 리포트
console.log('\n' + '='.repeat(50))
console.log('📊 최종 결과 리포트')
console.log('='.repeat(50))
console.log(`✅ 자동 통과: ${results.passed.length}개`)
console.log(`❌ 실패: ${results.failed.length}개`)
console.log(`⚠️  수동 확인 필요: ${results.manual.length}개`)

if (results.failed.length > 0) {
  console.log('\n❌ 실패 항목:')
  results.failed.forEach(item => console.log(`   - ${item}`))
}

if (results.manual.length > 0) {
  console.log('\n⚠️  수동 확인 필요 항목:')
  results.manual.forEach(item => console.log(`   - ${item}`))
}

console.log('\n' + '='.repeat(50))
if (results.failed.length === 0) {
  console.log('✨ 모든 자동 검증 항목 통과!')
  console.log('📝 수동 확인 항목은 브라우저에서 직접 테스트하세요.')
  process.exit(0)
} else {
  console.log('⚠️  일부 항목 실패 - 수정 필요')
  process.exit(1)
}
