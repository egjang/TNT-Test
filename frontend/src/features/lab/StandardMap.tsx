import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 남한 경계 범위 (위도: 33~38.5, 경도: 125~132)
const SOUTH_KOREA_BOUNDS: L.LatLngBoundsExpression = [
  [33.0, 124.5],  // 남서쪽 (제주도 포함)
  [38.7, 132.0],  // 북동쪽 (울릉도/독도 포함)
]

// 시도별 중심 좌표 (대략적인 중심점)
const SIDO_CENTERS: Record<string, [number, number]> = {
  '서울특별시': [37.5665, 126.9780],
  '서울': [37.5665, 126.9780],
  '부산광역시': [35.1796, 129.0756],
  '부산': [35.1796, 129.0756],
  '대구광역시': [35.8714, 128.6014],
  '대구': [35.8714, 128.6014],
  '인천광역시': [37.4563, 126.7052],
  '인천': [37.4563, 126.7052],
  '광주광역시': [35.1595, 126.8526],
  '광주': [35.1595, 126.8526],
  '대전광역시': [36.3504, 127.3845],
  '대전': [36.3504, 127.3845],
  '울산광역시': [35.5384, 129.3114],
  '울산': [35.5384, 129.3114],
  '세종특별자치시': [36.4800, 127.2890],
  '세종': [36.4800, 127.2890],
  '경기도': [37.4138, 127.5183],
  '경기': [37.4138, 127.5183],
  '강원특별자치도': [37.8228, 128.1555],
  '강원도': [37.8228, 128.1555],
  '강원': [37.8228, 128.1555],
  '충청북도': [36.6357, 127.4914],
  '충북': [36.6357, 127.4914],
  '충청남도': [36.5184, 126.8000],
  '충남': [36.5184, 126.8000],
  '전북특별자치도': [35.7175, 127.1530],
  '전라북도': [35.7175, 127.1530],
  '전북': [35.7175, 127.1530],
  '전라남도': [34.8679, 126.9910],
  '전남': [34.8679, 126.9910],
  '경상북도': [36.4919, 128.8889],
  '경북': [36.4919, 128.8889],
  '경상남도': [35.4606, 128.2132],
  '경남': [35.4606, 128.2132],
  '제주특별자치도': [33.4890, 126.4983],
  '제주도': [33.4890, 126.4983],
  '제주': [33.4890, 126.4983],
}

// 거래처 타입 정의 (API 응답은 camelCase)
interface Customer {
  customerSeq: number
  customerName: string
  addrProvinceName: string | null
  addrCityName: string | null
}

// 시도별 거래처 그룹
interface SidoCustomerGroup {
  sidoName: string
  customers: Customer[]
  center: [number, number]
}

// 지도 범위를 남한으로 맞추는 컴포넌트
function FitBounds() {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(SOUTH_KOREA_BOUNDS, { padding: [10, 10] })
  }, [map])

  return null
}

// 커스텀 마커 아이콘 생성
function createCustomIcon(count: number) {
  const size = Math.min(40, 20 + count * 2)
  return L.divIcon({
    className: 'customer-marker',
    html: `<div style="
      background: #e74c3c;
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(10, size / 3)}px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// 시도 지도 + 거래처 마커 컴포넌트
function SidoMapWithCustomers({
  geoData,
  loading,
  error,
  customerGroups,
  customersLoading,
}: {
  geoData: FeatureCollection | null
  loading: boolean
  error: string | null
  customerGroups: SidoCustomerGroup[]
  customersLoading: boolean
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const geoJsonRef = useRef<any>(null)

  const getStyle = (feature: Feature<Geometry, any> | undefined): PathOptions => {
    if (!feature) return {}
    const name = feature.properties?.CTP_KOR_NM || ''
    const isSelected = selected === name
    const isHovered = hovered === name

    return {
      fillColor: 'transparent',
      weight: isSelected ? 3 : isHovered ? 2 : 1.5,
      opacity: 1,
      color: isSelected ? '#1a1a2e' : isHovered ? '#333' : '#555',
      fillOpacity: 0,
    }
  }

  const onEachFeature = (feature: Feature<Geometry, any>, layer: Layer) => {
    const name = feature.properties?.CTP_KOR_NM || '알 수 없음'

    layer.on({
      mouseover: () => setHovered(name),
      mouseout: () => setHovered(null),
      click: () => setSelected((prev) => (prev === name ? null : name)),
    })

    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'map-tooltip',
    })
  }

  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle((feature: Feature<Geometry, any> | undefined) => getStyle(feature))
    }
  }, [hovered, selected])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div>지도 데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}>
        <div>오류: {error}</div>
      </div>
    )
  }

  const totalCustomers = customerGroups.reduce((sum, g) => sum + g.customers.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>시도 경계 지도 + 거래처</h3>
        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {customersLoading ? '거래처 로딩 중...' : `총 ${totalCustomers}개 거래처`}
        </p>
      </div>

      {/* 정보 패널 */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)', fontSize: '0.8rem' }}>
        {selected ? (
          <span><strong>선택:</strong> {selected}</span>
        ) : hovered ? (
          <span><strong>위치:</strong> {hovered}</span>
        ) : (
          <span>지역 또는 마커를 클릭하세요</span>
        )}
      </div>

      {/* 지도 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapContainer
          center={[36.5, 127.5]}
          zoom={7}
          style={{ height: '100%', width: '100%', background: 'var(--bg-primary, #fff)' }}
          scrollWheelZoom={true}
        >
          {geoData && (
            <>
              <GeoJSON
                ref={geoJsonRef}
                data={geoData}
                style={getStyle}
                onEachFeature={onEachFeature}
              />
              <FitBounds />
            </>
          )}
          {/* 거래처 마커 */}
          {customerGroups.map((group) => (
            <Marker
              key={group.sidoName}
              position={group.center}
              icon={createCustomIcon(group.customers.length)}
            >
              <Popup>
                <div style={{ maxHeight: 200, overflowY: 'auto', minWidth: 150 }}>
                  <strong style={{ fontSize: '0.9rem' }}>{group.sidoName}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>
                    {group.customers.length}개 거래처
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.8rem' }}>
                    {group.customers.slice(0, 20).map((c) => (
                      <li key={c.customerSeq}>{c.customerName}</li>
                    ))}
                    {group.customers.length > 20 && (
                      <li style={{ color: '#999' }}>... 외 {group.customers.length - 20}개</li>
                    )}
                  </ul>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

// 시군구 지도 컴포넌트 (기존 유지)
function SigunguMapPanel({
  geoData,
  loading,
  error,
}: {
  geoData: FeatureCollection | null
  loading: boolean
  error: string | null
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const geoJsonRef = useRef<any>(null)

  const getStyle = (feature: Feature<Geometry, any> | undefined): PathOptions => {
    if (!feature) return {}
    const name = feature.properties?.SIGUNGU_NM || ''
    const isSelected = selected === name
    const isHovered = hovered === name

    return {
      fillColor: 'transparent',
      weight: isSelected ? 3 : isHovered ? 2 : 1.5,
      opacity: 1,
      color: isSelected ? '#1a1a2e' : isHovered ? '#333' : '#555',
      fillOpacity: 0,
    }
  }

  const onEachFeature = (feature: Feature<Geometry, any>, layer: Layer) => {
    const name = feature.properties?.SIGUNGU_NM || '알 수 없음'

    layer.on({
      mouseover: () => setHovered(name),
      mouseout: () => setHovered(null),
      click: () => setSelected((prev) => (prev === name ? null : name)),
    })

    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'map-tooltip',
    })
  }

  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle((feature: Feature<Geometry, any> | undefined) => getStyle(feature))
    }
  }, [hovered, selected])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div>지도 데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}>
        <div>오류: {error}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>시군구 경계 지도</h3>
        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>2024년 2분기 기준 시군구 행정구역 경계</p>
      </div>

      {/* 정보 패널 */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)', fontSize: '0.8rem' }}>
        {selected ? (
          <span><strong>선택:</strong> {selected}</span>
        ) : hovered ? (
          <span><strong>위치:</strong> {hovered}</span>
        ) : (
          <span>지역 위에 마우스를 올리세요</span>
        )}
      </div>

      {/* 지도 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapContainer
          center={[36.5, 127.5]}
          zoom={7}
          style={{ height: '100%', width: '100%', background: 'var(--bg-primary, #fff)' }}
          scrollWheelZoom={true}
        >
          {geoData && (
            <>
              <GeoJSON
                ref={geoJsonRef}
                data={geoData}
                style={getStyle}
                onEachFeature={onEachFeature}
              />
              <FitBounds />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  )
}

export function StandardMap() {
  const [sidoData, setSidoData] = useState<FeatureCollection | null>(null)
  const [sigunguData, setSigunguData] = useState<FeatureCollection | null>(null)
  const [sidoLoading, setSidoLoading] = useState(true)
  const [sigunguLoading, setSigunguLoading] = useState(true)
  const [sidoError, setSidoError] = useState<string | null>(null)
  const [sigunguError, setSigunguError] = useState<string | null>(null)

  // 거래처 데이터
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)

  useEffect(() => {
    // 시도 데이터 로드
    fetch(`${import.meta.env.BASE_URL}data/sido_boundary_simplified.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error('시도 GeoJSON 파일을 불러올 수 없습니다.')
        return res.json()
      })
      .then((data: FeatureCollection) => {
        setSidoData(data)
        setSidoLoading(false)
      })
      .catch((err) => {
        setSidoError(err.message)
        setSidoLoading(false)
      })

    // 시군구 데이터 로드
    fetch(`${import.meta.env.BASE_URL}data/sigungu_boundary_simplified.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error('시군구 GeoJSON 파일을 불러올 수 없습니다.')
        return res.json()
      })
      .then((data: FeatureCollection) => {
        setSigunguData(data)
        setSigunguLoading(false)
      })
      .catch((err) => {
        setSigunguError(err.message)
        setSigunguLoading(false)
      })

    // 거래처 데이터 로드 (페이지네이션으로 전체 로드)
    const loadAllCustomers = async () => {
      try {
        const allCustomers: Customer[] = []
        let offset = 0
        const limit = 1000
        let hasMore = true

        while (hasMore) {
          const res = await fetch(`/api/v1/customers?mineOnly=false&limit=${limit}&offset=${offset}`)
          if (!res.ok) throw new Error('거래처 데이터를 불러올 수 없습니다.')
          const data: Customer[] = await res.json()
          allCustomers.push(...data)

          if (data.length < limit) {
            hasMore = false
          } else {
            offset += limit
          }
        }

        setCustomers(allCustomers)
        setCustomersLoading(false)
      } catch (err) {
        console.error('거래처 로드 실패:', err)
        setCustomersLoading(false)
      }
    }
    loadAllCustomers()
  }, [])

  // 시도별 거래처 그룹화
  const customerGroups: SidoCustomerGroup[] = React.useMemo(() => {
    const groups: Record<string, Customer[]> = {}

    customers.forEach((c) => {
      const sido = c.addrProvinceName
      if (sido && SIDO_CENTERS[sido]) {
        if (!groups[sido]) groups[sido] = []
        groups[sido].push(c)
      }
    })

    return Object.entries(groups).map(([sidoName, custs]) => ({
      sidoName,
      customers: custs,
      center: SIDO_CENTERS[sidoName],
    }))
  }, [customers])

  return (
    <div className="standard-map" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 시도 지도 + 거래처 (상단) */}
      <div style={{ flex: 1, minHeight: 0, borderBottom: '2px solid var(--border)' }}>
        <SidoMapWithCustomers
          geoData={sidoData}
          loading={sidoLoading}
          error={sidoError}
          customerGroups={customerGroups}
          customersLoading={customersLoading}
        />
      </div>

      {/* 시군구 지도 (하단) */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SigunguMapPanel
          geoData={sigunguData}
          loading={sigunguLoading}
          error={sigunguError}
        />
      </div>

      <style>{`
        .map-tooltip {
          background: rgba(0, 0, 0, 0.8);
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 12px;
          padding: 4px 8px;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .customer-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  )
}
