import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/landing/HeroSection'
import StatsSection from '@/components/landing/StatsSection'
import BeforeAfter from '@/components/landing/BeforeAfter'
import AIFeatures from '@/components/landing/AIFeatures'
import RoleCards from '@/components/landing/RoleCards'
import DemoSection from '@/components/landing/DemoSection'
import styles from './page.module.scss'

export const metadata = {
  title: '체키 — 현장 사진 한 장으로 분쟁을 막는다',
  description: '월 450건의 인테리어 분쟁. 원인은 하나였습니다. 기록이 없어서. 체키가 해결합니다.',
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 상태면 바로 프로젝트로
  if (user) redirect('/projects')

  return (
    <div className={styles.page}>
      <HeroSection />
      <StatsSection />
      <BeforeAfter />
      <AIFeatures />
      <RoleCards />
      <DemoSection />

      {/* 최종 CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <p className={styles.finalCtaEye}>지금 시작하세요</p>
          <h2 className={styles.finalCtaTitle}>
            첫 현장 등록은<br />
            <span className={styles.finalCtaAccent}>5분</span>이면 됩니다
          </h2>
          <p className={styles.finalCtaSub}>
            분쟁이 생기고 나서는 늦습니다.<br />
            지금 기록을 시작하면 모든 증거가 자동으로 쌓입니다.
          </p>
          <a href="/login" className={styles.finalCtaBtn}>
            무료로 시작하기
          </a>
          <p className={styles.finalCtaHint}>신용카드 불필요 · 언제든 해지 가능</p>
        </div>
      </section>

      {/* 푸터 */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>체키</span>
            <span className={styles.footerTagline}>현장 사진 한 장으로 분쟁을 막는다</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="/login">로그인</a>
            <span>·</span>
            <a href="/login">회원가입</a>
          </div>
          <p className={styles.footerCopy}>© 2025 Check-In. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
