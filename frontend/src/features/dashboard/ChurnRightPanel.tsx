import React, { useEffect, useRef, useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getAssigneeId, getEmpName } from '../../utils/auth'
import { MapContainer, GeoJSON, Marker, Tooltip as LeafletTooltip, useMap } from 'react-leaflet'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import L from 'leaflet'

type Row = { customerSeq: any; customerName: string; prevAmount: number }

type ArrearsCustomer = {
  name: string
  totalAr: number
  longTermAr: number
  ratio: number
  dept: string
  emp: string
  original: {
    m1: number; m2: number; m3: number
    m4: number; m5: number; m6: number
    m7: number; m8: number; m9: number
    m10: number; m11: number; m12: number
    over12: number
  }
}

type ArrearsCellInfo = { xMin: number; xMax: number; yMin: number; yMax: number }

type AgingBarCustomer = {
  name: string
  totalAr: number
  agingValue: number
  dept: string
  emp: string
  original: any
}

type AgingBarInfo = { name: string; totalValue: number }

// 활동분석 지역별 데이터 타입
type ActivityRegionData = {
  region: string
  totalCount: number
  completedCount: number
}

type ActivityMapInfo = {
  year: number
  month: number | 'all'
  week: number | 'all'
  activityType: string
  totalPlanned: number
  totalCompleted: number
}

type ViewMode = 'customer' | 'ai' | 'arrears' | 'aging' | 'activity-map'

export function ChurnRightPanel() {
  const [items, setItems] = useState<Row[]>([])
  const [title, setTitle] = useState('이탈거래처')
  const [amountKey, setAmountKey] = useState<'prevAmount' | 'curAmount'>('prevAmount')
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row: Row | null }>({ open: false, x: 0, y: 0, row: null })
  const rootRef = useRef<HTMLDivElement | null>(null)

  // AI Agent state
  const [viewMode, setViewMode] = useState<ViewMode>('customer')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [aiQuestion, setAiQuestion] = useState<string>('')

  // Arrears Cell state
  const [arrearsCustomers, setArrearsCustomers] = useState<ArrearsCustomer[]>([])
  const [arrearsCellInfo, setArrearsCellInfo] = useState<ArrearsCellInfo | null>(null)

  // Aging Bar state
  const [agingCustomers, setAgingCustomers] = useState<AgingBarCustomer[]>([])
  const [agingBarInfo, setAgingBarInfo] = useState<AgingBarInfo | null>(null)

  // Activity Map state
  const [activityRegionData, setActivityRegionData] = useState<ActivityRegionData[]>([])
  const [activityMapInfo, setActivityMapInfo] = useState<ActivityMapInfo | null>(null)

  // Dashboard 탭 변경 이벤트 수신
  useEffect(() => {
    const onTabChange = (e: any) => {
      const tab = e?.detail?.tab
      if (tab === 'sales-status') {
        setViewMode('ai')
      } else if (tab === 'compare') {
        setViewMode('customer')
      } else if (tab === 'activity-ag') {
        // 활동분석 탭으로 전환 시 미수채권 관련 상태 초기화
        setArrearsCustomers([])
        setArrearsCellInfo(null)
        setAgingCustomers([])
        setAgingBarInfo(null)
        setViewMode('activity-map')
      } else if (tab === 'arrears') {
        // 미수분석 탭으로 이동 시, 활동 지도 데이터 초기화 및 빈 상태로 전환
        setActivityRegionData([])
        setActivityMapInfo(null)
        // 미수분석 탭 초기 상태: 아무것도 선택되지 않은 상태 (빈 화면)
        setItems([])
        setArrearsCustomers([])
        setArrearsCellInfo(null)
        setAgingCustomers([])
        setAgingBarInfo(null)
        setViewMode('customer')
      }
    }
    window.addEventListener('tnt.sales.dashboard.tabChange' as any, onTabChange)
    return () => {
      window.removeEventListener('tnt.sales.dashboard.tabChange' as any, onTabChange)
    }
  }, [])

  useEffect(() => {
    const onShow = (e: any) => {
      const arr = Array.isArray(e?.detail?.items) ? e.detail.items : []
      setItems(arr)
      setTitle('이탈거래처')
      setAmountKey('prevAmount')
      setViewMode('customer') // 자동으로 customer 뷰로 전환
    }
    const onNew = (e: any) => {
      const arr = Array.isArray(e?.detail?.items) ? e.detail.items : []
      setItems(arr)
      setTitle('신규 거래처')
      setAmountKey('curAmount')
      setViewMode('customer') // 자동으로 customer 뷰로 전환
    }
    const onArrearsCell = (e: any) => {
      const customers = Array.isArray(e?.detail?.customers) ? e.detail.customers : []
      const cellInfo = e?.detail?.cellInfo
      setArrearsCustomers(customers)
      setArrearsCellInfo(cellInfo)
      setViewMode('arrears') // arrears 뷰로 전환
    }
    const onAgingBar = (e: any) => {
      const customers = Array.isArray(e?.detail?.customers) ? e.detail.customers : []
      const name = e?.detail?.name || ''
      const totalValue = e?.detail?.totalValue || 0
      setAgingCustomers(customers)
      setAgingBarInfo({ name, totalValue })
      setViewMode('aging') // aging 뷰로 전환
    }
    const onActivityRegion = (e: any) => {
      const regionData = Array.isArray(e?.detail?.regionData) ? e.detail.regionData : []
      const mapInfo = e?.detail?.mapInfo
      setActivityRegionData(regionData)
      setActivityMapInfo(mapInfo)
      setViewMode('activity-map')
    }
    window.addEventListener('tnt.sales.dashboard.churn' as any, onShow)
    window.addEventListener('tnt.sales.dashboard.newcustomers' as any, onNew)
    window.addEventListener('tnt.sales.dashboard.arrearsCell' as any, onArrearsCell)
    window.addEventListener('tnt.sales.dashboard.agingBar' as any, onAgingBar)
    window.addEventListener('tnt.sales.dashboard.activityRegion' as any, onActivityRegion)
    return () => {
      window.removeEventListener('tnt.sales.dashboard.churn' as any, onShow)
      window.removeEventListener('tnt.sales.dashboard.newcustomers' as any, onNew)
      window.removeEventListener('tnt.sales.dashboard.arrearsCell' as any, onArrearsCell)
      window.removeEventListener('tnt.sales.dashboard.agingBar' as any, onAgingBar)
      window.removeEventListener('tnt.sales.dashboard.activityRegion' as any, onActivityRegion)
    }
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menu.open) return
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenu({ open: false, x: 0, y: 0, row: null })
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu({ open: false, x: 0, y: 0, row: null }) }
    document.addEventListener('click', close, true)
    document.addEventListener('contextmenu', close, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('click', close, true)
      document.removeEventListener('contextmenu', close, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [menu.open])

  const fmt = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v || 0))
  // 백만원 단위 포맷 (arrears cellInfo 표시용)
  const fmtMillion = (v: number) => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round((v || 0) / 1000000))

  // AI Agent functions
  const handleAiAnalyze = async () => {
    if (!aiQuestion.trim()) {
      setAiError('질문을 입력해주세요.')
      return
    }

    setAiLoading(true)
    setAiError(null)
    setAiAnalysis('')

    try {
      const response = await fetch('/api/v1/sales-analysis-ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: aiQuestion.trim(),
          assigneeId: getAssigneeId(),
          empName: getEmpName(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setAiError(data.error)
      } else if (data.analysis) {
        setAiAnalysis(data.analysis)
      } else {
        setAiError('분석 결과를 받지 못했습니다.')
      }
    } catch (err: any) {
      setAiError(err.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAiAnalyze()
    }
  }

  const setExampleQuestion = (q: string) => {
    setAiQuestion(q)
  }

  return (
    <div ref={rootRef} className="card" style={{ padding: 0, height: '100%', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* AI Styles */}
      <style>{`
        @keyframes ai-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ai-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ai-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
        }
        @keyframes ai-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ai-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes ai-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .ai-panel-container {
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%);
          position: relative;
          overflow: hidden;
        }
        .ai-panel-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 30%);
          pointer-events: none;
        }
        .ai-input-container {
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 12px;
          padding: 2px;
          transition: all 0.3s ease;
        }
        .ai-input-container:focus-within {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
        }
        .ai-textarea {
          background: transparent !important;
          border: none !important;
          color: #e2e8f0 !important;
          resize: none;
          outline: none;
        }
        .ai-textarea::placeholder {
          color: rgba(148, 163, 184, 0.6);
        }
        .ai-send-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          background-size: 200% 200%;
          animation: ai-gradient 3s ease infinite;
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ai-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }
        .ai-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          animation: none;
          background: #4b5563;
        }
        .ai-chip {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 20px;
          color: #a5b4fc;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ai-chip:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-1px);
        }
        .ai-response-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }
        .ai-panel-markdown {
          color: #e2e8f0 !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .ai-panel-markdown * {
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
          max-width: 100% !important;
        }
        .ai-panel-markdown h1, .ai-panel-markdown h2, .ai-panel-markdown h3 {
          color: #a5b4fc !important;
          font-size: 13px;
          margin: 14px 0 8px 0;
          font-weight: 600;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          padding-bottom: 4px;
          white-space: normal !important;
          word-break: break-all !important;
        }
        .ai-panel-markdown p {
          margin: 8px 0;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
          color: #cbd5e1;
          max-width: 100% !important;
        }
        .ai-panel-markdown ul, .ai-panel-markdown ol {
          padding-left: 18px;
          margin: 8px 0;
          max-width: 100% !important;
        }
        .ai-panel-markdown li {
          margin: 4px 0;
          color: #cbd5e1;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
        }
        .ai-panel-markdown li::marker {
          color: #6366f1;
        }
        .ai-panel-markdown strong {
          color: #f1f5f9;
          font-weight: 600;
        }
        .ai-panel-markdown table {
          font-size: 10px;
          border-collapse: collapse;
          width: 100% !important;
          max-width: 100% !important;
          margin: 10px 0;
          table-layout: fixed !important;
          display: table !important;
          overflow-x: hidden !important;
        }
        .ai-panel-markdown th, .ai-panel-markdown td {
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 6px 8px;
          text-align: left;
          white-space: normal !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          overflow: hidden !important;
          text-overflow: ellipsis;
        }
        .ai-panel-markdown th {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          font-weight: 600;
        }
        .ai-panel-markdown td {
          background: rgba(255, 255, 255, 0.02);
        }
        .ai-panel-markdown tr:hover td {
          background: rgba(99, 102, 241, 0.08);
        }
        .ai-panel-markdown pre {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          color: #a5b4fc;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          overflow-x: hidden !important;
          max-width: 100% !important;
        }
        .ai-panel-markdown code {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          color: #a5b4fc;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
        }
        .ai-loading-dot {
          width: 8px;
          height: 8px;
          background: #6366f1;
          border-radius: 50%;
          display: inline-block;
          animation: ai-bounce 1.4s infinite ease-in-out both;
        }
        .ai-loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .ai-loading-dot:nth-child(2) { animation-delay: -0.16s; }
        .ai-loading-dot:nth-child(3) { animation-delay: 0; }
        .ai-sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #a5b4fc;
          border-radius: 50%;
          animation: ai-pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: viewMode === 'ai' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border)',
        background: viewMode === 'ai'
          ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)'
          : 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {viewMode === 'ai' ? (
          <>
            {/* Animated background particles */}
            <div className="ai-sparkle" style={{ top: '20%', left: '10%', animationDelay: '0s' }} />
            <div className="ai-sparkle" style={{ top: '60%', left: '85%', animationDelay: '0.5s' }} />
            <div className="ai-sparkle" style={{ top: '80%', left: '30%', animationDelay: '1s' }} />

            {/* AI Icon with glow */}
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
              position: 'relative',
              zIndex: 1,
            }}>
              <span style={{ fontSize: 16 }}>🤖</span>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, letterSpacing: '0.5px' }}>
                Sales AI Agent
              </div>
              <div style={{ fontSize: 9, color: '#a5b4fc', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  background: '#22c55e',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px #22c55e',
                }} />
                Powered by AI
              </div>
            </div>
          </>
        ) : viewMode === 'arrears' ? (
          <span style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>Risk Map 선택 영역</span>
        ) : viewMode === 'aging' ? (
          <span style={{ fontWeight: 700, fontSize: 13, color: '#3b82f6' }}>연령 분포 선택</span>
        ) : viewMode === 'activity-map' ? (
          <span style={{ fontWeight: 700, fontSize: 13, color: '#2563eb' }}>지역별 활동 현황</span>
        ) : (
          <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
        )}
      </div>

      {/* Content Area */}
      <div
        className={viewMode === 'ai' ? 'ai-panel-container' : ''}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 12,
          background: viewMode === 'ai' ? undefined : undefined,
        }}
      >
        {viewMode === 'customer' ? (
          // Customer List View
          <>
            {(!items || items.length === 0) ? (
              <div className="empty-state">데이터가 없습니다</div>
            ) : (
              <div className="table-container" style={{ maxHeight: 'calc(100% - 20px)' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>거래처명</th>
                      <th style={{ width: 100, textAlign: 'right' }}>{amountKey === 'prevAmount' ? '작년매출' : '올해매출'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          try {
                            const sel = { customerSeq: it.customerSeq, customerName: it.customerName }
                            localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(sel))
                            window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'dashboard-churn', customer: sel } }) as any)
                          } catch { }
                          const btn = document.querySelector('button[data-key="customer:sales-activity-new"]') as HTMLButtonElement | null
                          if (btn) btn.click()
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setMenu({ open: true, x: e.clientX, y: e.clientY, row: it })
                        }}
                        style={{ cursor: 'pointer' }}
                        title="클릭하면 영업활동 등록으로 이동"
                      >
                        <td>{it.customerName || ''}</td>
                        <td style={{ textAlign: 'right', fontSize: 11 }}>{fmt((it as any)[amountKey] as any)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : viewMode === 'arrears' ? (
          // Arrears Cell Customers View - 2열 그리드 레이아웃
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
            {arrearsCellInfo && (
              <div style={{
                padding: '8px 12px',
                background: '#f1f5f9',
                borderRadius: 6,
                fontSize: 11,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <span>
                  총 채권 <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmtMillion(arrearsCustomers.reduce((sum, c) => sum + c.totalAr, 0))}</span> 백만,
                  연체율 {arrearsCellInfo.yMin}~{arrearsCellInfo.yMax}%
                  <span style={{ marginLeft: 8, fontWeight: 600, color: '#0f172a' }}>({arrearsCustomers.length}개)</span>
                </span>
                <button
                  onClick={() => {
                    setArrearsCustomers([])
                    setArrearsCellInfo(null)
                    setViewMode('customer')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#94a3b8',
                    padding: '2px 6px'
                  }}
                >×</button>
              </div>
            )}
            {arrearsCustomers.length === 0 ? (
              <div className="empty-state">해당 영역에 거래처가 없습니다</div>
            ) : (
              <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 6,
                alignContent: 'start',
                padding: '2px'
              }}>
                {arrearsCustomers.map((customer, idx) => {
                  const orig = customer.original
                  const sum1_3 = (orig?.m1 || 0) + (orig?.m2 || 0) + (orig?.m3 || 0)
                  const sum4_6 = (orig?.m4 || 0) + (orig?.m5 || 0) + (orig?.m6 || 0)
                  const sum7_12 = (orig?.m7 || 0) + (orig?.m8 || 0) + (orig?.m9 || 0) + (orig?.m10 || 0) + (orig?.m11 || 0) + (orig?.m12 || 0)
                  const over12 = orig?.over12 || 0

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#fff',
                        borderRadius: 6,
                        padding: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 10
                      }}
                    >
                      {/* 거래처명 */}
                      <div style={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 2
                      }} title={customer.name}>
                        {customer.name}
                      </div>

                      {/* 담당자 */}
                      <div style={{
                        fontSize: 9,
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4
                      }}>
                        {customer.dept} / {customer.emp}
                      </div>

                      {/* 총 미수금 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}>
                        <span style={{ color: '#64748b' }}>총 미수</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(customer.totalAr)}</span>
                      </div>

                      {/* 연체 구간별 금액 (컴팩트) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 2,
                        fontSize: 9,
                        background: '#f8fafc',
                        borderRadius: 4,
                        padding: 4
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#3b82f6' }}>1~3M</span>
                          <span>{fmt(sum1_3)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#f59e0b' }}>4~6M</span>
                          <span>{fmt(sum4_6)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#ea580c' }}>7~12M</span>
                          <span>{fmt(sum7_12)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#dc2626' }}>1Y+</span>
                          <span>{fmt(over12)}</span>
                        </div>
                      </div>

                      {/* 장기연체율 */}
                      <div style={{
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: '1px dashed #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 9
                      }}>
                        <span style={{ color: '#64748b' }}>장기연체율</span>
                        <span style={{
                          fontWeight: 600,
                          color: customer.ratio > 50 ? '#dc2626' : customer.ratio > 20 ? '#f59e0b' : '#3b82f6'
                        }}>
                          {customer.ratio}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'aging' ? (
          // Aging Bar Customers View - 2열 그리드 레이아웃 (arrears와 동일한 스타일)
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
            {agingBarInfo && (
              <div style={{
                padding: '8px 12px',
                background: '#eff6ff',
                borderRadius: 6,
                fontSize: 11,
                color: '#1e40af',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <span>
                  <span style={{ fontWeight: 700 }}>{agingBarInfo.name}</span> 연체 금액
                  <span style={{ fontWeight: 700, marginLeft: 8 }}>{fmtMillion(agingBarInfo.totalValue)}</span> 백만
                  <span style={{ marginLeft: 8, fontWeight: 600, color: '#1e40af' }}>({agingCustomers.length}개)</span>
                </span>
                <button
                  onClick={() => {
                    setAgingCustomers([])
                    setAgingBarInfo(null)
                    setViewMode('customer')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#94a3b8',
                    padding: '2px 6px'
                  }}
                >×</button>
              </div>
            )}
            {agingCustomers.length === 0 ? (
              <div className="empty-state">해당 연령대에 거래처가 없습니다</div>
            ) : (
              <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 6,
                alignContent: 'start',
                padding: '2px'
              }}>
                {agingCustomers.map((customer, idx) => {
                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#fff',
                        borderRadius: 6,
                        padding: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 10
                      }}
                    >
                      {/* 거래처명 */}
                      <div style={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 2
                      }} title={customer.name}>
                        {customer.name}
                      </div>

                      {/* 담당자 */}
                      <div style={{
                        fontSize: 9,
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4
                      }}>
                        {customer.dept} / {customer.emp}
                      </div>

                      {/* 해당 연령대 금액 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                        padding: '4px 6px',
                        background: '#eff6ff',
                        borderRadius: 4
                      }}>
                        <span style={{ color: '#1e40af', fontWeight: 500 }}>{agingBarInfo?.name}</span>
                        <span style={{ fontWeight: 700, color: '#1e40af' }}>{fmt(customer.agingValue)}</span>
                      </div>

                      {/* 총 미수금 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#64748b' }}>총 미수</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmt(customer.totalAr)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'activity-map' ? (
          // Activity Map View
          <ActivityRegionMap
            regionData={activityRegionData}
            mapInfo={activityMapInfo}
          />
        ) : (
          // AI Agent View
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10, position: 'relative', zIndex: 1 }}>
            {/* Question Input with futuristic design */}
            <div className="ai-input-container">
              <div style={{ display: 'flex', gap: 8, padding: 6 }}>
                <textarea
                  className="ai-textarea"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyPress={handleAiKeyPress}
                  placeholder="매출 데이터에 대해 무엇이든 물어보세요..."
                  disabled={aiLoading}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 12,
                    height: 52,
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  className="ai-send-btn"
                  onClick={handleAiAnalyze}
                  disabled={aiLoading || !aiQuestion.trim()}
                  style={{
                    padding: '0 16px',
                    fontSize: 18,
                    fontWeight: 600,
                    minWidth: 50,
                  }}
                >
                  {aiLoading ? (
                    <div style={{
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'ai-spin 1s linear infinite',
                    }} />
                  ) : '→'}
                </button>
              </div>
            </div>

            {/* Example Questions as chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: '📅 이번달 매출', q: '이번 달 매출 현황을 알려줘' },
                { label: '📦 품목별 분석', q: '품목별 매출을 분석해줘' },
                { label: '🏆 Top 10 고객', q: '고객별 매출 Top 10을 보여줘' },
              ].map((ex, i) => (
                <button
                  key={i}
                  className="ai-chip"
                  onClick={() => setExampleQuestion(ex.q)}
                  disabled={aiLoading}
                  style={{
                    padding: '5px 12px',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Results Area */}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {aiLoading && (
                <div style={{
                  textAlign: 'center',
                  padding: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                }}>
                  {/* AI thinking animation */}
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      border: '2px solid transparent',
                      borderTop: '2px solid #6366f1',
                      borderRadius: '50%',
                      animation: 'ai-spin 1s linear infinite',
                    }} />
                    <span style={{ fontSize: 24 }}>🤖</span>
                  </div>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                      AI가 데이터를 분석하고 있습니다
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <span className="ai-loading-dot" />
                      <span className="ai-loading-dot" />
                      <span className="ai-loading-dot" />
                    </div>
                  </div>
                </div>
              )}

              {aiError && (
                <div
                  style={{
                    padding: 14,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10,
                    color: '#fca5a5',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>오류 발생</div>
                    <div style={{ color: '#fecaca' }}>{aiError}</div>
                  </div>
                </div>
              )}

              {!aiLoading && !aiError && aiAnalysis && (
                <div className="ai-response-box" style={{
                  padding: 14,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  maxHeight: 'calc(100% - 10px)',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}>
                  {/* AI Response header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                    }}>🤖</div>
                    <span style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600 }}>AI 분석 결과</span>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1.7,
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere',
                      width: '100%',
                      maxWidth: '100%',
                      overflowX: 'hidden',
                    }}
                    className="markdown-content ai-panel-markdown"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</ReactMarkdown>
                  </div>
                </div>
              )}

              {!aiLoading && !aiError && !aiAnalysis && (
                <div style={{
                  textAlign: 'center',
                  padding: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  {/* Animated AI icon */}
                  <div style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '50%',
                      animation: 'ai-pulse 2s ease-in-out infinite',
                    }} />
                    <span style={{ fontSize: 32 }}>🤖</span>
                  </div>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      Sales AI Agent
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>
                      매출 데이터를 분석하고<br />
                      인사이트를 제공합니다
                    </div>
                  </div>
                  <div style={{
                    marginTop: 8,
                    padding: '6px 12px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 20,
                    fontSize: 9,
                    color: '#a5b4fc',
                  }}>
                    위 입력창에 질문을 입력하세요
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {menu.open && menu.row && (
        <div
          role="menu"
          style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 10px 24px rgba(0,0,0,.2)' }}
        >
          <button
            role="menuitem"
            className="btn"
            style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', color: 'inherit', border: 'none', borderRadius: 8 }}
            onClick={() => {
              const it = menu.row!
              try {
                const sel = { customerSeq: it.customerSeq, customerName: it.customerName }
                localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(sel))
                window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'dashboard-churn', customer: sel } }) as any)
                window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'customer:sales-activity-new' } }) as any)
              } catch { }
              setMenu({ open: false, x: 0, y: 0, row: null })
            }}
          >영업활동 이동</button>
        </div>
      )}
    </div>
  )
}

// 남한 경계 범위
const SOUTH_KOREA_BOUNDS: L.LatLngBoundsExpression = [
  [33.0, 125.8],
  [38.6, 130.0],
]

// 시도별 중심 좌표
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

// 지도 범위를 남한으로 맞추는 컴포넌트
function FitBounds() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(SOUTH_KOREA_BOUNDS, { padding: [10, 10] })
    map.setZoom(map.getZoom() + 0.2)
  }, [map])
  return null
}

// 활동수 포맷
function formatActivityCount(count: number) {
  return count.toLocaleString()
}

// 커스텀 마커 아이콘 생성 (원형 활동수 표시)
function createActivityIcon(regionName: string, completed: number, total: number, maxCount: number) {
  const ratio = maxCount > 0 ? completed / maxCount : 0
  // 텍스트가 2줄이 되므로 기본 크기를 키움
  const size = Math.max(50, Math.min(80, 50 + ratio * 30))
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  // 달성률에 따라 색상 결정 (파스텔톤 - Modern Blue)
  // High: Blue(225), Medium: Amber(35), Low: Rose(350)
  const hue = completionRate >= 80 ? 225 : completionRate >= 50 ? 35 : 350
  const saturation = 65 // 파스텔톤 유지하되 약간 더 선명하게
  const lightness = Math.max(80, 90 - ratio * 10) // 밝고 화사하게

  return L.divIcon({
    className: 'activity-marker',
    html: `<div style="
background: hsl(${hue}, ${saturation}%, ${lightness}%);
color: #334155;
border-radius: 50%;
width: ${size}px;
height: ${size}px;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
font-size: ${Math.max(10, size / 6.5)}px;
font-weight: bold;
border: 2px solid white;
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
line-height: 1.2;
">
  <div style="font-size: ${Math.max(8, size / 6)}px; opacity: 0.85; margin-bottom: 2px;">${regionName.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}</div>
  <div style="font-size: 0.9em;">계획 ${formatActivityCount(total)}</div>
  <div style="font-size: 0.9em;">완료 ${formatActivityCount(completed)}</div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// 지역별 활동 지도 컴포넌트
function ActivityRegionMap({
  regionData,
  mapInfo
}: {
  regionData: ActivityRegionData[]
  mapInfo: ActivityMapInfo | null
}) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const geoJsonRef = useRef<any>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  // 시도 추출
  const extractSido = (region: string): string | null => {
    if (!region) return null
    const trimmed = region.trim()
    const parts = trimmed.split(/\s+/)
    const first = parts[0]

    const sidoPatterns: Record<string, string> = {
      '서울특별시': '서울특별시', '서울': '서울특별시',
      '부산광역시': '부산광역시', '부산': '부산광역시',
      '대구광역시': '대구광역시', '대구': '대구광역시',
      '인천광역시': '인천광역시', '인천': '인천광역시',
      '광주광역시': '광주광역시', '광주': '광주광역시',
      '대전광역시': '대전광역시', '대전': '대전광역시',
      '울산광역시': '울산광역시', '울산': '울산광역시',
      '세종특별자치시': '세종특별자치시', '세종': '세종특별자치시',
      '경기도': '경기도', '경기': '경기도',
      '강원특별자치도': '강원특별자치도', '강원도': '강원특별자치도', '강원': '강원특별자치도',
      '충청북도': '충청북도', '충북': '충청북도',
      '충청남도': '충청남도', '충남': '충청남도',
      '전북특별자치도': '전북특별자치도', '전라북도': '전북특별자치도', '전북': '전북특별자치도',
      '전라남도': '전라남도', '전남': '전라남도',
      '경상북도': '경상북도', '경북': '경상북도',
      '경상남도': '경상남도', '경남': '경상남도',
      '제주특별자치도': '제주특별자치도', '제주도': '제주특별자치도', '제주': '제주특별자치도',
    }

    return sidoPatterns[first] || null
  }

  // 시도별로 활동수 합산
  const activityBySido = useMemo(() => {
    const map: Record<string, { totalCount: number; completedCount: number }> = {}
    regionData.forEach(d => {
      const sido = extractSido(d.region)
      if (sido) {
        if (!map[sido]) map[sido] = { totalCount: 0, completedCount: 0 }
        map[sido].totalCount += d.totalCount
        map[sido].completedCount += d.completedCount
      }
    })
    return map
  }, [regionData])

  // 시도별 활동 배열 (마커용)
  const sidoActivityArray = useMemo(() => {
    return Object.entries(activityBySido).map(([sido, data]) => ({
      sido,
      totalCount: data.totalCount,
      completedCount: data.completedCount,
      center: SIDO_CENTERS[sido],
    })).filter(d => d.center && (d.completedCount > 0 || d.totalCount > 0))
  }, [activityBySido])

  const maxCount = useMemo(() => Math.max(...Object.values(activityBySido).map(d => d.completedCount), 1), [activityBySido])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sido_boundary_simplified.geojson`)
      .then(res => {
        if (!res.ok) throw new Error('지도 데이터를 불러올 수 없습니다.')
        return res.json()
      })
      .then((data: FeatureCollection) => {
        setGeoData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const getStyle = (feature: Feature<Geometry, any> | undefined): PathOptions => {
    if (!feature) return {}
    const name = feature.properties?.CTP_KOR_NM || ''
    const isHovered = hovered === name
    const data = activityBySido[name]
    const completed = data?.completedCount || 0
    const ratio = maxCount > 0 ? completed / maxCount : 0

    const fillOpacity = completed > 0 ? 0.2 + ratio * 0.5 : 0.05

    return {
      fillColor: completed > 0 ? '#60a5fa' : '#e5e7eb', // Blue-400
      weight: isHovered ? 2 : 1,
      opacity: 1,
      color: isHovered ? '#1d4ed8' : '#9ca3af', // Blue-700 : Gray-400
      fillOpacity,
    }
  }

  const onEachFeature = (feature: Feature<Geometry, any>, layer: Layer) => {
    const name = feature.properties?.CTP_KOR_NM || '알 수 없음'
    const data = activityBySido[name]
    const completed = data?.completedCount || 0
    const total = data?.totalCount || 0
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    layer.on({
      mouseover: () => {
        setHovered(name)
        if (geoJsonRef.current) {
          geoJsonRef.current.setStyle((f: Feature<Geometry, any> | undefined) => getStyle(f))
        }
      },
      mouseout: () => {
        setHovered(null)
        if (geoJsonRef.current) {
          geoJsonRef.current.setStyle((f: Feature<Geometry, any> | undefined) => getStyle(f))
        }
      },
    })

    layer.bindTooltip(
      `<strong>${name}</strong><br />완료: ${formatActivityCount(completed)} / ${formatActivityCount(total)} (${rate}%)`,
      { permanent: false, direction: 'center', className: 'activity-map-tooltip' }
    )
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        지도 로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
        {error}
      </div>
    )
  }

  // 데이터가 없을 때 안내 메시지
  if (regionData.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        gap: 12,
        padding: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, opacity: 0.5 }}>🗺️</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>활동 데이터를 조회해주세요</div>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          활동분석 탭에서 조회 조건을 설정하고<br />
          조회 버튼을 클릭하면<br />
          지역별 활동 현황이 지도에 표시됩니다.
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* 요약 정보 */}
      {mapInfo && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 11,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b' }}>
            {mapInfo.year}년 {mapInfo.month !== 'all' ? `${mapInfo.month}월` : ''} {mapInfo.week !== 'all' ? `${mapInfo.week}주` : ''}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>계획: <b style={{ color: '#64748b' }}>{mapInfo.totalPlanned.toLocaleString()}</b></span>
            <span>완료: <b style={{ color: '#2563eb' }}>{mapInfo.totalCompleted.toLocaleString()}</b></span>
          </div>
        </div>
      )}

      <MapContainer
        center={[36.5, 127.5]}
        zoom={7}
        zoomSnap={0.1}
        style={{ height: '100%', width: '100%', background: '#fff' }}
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
        {/* 시도별 활동 마커 */}
        {sidoActivityArray.map(m => {
          const icon = createActivityIcon(m.sido, m.completedCount, m.totalCount, maxCount)
          const rate = m.totalCount > 0 ? Math.round((m.completedCount / m.totalCount) * 100) : 0
          return (
            <Marker key={m.sido} position={m.center} icon={icon}>
              <LeafletTooltip
                direction="top"
                offset={[0, -20]}
                className="activity-marker-tooltip"
              >
                <div style={{ padding: '4px 0' }}>
                  <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>{m.sido}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block'
                    }}></span>
                    <span style={{ color: '#374151', fontSize: 13 }}>완료: </span>
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: 13 }}>{m.completedCount.toLocaleString()}건</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#94a3b8',
                      display: 'inline-block'
                    }}></span>
                    <span style={{ color: '#374151', fontSize: 13 }}>계획: </span>
                    <span style={{ color: '#374151', fontWeight: 600, fontSize: 13 }}>{m.totalCount.toLocaleString()}건 ({rate}%)</span>
                  </div>
                </div>
              </LeafletTooltip>
            </Marker>
          )
        })}
      </MapContainer>

      {/* 범례 */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        background: 'rgba(255,255,255,0.95)',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 11,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>활동 완료수</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 16, background: 'rgba(96, 165, 250, 0.2)', border: '1px solid #9ca3af' }} />
          <span>적음</span>
          <div style={{ width: 16, height: 16, background: 'rgba(96, 165, 250, 0.7)', border: '1px solid #9ca3af', marginLeft: 8 }} />
          <span>많음</span>
        </div>
      </div>

      <style>{`
.activity-map-tooltip {
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  padding: 6px 10px;
}
.activity-marker {
  background: transparent;
  border: none;
}
.activity-marker-tooltip {
  background: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  font-family: inherit !important;
}
.activity-marker-tooltip::before {
  border-top-color: #fff !important;
}
.leaflet-tooltip.activity-marker-tooltip {
  opacity: 1 !important;
}
`}</style>
    </div>
  )
}

