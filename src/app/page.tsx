import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to projects
  if (user) {
    redirect('/projects')
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '450px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>📋</span>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Check-In
          </h1>
          <p style={{ fontSize: '1rem', color: '#6b7280' }}>
            기록의 편
          </p>
        </div>

        <p style={{
          fontSize: '1rem',
          color: '#374151',
          marginBottom: '2rem',
          lineHeight: 1.6
        }}>
          인테리어 프로젝트의 모든 과정을<br />
          체계적으로 관리하세요
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/login"
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '1rem'
            }}
          >
            시작하기
          </Link>
        </div>
      </div>
    </main>
  )
}
