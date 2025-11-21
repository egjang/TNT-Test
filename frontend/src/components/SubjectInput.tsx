import React from 'react'

type Props = {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  style?: React.CSSProperties
}

export function SubjectInput({ value, onChange, placeholder, readOnly, className, style }: Props) {
  return (
    <input
      type="text"
      className={['subject-input', className].filter(Boolean).join(' ')}
      style={style}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  )
}
