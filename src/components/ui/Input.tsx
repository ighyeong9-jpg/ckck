import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'light' | 'dark'
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'light', label, error, className = '', id, ...props }, ref) => {
    const inputClasses =
      variant === 'dark'
        ? 'w-full h-11 px-4 rounded-lg text-sm ' +
          'bg-white/[0.06] border border-white/[0.12] text-white ' +
          'placeholder:text-white/25 ' +
          'focus:outline-none focus:border-orange-500 ' +
          'focus:ring-2 focus:ring-orange-500/20 focus:bg-white/[0.08] ' +
          'transition-all duration-200'
        : 'w-full h-11 px-4 rounded-lg text-sm ' +
          'bg-gray-50 border border-gray-200 text-gray-900 ' +
          'placeholder:text-gray-400 ' +
          'focus:outline-none focus:border-orange-500 ' +
          'focus:ring-2 focus:ring-orange-500/[0.15] focus:bg-white ' +
          'transition-all duration-200'

    const labelClasses =
      variant === 'dark'
        ? 'block text-xs font-bold text-white/50 mb-1.5 tracking-wide'
        : 'block text-xs font-bold text-gray-500 mb-1.5 tracking-wide'

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className={labelClasses}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            inputClasses,
            error ? 'border-nogo bg-nogo-light/30' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-nogo font-medium">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
