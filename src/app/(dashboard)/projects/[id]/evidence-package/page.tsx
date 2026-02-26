'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EvidenceFile } from '@/types/evidenceFile'
import { FILE_CATEGORIES } from '@/types/evidenceFile'
import { getMerkleRoot, verifyEvidencePackage, type VerificationResult } from '@/lib/utils/merkleTree'
import type { AutoCheckResult } from '@/lib/ai/auto-checker'
import QuickActions from '@/components/ui/QuickActions'
import { useToast } from '@/components/ui/Toast'
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
  const toast = useToast()
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

  // 드래그&드롭 + 업로드 진행 상태
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ step: number; fileName: string } | null>(null)
  // step: 1=업로드, 2=SHA-256, 3=메타데이터, 4=완료

  // 사진 상세 모달
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null)
  const [verifyingHash, setVerifyingHash] = useState(false)
  const [hashVerifyResult, setHashVerifyResult] = useState<'match' | 'mismatch' | null>(null)

  // 카테고리 필터
  const [activeFilter, setActiveFilter] = useState<string>('all')

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

  // 드래그&드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      await uploadFiles(Array.from(droppedFiles))
    }
  }

  // 공통 업로드 로직
  const uploadFiles = async (fileList: File[]) => {
    setUploading(true)
    try {
      for (const file of fileList) {
        if (file.size > 5 * 1024 * 1024) {
          toast.warning(`"${file.name}" 파일이 너무 큽니다. (최대 5MB)`)
          continue
        }

        // Step 1: 업로드 시작
        setUploadProgress({ step: 1, fileName: file.name })
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `${projectId}/${timestamp}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(storagePath, file)
        if (uploadError) throw new Error(uploadError.message || '파일 업로드 실패')

        // Step 2: SHA-256 해시 생성
        setUploadProgress({ step: 2, fileName: file.name })
        const sha256Hash = await generateSHA256(file)

        // Step 3: 메타데이터 저장
        setUploadProgress({ step: 3, fileName: file.name })
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
            is_evidence: false,
          }])
          .select()
          .single()
        if (dbError) throw dbError

        // Step 4: 완료
        setUploadProgress({ step: 4, fileName: file.name })
        setFiles(prev => [data, ...prev])
        await new Promise(r => setTimeout(r, 400))
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('업로드 완료! SHA-256 해시가 자동 생성됐습니다.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '업로드 오류'
      toast.error(`업로드 오류: ${msg}`)
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  // 파일 업로드 (input change)
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    await uploadFiles(Array.from(selectedFiles))
  }

  // 법정 증거 지정 토글
  const handleToggleEvidence = async (file: EvidenceFile) => {
    const newVal = !file.is_evidence
    const { error } = await supabase
      .from('evidence_files')
      .update({ is_evidence: newVal })
      .eq('id', file.id)
    if (!error) {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_evidence: newVal } : f))
      if (selectedFile?.id === file.id) setSelectedFile({ ...file, is_evidence: newVal })
      toast.success(newVal ? '법정 증거로 지정됐습니다.' : '증거 지정이 해제됐습니다.')
    }
  }

  // 단일 파일 해시 무결성 검증
  const handleVerifyHash = async (file: EvidenceFile) => {
    if (!file.sha256_hash) { toast.warning('해시값이 없습니다.'); return }
    setVerifyingHash(true)
    setHashVerifyResult(null)
    try {
      const { data: blob } = await supabase.storage.from('evidence').download(file.storage_path)
      if (!blob) throw new Error('파일 다운로드 실패')
      const currentHash = await generateSHA256(new File([blob], file.file_name, { type: file.file_type || undefined }))
      setHashVerifyResult(currentHash === file.sha256_hash ? 'match' : 'mismatch')
    } catch {
      toast.error('무결성 검증 중 오류가 발생했습니다.')
    } finally {
      setVerifyingHash(false)
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
      toast.error(`삭제 오류: ${err?.message || JSON.stringify(err)}`)
    }
  }

  // AI 자동 체크
  const handleAiCheck = async (file: EvidenceFile) => {
    if (!isImageFile(file)) {
      toast.warning('이미지 파일만 AI 분석이 가능합니다.')
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
      toast.error(`AI 분석 오류: ${err?.message}`)
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
      toast.error(`다운로드 오류: ${err?.message || '파일을 찾을 수 없습니다.'}`)
    }
  }

  // 해시 복사
  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    toast.success('인증값이 클립보드에 복사되었습니다.')
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
      toast.warning('검증할 파일이 없습니다.')
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
        toast.success('검증 완료: 모든 파일이 유효합니다.')
      } else {
        toast.error(`검증 실패: ${result.failedFiles.length}개 파일에 문제가 있습니다.`)
      }
    } catch (err) {
      console.error('Error verifying package:', err)
      toast.error('검증 중 오류가 발생했습니다.')
    } finally {
      setVerifying(false)
    }
  }

  // Merkle Root 저장
  const saveMerkleRoot = async () => {
    if (!merkleRoot) {
      toast.warning('저장할 인증 코드가 없습니다.')
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ merkle_root: merkleRoot })
        .eq('id', projectId)

      if (error) throw error
      toast.success('인증 코드가 저장되었습니다.')
    } catch (err: any) {
      toast.error(`저장 오류: ${err?.message}`)
    }
  }

  // 증거 패키지 HTML 다운로드
  const handleDownloadPackage = () => {
    if (files.length === 0) {
      toast.warning('다운로드할 파일이 없습니다.')
      return
    }

    const now = new Date().toLocaleString('ko-KR')
    const evidenceFiles = files.filter(f => f.is_evidence)
    const hashedFiles = files.filter(f => f.sha256_hash)

    const rows = files.map(f => `
      <tr>
        <td>${f.file_name}</td>
        <td>${FILE_CATEGORIES.find(c => c.id === f.category)?.name || '기타'}</td>
        <td style="font-family:monospace;font-size:11px">${f.sha256_hash ? f.sha256_hash.substring(0, 16) + '...' : '미생성'}</td>
        <td>${f.is_evidence ? '✅ 법정증거' : '-'}</td>
        <td>${formatFileSize(f.file_size)}</td>
        <td>${new Date(f.created_at).toLocaleDateString('ko-KR')}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>증거 패키지 리포트</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; color: #1f2937; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 22px; color: #0F2744; border-bottom: 3px solid #E8651A; padding-bottom: 8px; }
  .meta { display: flex; gap: 32px; margin: 20px 0; }
  .meta-item { display: flex; flex-direction: column; }
  .meta-label { font-size: 11px; color: #6b7280; }
  .meta-value { font-size: 18px; font-weight: 700; color: #0F2744; }
  .merkle { background: #f3f4f6; border-radius: 8px; padding: 12px 16px; margin: 20px 0; }
  .merkle-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  .merkle-code { font-family: monospace; font-size: 13px; color: #374151; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th { background: #0F2744; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
  <h1>⚖️ 증거 패키지 무결성 리포트</h1>
  <div class="meta">
    <div class="meta-item"><span class="meta-label">생성 일시</span><span class="meta-value">${now}</span></div>
    <div class="meta-item"><span class="meta-label">전체 파일</span><span class="meta-value">${files.length}개</span></div>
    <div class="meta-item"><span class="meta-label">법정 증거</span><span class="meta-value">${evidenceFiles.length}개</span></div>
    <div class="meta-item"><span class="meta-label">해시 생성</span><span class="meta-value">${hashedFiles.length}개</span></div>
  </div>
  <div class="merkle">
    <div class="merkle-label">Merkle Tree Root Hash</div>
    <div class="merkle-code">${merkleRoot || '(미생성)'}</div>
  </div>
  <table>
    <thead><tr><th>파일명</th><th>카테고리</th><th>SHA-256</th><th>증거 지정</th><th>크기</th><th>업로드 일</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    본 리포트는 체크인(Check-In) 시스템에서 자동 생성되었습니다. SHA-256 해시 및 Merkle Root는 파일 무결성 검증에 활용됩니다.
  </div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evidence-package-${projectId}-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('증거 패키지 리포트가 다운로드됐습니다.')
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
              <button
                className={styles.downloadPackageBtn}
                onClick={handleDownloadPackage}
                disabled={files.length === 0}
              >
                ⬇️ 패키지 다운로드
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

        {/* 증거 패키지 요약 */}
        <section className={styles.evidenceSummary}>
          <div className={styles.evidSumCard}>
            <span className={styles.evidSumNumber}>{files.length}</span>
            <span className={styles.evidSumLabel}>전체 파일</span>
          </div>
          <div className={styles.evidSumCard} style={{ borderColor: '#3b82f6' }}>
            <span className={styles.evidSumNumber} style={{ color: '#3b82f6' }}>{files.filter(f => f.is_evidence).length}</span>
            <span className={styles.evidSumLabel}>법정 증거 지정</span>
          </div>
          <div className={styles.evidSumCard} style={{ borderColor: '#10b981' }}>
            <span className={styles.evidSumNumber} style={{ color: '#10b981' }}>{files.filter(f => f.sha256_hash).length}</span>
            <span className={styles.evidSumLabel}>해시 생성 완료</span>
          </div>
          <div className={styles.evidSumCard} style={{ borderColor: merkleRoot ? '#10b981' : '#d1d5db' }}>
            <span className={styles.evidSumNumber} style={{ color: merkleRoot ? '#10b981' : '#9ca3af', fontSize: '0.85rem' }}>
              {merkleRoot ? `${merkleRoot.substring(0, 8)}...` : '미생성'}
            </span>
            <span className={styles.evidSumLabel}>Merkle Tree</span>
          </div>
        </section>

        {/* Upload Section — 드래그&드롭 */}
        <section className={styles.uploadSection}>
          <div
            className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''} ${uploading ? styles.dropZoneUploading : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <span className={styles.dropIcon}>{isDragging ? '📂' : '📁'}</span>
            <p className={styles.dropText}>
              {isDragging ? '여기에 놓으세요!' : '사진 또는 문서를 여기에 끌어다 놓으세요'}
            </p>
            <p className={styles.dropHint}>또는</p>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className={styles.fileInput} id="fileUpload" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <label htmlFor="fileUpload" className={styles.uploadBtn}>
              파일 선택
            </label>
            <div className={styles.dropMeta}>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={styles.categorySelect}>
                {FILE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
              </select>
              <span className={styles.dropMetaHint}>파일당 최대 5MB</span>
            </div>
          </div>

          {/* 업로드 진행 상태 */}
          {uploadProgress && (
            <div className={styles.uploadSteps}>
              <p className={styles.uploadFileName}>{uploadProgress.fileName}</p>
              <div className={styles.uploadStepList}>
                {[
                  { step: 1, label: '파일 업로드' },
                  { step: 2, label: 'SHA-256 해시 생성' },
                  { step: 3, label: '메타데이터 저장' },
                  { step: 4, label: '완료!' },
                ].map(s => (
                  <div
                    key={s.step}
                    className={`${styles.uploadStep} ${
                      s.step < uploadProgress.step ? styles.stepDone :
                      s.step === uploadProgress.step ? styles.stepActive : ''
                    }`}
                  >
                    <span>{s.step < uploadProgress.step ? '✅' : s.step === uploadProgress.step ? '⏳' : '⭕'}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        {/* 카테고리 필터 */}
        {files.length > 0 && (
          <div className={styles.filterTabs}>
            <button type="button" className={`${styles.filterTab} ${activeFilter === 'all' ? styles.filterTabActive : ''}`} onClick={() => setActiveFilter('all')}>
              전체 {files.length}
            </button>
            <button type="button" className={`${styles.filterTab} ${activeFilter === 'evidence' ? styles.filterTabActive : ''}`} onClick={() => setActiveFilter('evidence')}>
              🔒 법정증거 {files.filter(f => f.is_evidence).length}
            </button>
            {Object.keys(groupedFiles).map(cat => {
              const catInfo = getCategoryInfo(cat)
              return (
                <button key={cat} type="button" className={`${styles.filterTab} ${activeFilter === cat ? styles.filterTabActive : ''}`} onClick={() => setActiveFilter(cat)}>
                  {catInfo?.icon} {catInfo?.name || '기타'} {groupedFiles[cat].length}
                </button>
              )
            })}
          </div>
        )}

        {/* Files List */}
        <section className={styles.filesSection}>
          {files.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📸</span>
              <h3>증빙 파일을 업로드해보세요</h3>
              <p>사진, 문서 등 증빙 자료를 업로드하면<br/>자동으로 SHA-256 해시가 생성됩니다</p>
              <label htmlFor="fileUpload" className={styles.emptyBtn}>
                + 첫 파일 업로드하기
              </label>
            </div>
          ) : (() => {
            const displayFiles = activeFilter === 'all' ? files :
              activeFilter === 'evidence' ? files.filter(f => f.is_evidence) :
              (groupedFiles[activeFilter] || [])
            const displayGroups = activeFilter === 'all' || activeFilter === 'evidence'
              ? Object.entries(displayFiles.reduce((acc, f) => { const cat = f.category || 'other'; if (!acc[cat]) acc[cat] = []; acc[cat].push(f); return acc }, {} as Record<string, EvidenceFile[]>))
              : [[activeFilter, displayFiles]] as [string, EvidenceFile[]][]
            return displayGroups.map(([category, categoryFiles]) => {
              const catInfo = getCategoryInfo(category)
              return (
                <div key={category} className={styles.categoryGroup}>
                  <div className={styles.categoryHeader}>
                    <h2><span>{catInfo?.icon}</span>{catInfo?.name || '기타'}</h2>
                    <span className={styles.fileCount}>{categoryFiles.length}개</span>
                  </div>
                  <div className={styles.filesList}>
                    {categoryFiles.map(file => (
                      <div key={file.id} className={`${styles.fileCard} ${file.is_evidence ? styles.fileCardEvidence : ''}`}>
                        {file.is_evidence && <span className={styles.evidenceBadge}>🔒 법정증거</span>}
                        <div className={styles.fileInfo} onClick={() => { setSelectedFile(file); setHashVerifyResult(null) }} style={{ cursor: 'pointer' }}>
                          <span className={styles.fileName}>{file.file_name}</span>
                          <div className={styles.fileMeta}>
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>•</span>
                            <span>{new Date(file.created_at).toLocaleDateString('ko-KR')}</span>
                            {file.sha256_hash && <span>• ✅ 해시생성</span>}
                          </div>
                        </div>
                        <div className={styles.fileActions}>
                          {isImageFile(file) && (
                            <button className={styles.aiCheckBtn} onClick={() => handleAiCheck(file)} disabled={aiChecking === file.id}>
                              {aiChecking === file.id ? '분석 중...' : 'AI 체크'}
                            </button>
                          )}
                          <button className={`${styles.evidenceToggle} ${file.is_evidence ? styles.evidenceActive : ''}`} onClick={() => handleToggleEvidence(file)} title={file.is_evidence ? '증거 지정 해제' : '법정 증거로 지정'}>
                            {file.is_evidence ? '🔒' : '🔓'}
                          </button>
                          <button className={styles.downloadBtn} onClick={() => handleDownload(file)}>다운로드</button>
                          <button className={styles.deleteBtn} onClick={() => handleDelete(file)}>삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          })()}
        </section>

        {/* 사진 상세 모달 */}
        {selectedFile && (
          <div className={styles.modalOverlay} onClick={() => setSelectedFile(null)}>
            <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>파일 상세 정보</h2>
                <button type="button" className={styles.modalClose} onClick={() => setSelectedFile(null)}>✕</button>
              </div>
              <div className={styles.detailBody}>
                <div className={styles.detailMeta}>
                  <div className={styles.detailRow}><span>파일명</span><strong>{selectedFile.file_name}</strong></div>
                  <div className={styles.detailRow}><span>파일 크기</span><strong>{formatFileSize(selectedFile.file_size)}</strong></div>
                  <div className={styles.detailRow}><span>파일 형식</span><strong>{selectedFile.file_type || '알 수 없음'}</strong></div>
                  <div className={styles.detailRow}><span>업로드 일시</span><strong>{new Date(selectedFile.created_at).toLocaleString('ko-KR')}</strong></div>
                  <div className={styles.detailRow}><span>카테고리</span><strong>{getCategoryInfo(selectedFile.category)?.name || '기타'}</strong></div>
                  <div className={`${styles.detailRow} ${styles.hashRow}`}>
                    <span>SHA-256</span>
                    <div className={styles.hashDisplay}>
                      <code className={styles.hashCode}>{selectedFile.sha256_hash || '미생성'}</code>
                      {selectedFile.sha256_hash && (
                        <button type="button" className={styles.copyBtn} onClick={() => copyHash(selectedFile.sha256_hash!)}>복사</button>
                      )}
                    </div>
                  </div>
                  {hashVerifyResult && (
                    <div className={`${styles.verifyResult} ${hashVerifyResult === 'match' ? styles.verifyMatch : styles.verifyMismatch}`}>
                      {hashVerifyResult === 'match' ? '✅ 무결성 검증 완료 — 파일이 변조되지 않았습니다.' : '❌ 해시 불일치 — 파일이 변조되었을 수 있습니다!'}
                    </div>
                  )}
                </div>
                <div className={styles.detailActions}>
                  <button
                    type="button"
                    className={`${styles.evidenceToggleBtn} ${selectedFile.is_evidence ? styles.evidenceActiveBtn : ''}`}
                    onClick={() => handleToggleEvidence(selectedFile)}
                  >
                    {selectedFile.is_evidence ? '🔒 법정 증거 지정됨 (해제)' : '🔓 법정 증거로 지정'}
                  </button>
                  <button
                    type="button"
                    className={styles.verifyBtn2}
                    onClick={() => handleVerifyHash(selectedFile)}
                    disabled={verifyingHash || !selectedFile.sha256_hash}
                  >
                    {verifyingHash ? '검증 중...' : '🔍 무결성 검증'}
                  </button>
                  <button type="button" className={styles.downloadBtn2} onClick={() => handleDownload(selectedFile)}>
                    ⬇️ 다운로드
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
