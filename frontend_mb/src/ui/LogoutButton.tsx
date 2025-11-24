import React from 'react'
import { LogOut } from 'lucide-react'

type Props = {
  onClick: () => void
}

export function LogoutButton({ onClick }: Props) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="icon-button"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      title="로그아웃"
      aria-label="로그아웃"
    >
      <LogOut className="icon" size={20} />
    </span>
  )
}
