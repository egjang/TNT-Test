import React, { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { kakao?: any }
}

type Props = {
  lat?: number
  lng?: number
  level?: number
}

export function KakaoMap({ lat = 37.5665, lng = 126.9780, level = 5 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const DEFAULT_APPKEY = 'b20223691563e31589065d81b9bd7057'
    const appkey = ((import.meta as any).env?.VITE_KAKAO_MAP_APPKEY as string | undefined)
      || (window as any).__KAKAOMAP_APPKEY__
      || (typeof localStorage !== 'undefined' ? localStorage.getItem('tnt.sales.kakao.appkey') || undefined : undefined)
      || DEFAULT_APPKEY
    if (!appkey) {
      setError('카카오 지도 키가 없습니다. .env.local에 VITE_KAKAO_MAP_APPKEY를 설정하거나, 콘솔에서 localStorage.setItem(\'tnt.sales.kakao.appkey\',\'YOUR_JS_KEY\') 실행 후 새로고침하세요.')
      return
    }

    function initMap() {
      if (!window.kakao || !window.kakao.maps) return
      window.kakao.maps.load(() => {
        if (!containerRef.current) return
        const center = new window.kakao.maps.LatLng(lat, lng)
        const map = new window.kakao.maps.Map(containerRef.current, { center, level })
        // 마커 예시(초기 중심)
        new window.kakao.maps.Marker({ position: center, map })
      })
    }

    // 이미 SDK가 로드된 경우
    if (window.kakao && window.kakao.maps) {
      initMap()
      return
    }

    // 스크립트 로드
    const scriptId = 'kakao-maps-sdk'
    if (document.getElementById(scriptId)) {
      // 다른 곳에서 로드 중/완료 상태
      const exist = document.getElementById(scriptId) as HTMLScriptElement
      if (exist?.getAttribute('data-loaded') === 'true') initMap()
      else exist?.addEventListener('load', initMap, { once: true })
      return
    }

    const s = document.createElement('script')
    s.id = scriptId
    s.async = true
    s.defer = true
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`
    s.addEventListener('load', () => {
      s.setAttribute('data-loaded', 'true')
      initMap()
    })
    s.onerror = () => setError('카카오 지도 SDK를 불러오지 못했습니다.')
    document.head.appendChild(s)

    return () => {
      // 스크립트는 계속 재사용 (제거하지 않음)
    }
  }, [lat, lng, level])

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: 8, overflow: 'hidden' }} />
      )}
    </div>
  )
}
