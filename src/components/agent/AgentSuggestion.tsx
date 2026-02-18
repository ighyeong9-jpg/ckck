'use client'

import styles from './AgentSuggestion.module.scss'

interface AgentSuggestionProps {
  icon: string
  text: string
  buttonText: string
  onAction: () => void
}

export default function AgentSuggestion({ icon, text, buttonText, onAction }: AgentSuggestionProps) {
  return (
    <div className={styles.suggestion}>
      <div className={styles.suggestionContent}>
        <span className={styles.suggestionIcon}>{icon}</span>
        <span className={styles.suggestionText}>{text}</span>
      </div>
      <button className={styles.suggestionBtn} onClick={onAction}>
        {buttonText}
      </button>
    </div>
  )
}

export function AIBadge() {
  return (
    <span className={styles.aiBadge}>
      🤖 AI
    </span>
  )
}
