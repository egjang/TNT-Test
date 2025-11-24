/**
 * 애플리케이션 이벤트 시스템
 * 284회 사용되던 이벤트 핸들링 로직을 통합 및 타입 안전성 확보
 */

import { useEffect } from 'react'

/**
 * 애플리케이션에서 사용하는 이벤트 이름
 */
export const APP_EVENTS = {
  NAVIGATE: 'tnt.sales.navigate',
  LOGIN_CHANGED: 'tnt.sales.login.changed',
  DASHBOARD_CHURN: 'tnt.sales.dashboard.churn',
  DASHBOARD_NEW_CUSTOMERS: 'tnt.sales.dashboard.newcustomers',
  INVENTORY_EXPIRY_SELECTION: 'tnt.inventory.expiry.selection',
  INVENTORY_APPLY_PROMOTION: 'tnt.inventory.apply-promotion',
} as const

/**
 * 각 이벤트별 상세 데이터 타입 정의
 */
type EventMap = {
  [APP_EVENTS.NAVIGATE]: { key: string }
  [APP_EVENTS.LOGIN_CHANGED]: { loggedIn: boolean }
  [APP_EVENTS.DASHBOARD_CHURN]: { items: any[] }
  [APP_EVENTS.DASHBOARD_NEW_CUSTOMERS]: { items: any[] }
  [APP_EVENTS.INVENTORY_EXPIRY_SELECTION]: { count?: number }
  [APP_EVENTS.INVENTORY_APPLY_PROMOTION]: { promotionId: number }
}

/**
 * 애플리케이션 이벤트를 발생시킴
 * @param eventName - 발생시킬 이벤트 이름
 * @param detail - 이벤트와 함께 전달할 데이터
 * @example
 * ```typescript
 * dispatchAppEvent(APP_EVENTS.NAVIGATE, { key: 'customer:list' })
 * ```
 */
export function dispatchAppEvent<K extends keyof EventMap>(
  eventName: K,
  detail: EventMap[K]
): void {
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
  } catch (err) {
    console.error(`Failed to dispatch event ${eventName}`, err)
  }
}

/**
 * React Hook: 애플리케이션 이벤트를 구독
 * @param eventName - 구독할 이벤트 이름
 * @param handler - 이벤트 발생 시 실행할 핸들러 함수
 * @example
 * ```typescript
 * useAppEvent(APP_EVENTS.NAVIGATE, ({ key }) => {
 *   setSelectedKey(key)
 * })
 * ```
 */
export function useAppEvent<K extends keyof EventMap>(
  eventName: K,
  handler: (detail: EventMap[K]) => void
): void {
  useEffect(() => {
    const listener = (e: Event) => {
      handler((e as CustomEvent<EventMap[K]>).detail)
    }
    window.addEventListener(eventName, listener)
    return () => window.removeEventListener(eventName, listener)
  }, [eventName, handler])
}

/**
 * 한 번만 실행되는 이벤트 리스너 등록
 * @param eventName - 구독할 이벤트 이름
 * @param handler - 이벤트 발생 시 실행할 핸들러 함수
 * @example
 * ```typescript
 * addAppEventListenerOnce(APP_EVENTS.LOGIN_CHANGED, ({ loggedIn }) => {
 *   if (loggedIn) {
 *     console.log('User logged in')
 *   }
 * })
 * ```
 */
export function addAppEventListenerOnce<K extends keyof EventMap>(
  eventName: K,
  handler: (detail: EventMap[K]) => void
): void {
  const listener = (e: Event) => {
    handler((e as CustomEvent<EventMap[K]>).detail)
    window.removeEventListener(eventName, listener)
  }
  window.addEventListener(eventName, listener)
}

/**
 * 일반 이벤트 리스너 등록 (React Hook이 아닌 경우)
 * @param eventName - 구독할 이벤트 이름
 * @param handler - 이벤트 발생 시 실행할 핸들러 함수
 * @returns 이벤트 리스너 제거 함수
 * @example
 * ```typescript
 * const unsubscribe = addAppEventListener(APP_EVENTS.NAVIGATE, ({ key }) => {
 *   console.log('Navigated to:', key)
 * })
 * // 나중에 구독 해제
 * unsubscribe()
 * ```
 */
export function addAppEventListener<K extends keyof EventMap>(
  eventName: K,
  handler: (detail: EventMap[K]) => void
): () => void {
  const listener = (e: Event) => {
    handler((e as CustomEvent<EventMap[K]>).detail)
  }
  window.addEventListener(eventName, listener)
  return () => window.removeEventListener(eventName, listener)
}
