'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './KakaoShare.module.scss'

interface KakaoShareProps {
  title: string
  description?: string
  imageUrl?: string
  linkUrl?: string
  buttonText?: string
  variant?: 'button' | 'icon'
  /** 추가 버튼 (최대 2개) */
  extraButtons?: Array<{ title: string; url: string }>
}

declare global {
  interface Window {
    Kakao: any
  }
}

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'
const SDK_INTEGRITY = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4'

export default function KakaoShare({
  title,
  description = '체키로 현장을 안전하게 관리하고 있어요.',
  imageUrl,
  linkUrl,
  buttonText = '카카오톡으로 공유',
  variant = 'button',
  extraButtons = [],
}: KakaoShareProps) {
  const [sdkReady, setSdkReady] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── SDK 로드 ──────────────────────────────────────────────────
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY
    if (!appKey) return

    // 이미 초기화됨
    if (window.Kakao?.isInitialized?.()) {
      setSdkReady(true)
      return
    }

    // 이미 스크립트가 있으면 재사용
    const existing = document.querySelector(`script[src="${SDK_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(appKey)
        setSdkReady(true)
      })
      return
    }

    const script = document.createElement('script')
    script.src = SDK_URL
    script.integrity = SDK_INTEGRITY
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(appKey)
      }
      setSdkReady(true)
    }
    script.onerror = () => {
      console.error('[KakaoShare] SDK 로드 실패')
    }
    document.head.appendChild(script)
  }, [])

  // ── 토스트 헬퍼 ──────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }

  // ── 공유 실행 ────────────────────────────────────────────────
  const share = async () => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY
    const url = linkUrl ?? window.location.href

    // 앱키 없음 → 클립보드 폴백
    if (!appKey) {
      try {
        await navigator.clipboard.writeText(`${title}\n${description}\n${url}`)
        showToast('링크를 복사했어요. 카카오톡에 붙여넣기 하세요!')
      } catch {
        showToast('링크 복사에 실패했어요.', 'error')
      }
      return
    }

    if (!sdkReady || !window.Kakao?.Share) {
      showToast('SDK 로딩 중이에요. 잠시 후 다시 시도해주세요.', 'error')
      return
    }

    setSharing(true)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://checkin.app'
      const ogImage = imageUrl ?? `${appUrl}/og-image.png`

      const buttons: Array<{ title: string; link: { mobileWebUrl: string; webUrl: string } }> = [
        { title: '체키에서 확인하기', link: { mobileWebUrl: url, webUrl: url } },
      ]

      extraButtons.slice(0, 1).forEach((btn) => {
        buttons.push({ title: btn.title, link: { mobileWebUrl: btn.url, webUrl: btn.url } })
      })

      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl: ogImage,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons,
      })
      // sendDefault는 팝업이므로 성공 콜백 없음 — 팝업 뜨면 성공으로 간주
    } catch (err) {
      console.error('[KakaoShare] 공유 실패:', err)
      showToast('공유 중 오류가 발생했어요.', 'error')
    } finally {
      setSharing(false)
    }
  }

  return (
    <span className={styles.wrap}>
      {variant === 'icon' ? (
        <button
          className={styles.iconBtn}
          onClick={share}
          disabled={sharing}
          aria-label="카카오톡으로 공유"
          title="카카오톡으로 공유"
        >
          <KakaoIcon />
        </button>
      ) : (
        <button className={styles.btn} onClick={share} disabled={sharing}>
          <KakaoIcon />
          <span>{sharing ? '공유 중...' : buttonText}</span>
        </button>
      )}

      {toast && (
        <span className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.msg}
        </span>
      )}
    </span>
  )
}

function KakaoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3C6.48 3 2 6.84 2 11.5c0 2.93 1.71 5.51 4.3 7.1L5.25 21l3.6-1.8c1 .28 2.06.43 3.15.43 5.52 0 10-3.84 10-8.5S17.52 3 12 3z" />
    </svg>
  )
}
