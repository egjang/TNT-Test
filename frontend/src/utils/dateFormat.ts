/**
 * 날짜 포맷팅 유틸리티 함수
 * 17개 파일에서 중복 사용되던 날짜 포맷팅 로직을 통합
 */

/**
 * 날짜를 'YY-MM-DD HH:mm' 형식으로 포맷
 * @param input - Date 객체 또는 ISO 문자열
 * @returns 포맷된 날짜 문자열 (예: '25-01-15 14:30')
 */
export function formatDateTime(input?: string | Date | null): string {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}`
}

/**
 * 날짜를 'YYYY-MM-DD' 형식으로 포맷
 * @param d - Date 객체
 * @returns 포맷된 날짜 문자열 (예: '2025-01-15')
 */
export function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * ISO 날짜 문자열을 input[type="date"]에 사용할 수 있는 형식으로 변환
 * @param value - ISO 날짜 문자열
 * @returns 'YYYY-MM-DD' 형식 문자열
 */
export function isoToDateInput(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return formatDate(d)
}

/**
 * input[type="date"] 값을 ISO 문자열로 변환
 * @param value - 'YYYY-MM-DD' 형식 문자열
 * @param defaultHour - 기본 시간 (0-23), 기본값: 0
 * @returns ISO 날짜 문자열
 */
export function dateInputToIso(value?: string | null, defaultHour = 0): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const [year, month, day] = trimmed.split('-').map((part) => Number(part))
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day, defaultHour, 0, 0, 0)
  if (isNaN(date.getTime())) return undefined
  return date.toISOString()
}

/**
 * ISO 날짜 문자열을 input[type="datetime-local"]에 사용할 수 있는 형식으로 변환
 * @param value - ISO 날짜 문자열
 * @returns 'YYYY-MM-DDTHH:mm' 형식 문자열
 */
export function isoToDateTimeInput(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

/**
 * input[type="datetime-local"] 값을 ISO 문자열로 변환
 * @param value - 'YYYY-MM-DDTHH:mm' 형식 문자열
 * @returns ISO 날짜 문자열
 */
export function dateTimeInputToIso(value?: string | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/**
 * 현재 날짜를 input[type="date"] 형식으로 반환
 * @returns 'YYYY-MM-DD' 형식 문자열
 */
export function getTodayDateInput(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
