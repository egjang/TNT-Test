import React from 'react'

type Props = {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function SubjectInput({ value, onChange, placeholder, readOnly }: Props) {
  return (
    <input
      type="text"
      className="subject-input"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  )
}

