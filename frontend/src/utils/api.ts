/**
 * API 호출 유틸리티
 * 216회 사용되던 fetch 호출 로직을 통합하여 일관성 및 에러 처리 개선
 */

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T> {
  data: T
  status: number
  ok: boolean
}

/**
 * Fetch 옵션 확장
 */
export interface FetchOptions extends RequestInit {
  timeout?: number
}

/**
 * 타임아웃 기능이 있는 fetch 래퍼
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if ((error as Error).name === 'AbortError') {
      throw new ApiError(408, '요청 시간이 초과되었습니다')
    }
    throw error
  }
}

/**
 * API 호출 (JSON 응답)
 * @param url - API 엔드포인트 URL
 * @param options - Fetch 옵션
 * @returns Promise<T> - JSON 파싱된 응답 데이터
 * @throws {ApiError} - HTTP 에러 또는 네트워크 에러
 * @example
 * ```typescript
 * const customers = await fetchApi<Customer[]>('/api/v1/customers?mineOnly=true')
 * ```
 */
export async function fetchApi<T>(
  url: string,
  options?: FetchOptions
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, options)

    if (!response.ok) {
      let message = `HTTP ${response.status}`
      let errorData: any = null

      try {
        const data = await response.json()
        if (data?.error) message = data.error
        if (data?.message) message = data.message
        errorData = data
      } catch {
        try {
          const text = await response.text()
          if (text) message = text
        } catch {
          // 무시
        }
      }

      throw new ApiError(response.status, message, errorData)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof TypeError) {
      throw new ApiError(0, '네트워크 오류가 발생했습니다')
    }
    throw new ApiError(0, '알 수 없는 오류가 발생했습니다')
  }
}

/**
 * GET 요청
 * @param url - API 엔드포인트 URL
 * @param options - Fetch 옵션
 * @returns Promise<T> - JSON 파싱된 응답 데이터
 */
export async function get<T>(url: string, options?: FetchOptions): Promise<T> {
  return fetchApi<T>(url, { ...options, method: 'GET' })
}

/**
 * POST 요청
 * @param url - API 엔드포인트 URL
 * @param body - 요청 본문 (자동으로 JSON.stringify)
 * @param options - Fetch 옵션
 * @returns Promise<T> - JSON 파싱된 응답 데이터
 */
export async function post<T>(
  url: string,
  body?: any,
  options?: FetchOptions
): Promise<T> {
  return fetchApi<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * PUT 요청
 * @param url - API 엔드포인트 URL
 * @param body - 요청 본문 (자동으로 JSON.stringify)
 * @param options - Fetch 옵션
 * @returns Promise<T> - JSON 파싱된 응답 데이터
 */
export async function put<T>(
  url: string,
  body?: any,
  options?: FetchOptions
): Promise<T> {
  return fetchApi<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * DELETE 요청
 * @param url - API 엔드포인트 URL
 * @param options - Fetch 옵션
 * @returns Promise<T> - JSON 파싱된 응답 데이터
 */
export async function del<T>(url: string, options?: FetchOptions): Promise<T> {
  return fetchApi<T>(url, { ...options, method: 'DELETE' })
}

/**
 * 파일 업로드 (multipart/form-data)
 * @param url - API 엔드포인트 URL
 * @param formData - FormData 객체
 * @param options - Fetch 옵션
 * @returns Promise<T> - JSON 파싱된 응답 데이터
 */
export async function upload<T>(
  url: string,
  formData: FormData,
  options?: FetchOptions
): Promise<T> {
  return fetchApi<T>(url, {
    ...options,
    method: 'POST',
    body: formData,
    // Content-Type은 자동으로 설정됨 (multipart/form-data boundary 포함)
  })
}

/**
 * 쿼리 파라미터를 URL에 추가
 * @param url - 기본 URL
 * @param params - 쿼리 파라미터 객체
 * @returns 쿼리 파라미터가 추가된 URL
 * @example
 * ```typescript
 * const url = buildUrl('/api/v1/customers', { mineOnly: true, limit: 100 })
 * // 결과: '/api/v1/customers?mineOnly=true&limit=100'
 * ```
 */
export function buildUrl(url: string, params?: Record<string, any>): string {
  if (!params) return url

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${url}?${queryString}` : url
}
