import React from 'react'
import { getStoredTheme, setTheme } from '../config/theme'

export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<'light' | 'dark'>(getStoredTheme() ?? 'light')

  const toggle = React.useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }, [theme])

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label="테마 전환"
      title={theme === 'light' ? '다크 테마로 전환' : '라이트 테마로 전환'}
    >
      <span className="thumb" aria-hidden>
        {theme === 'light' ? (
          // Sun icon
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          // Moon icon
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>
    </button>
  )
}
