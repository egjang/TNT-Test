import React, { useState, useEffect } from 'react'

type ARAgingItem = {
  customerCode?: string
  customerName?: string
  salesRep?: string
  department?: string
  totalAr?: number
  overdue?: number
  aging30?: number
  aging60?: number
  aging90?: number
  aging180?: number
  aging365?: number
  lastCollectionDate?: string
  riskLevel?: string
  [key: string]: any
}

export function ARAgingDashboard() {
  const [items, setItems] = useState<ARAgingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salesRepList, setSalesRepList] = useState<string[]>([])
  const [snapshotOptions, setSnapshotOptions] = useState<any[]>([])

  // Filter states
  const [company, setCompany] = useState<string>('all')
  const [salesRep, setSalesRep] = useState<string>('all')
  const [customerName, setCustomerName] = useState<string>('')
  const [riskLevel, setRiskLevel] = useState<string>('all')
  const [agingBucket, setAgingBucket] = useState<string>('all')
  const [snapshotValue, setSnapshotValue] = useState<string>('latest') // format: "meetingId:snapshotDate" or "latest"

  // Summary statistics
  const [summary, setSummary] = useState({
    totalAr: 0,
    overdueAr: 0,
    overdueCount: 0,
    aging30Ar: 0,
    aging30Count: 0,
    normalAr: 0,
  })

  const fetchSalesReps = async () => {
    try {
      const res = await fetch('/api/v1/credit/sales-reps')
      if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`)
      const data = await res.json()
      setSalesRepList(data.salesReps || [])
    } catch (err: any) {
      console.error('영업사원 목록 조회 실패:', err)
    }
  }

  const fetchSnapshotOptions = async () => {
    try {
      const res = await fetch('/api/v1/credit/snapshot-options')
      if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`)
      const data = await res.json()
      setSnapshotOptions(data.options || [])
    } catch (err: any) {
      console.error('채권검토일 목록 조회 실패:', err)
    }
  }

  const fetchARData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (company !== 'all') params.append('company', company)
      if (salesRep !== 'all') params.append('salesRep', salesRep)
      if (customerName) params.append('customerName', customerName)
      if (riskLevel !== 'all') params.append('riskLevel', riskLevel)
      if (agingBucket !== 'all') params.append('agingBucket', agingBucket)

      if (snapshotValue !== 'latest') {
        const [mId, sDate] = snapshotValue.split(':')
        if (mId && mId !== 'null' && mId !== 'undefined') params.append('meetingId', mId)
        if (sDate) params.append('snapshotDate', sDate)
      } else {
        params.append('snapshotDate', 'latest')
      }

      console.log('AR Aging 조회 요청:', params.toString())

      const res = await fetch(`/api/v1/credit/ar-aging?${params.toString()}`)
      if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`)
      const data = await res.json()

      console.log('AR Aging 조회 응답:', data)

      // Map API response to component format
      const items = (data.items || []).map((item: any) => ({
        customerSeq: item.customer_seq,
        customerCode: item.customer_no,
        customerName: item.customer_name,
        companyType: item.company_type,
        salesRep: item.emp_name,
        department: item.dept_name,
        totalAr: item.total_ar,
        overdue: item.overdue,
        aging030: item.aging_0_30,
        aging3160: item.aging_31_60,
        aging6190: item.aging_61_90,
        aging91120: item.aging_91_120,
        aging121150: item.aging_121_150,
        aging151180: item.aging_151_180,
        aging181210: item.aging_181_210,
        aging211240: item.aging_211_240,
        aging241270: item.aging_241_270,
        aging271300: item.aging_271_300,
        aging301330: item.aging_301_330,
        aging331365: item.aging_331_365,
        agingOver365: item.aging_over_365,
        riskLevel: item.riskLevel,
        lastCollectionDate: item.last_collection_date,
      }))
      setItems(items)

      // Calculate summary
      const highRisk = items.filter((it: ARAgingItem) => it.riskLevel === 'high')
      const mediumRisk = items.filter((it: ARAgingItem) => it.riskLevel === 'medium')
      const lowRisk = items.filter((it: ARAgingItem) => it.riskLevel === 'low')

      setSummary({
        totalAr: items.reduce((sum: number, it: ARAgingItem) => sum + (it.totalAr || 0), 0),
        overdueAr: items.reduce((sum: number, it: ARAgingItem) => sum + (it.overdue || 0), 0),
        overdueCount: highRisk.length,
        aging30Ar: items.reduce((sum: number, it: ARAgingItem) => sum + (it.aging030 || 0), 0),
        aging30Count: lowRisk.length,
        normalAr: items.reduce((sum: number, it: ARAgingItem) => sum + (it.aging030 || 0), 0),
      })
    } catch (err: any) {
      console.error('AR Aging 조회 실패:', err)
      setError(err.message || '데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesReps()
    fetchSnapshotOptions()
    fetchARData()
  }, [])

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    return Number.isFinite(num) ? `₩${num.toLocaleString('ko-KR')}` : String(value)
  }

  const formatDate = (value: any) => {
    if (!value) return '-'
    const str = String(value)
    if (str.length === 8) {
      return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`
    }
    return str
  }

  const getCompanyIcon = (companyType: string) => {
    if (companyType === 'TNT') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          background: '#3b82f6',
          color: 'white',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          marginRight: 6,
        }}>
          T
        </span>
      )
    } else if (companyType === 'DYS') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          background: '#10b981',
          color: 'white',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          marginRight: 6,
        }}>
          D
        </span>
      )
    }
    return null
  }

  const getRiskBadge = (riskLevel: string) => {
    if (riskLevel === 'high') {
      return (
        <span style={{ padding: '2px 8px', background: '#ef4444', color: 'white', borderRadius: 4, fontSize: 11 }}>
          고위험
        </span>
      )
    } else if (riskLevel === 'medium') {
      return (
        <span style={{ padding: '2px 8px', background: '#f59e0b', color: 'white', borderRadius: 4, fontSize: 11 }}>
          중위험
        </span>
      )
    } else if (riskLevel === 'low') {
      return (
        <span style={{ padding: '2px 8px', background: '#10b981', color: 'white', borderRadius: 4, fontSize: 11 }}>
          저위험
        </span>
      )
    }
    return (
      <span style={{ padding: '2px 8px', background: '#6b7280', color: 'white', borderRadius: 4, fontSize: 11 }}>
        -
      </span>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      {/* Header & Filters */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        {/* Title Row */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>연체채권 현황</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>거래처별 채권 연령 분석 및 리스크 관리</p>
          </div>
          <div style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: '#4b5563' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>위험도 분류 기준 (연체비율)</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span><span style={{ color: '#ef4444', fontWeight: 600 }}>고위험</span>: 30% 초과</span>
              <span><span style={{ color: '#f59e0b', fontWeight: 600 }}>중위험</span>: 10~30%</span>
              <span><span style={{ color: '#10b981', fontWeight: 600 }}>저위험</span>: 10% 이하</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>※ 연체비율 = 30일 초과 연체액 / 총채권액</div>
          </div>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <select className="search-input" value={snapshotValue} onChange={(e) => setSnapshotValue(e.target.value)} style={{ width: 220 }}>
            <option value="latest">최신 채권검토일</option>
            {snapshotOptions.map((opt, idx) => (
              <option key={idx} value={`${opt.meeting_id}:${opt.snapshot_date}`}>
                {opt.meeting_name} ({opt.snapshot_date})
              </option>
            ))}
          </select>
          <select className="search-input" value={company} onChange={(e) => setCompany(e.target.value)} style={{ width: 120 }}>
            <option value="all">전체 회사</option>
            <option value="TNT">TNT</option>
            <option value="DYS">DYS</option>
          </select>
          <select className="search-input" value={salesRep} onChange={(e) => setSalesRep(e.target.value)} style={{ width: 150 }}>
            <option value="all">전체 영업사원</option>
            {salesRepList.map((rep) => (
              <option key={rep} value={rep}>{rep}</option>
            ))}
          </select>
          <input
            type="text"
            className="search-input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="거래처명 검색"
            style={{ width: 150 }}
          />
          <select className="search-input" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} style={{ width: 120 }}>
            <option value="all">전체 위험도</option>
            <option value="high">고위험</option>
            <option value="medium">중위험</option>
            <option value="low">저위험</option>
          </select>
          <select className="search-input" value={agingBucket} onChange={(e) => setAgingBucket(e.target.value)} style={{ width: 120 }}>
            <option value="all">전체 구간</option>
            <option value="0-30">0-30일 이내</option>
            <option value="31-60">1개월 이내</option>
            <option value="61-90">2개월 이내</option>
            <option value="91-120">3개월 이내</option>
            <option value="121-150">4개월 이내</option>
            <option value="151-180">5개월 이내</option>
            <option value="181-210">6개월 이내</option>
            <option value="211-240">7개월 이내</option>
            <option value="241-270">8개월 이내</option>
            <option value="271-300">9개월 이내</option>
            <option value="301-330">10개월 이내</option>
            <option value="331-365">11개월 이내</option>
            <option value="over-365">12개월 초과</option>
          </select>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button
              className="btn"
              onClick={fetchARData}
              disabled={loading}
              style={{
                height: 30,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                background: '#3b82f6',
                borderColor: '#3b82f6',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? '조회 중...' : '조회'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div className="card" style={{ padding: 16, borderTop: '3px solid #3b82f6' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>총채권액</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{formatCurrency(summary.totalAr)}</div>
          </div>
          <div className="card" style={{ padding: 16, borderTop: '3px solid #ef4444' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>만기도과 ({summary.overdueCount}건)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{formatCurrency(summary.overdueAr)}</div>
          </div>
          <div className="card" style={{ padding: 16, borderTop: '3px solid #f59e0b' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>30일 이내 ({summary.aging30Count}건)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(summary.aging30Ar)}</div>
          </div>
          <div className="card" style={{ padding: 16, borderTop: '3px solid #10b981' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>정상채권</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{formatCurrency(summary.normalAr)}</div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {error ? (
          <div style={{ padding: 16, color: '#ef4444' }}>{error}</div>
        ) : items.length === 0 ? (
          <div className="empty-state">조회된 데이터가 없습니다</div>
        ) : (
          <div className="card" style={{ overflow: 'auto', height: '100%' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>#</th>
                  <th style={{ width: 80, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>위험도</th>
                  <th style={{ minWidth: 250, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>거래처 정보</th>
                  <th style={{ minWidth: 120, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>총채권액</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>0-30일</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>1개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>2개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>3개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>4개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>5개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>6개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>7개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>8개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>9개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>10개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>11개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>12개월</th>
                  <th style={{ minWidth: 100, textAlign: 'right', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>12개월+</th>
                  <th style={{ minWidth: 100, textAlign: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{idx + 1}</td>
                    <td>{getRiskBadge(item.riskLevel || '')}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {getCompanyIcon(item.companyType || '')}
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{item.customerName || '-'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span>코드: {item.customerCode || '-'}</span>
                          <span>영업: {item.salesRep || '-'}</span>
                          <span>부서: {item.department || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.totalAr)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging030)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging3160)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging6190)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging91120)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging121150)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging151180)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging181210)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging211240)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging241270)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging271300)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging301330)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.aging331365)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.agingOver365)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          alert('거래처 상세 패널 구현 예정')
                        }}
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
