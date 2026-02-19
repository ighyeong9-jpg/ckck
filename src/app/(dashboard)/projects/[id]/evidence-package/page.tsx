'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EvidenceFile } from '@/types/evidenceFile'
import { FILE_CATEGORIES } from '@/types/evidenceFile'
import { getMerkleRoot, verifyEvidencePackage, type VerificationResult } from '@/lib/utils/merkleTree'
import type { AutoCheckResult } from '@/lib/ai/auto-checker'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

// 이미지 파일 확장자 목록
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'bmp']
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/bmp']

function isImageFile(file: EvidenceFile): boolean {
  const ext = file.file_name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(ext) || IMAGE_MIME_TYPES.includes(file.file_type ?? '')
}

// GO/NO-GO 판정에 대응하는 친절 안내 문구
const GO_NO_GO_LABEL: Record<string, { label: string; message: string }> = {
  'GO':          { label: '진행해도 좋아요',       message: '주요 항목이 모두 기준을 충족했습니다. 현재 공정을 그대로 이어가셔도 됩니다.' },
  'NO-GO':       { label: '즉시 확인이 필요해요',   message: '기준을 충족하지 못한 항목이 발견되었습니다. 아래 내용을 확인하시고 보완 후 재검토해 주세요.' },
  'CONDITIONAL': { label: '추가 확인 후 진행하세요', message: '사진만으로는 판단하기 어려운 항목이 있어요. 현장에서 직접 확인해 주시면 더 정확한 결과를 드릴 수 있습니다.' },
}

// 체크 항목 결과 레이블
const ITEM_RESULT_LABEL: Record<string, { icon: string; label: string }> = {
  'PASS':      { icon: '✅', label: '양호해요' },
  'FAIL':      { icon: '❌', label: '확인이 필요해요' },
  'UNCERTAIN': { icon: '❓', label: '사진으로는 확인이 어려워요' },
}

export default function EvidencePackagePage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('other')
  const [merkleRoot, setMerkleRoot] = useState<string>('')
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)

  // AI 자동 체크 상태
  const [aiChecking, setAiChecking] = useState<string | null>(null)   // 현재 분석 중인 file.id
  const [aiResult, setAiResult] = useState<AutoCheckResult | null>(null)
  const [aiResultFile, setAiResultFile] = useState<string>('')         // 분석된 파일명
  const [showAiModal, setShowAiModal] = useState(false)

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: evidenceFiles, error } = await supabase
          .from('evidence_files')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFiles(evidenceFiles || [])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // SHA-256 해시 생성
  const generateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 파일 업로드
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)

    try {
      for (const file of Array.from(selectedFiles)) {
        // 파일 크기 체크 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
          alert(`"${file.name}" 파일이 너무 큽니다. (최대 5MB)`)
          continue
        }

        // SHA-256 해시 생성
        const sha256Hash = await generateSHA256(file)

        // 파일명 생성 (중복 방지)
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `${projectId}/${timestamp}_${safeName}`

        // Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(storagePath, file)

        if (uploadError) {
          throw new Error(uploadError.message || '파일 업로드 실패')
        }

        // DB에 메타데이터 저장
        const { data, error: dbError } = await supabase
          .from('evidence_files')
          .insert([{
            project_id: projectId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath,
            sha256_hash: sha256Hash,
            category: selectedCategory,
          }])
          .select()
          .single()

        if (dbError) throw dbError

        setFiles(prev => [data, ...prev])
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      alert('업로드 완료!')
    } catch (err: any) {
      console.error('Error uploading:', err)
      alert(`업로드 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setUploading(false)
    }
  }

  // 파일 삭제
  const handleDelete = async (file: EvidenceFile) => {
    if (!confirm(`"${file.file_name}" 파일을 삭제하시겠습니까?`)) return

    try {
      // Storage에서 삭제
      await supabase.storage
        .from('evidence')
        .remove([file.storage_path])

      // DB에서 삭제
      const { error } = await supabase
        .from('evidence_files')
        .delete()
        .eq('id', file.id)

      if (error) throw error

      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (err: any) {
      console.error('Error deleting:', err)
      alert(`삭제 오류: ${err?.message || JSON.stringify(err)}`)
    }
  }

  // AI 자동 체크
  const handleAiCheck = async (file: EvidenceFile) => {
    if (!isImageFile(file)) {
      alert('이미지 파일만 AI 분석이 가능합니다.')
      return
    }

    setAiChecking(file.id)
    setAiResult(null)
    setAiResultFile(file.file_name)

    try {
      // Storage에서 파일 다운로드
      const { data: blob, error: dlError } = await supabase.storage
        .from('evidence')
        .download(file.storage_path)

      if (dlError || !blob) throw new Error('파일 다운로드 실패: ' + dlError?.message)

      // base64 변환
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      bytes.forEach(b => { binary += String.fromCharCode(b) })
      const base64 = btoa(binary)

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(file.storage_path)
      const photoUrl = urlData?.publicUrl ?? ''

      // API 호출
      const res = await fetch('/api/ai/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          imageBase64: base64,
          mimeType: file.file_type || 'image/jpeg',
          photoUrl,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || `서버 오류 (${res.status})`)
      }

      const result: AutoCheckResult = await res.json()
      setAiResult(result)
      setShowAiModal(true)
    } catch (err: any) {
      console.error('[AI Check]', err)
      alert(`AI 분석 오류: ${err?.message}`)
    } finally {
      setAiChecking(null)
    }
  }

  // 파일 다운로드
  const handleDownload = async (file: EvidenceFile) => {
    try {
      // Public URL로 다운로드
      const { data } = supabase.storage
        .from('evidence')
        .getPublicUrl(file.storage_path)

      if (data?.publicUrl) {
        const a = document.createElement('a')
        a.href = data.publicUrl
        a.download = file.file_name
        a.target = '_blank'
        a.click()
      }
    } catch (err: any) {
      console.error('Error downloading:', err)
      alert(`다운로드 오류: ${err?.message || '파일을 찾을 수 없습니다.'}`)
    }
  }

  // 해시 복사
  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    alert('인증값이 클립보드에 복사되었습니다.')
  }

  const getCategoryInfo = (id: string) => FILE_CATEGORIES.find(c => c.id === id)

  // Merkle Root 생성
  const generateMerkleRoot = async () => {
    if (files.length === 0) {
      setMerkleRoot('')
      return
    }

    try {
      const hashes = files
        .filter(f => f.sha256_hash)
        .map(f => f.sha256_hash!)

      if (hashes.length > 0) {
        const root = await getMerkleRoot(hashes)
        setMerkleRoot(root)
      }
    } catch (err) {
      console.error('Error generating Merkle root:', err)
    }
  }

  // 파일이 변경될 때마다 Merkle Root 재생성
  useEffect(() => {
    generateMerkleRoot()
  }, [files])

  // 증빙 패키지 검증
  const verifyPackage = async () => {
    if (files.length === 0) {
      alert('검증할 파일이 없습니다.')
      return
    }

    setVerifying(true)
    try {
      const filesForVerification = files
        .filter(f => f.sha256_hash)
        .map(f => ({
          name: f.file_name,
          hash: f.sha256_hash!
        }))

      // 현재 저장된 Merkle Root와 비교 (프로젝트에서 가져오기)
      const { data: project } = await supabase
        .from('projects')
        .select('merkle_root')
        .eq('id', projectId)
        .single()

      const expectedRoot = project?.merkle_root || merkleRoot

      const result = await verifyEvidencePackage(filesForVerification, expectedRoot)
      setVerificationResult(result)

      if (result.isValid) {
        alert('검증 완료: 모든 파일이 유효합니다.')
      } else {
        alert(`검증 실패: ${result.failedFiles.length}개 파일에 문제가 있습니다.`)
      }
    } catch (err) {
      console.error('Error verifying package:', err)
      alert('검증 중 오류가 발생했습니다.')
    } finally {
      setVerifying(false)
    }
  }

  // Merkle Root 저장
  const saveMerkleRoot = async () => {
    if (!merkleRoot) {
      alert('저장할 인증 코드가 없습니다.')
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ merkle_root: merkleRoot })
        .eq('id', projectId)

      if (error) throw error
      alert('인증 코드가 저장되었습니다.')
    } catch (err: any) {
      alert(`저장 오류: ${err?.message}`)
    }
  }

  // 카테고리별 그룹화
  const groupedFiles = files.reduce((acc, file) => {
    const cat = file.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(file)
    return acc
  }, {} as Record<string, EvidenceFile[]>)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* AI Quick Actions */}
        <QuickActions compact actions={[
          { icon: '📁', label: '증빙 현황', description: '증빙 패키지 현황 조회', message: '증빙 패키지 현황 조회해줘' },
          { icon: '✅', label: '무결성 검증', description: '증빙 무결성 검증', message: '증빙 무결성 검증해줘' },
        ]} />

        {/* Summary */}
        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>총 파일 수</span>
            <span className={styles.summaryValue}>{files.length}개</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>총 용량</span>
            <span className={styles.summaryValue}>
              {formatFileSize(files.reduce((sum, f) => sum + f.file_size, 0))}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>카테고리</span>
            <span className={styles.summaryValue}>
              {Object.keys(groupedFiles).length}개
            </span>
          </div>
        </section>

        {/* 파일 위변조 검증 */}
        <section className={styles.merkleSection}>
          <div className={styles.merkleHeader}>
            <h2>파일 위변조 검증</h2>
            <div className={styles.merkleActions}>
              <button
                className={styles.verifyBtn}
                onClick={verifyPackage}
                disabled={verifying || files.length === 0}
              >
                {verifying ? '검증 중...' : '위변조 검사'}
              </button>
              <button
                className={styles.saveRootBtn}
                onClick={saveMerkleRoot}
                disabled={!merkleRoot}
              >
                인증값 저장
              </button>
            </div>
          </div>

          {merkleRoot && (
            <div className={styles.merkleRoot}>
              <span className={styles.merkleLabel}>인증 코드:</span>
              <code
                className={styles.merkleHash}
                onClick={() => copyHash(merkleRoot)}
                title="클릭하여 복사"
              >
                {merkleRoot}
              </code>
            </div>
          )}

          {verificationResult && (
            <div className={`${styles.verificationResult} ${verificationResult.isValid ? styles.valid : styles.invalid}`}>
              <div className={styles.verificationStatus}>
                <span className={styles.statusIcon}>
                  {verificationResult.isValid ? '✅' : '❌'}
                </span>
                <span className={styles.statusText}>
                  {verificationResult.isValid ? '모든 파일이 검증되었습니다' : '일부 파일 검증 실패'}
                </span>
              </div>
              <div className={styles.verificationDetails}>
                <span>검증된 파일: {verificationResult.verifiedFiles}/{verificationResult.totalFiles}</span>
                <span>검증 시간: {new Date(verificationResult.timestamp).toLocaleString('ko-KR')}</span>
              </div>
              {verificationResult.failedFiles.length > 0 && (
                <div className={styles.failedFiles}>
                  <span className={styles.failedLabel}>실패한 파일:</span>
                  <ul>
                    {verificationResult.failedFiles.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Upload Section */}
        <section className={styles.uploadSection}>
          <div className={styles.uploadCard}>
            <div className={styles.uploadLeft}>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className={styles.categorySelect}
              >
                {FILE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.uploadRight}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className={styles.fileInput}
                id="fileUpload"
              />
              <label htmlFor="fileUpload" className={styles.uploadBtn}>
                {uploading ? '업로드 중...' : '📎 파일 선택'}
              </label>
            </div>
          </div>
          <p className={styles.uploadHint}>
            파일당 최대 5MB / SHA-256 해시 자동 생성
          </p>
        </section>

        {/* AI 체크 결과 모달 */}
        {showAiModal && aiResult && (() => {
          const verdict = GO_NO_GO_LABEL[aiResult.goNoGo] ?? GO_NO_GO_LABEL['CONDITIONAL']
          return (
            <div className={styles.modalOverlay} onClick={() => setShowAiModal(false)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>AI 현장 점검 리포트</h2>
                  <button className={styles.modalClose} onClick={() => setShowAiModal(false)}>✕</button>
                </div>

                <div className={styles.modalBody}>
                  {/* 판정 요약 카드 — 공감 먼저 */}
                  <div className={styles.aiSummary}>
                    <span className={styles.aiFileName}>{aiResultFile}</span>
                    <div className={styles.aiMeta}>
                      <span className={styles.aiProcess}>{aiResult.detectedProcess} 공종</span>
                      <span className={styles.aiConfidence}>
                        분석 신뢰도 {Math.round(aiResult.confidence * 100)}%
                      </span>
                    </div>
                    {/* 판정 — 친절 레이블 + 기술 코드 병기 */}
                    <div className={`${styles.verdictBanner} ${styles[`goNoGo${aiResult.goNoGo.replace('-', '')}`]}`}>
                      <span className={styles.verdictLabel}>{verdict.label}</span>
                      <span className={styles.verdictCode}>{aiResult.goNoGo}</span>
                    </div>
                    <p className={styles.verdictMessage}>{verdict.message}</p>
                  </div>

                  {/* 항목별 확인 결과 */}
                  {aiResult.checkedItems.length > 0 && (
                    <div className={styles.aiSection}>
                      <h3>항목별 확인 결과</h3>
                      <div className={styles.checkedItems}>
                        {aiResult.checkedItems.map(item => {
                          const res = ITEM_RESULT_LABEL[item.result] ?? ITEM_RESULT_LABEL['UNCERTAIN']
                          return (
                            <div key={item.itemId} className={`${styles.checkedItem} ${styles[`item${item.result}`]}`}>
                              <div className={styles.itemHeader}>
                                <span className={styles.itemResult}>{res.icon}</span>
                                <span className={styles.itemName}>{item.itemName}</span>
                                <span className={styles.itemResultLabel}>{res.label}</span>
                              </div>
                              <p className={styles.itemReason}>{item.reason}</p>
                              {item.legalBasis && (
                                <p className={styles.itemLegal}>관련 기준: {item.legalBasis}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 함께 살펴볼 부분 */}
                  {aiResult.issues.length > 0 && (
                    <div className={styles.aiSection}>
                      <h3>함께 살펴볼 부분이에요</h3>
                      <ul className={styles.issueList}>
                        {aiResult.issues.map((issue, i) => (
                          <li key={i} className={styles.issueItem}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 이렇게 해보시면 좋아요 */}
                  {aiResult.recommendations.length > 0 && (
                    <div className={styles.aiSection}>
                      <h3>이렇게 해보시면 좋아요</h3>
                      <ul className={styles.recommendList}>
                        {aiResult.recommendations.map((rec, i) => (
                          <li key={i} className={styles.recommendItem}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 현장에서 직접 확인해 주세요 */}
                  {aiResult.requiresHumanReview.length > 0 && (
                    <div className={styles.aiSection}>
                      <h3>현장에서 직접 확인해 주세요</h3>
                      <ul className={styles.reviewList}>
                        {aiResult.requiresHumanReview.map((item, i) => (
                          <li key={i} className={styles.reviewItem}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <p className={styles.aiDisclaimer}>
                    AI가 사진을 바탕으로 분석한 결과예요. 최종 판단은 항상 전문가의 현장 확인과 함께해 주세요.
                  </p>
                  <button className={styles.modalConfirmBtn} onClick={() => setShowAiModal(false)}>
                    알겠어요
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Files List */}
        <section className={styles.filesSection}>
          {files.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📸</span>
              <h3>증빙 파일을 업로드해보세요</h3>
              <p>사진, 문서 등 증빙 자료를 업로드하면<br/>자동으로 카테고리별 정리됩니다</p>
              <label htmlFor="fileUpload" className={styles.emptyBtn}>
                + 첫 파일 업로드하기
              </label>
            </div>
          ) : (
            Object.entries(groupedFiles).map(([category, categoryFiles]) => {
              const catInfo = getCategoryInfo(category)
              return (
                <div key={category} className={styles.categoryGroup}>
                  <div className={styles.categoryHeader}>
                    <h2>
                      <span>{catInfo?.icon}</span>
                      {catInfo?.name || '기타'}
                    </h2>
                    <span className={styles.fileCount}>{categoryFiles.length}개</span>
                  </div>

                  <div className={styles.filesList}>
                    {categoryFiles.map(file => (
                      <div key={file.id} className={styles.fileCard}>
                        <div className={styles.fileInfo}>
                          <span className={styles.fileName}>{file.file_name}</span>
                          <div className={styles.fileMeta}>
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>•</span>
                            <span>{new Date(file.created_at).toLocaleDateString('ko-KR')}</span>
                          </div>
                          {file.sha256_hash && (
                            <div
                              className={styles.hash}
                              onClick={() => copyHash(file.sha256_hash!)}
                              title="클릭하여 복사"
                            >
                              파일 인증값: {file.sha256_hash.substring(0, 16)}...
                            </div>
                          )}
                        </div>
                        <div className={styles.fileActions}>
                          {isImageFile(file) && (
                            <button
                              className={styles.aiCheckBtn}
                              onClick={() => handleAiCheck(file)}
                              disabled={aiChecking === file.id}
                              title="AI 자동 품질 체크"
                            >
                              {aiChecking === file.id ? '분석 중...' : 'AI 체크'}
                            </button>
                          )}
                          <button
                            className={styles.downloadBtn}
                            onClick={() => handleDownload(file)}
                          >
                            다운로드
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(file)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
