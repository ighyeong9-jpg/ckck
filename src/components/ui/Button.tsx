'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'ghost-dark' | 'danger' | 'success' | 'white'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-orange-500 text-white font-bold shadow-orange ' +
    'hover:bg-orange-400 hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(232,101,26,.5)] ' +
    'active:bg-orange-600 active:translate-y-0',
  secondary:
    'bg-transparent text-navy-800 border-[1.5px] border-navy-800 font-semibold ' +
    'hover:bg-navy-100',
  ghost:
    'bg-transparent text-gray-600 border border-gray-200 font-medium ' +
    'hover:bg-gray-50',
  'ghost-dark':
    'bg-white/[0.06] text-white/80 border border-white/[0.15] font-semibold ' +
    'hover:bg-white/10 hover:-translate-y-0.5',
  danger:
    'bg-nogo text-white font-bold ' +
    'hover:brightness-110',
  success:
    'bg-go text-white font-bold ' +
    'hover:brightness-110',
  white:
    'bg-white text-orange-500 font-extrabold shadow-xl ' +
    'hover:-translate-y-0.5 hover:scale-[1.02]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-4 text-sm rounded-md',
  md: 'h-10 px-5 text-[15px] rounded-lg',
  lg: 'h-12 px-6 text-[15px] rounded-xl',
  xl: 'h-[52px] px-8 text-[15px] rounded-xl',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-2',
          'transition-all duration-[250ms] ease-spring',
          'active:translate-y-px active:scale-[0.98]',
          'select-none whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
