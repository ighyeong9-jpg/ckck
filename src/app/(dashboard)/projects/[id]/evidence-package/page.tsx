'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EvidenceFile } from '@/types/evidenceFile'
import { FILE_CATEGORIES } from '@/types/evidenceFile'
import { getMerkleRoot, verifyEvidencePackage, type VerificationResult } from '@/lib/utils/merkleTree'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

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
