import { HTMLAttributes } from 'react'

type Variant = 'go' | 'nogo' | 'warn' | 'info' | 'high' | 'new'

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: Variant
}

const variantClasses: Record<Variant, string> = {
  go:   'bg-go-light text-go border border-go/20',
  nogo: 'bg-nogo-light text-nogo border border-nogo/20',
  warn: 'bg-warn-light text-warn border border-warn/20',
  info: 'bg-info-light text-info border border-info/20',
  high: 'bg-nogo text-white',
  new:  'bg-orange-100 text-orange-500',
}

export default function StatusBadge({ variant, className = '', children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full',
        variantClasses[variant],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}
