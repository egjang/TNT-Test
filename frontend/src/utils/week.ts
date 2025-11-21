export type WeekRange = { start: Date; end: Date }

function atStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Returns week range [Mon..Sun] for the given offset in weeks from current week.
 * - offsetWeeks = 0: this week, 1: next week, -1: previous week
 * - Week starts on Monday (KST typical)
 */
export function getWeekRange(offsetWeeks = 0, opts?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }): WeekRange {
  const weekStartsOn = opts?.weekStartsOn ?? 1 // Monday
  const now = new Date()
  const base = atStartOfDay(now)
  const day = base.getDay() // 0=Sun..6=Sat
  const diffToStart = (day - weekStartsOn + 7) % 7
  const start = new Date(base)
  start.setDate(base.getDate() - diffToStart + offsetWeeks * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

export function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function formatRange(r: WeekRange): string {
  return `${formatDate(r.start)} ~ ${formatDate(r.end)}`
}

