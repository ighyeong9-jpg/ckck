/**
 * NanumGothic 폰트 자동 다운로드 스크립트
 *
 * 실행: node scripts/download-korean-font.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Regular.ttf'
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'fonts')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'NanumGothic-Regular.ttf')

console.log('📥 NanumGothic 폰트 다운로드 중...\n')
console.log(`URL: ${FONT_URL}`)
console.log(`저장 위치: ${OUTPUT_FILE}\n`)

// fonts 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log('✅ fonts 디렉토리 생성됨')
}

// 이미 파일이 있는지 확인
if (fs.existsSync(OUTPUT_FILE)) {
  const stats = fs.statSync(OUTPUT_FILE)
  console.log(`⚠️  파일이 이미 존재합니다 (${(stats.size / 1024).toFixed(1)} KB)`)
  console.log('기존 파일을 덮어쓰시겠습니까? (파일 삭제 후 다시 실행)')
  process.exit(0)
}

// HTTPS 다운로드
const file = fs.createWriteStream(OUTPUT_FILE)

https.get(FONT_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // 리다이렉트 처리
    https.get(response.headers.location, (redirectResponse) => {
      const totalSize = parseInt(redirectResponse.headers['content-length'], 10)
      let downloadedSize = 0

      redirectResponse.on('data', (chunk) => {
        downloadedSize += chunk.length
        const progress = ((downloadedSize / totalSize) * 100).toFixed(1)
        process.stdout.write(`\r진행률: ${progress}% (${(downloadedSize / 1024).toFixed(1)} KB / ${(totalSize / 1024).toFixed(1)} KB)`)
      })

      redirectResponse.pipe(file)

      file.on('finish', () => {
        file.close()
        console.log('\n\n✅ 다운로드 완료!')
        console.log(`파일 크기: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`)
        console.log('\n다음 단계:')
        console.log('  1. npm run dev (개발 서버 재시작)')
        console.log('  2. PDF 내보내기 기능 테스트')
        console.log('  3. 한글이 정상적으로 표시되는지 확인\n')
      })
    }).on('error', (err) => {
      fs.unlinkSync(OUTPUT_FILE)
      console.error('\n❌ 다운로드 실패:', err.message)
      process.exit(1)
    })
  } else {
    const totalSize = parseInt(response.headers['content-length'], 10)
    let downloadedSize = 0

    response.on('data', (chunk) => {
      downloadedSize += chunk.length
      const progress = ((downloadedSize / totalSize) * 100).toFixed(1)
      process.stdout.write(`\r진행률: ${progress}% (${(downloadedSize / 1024).toFixed(1)} KB / ${(totalSize / 1024).toFixed(1)} KB)`)
    })

    response.pipe(file)

    file.on('finish', () => {
      file.close()
      console.log('\n\n✅ 다운로드 완료!')
      console.log(`파일 크기: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`)
      console.log('\n다음 단계:')
      console.log('  1. npm run dev (개발 서버 재시작)')
      console.log('  2. PDF 내보내기 기능 테스트')
      console.log('  3. 한글이 정상적으로 표시되는지 확인\n')
    })
  }
}).on('error', (err) => {
  fs.unlinkSync(OUTPUT_FILE)
  console.error('\n❌ 다운로드 실패:', err.message)
  console.log('\n대안:')
  console.log('  1. Google Fonts에서 수동 다운로드: https://fonts.google.com/specimen/Nanum+Gothic')
  console.log(`  2. 다운로드한 파일을 ${OUTPUT_FILE} 위치에 저장\n`)
  process.exit(1)
})
