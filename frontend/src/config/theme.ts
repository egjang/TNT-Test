export type Theme = 'light' | 'dark'

const THEME_KEY = 'theme'

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  return null
}

export function applyTheme(t: Theme) {
  const theme = t === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(THEME_KEY, t) } catch {}
  applyTheme(t)
}

export function initTheme(defaultTheme: Theme = 'light') {
  const stored = getStoredTheme()
  const theme = stored ?? defaultTheme
  applyTheme(theme)
}

