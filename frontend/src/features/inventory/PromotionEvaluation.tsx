import { useState } from 'react'
import { BarChart3, TrendingUp, Package, Calendar, Search, Download } from 'lucide-react'

export default function PromotionEvaluation() {
  const [company, setCompany] = useState<'TNT' | 'DYS'>('TNT')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [searchText, setSearchText] = useState('')

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              프로모션 평가
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              완료된 프로모션의 성과를 분석하고 평가합니다
            </p>
          </div>
        </div>
      </div>

      {/* 회사 선택 & 필터 */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* 회사 선택 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>회사</label>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setCompany('TNT')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: company === 'TNT' ? '#3b82f6' : 'white',
                  color: company === 'TNT' ? 'white' : '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                TNT
              </button>
              <button
                onClick={() => setCompany('DYS')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderLeft: '1px solid #e5e7eb',
                  background: company === 'DYS' ? '#10b981' : 'white',
                  color: company === 'DYS' ? 'white' : '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                DYS
              </button>
            </div>
          </div>

          {/* 기간 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>기간</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 13
                }}
              />
              <span style={{ color: '#9ca3af' }}>~</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 13
                }}
              />
            </div>
          </div>

          {/* 검색 */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>프로모션명</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="프로모션명 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 13
                }}
              />
            </div>
          </div>

          <button
            style={{
              padding: '8px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            조회
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} color="#3b82f6" />
            </div>
            <span style={{ fontSize: 13, color: '#6b7280' }}>완료 프로모션</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>0건</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="#10b981" />
            </div>
            <span style={{ fontSize: 13, color: '#6b7280' }}>총 판매금액</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>0원</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color="#f59e0b" />
            </div>
            <span style={{ fontSize: 13, color: '#6b7280' }}>판매 수량</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>0개</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={20} color="#ef4444" />
            </div>
            <span style={{ fontSize: 13, color: '#6b7280' }}>평균 달성률</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>0%</div>
        </div>
      </div>

      {/* 프로모션 목록 */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
            프로모션 평가 목록
          </h3>
          <button
            style={{
              padding: '6px 12px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Download size={14} />
            Excel 다운로드
          </button>
        </div>

        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <BarChart3 size={48} strokeWidth={1} />
          <p style={{ marginTop: 12, fontSize: 14 }}>
            평가할 프로모션이 없습니다.<br />
            <span style={{ fontSize: 13 }}>프로모션 기획에서 완료된 프로모션을 확인하세요.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
