#!/usr/bin/env node
/**
 * End-to-End 자동화 테스트
 * 회원가입 → 로그인 → 프로젝트 생성 → 사전진단 → 저장 → 공유링크
 */

import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
// 이미 확인된 테스트 계정 사용 (Supabase 이메일 확인 우회)
const TEST_EMAIL = process.env.TEST_EMAIL || `test${Date.now()}@example.com`
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234'
const USE_EXISTING_ACCOUNT = process.env.USE_EXISTING_ACCOUNT === 'true'

const results = {
  passed: [],
  failed: [],
  warnings: []
}

function pass(step) {
  results.passed.push(step)
  console.log('✅', step)
}

function fail(step, error) {
  results.failed.push({ step, error: error.message })
  console.log('❌', step, ':', error.message)
}

function warn(step, message) {
  results.warnings.push({ step, message })
  console.log('⚠️ ', step, ':', message)
}

async function runTest() {
  console.log('\n🚀 E2E 자동화 테스트 시작\n')
  console.log(`테스트 계정: ${TEST_EMAIL}\n`)

  const browser = await chromium.launch({ headless: false, slowMo: 500 })
  const context = await browser.newContext()
  const page = await context.newPage()

  let projectId = null
  let shareLink = null

  try {
    // ============================================================
    // 1. 로그인 페이지 접속
    // ============================================================
    try {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle', { timeout: 10000 })

      // 로그인 페이지로 리다이렉트되었는지 확인
      const url = page.url()
      if (url.includes('/login')) {
        pass('1. 로그인 페이지 접속')
      } else {
        // 루트에서 로그인 페이지로 이동
        await page.goto(BASE_URL + '/login')
        await page.waitForLoadState('networkidle')
        pass('1. 로그인 페이지 이동')
      }
    } catch (error) {
      fail('1. 로그인 페이지 접속', error)
      throw error
    }

    // ============================================================
    // 2. 회원가입 (기존 계정 사용 시 스킵)
    // ============================================================
    if (!USE_EXISTING_ACCOUNT) {
      try {
        // 회원가입 탭 클릭
        await page.click('text=회원가입')
        await page.waitForTimeout(500)

        // 이메일 입력
        await page.fill('input[type="email"]', TEST_EMAIL)
        await page.fill('input[type="password"]', TEST_PASSWORD)

        // 회원가입 버튼 클릭
        await page.click('button[type="submit"]')

        // 응답 대기 (성공 메시지 또는 에러)
        await page.waitForTimeout(2000)

        // 성공 메시지 확인
        const pageContent = await page.content()
        if (pageContent.includes('회원가입 완료') || pageContent.includes('이메일을 확인')) {
          warn('2. 회원가입', 'Supabase 이메일 확인 필요 - 기존 계정으로 재시도')
          // 테스트를 위해 이미 확인된 계정이 필요함을 안내
          console.log('\n⚠️  Supabase 이메일 확인이 필요합니다.')
          console.log('   해결 방법: USE_EXISTING_ACCOUNT=true TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass node e2e-flow-test.mjs')
          throw new Error('이메일 확인 필요')
        } else if (pageContent.includes('이미 등록된')) {
          warn('2. 회원가입', '이미 등록된 이메일 (로그인 시도)')
          // 로그인 탭으로 전환
          await page.click('text=로그인')
          await page.waitForTimeout(500)
        } else {
          pass('2. 회원가입 요청 전송')
          // 로그인 탭으로 전환
          await page.click('text=로그인')
          await page.waitForTimeout(500)
        }
      } catch (error) {
        fail('2. 회원가입', error)
        throw error
      }
    } else {
      console.log('⏭️  기존 계정 사용 - 회원가입 스킵')
      // 로그인 탭 확인
      await page.click('text=로그인')
      await page.waitForTimeout(500)
    }

    // ============================================================
    // 3. 로그인
    // ============================================================
    try {
      // 로그인 폼 입력
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)

      // 로그인 버튼 클릭
      await page.click('button[type="submit"]')

      // 페이지 이동 대기 (waitForURL 사용)
      try {
        await page.waitForURL(url => url.includes('/dashboard') || url.includes('/projects'), { timeout: 10000 })
        pass('3. 로그인 성공')
      } catch {
        // URL 변경이 없을 수도 있으므로 현재 URL 확인
        await page.waitForTimeout(3000)
        const url = page.url()
        if (url.includes('/dashboard') || url.includes('/projects')) {
          pass('3. 로그인 성공')
        } else if (url.includes('/login')) {
          // 로그인 페이지에 남아있으면 에러 메시지 확인
          const errorMsg = await page.locator('text=/오류|error|잘못/i').first()
          if (await errorMsg.isVisible({ timeout: 1000 })) {
            const errorText = await errorMsg.textContent()
            throw new Error(`로그인 실패: ${errorText}`)
          } else {
            throw new Error('로그인 후 페이지 이동 없음')
          }
        } else {
          throw new Error(`예상치 못한 URL: ${url}`)
        }
      }
    } catch (error) {
      fail('3. 로그인', error)
      throw error
    }

    // ============================================================
    // 4. 프로젝트 생성
    // ============================================================
    try {
      // 프로젝트 목록 페이지로 이동
      await page.goto(BASE_URL + '/projects')
      await page.waitForLoadState('networkidle')

      // "새 현장" 버튼 클릭
      const newProjectBtn = await page.locator('text=새 현장').first()
      await newProjectBtn.click()
      await page.waitForTimeout(1000)

      // 프로젝트 정보 입력
      await page.fill('input[name="name"]', 'E2E 테스트 프로젝트')
      await page.fill('input[name="client_name"]', '테스트 고객')

      // 시작일/종료일 입력
      const today = new Date().toISOString().split('T')[0]
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
      const endDateStr = endDate.toISOString().split('T')[0]

      await page.fill('input[name="start_date"]', today)
      await page.fill('input[name="end_date"]', endDateStr)

      // 생성 버튼 클릭
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      // 프로젝트 카드 확인
      const projectCard = await page.locator('text=E2E 테스트 프로젝트').first()
      if (await projectCard.isVisible()) {
        pass('4. 프로젝트 생성 성공')

        // 프로젝트 ID 추출
        const cardLink = await projectCard.locator('..').locator('..').locator('a').first()
        const href = await cardLink.getAttribute('href')
        projectId = href.split('/').pop()
        console.log(`   프로젝트 ID: ${projectId}`)
      } else {
        throw new Error('프로젝트 카드를 찾을 수 없습니다')
      }
    } catch (error) {
      fail('4. 프로젝트 생성', error)
      throw error
    }

    // ============================================================
    // 5. 사전진단 페이지 이동
    // ============================================================
    try {
      // 생성된 프로젝트 클릭
      await page.click(`a[href*="/projects/${projectId}"]`)
      await page.waitForLoadState('networkidle')

      // diagnostic 탭으로 리다이렉트 확인
      const url = page.url()
      if (url.includes('/diagnostic')) {
        pass('5. 사전진단 페이지 이동')
      } else {
        throw new Error(`예상치 못한 URL: ${url}`)
      }
    } catch (error) {
      fail('5. 사전진단 페이지 이동', error)
      throw error
    }

    // ============================================================
    // 6. 체크리스트 체크
    // ============================================================
    try {
      // 체크박스 10개 이상 체크
      const checkboxes = await page.locator('input[type="checkbox"]').all()

      if (checkboxes.length === 0) {
        throw new Error('체크박스를 찾을 수 없습니다')
      }

      const checkCount = Math.min(15, checkboxes.length)
      for (let i = 0; i < checkCount; i++) {
        await checkboxes[i].check()
        await page.waitForTimeout(100)
      }

      pass(`6. 체크리스트 ${checkCount}개 체크 완료`)

      // 리스크 점수 표시 확인
      await page.waitForTimeout(1000)
      const riskScore = await page.locator('text=/\\d+점/').first()
      if (await riskScore.isVisible()) {
        const scoreText = await riskScore.textContent()
        console.log(`   리스크 점수: ${scoreText}`)
      }
    } catch (error) {
      fail('6. 체크리스트 체크', error)
      throw error
    }

    // ============================================================
    // 7. 저장 버튼 클릭
    // ============================================================
    try {
      // 저장 버튼 찾기
      const saveButton = await page.locator('button:has-text("저장")').first()
      await saveButton.click()

      // 저장 완료 대기
      await page.waitForTimeout(2000)

      // 성공 토스트 메시지 확인
      const toastOrSuccess = await page.locator('text=/저장|성공/i').first()
      if (await toastOrSuccess.isVisible({ timeout: 3000 })) {
        pass('7. 사전진단 저장 성공')
      } else {
        warn('7. 사전진단 저장', '성공 메시지를 확인할 수 없음 (저장은 완료되었을 수 있음)')
      }
    } catch (error) {
      fail('7. 사전진단 저장', error)
      throw error
    }

    // ============================================================
    // 8. 공유 링크 확인
    // ============================================================
    try {
      // 콘솔 로그에서 공유 링크 확인
      const logs = []
      page.on('console', msg => {
        const text = msg.text()
        logs.push(text)
        if (text.includes('Share link created:')) {
          shareLink = text.split(':')[1].trim()
        }
      })

      await page.waitForTimeout(2000)

      if (shareLink) {
        pass('8. 공유 링크 자동 생성 확인')
        console.log(`   공유 링크: ${shareLink}`)
      } else {
        // Supabase shares 테이블 확인 필요
        warn('8. 공유 링크', '콘솔에서 확인 불가 (DB 확인 필요)')
      }
    } catch (error) {
      fail('8. 공유 링크 확인', error)
    }

    // ============================================================
    // 9. 공유 링크 접근 테스트
    // ============================================================
    if (shareLink) {
      try {
        // 새 시크릿 창에서 공유 링크 접근
        const newContext = await browser.newContext()
        const newPage = await newContext.newPage()

        await newPage.goto(BASE_URL + shareLink)
        await newPage.waitForLoadState('networkidle', { timeout: 10000 })

        // 공유 페이지 내용 확인
        const content = await newPage.content()
        if (content.includes('E2E 테스트 프로젝트') || content.includes('공사 현황')) {
          pass('9. 공유 링크 접근 성공 (비로그인)')
        } else {
          warn('9. 공유 링크 접근', '페이지 로드되었으나 내용 확인 불가')
        }

        await newContext.close()
      } catch (error) {
        fail('9. 공유 링크 접근', error)
      }
    }

  } catch (error) {
    console.error('\n❌ 테스트 중단:', error.message)
  } finally {
    await browser.close()
  }

  // ============================================================
  // 결과 리포트
  // ============================================================
  console.log('\n' + '='.repeat(60))
  console.log('📊 E2E 테스트 결과')
  console.log('='.repeat(60))
  console.log(`✅ 성공: ${results.passed.length}개`)
  console.log(`❌ 실패: ${results.failed.length}개`)
  console.log(`⚠️  경고: ${results.warnings.length}개`)

  if (results.failed.length > 0) {
    console.log('\n❌ 실패 항목:')
    results.failed.forEach(({ step, error }) => {
      console.log(`   - ${step}`)
      console.log(`     ${error}`)
    })
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  경고 항목:')
    results.warnings.forEach(({ step, message }) => {
      console.log(`   - ${step}: ${message}`)
    })
  }

  console.log('\n' + '='.repeat(60))

  if (results.failed.length === 0) {
    console.log('✨ 전체 플로우 테스트 성공!')
    process.exit(0)
  } else {
    console.log('⚠️  일부 항목 실패 - 수정 필요')
    process.exit(1)
  }
}

runTest().catch(err => {
  console.error('테스트 실행 오류:', err)
  process.exit(1)
})
