import { HTMLAttributes } from 'react'

type Variant = 'default' | 'featured' | 'pass' | 'fail' | 'warn' | 'navy' | 'glass'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  hover?: boolean
}

const variantClasses: Record<Variant, string> = {
  default:
    'bg-white border border-gray-200 rounded-xl p-6 shadow-card ' +
    'transition-all duration-200',
  featured:
    'bg-white border border-gray-200 rounded-xl p-6 shadow-card relative overflow-hidden ' +
    'before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] ' +
    'before:bg-gradient-to-r before:from-navy-800 before:to-orange-500',
  pass:
    'bg-white border border-gray-200 rounded-xl p-6 border-l-4 border-l-go',
  fail:
    'bg-white border border-gray-200 rounded-xl p-6 border-l-4 border-l-nogo',
  warn:
    'bg-white border border-gray-200 rounded-xl p-6 border-l-4 border-l-warn',
  navy:
    'bg-gradient-to-br from-navy-800 to-navy-700 border border-white/[0.08] rounded-xl p-6 text-white',
  glass:
    'bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 ' +
    'shadow-[0_32px_80px_rgba(0,0,0,.45)]',
}

export default function Card({ variant = 'default', hover = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        variantClasses[variant],
        hover ? 'hover:shadow-md hover:-translate-y-0.5' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
