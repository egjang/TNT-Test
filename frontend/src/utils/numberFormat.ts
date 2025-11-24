/**
 * 숫자 포맷팅 유틸리티 함수
 * 12개 파일에서 중복 사용되던 숫자 포맷팅 로직을 통합
 */

// 한국어 로케일 숫자 포맷터 인스턴스 (재사용)
const numberFormatter = new Intl.NumberFormat('ko-KR')

/**
 * 숫자를 한국어 천 단위 구분 형식으로 포맷
 * @param value - 포맷할 숫자
 * @returns 포맷된 문자열 (예: '1,234,567') 또는 '-' (null/undefined인 경우)
 */
export function formatNumber(value?: number | null): string {
  if (value == null) return '-'
  try {
    return numberFormatter.format(value)
  } catch {
    return String(value)
  }
}

/**
 * 숫자를 원화 형식으로 포맷
 * @param value - 포맷할 숫자
 * @returns 포맷된 문자열 (예: '1,234,567원')
 */
export function formatCurrency(value?: number | null): string {
  if (value == null) return '-'
  try {
    return `${numberFormatter.format(value)}원`
  } catch {
    return String(value)
  }
}

/**
 * 숫자를 백만 단위로 변환하여 포맷
 * @param value - 포맷할 숫자
 * @returns 백만 단위로 반올림된 포맷 문자열 (예: '123')
 */
export function formatMillion(value?: number | null): string {
  if (value == null) return '-'
  const millions = (value || 0) / 1_000_000
  return numberFormatter.format(Math.round(millions))
}

/**
 * 숫자를 백만 단위로 변환하여 포맷 (소수점 포함)
 * @param value - 포맷할 숫자
 * @param decimals - 소수점 자릿수 (기본값: 1)
 * @returns 백만 단위 포맷 문자열 (예: '123.5')
 */
export function formatMillionWithDecimals(value?: number | null, decimals: number = 1): string {
  if (value == null) return '-'
  const millions = (value || 0) / 1_000_000
  return millions.toFixed(decimals)
}

/**
 * 퍼센트를 포맷
 * @param value - 포맷할 숫자 (0-100 범위)
 * @param decimals - 소수점 자릿수 (기본값: 0)
 * @returns 포맷된 퍼센트 문자열 (예: '75%')
 */
export function formatPercent(value?: number | null, decimals: number = 0): string {
  if (value == null) return '-'
  return `${value.toFixed(decimals)}%`
}

/**
 * 비율을 퍼센트로 변환하여 포맷
 * @param value - 포맷할 비율 (0-1 범위)
 * @param decimals - 소수점 자릿수 (기본값: 0)
 * @returns 포맷된 퍼센트 문자열 (예: '75%')
 */
export function formatRatioAsPercent(value?: number | null, decimals: number = 0): string {
  if (value == null) return '-'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 숫자를 간단한 형식으로 포맷 (K, M, B 접미사 사용)
 * @param value - 포맷할 숫자
 * @returns 포맷된 문자열 (예: '1.2K', '3.5M', '1.1B')
 */
export function formatCompact(value?: number | null): string {
  if (value == null) return '-'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K`
  }
  return formatNumber(value)
}
