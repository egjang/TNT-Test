import React from 'react'

type FilterFieldProps = {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}

export function FilterField({ label, children, style }: FilterFieldProps) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
