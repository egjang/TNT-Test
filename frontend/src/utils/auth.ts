/**
 * 인증 및 localStorage 유틸리티 함수
 * 42개 파일에서 중복 사용되던 localStorage 접근 로직을 통합
 */

const STORAGE_KEYS = {
  ASSIGNEE_ID: 'tnt.sales.assigneeId',
  EMP_NAME: 'tnt.sales.empName',
  EMP_ID: 'tnt.sales.empId',
  SELECTED_CUSTOMER: 'tnt.sales.selectedCustomer',
} as const

/**
 * 영업 담당자 ID를 조회
 * @returns 담당자 ID 또는 null
 */
export function getAssigneeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ASSIGNEE_ID)
  } catch {
    return null
  }
}

/**
 * 직원 이름을 조회
 * @returns 직원 이름 또는 null
 */
export function getEmpName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.EMP_NAME)
  } catch {
    return null
  }
}

/**
 * 직원 ID를 조회
 * @returns 직원 ID 또는 null
 */
export function getEmpId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.EMP_ID)
  } catch {
    return null
  }
}

/**
 * 로그인 여부를 확인
 * @returns 로그인 여부 (empId가 있으면 true)
 */
export function isLoggedIn(): boolean {
  return !!getEmpId()
}

/**
 * 선택된 고객 정보 타입
 */
export interface SelectedCustomer {
  customerId?: string
  customerName?: string
  customerSeq?: number
}

/**
 * 선택된 고객 정보를 조회
 * @returns 선택된 고객 정보 또는 null
 */
export function getSelectedCustomer(): SelectedCustomer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELECTED_CUSTOMER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 선택된 고객 정보를 저장
 * @param customer - 저장할 고객 정보
 */
export function setSelectedCustomer(customer: SelectedCustomer): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_CUSTOMER, JSON.stringify(customer))
  } catch (e) {
    console.error('Failed to save selected customer', e)
  }
}

/**
 * 선택된 고객 정보를 삭제
 */
export function clearSelectedCustomer(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_CUSTOMER)
  } catch (e) {
    console.error('Failed to clear selected customer', e)
  }
}

/**
 * 사용자 정보를 한 번에 설정
 * @param empId - 직원 ID
 * @param empName - 직원 이름
 * @param assigneeId - 담당자 ID
 */
export function setUserInfo(empId: string, empName: string, assigneeId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMP_ID, empId)
    localStorage.setItem(STORAGE_KEYS.EMP_NAME, empName)
    localStorage.setItem(STORAGE_KEYS.ASSIGNEE_ID, assigneeId)
  } catch (e) {
    console.error('Failed to set user info', e)
  }
}

/**
 * 모든 사용자 정보를 삭제 (로그아웃)
 */
export function clearUserInfo(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EMP_ID)
    localStorage.removeItem(STORAGE_KEYS.EMP_NAME)
    localStorage.removeItem(STORAGE_KEYS.ASSIGNEE_ID)
    localStorage.removeItem(STORAGE_KEYS.SELECTED_CUSTOMER)
  } catch (e) {
    console.error('Failed to clear user info', e)
  }
}

/**
 * 현재 로그인한 사용자 정보를 모두 조회
 * @returns 사용자 정보 객체
 */
export function getCurrentUser(): {
  empId: string | null
  empName: string | null
  assigneeId: string | null
  isLoggedIn: boolean
} {
  return {
    empId: getEmpId(),
    empName: getEmpName(),
    assigneeId: getAssigneeId(),
    isLoggedIn: isLoggedIn(),
  }
}
