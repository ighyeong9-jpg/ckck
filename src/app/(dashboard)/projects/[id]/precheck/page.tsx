'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SAFETY_LEVELS, getSafetyLevelFromRate } from '@/types/safety-levels'
import { useToast } from '@/components/ui/Toast'

interface ChecklistItem {
  id: string
  category: string
  item: string
  checked: boolean
  photo_url?: string | null
}

export default function PrecheckPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const toast = useToast()

  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  useEffect(() => {
    loadChecklist()
  }, [projectId])

  const loadChecklist = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnostic_responses')
        .select('id, category, item_text, checked, photo_url')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setChecklist(
        (data || []).map((d: any) => ({
          id: d.id,
          category: d.category || '일반',
          item: d.item_text || '',
          checked: d.checked ?? false,
          photo_url: d.photo_url || null,
        }))
      )
    } catch (err) {
      console.error('Error loading checklist:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleCheck = async (id: string) => {
    const item = checklist.find(c => c.id === id)
    if (!item) return
    const newChecked = !item.checked
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: newChecked } : c))
    try {
      await supabase.from('diagnostic_responses').update({ checked: newChecked }).eq('id', id)
    } catch {}
  }

  const handlePhotoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingId(itemId)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `precheck/${projectId}/${itemId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      await supabase.from('diagnostic_responses').update({ photo_url: publicUrl }).eq('id', itemId)
      setChecklist(prev => prev.map(c => c.id === itemId ? { ...c, photo_url: publicUrl } : c))
      toast.success('사진이 업로드되었습니다.')
    } catch (err: any) {
      toast.error(`업로드 오류: ${err?.message}`)
    } finally {
      setUploadingId(null)
    }
  }

  const completedCount = checklist.filter(c => c.checked).length
  const completionRate = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0
  const safetyLevel = getSafetyLevelFromRate(completionRate)
  const levelInfo = SAFETY_LEVELS[safetyLevel]

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* 완료율 카드 + 안전 뱃지 */}
      <div style={{
        background: 'white', padding: '1.5rem', borderRadius: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem',
        borderLeft: `4px solid ${levelInfo.color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>완료율</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: levelInfo.color, margin: '0.25rem 0' }}>
              {completionRate}%
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: levelInfo.bg, color: levelInfo.color,
              padding: '0.375rem 0.75rem', borderRadius: '1rem',
              fontSize: '0.875rem', fontWeight: 600,
            }}>
              {levelInfo.icon} {levelInfo.label}
            </span>
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
              {completedCount} / {checklist.length}
            </p>
          </div>
        </div>
      </div>

      {/* 체크리스트 */}
      {checklist.length === 0 ? (
        <div style={{
          background: 'white', padding: '3rem', borderRadius: '0.75rem',
          textAlign: 'center', color: '#64748B',
        }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>체크리스트가 없습니다</p>
          <p style={{ fontSize: '0.875rem' }}>진단 탭에서 먼저 체크리스트를 생성해주세요</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {checklist.map((item) => (
            <div key={item.id} style={{
              background: 'white', padding: '1rem 1.25rem', borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item.id)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  background: '#E2E8F0', padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
                  fontSize: '0.75rem', fontWeight: 600, color: '#64748B',
                }}>
                  {item.category}
                </span>
                <p style={{
                  fontSize: '0.875rem', color: '#0F172A', margin: '0.25rem 0 0',
                  textDecoration: item.checked ? 'line-through' : 'none',
                }}>
                  {item.item}
                </p>
              </div>
              {/* 썸네일 미리보기 */}
              {item.photo_url && (
                <img
                  src={item.photo_url}
                  alt="현장 사진"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '0.375rem', flexShrink: 0 }}
                />
              )}
              {/* 사진 업로드 버튼 */}
              <label style={{
                padding: '0.5rem 0.75rem', background: '#F8FAFC',
                border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                cursor: 'pointer', color: '#667eea', fontWeight: 500,
                fontSize: '0.875rem', flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(item.id, e)}
                  style={{ display: 'none' }}
                />
                {uploadingId === item.id ? '...' : '📷'}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
