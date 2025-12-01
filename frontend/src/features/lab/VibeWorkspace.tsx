import React, { useState, useEffect } from 'react'
import { Search, Database, Loader2, Table2, AlertCircle, CheckCircle, Coins, BookOpen, Cloud, Settings, MessageSquare } from 'lucide-react'

type QueryResult = {
  question: string
  sql: string
  results: Array<Record<string, any>>
  rowCount: number
  error?: string
}

type SchemaTable = {
  schema: string
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: string
    default: any
    description?: string
  }>
}

export function VibeWorkspace() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [schema, setSchema] = useState<SchemaTable[]>([])
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSchema()
  }, [])

  const loadSchema = async () => {
    setSchemaLoading(true)
    try {
      const res = await fetch('/api/v1/nl2sql/schema')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSchema(data.tables || [])
      }
    } catch (e: any) {
      setError(e.message || '스키마 조회 실패')
    } finally {
      setSchemaLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/v1/nl2sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        if (data.sql) {
          setResult({ ...data, results: [], rowCount: 0 })
        }
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e.message || '쿼리 실행 실패')
    } finally {
      setLoading(false)
    }
  }

  const exampleQuestions = [
    '2024년 총 매출액은?',
    '영업사원별 매출 TOP 10',
    '최근 3개월 신규 고객 수',
    '제품별 판매 수량 합계',
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>VIBE Workspace</h1>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
              자연어로 데이터베이스에 질문하세요
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => window.open('https://aistudio.google.com/usage?project=gen-lang-client-0711471737&timeRange=last-28-days', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Coins size={16} />
              토큰
            </button>
            <button
              onClick={() => window.open('https://docs.n8n.io/', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <BookOpen size={16} />
              n8n 매뉴얼
            </button>
            <button
              onClick={() => window.open('https://tntintl1-my.sharepoint.com/', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Cloud size={16} />
              OneDrive
            </button>
            <button
              onClick={() => window.open('https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Settings size={16} />
              MS 앱
            </button>
            <button
              onClick={() => window.open('https://api.slack.com/apps', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={16} />
              Slack 앱
            </button>
            <button
              onClick={() => setShowSchema(!showSchema)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: showSchema ? '#3b82f6' : '#fff',
                color: showSchema ? '#fff' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Database size={16} />
              {showSchema ? '스키마 숨기기' : '스키마 보기'}
            </button>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
              />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="예: 2024년 총 매출액은 얼마인가요?"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#111827',
                  background: '#fff',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                padding: '12px 24px',
                background: loading || !question.trim() ? '#93c5fd' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  분석 중...
                </>
              ) : (
                '질문하기'
              )}
            </button>
          </div>
        </form>

        {/* Example Questions */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>예시:</span>
          {exampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setQuestion(q)}
              disabled={loading}
              style={{
                padding: '4px 12px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', gap: 16 }}>
        {/* Schema Panel */}
        {showSchema && (
          <div
            className="card"
            style={{ width: 320, flexShrink: 0, overflow: 'auto', padding: 16, background: '#fff' }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#111827' }}>
              데이터베이스 스키마
            </h3>
            {schemaLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : schema.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontSize: 13 }}>
                스키마 정보 없음
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {schema.map((table, idx) => (
                  <details key={idx} style={{ background: '#f9fafb', padding: 8, borderRadius: 6 }}>
                    <summary
                      style={{ cursor: 'pointer', fontWeight: 500, fontSize: 13, color: '#374151', marginBottom: 8 }}
                    >
                      {table.schema}.{table.name}
                    </summary>
                    <div style={{ paddingLeft: 12, fontSize: 12, color: '#6b7280' }}>
                      {table.columns.map((col, colIdx) => (
                        <div key={colIdx} style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div>
                            <span style={{ color: '#111827', fontWeight: 500 }}>{col.name}</span>
                            <span style={{ color: '#9ca3af' }}> ({col.type})</span>
                          </div>
                          {col.description && (
                            <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 500 }}>
                              {col.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Panel */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {error ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: 12 }} />
              <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 600 }}>{error}</div>
            </div>
          ) : result ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'hidden' }}>
              {/* Success Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#f0fdf4', borderRadius: 8 }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>쿼리 실행 완료</div>
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                    {result.rowCount}개의 결과를 찾았습니다
                  </div>
                </div>
              </div>

              {/* Generated SQL */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>생성된 SQL:</div>
                <pre
                  style={{
                    background: '#1f2937',
                    color: '#f3f4f6',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 12,
                    overflow: 'auto',
                    margin: 0,
                  }}
                >
                  {result.sql}
                </pre>
              </div>

              {/* Results Table */}
              {result.results.length > 0 && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>결과:</div>
                  <div style={{ overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                    <table className="table" style={{ width: '100%', fontSize: 13 }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                        <tr>
                          {Object.keys(result.results[0]).map((key) => (
                            <th
                              key={key}
                              style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            {Object.values(row).map((val, valIdx) => (
                              <td key={valIdx} style={{ padding: '10px 12px', color: '#6b7280' }}>
                                {val === null || val === undefined ? (
                                  <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>null</span>
                                ) : typeof val === 'object' ? (
                                  JSON.stringify(val)
                                ) : (
                                  String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <Table2 size={64} style={{ margin: '0 auto 16px', color: '#d1d5db' }} />
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>질문을 입력하세요</div>
              <div style={{ fontSize: 14 }}>
                자연어로 데이터베이스에 질문하면 자동으로 SQL을 생성하여 실행합니다
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
