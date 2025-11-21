// Simple menu visibility store using localStorage with a custom event broadcast

export type MenuVisibility = Record<string, boolean>

const STORAGE_KEY = 'tnt.sales.menu.visibility'
const CHANGE_EVENT = 'tnt.sales.menu.visibility.changed'

function read(): MenuVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(v: MenuVisibility) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch {}
  try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT)) } catch {}
}

export function getMenuVisibility(): MenuVisibility {
  return read()
}

export function isMenuEnabled(key: string, fallback = true): boolean {
  const v = read()
  if (Object.prototype.hasOwnProperty.call(v, key)) return !!v[key]
  return fallback
}

export function setMenuEnabled(key: string, enabled: boolean) {
  const v = read()
  v[key] = !!enabled
  write(v)
}

export function onMenuVisibilityChange(cb: () => void) {
  const handler = () => cb()
  window.addEventListener(CHANGE_EVENT, handler as any)
  return () => window.removeEventListener(CHANGE_EVENT, handler as any)
}

