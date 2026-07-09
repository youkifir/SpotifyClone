import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variantClasses: Record<string, string> = {
  primary: 'bg-green-500 text-black hover:bg-green-400 hover:scale-105',
  secondary: 'bg-transparent border border-neutral-500 text-white hover:border-white',
  ghost: 'bg-transparent text-neutral-300 hover:text-white',
}

function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
