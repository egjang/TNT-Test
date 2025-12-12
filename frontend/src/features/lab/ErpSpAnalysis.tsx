import { useState } from 'react'
import { Database, Search, Copy, Check, FileCode, RefreshCw } from 'lucide-react'

type SpItem = {
  name: string
  type: string
  createDate?: string
  modifyDate?: string
}

export function ErpSpAnalysis() {
  const [company, setCompany] = useState<'TNT' | 'DYS'>('TNT')
  const [searchText, setSearchText] = useState('')
  const [spList, setSpList] = useState<SpItem[]>([])
  const [selectedSp, setSelectedSp] = useState<SpItem | null>(null)
  const [spContent, setSpContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [copied, setCopied] = useState(false)

  // SP 목록 조회
  const handleSearch = async () => {
    if (!searchText.trim()) {
      alert('검색어를 입력하세요.')
      return
    }

    setLoading(true)
    setSpList([])
    setSelectedSp(null)
    setSpContent('')

    try {
      const res = await fetch(`/api/v1/erp/sp/list?company=${company}&keyword=${encodeURIComponent(searchText)}`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()
      setSpList(data.items || [])
    } catch (err) {
      console.error('SP 목록 조회 실패:', err)
      alert('SP 목록 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // SP 내용 조회
  const handleViewContent = async () => {
    if (!selectedSp) {
      alert('SP를 선택하세요.')
      return
    }

    setLoadingContent(true)
    setSpContent('')

    try {
      const res = await fetch(`/api/v1/erp/sp/content?company=${company}&spName=${encodeURIComponent(selectedSp.name)}`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()
      setSpContent(data.content || '')
    } catch (err) {
      console.error('SP 내용 조회 실패:', err)
      alert('SP 내용 조회에 실패했습니다.')
    } finally {
      setLoadingContent(false)
    }
  }

  // 내용 복사
  const handleCopy = async () => {
    if (!spContent) return

    try {
      await navigator.clipboard.writeText(spContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
      alert('복사에 실패했습니다.')
    }
  }

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Database size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              ERP SP분석
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              ERP Stored Procedure를 검색하고 내용을 확인합니다
            </p>
          </div>
        </div>
      </div>

      {/* 검색 영역 */}
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

          {/* 검색어 */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>SP명 검색</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="검색할 SP명을 입력하세요..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            SP 목록 조회
          </button>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 20, height: 'calc(100vh - 300px)' }}>
        {/* 왼쪽: SP 목록 */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
              SP 목록 {spList.length > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({spList.length}건)</span>}
            </h3>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p>조회 중...</p>
              </div>
            ) : spList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <Database size={40} strokeWidth={1} />
                <p style={{ marginTop: 12, fontSize: 13 }}>
                  검색어를 입력하고<br />SP 목록 조회 버튼을 클릭하세요.
                </p>
              </div>
            ) : (
              <div>
                {spList.map((sp, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedSp(sp)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selectedSp?.name === sp.name ? '#eff6ff' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedSp?.name !== sp.name) e.currentTarget.style.background = '#f9fafb'
                    }}
                    onMouseLeave={(e) => {
                      if (selectedSp?.name !== sp.name) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileCode size={16} color={selectedSp?.name === sp.name ? '#3b82f6' : '#9ca3af'} />
                      <span style={{
                        fontSize: 13,
                        fontWeight: selectedSp?.name === sp.name ? 600 : 400,
                        color: selectedSp?.name === sp.name ? '#3b82f6' : '#111827',
                        wordBreak: 'break-all'
                      }}>
                        {sp.name}
                      </span>
                    </div>
                    {sp.modifyDate && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, marginLeft: 24 }}>
                        수정: {sp.modifyDate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 내용 조회 버튼 */}
          <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleViewContent}
              disabled={!selectedSp || loadingContent}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: selectedSp ? '#3b82f6' : '#e5e7eb',
                color: selectedSp ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: selectedSp && !loadingContent ? 'pointer' : 'not-allowed',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {loadingContent && <RefreshCw size={14} className="animate-spin" />}
              내용 조회
            </button>
          </div>
        </div>

        {/* 오른쪽: SP 내용 */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
              SP 내용 {selectedSp && <span style={{ color: '#3b82f6' }}>- {selectedSp.name}</span>}
            </h3>
            {spContent && (
              <button
                onClick={handleCopy}
                style={{
                  padding: '6px 12px',
                  background: copied ? '#10b981' : '#f3f4f6',
                  color: copied ? 'white' : '#374151',
                  border: '1px solid',
                  borderColor: copied ? '#10b981' : '#e5e7eb',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '복사됨!' : '복사'}
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
            {loadingContent ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p>내용 조회 중...</p>
              </div>
            ) : spContent ? (
              <pre style={{
                margin: 0,
                padding: 20,
                fontSize: 12,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: '#1e293b',
                color: '#e2e8f0',
                minHeight: '100%'
              }}>
                {spContent}
              </pre>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <FileCode size={48} strokeWidth={1} />
                <p style={{ marginTop: 12, fontSize: 13 }}>
                  SP를 선택하고<br />내용 조회 버튼을 클릭하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
