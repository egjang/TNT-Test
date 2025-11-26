import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface ActivityAnalysisAIModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ActivityAnalysisAIModal({ isOpen, onClose }: ActivityAnalysisAIModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [question, setQuestion] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      // 초기화
      setQuestion('')
      setAnalysis('')
      setError(null)
    }
  }, [isOpen])

  const handleAnalyze = async () => {
    if (!question.trim()) {
      setError('질문을 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setAnalysis('')

    try {
      const response = await fetch('/api/v1/activity-analysis-ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.analysis) {
        setAnalysis(data.analysis)
      } else {
        setError('분석 결과를 받지 못했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAnalyze()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onMouseDown={(e) => {
        // Only close on left click (button 0), ignore right click (button 2)
        if (e.button === 0 && e.target === e.currentTarget) {
          onClose()
        }
      }}
      onContextMenu={(e) => {
        // Prevent context menu on background
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
    >
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          width: '90%',
          maxWidth: 1000,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 24 }}>🤖</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white' }}>활동분석 AI Agent</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                AI가 활동 데이터를 분석하여 인사이트를 제공합니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--background)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                무엇을 분석해드릴까요?
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="예: 이번 주 김철수 사원의 활동을 분석해줘&#10;예: 지난달 우리 팀의 주요 활동은 무엇이었나요?&#10;예: 최근 2주간 미완료된 활동들을 요약해줘"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--panel)',
                    color: 'var(--text)',
                    resize: 'vertical',
                    minHeight: 80,
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !question.trim()}
                  style={{
                    padding: '12px 24px',
                    background: loading || !question.trim() ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: loading || !question.trim() ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {loading ? '분석 중...' : '분석하기'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>💡 예시:</span>
              <button
                onClick={() => setQuestion('이번 주 활동을 요약해줘')}
                disabled={loading}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                이번 주 활동 요약
              </button>
              <button
                onClick={() => setQuestion('지난주 달성률은 어떻게 되나요?')}
                disabled={loading}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                지난주 달성률
              </button>
              <button
                onClick={() => setQuestion('최근 한 달간 주요 고객 방문 내역을 알려줘')}
                disabled={loading}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                최근 고객 방문
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '4px solid var(--border)',
                  borderTop: '4px solid #667eea',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>AI가 활동 데이터를 분석하고 있습니다...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 16,
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: 8,
                color: '#c33',
                fontSize: 14,
              }}
            >
              <strong>오류:</strong> {error}
            </div>
          )}

          {!loading && !error && analysis && (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text)',
              }}
              className="markdown-content"
            >
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}

          {!loading && !error && !analysis && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <p style={{ fontSize: 15, marginBottom: 8 }}>활동 분석에 대해 무엇이든 물어보세요!</p>
              <p style={{ fontSize: 13 }}>자연어로 질문하시면 AI가 활동 데이터를 분석하여 답변해드립니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
