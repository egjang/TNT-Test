import { useEffect, useState } from 'react'
import { Search, RefreshCw, Plus } from 'lucide-react'

export type CompetitorRow = {
  competitorId: number
  competitorName: string
  country?: string
  homepage?: string
  foundedYear?: number
  description?: string
  marketPositionCd?: string
  distributionModel?: string
  createdAt?: string
}

interface CompetitorListProps {
  onSelect: (competitor: CompetitorRow) => void
  onCreate: () => void
  selectedId?: number | null
}

export function CompetitorList({ onSelect, onCreate, selectedId }: CompetitorListProps) {
  const [items, setItems] = useState<CompetitorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [distributionFilter, setDistributionFilter] = useState('')

  useEffect(() => {
    load()
    const handleReload = () => load()
    window.addEventListener('tnt.sales.competitor.reload' as any, handleReload)
    return () => window.removeEventListener('tnt.sales.competitor.reload' as any, handleReload)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('name', searchText)
      if (positionFilter) params.append('marketPosition', positionFilter)
      if (distributionFilter) params.append('distributionModel', distributionFilter)

      const r = await fetch(`/api/v1/competitors?${params.toString()}`)
      if (r.ok) {
        const data = await r.json()
        if (Array.isArray(data)) {
          setItems(data)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchSearch = searchText === '' ||
      (item.competitorName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (item.country || '').toLowerCase().includes(searchText.toLowerCase())
    const matchPosition = positionFilter === '' || item.marketPositionCd === positionFilter
    const matchDistribution = distributionFilter === '' || item.distributionModel === distributionFilter
    return matchSearch && matchPosition && matchDistribution
  })

  const getPositionStyle = (position?: string) => {
    switch (position) {
      case '기술 리더':
        return { background: '#ede9fe', color: '#7c3aed' }
      case '품질 강자':
        return { background: '#d1fae5', color: '#059669' }
      case '가성비 중심':
        return { background: '#fef3c7', color: '#d97706' }
      case '초저가 진입자':
        return { background: '#fee2e2', color: '#dc2626' }
      default:
        return { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
    }
  }

  const handleReset = () => {
    setSearchText('')
    setPositionFilter('')
    setDistributionFilter('')
  }

  const handleSearch = () => {
    load()
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
      {/* 검색 조건 영역 */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>경쟁사명</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ width: '100%', paddingLeft: 36 }}
              />
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>시장 지위</label>
            <select
              className="input"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">전체</option>
              <option value="기술 리더">기술 리더</option>
              <option value="품질 강자">품질 강자</option>
              <option value="가성비 중심">가성비 중심</option>
              <option value="초저가 진입자">초저가 진입자</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>유통 모델</label>
            <select
              className="input"
              value={distributionFilter}
              onChange={(e) => setDistributionFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">전체</option>
              <option value="직판">직판</option>
              <option value="총판">총판</option>
              <option value="대리점">대리점</option>
              <option value="온라인">온라인</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleReset}>초기화</button>
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 툴바 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          총 <strong style={{ color: 'var(--text-primary)' }}>{filteredItems.length}</strong>건
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => load()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button className="btn btn-primary" onClick={onCreate} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} />
            신규 등록
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}>
                <input type="checkbox" />
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 60 }}>No</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>경쟁사명</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 100 }}>국가</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 100 }}>설립연도</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 120 }}>시장 지위</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 100 }}>유통 모델</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 100 }}>홈페이지</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr
                key={item.competitorId}
                onClick={() => onSelect(item)}
                style={{
                  cursor: 'pointer',
                  background: selectedId === item.competitorId ? 'var(--bg-secondary)' : 'transparent'
                }}
                onMouseEnter={e => { if (selectedId !== item.competitorId) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (selectedId !== item.competitorId) e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  <input type="checkbox" onClick={e => e.stopPropagation()} />
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{idx + 1}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500, color: 'var(--primary)' }}>
                  {item.competitorName || '-'}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  {item.country || '-'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  {item.foundedYear || '-'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    ...getPositionStyle(item.marketPositionCd)
                  }}>
                    {item.marketPositionCd || '-'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  {item.distributionModel || '-'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  {item.homepage ? (
                    <a
                      href={item.homepage}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ color: 'var(--primary)', textDecoration: 'none' }}
                    >
                      Link
                    </a>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  조회된 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {filteredItems.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>«</button>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>‹</button>
          <button className="btn btn-primary" style={{ padding: '4px 8px', minWidth: 32 }}>1</button>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>›</button>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>»</button>
        </div>
      )}
    </div>
  )
}
