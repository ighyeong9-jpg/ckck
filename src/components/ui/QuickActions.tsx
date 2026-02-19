'use client'

import styles from './QuickActions.module.scss'

interface QuickAction {
  icon: string
  label: string
  description: string
  message: string
  color?: string
}

interface QuickActionsProps {
  title?: string
  actions: QuickAction[]
  compact?: boolean
}

export function sendToCheki(message: string) {
  window.dispatchEvent(new CustomEvent('cheki-send', { detail: { message } }))
}

export default function QuickActions({ title, actions, compact }: QuickActionsProps) {
  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.grid}>
        {actions.map((action, i) => (
          <button
            key={i}
            className={styles.card}
            onClick={() => sendToCheki(action.message)}
            style={action.color ? { '--accent': action.color } as React.CSSProperties : undefined}
          >
            <span className={styles.icon}>{action.icon}</span>
            <div className={styles.content}>
              <span className={styles.label}>{action.label}</span>
              {!compact && <span className={styles.desc}>{action.description}</span>}
            </div>
            <span className={styles.arrow}>&#8250;</span>
          </button>
        ))}
      </div>
    </div>
  )
}
