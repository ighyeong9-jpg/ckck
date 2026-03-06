/**
 * korean-font.ts — jsPDF에 한글 폰트 추가
 *
 * NanumGothic 폰트를 사용하여 PDF에서 한글 지원
 * CDN에서 동적으로 로드하여 사용
 */

import type { jsPDF } from 'jspdf'

let fontLoaded = false
let fontData: string | null = null

/**
 * NanumGothic 폰트를 jsPDF에 추가
 * 처음 호출 시 CDN에서 폰트를 다운로드하고, 이후에는 캐시된 데이터 사용
 */
export async function addKoreanFont(doc: jsPDF): Promise<void> {
  if (fontLoaded && fontData) {
    doc.addFileToVFS('NanumGothic.ttf', fontData)
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
    doc.setFont('NanumGothic')
    return
  }

  try {
    // CDN에서 NanumGothic 폰트 다운로드 (base64)
    // 주의: 실제 운영에서는 public 폴더에 폰트 파일을 저장하는 것이 더 안정적
    const response = await fetch('/fonts/NanumGothic-Regular.ttf')

    if (!response.ok) {
      console.warn('한글 폰트 로드 실패, 기본 폰트 사용')
      return
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // ArrayBuffer를 base64로 변환
    let binary = ''
    uint8Array.forEach(byte => {
      binary += String.fromCharCode(byte)
    })
    fontData = btoa(binary)

    // jsPDF에 폰트 추가
    doc.addFileToVFS('NanumGothic.ttf', fontData)
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
    doc.setFont('NanumGothic')

    fontLoaded = true
    console.log('✅ 한글 폰트 로드 완료')
  } catch (error) {
    console.error('한글 폰트 로드 에러:', error)
    console.warn('기본 폰트로 대체 (한글이 깨질 수 있습니다)')
  }
}

/**
 * Bold 폰트 추가 (필요시)
 */
export async function addKoreanFontBold(doc: jsPDF): Promise<void> {
  try {
    const response = await fetch('/fonts/NanumGothic-Bold.ttf')
    if (!response.ok) return

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    let binary = ''
    uint8Array.forEach(byte => {
      binary += String.fromCharCode(byte)
    })
    const boldFontData = btoa(binary)

    doc.addFileToVFS('NanumGothic-Bold.ttf', boldFontData)
    doc.addFont('NanumGothic-Bold.ttf', 'NanumGothic', 'bold')
  } catch (error) {
    console.warn('Bold 폰트 로드 실패, normal 폰트 사용')
  }
}
