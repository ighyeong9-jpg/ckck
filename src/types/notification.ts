export type NotificationType = 'risk' | 'checklist' | 'change' | 'completion' | 'deadline' | 'ai' | 'defect'

export interface Notification {
  id: string
  user_id: string
  notification_type: NotificationType
  title: string
  message: string | null
  link?: string | null
  is_read: boolean
  project_id: string | null
  created_at: string
}

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  risk: '⚠️',
  checklist: '📋',
  change: '🔄',
  completion: '✅',
  deadline: '⏰',
  ai: '🤖',
  defect: '🚨',
}
