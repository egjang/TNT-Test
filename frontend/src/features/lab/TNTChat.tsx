import React, { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, Bot, User, Copy, Check, Database, Sparkles, FileText, MessageCircle
} from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: { title: string; uri: string }[]
}

type StoreDocument = {
  name: string
  displayName: string
  state: string
  sizeBytes: string
  mimeType: string
  createTime: string
}

export function TNTChat() {
  // Store info (received from right panel via events)
  const [currentStore, setCurrentStore] = useState<string>('')
  const [storeDocuments, setStoreDocuments] = useState<StoreDocument[]>([])
  const [storeDisplayName, setStoreDisplayName] = useState<string>('')

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [copied, setCopied] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load initial store info on mount
  useEffect(() => {
    fetchCurrentStore()
  }, [])

  // Listen for store changes from right panel
  useEffect(() => {
    const handleStoreChange = (e: CustomEvent<{ storeName: string; displayName?: string; documents: StoreDocument[] }>) => {
      if (e.detail.storeName) {
        setCurrentStore(e.detail.storeName)
        setStoreDocuments(e.detail.documents || [])
        // Use displayName from event if available, otherwise extract from store name
        setStoreDisplayName(e.detail.displayName || e.detail.storeName.split('/').pop() || '')
      }
    }
    window.addEventListener('tnt.chat.store.changed' as any, handleStoreChange)
    return () => window.removeEventListener('tnt.chat.store.changed' as any, handleStoreChange)
  }, [])

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const fetchCurrentStore = async () => {
    try {
      const res = await fetch('/api/v1/rag/stores')
      const data = await res.json()
      if (data.currentStore) {
        setCurrentStore(data.currentStore)
        // Find display name from stores list
        const store = data.stores?.find((s: any) => s.name === data.currentStore)
        setStoreDisplayName(store?.displayName || data.currentStore.split('/').pop() || '')
        // Fetch documents
        const docsRes = await fetch('/api/v1/rag/store/documents')
        const docsData = await docsRes.json()
        if (docsData.documents) {
          setStoreDocuments(docsData.documents)
        }
      }
    } catch (e) {
      console.error('Failed to fetch store info:', e)
    }
  }

  // ===== Chat Functions =====
  const sendMessage = async () => {
    if (!input.trim() || loading) return
    if (!currentStore) {
      return
    }
    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setStreamingContent('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }])

    try {
      const url = `/api/v1/rag/query/stream?question=${encodeURIComponent(userMessage)}`
      const eventSource = new EventSource(url)
      let fullContent = ''
      let receivedCitations: { title: string; uri: string }[] = []

      eventSource.addEventListener('content', (e) => {
        fullContent += e.data
        setStreamingContent(fullContent)
      })
      eventSource.addEventListener('citations', (e) => {
        try { receivedCitations = JSON.parse(e.data) } catch {}
      })
      eventSource.addEventListener('done', () => {
        eventSource.close()
        setMessages(prev => [...prev, {
          role: 'assistant', content: fullContent, timestamp: new Date(),
          citations: receivedCitations.length > 0 ? receivedCitations : undefined
        }])
        setStreamingContent('')
        setLoading(false)
      })
      eventSource.addEventListener('error', (e: any) => {
        eventSource.close()
        setLoading(false)
      })
      eventSource.onerror = () => {
        eventSource.close()
        if (fullContent) {
          setMessages(prev => [...prev, { role: 'assistant', content: fullContent, timestamp: new Date() }])
        }
        setStreamingContent('')
        setLoading(false)
      }
    } catch (e: any) {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setStreamingContent('')
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
    }}>
      {/* Header - Glassmorphism Style */}
      <div style={{
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(168,85,247,0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          position: 'relative'
        }}>
          <MessageCircle size={24} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>대화해~~TNT</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.7, fontWeight: 400 }}>AI-Powered RAG Assistant</p>
        </div>
        {currentStore && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 13, fontWeight: 500,
            position: 'relative'
          }}>
            <Database size={16} style={{ opacity: 0.8 }} />
            <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {storeDisplayName}
            </span>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '24px 20px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
      }}>
        {!currentStore ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#9ca3af'
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: 24,
              background: 'linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
            }}>
              <Database size={48} style={{ color: '#94a3b8' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#475569' }}>
              스토어를 선택하세요
            </div>
            <div style={{ fontSize: 14, textAlign: 'center', color: '#94a3b8', lineHeight: 1.6 }}>
              우측 패널에서 RAG 스토어를<br />선택하거나 생성하세요.
            </div>
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {/* Animated Bot Icon */}
            <div style={{
              width: 100, height: 100, borderRadius: 28,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 28, boxShadow: '0 12px 32px rgba(59,130,246,0.3)',
              animation: 'float 3s ease-in-out infinite'
            }}>
              <Sparkles size={48} style={{ color: '#fff' }} />
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, marginBottom: 10,
              color: '#1e293b', letterSpacing: '-0.02em'
            }}>
              무엇이든 물어보세요
            </div>
            <div style={{
              fontSize: 14, textAlign: 'center', maxWidth: 380,
              marginBottom: 32, lineHeight: 1.7, color: '#64748b'
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', background: '#eff6ff', borderRadius: 6,
                color: '#3b82f6', fontWeight: 600
              }}>
                <Database size={14} /> {storeDisplayName}
              </span>
              <span style={{ marginLeft: 6 }}>스토어의</span><br />
              <span style={{ color: '#475569', fontWeight: 500 }}>{storeDocuments.length}개 문서</span>를 기반으로 AI가 답변합니다.
            </div>
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500
            }}>
              {['문서 내용을 요약해줘', '핵심 정보가 뭐야?', '주요 인사이트 알려줘'].map((q, i) => (
                <button key={i} onClick={() => setInput(q)}
                  style={{
                    padding: '12px 20px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    fontSize: 13,
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                    e.currentTarget.style.background = '#eff6ff'
                    e.currentTarget.style.color = '#3b82f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.color = '#475569'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  boxShadow: msg.role === 'user'
                    ? '0 4px 12px rgba(99,102,241,0.3)'
                    : '0 4px 12px rgba(59,130,246,0.3)',
                  flexShrink: 0
                }}>
                  {msg.role === 'user'
                    ? <User size={20} style={{ color: '#fff' }} />
                    : <Bot size={20} style={{ color: '#fff' }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Role Label */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: msg.role === 'user' ? '#6366f1' : '#0ea5e9'
                    }}>
                      {msg.role === 'user' ? '나' : 'TNT AI'}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Message Bubble */}
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: 14, lineHeight: 1.8,
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                      : '#fff',
                    color: '#1e293b',
                    whiteSpace: 'pre-wrap',
                    boxShadow: msg.role === 'user'
                      ? 'inset 0 0 0 1px #e2e8f0'
                      : '0 2px 12px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(59,130,246,0.1)',
                    position: 'relative'
                  }}>
                    {msg.content}
                  </div>
                  {/* Citations - Modern Style */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div style={{
                      marginTop: 12, padding: '12px 16px',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)',
                      borderRadius: 12,
                      border: '1px solid rgba(59,130,246,0.15)'
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 10
                      }}>
                        <FileText size={14} /> 참조 문서
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {msg.citations.map((c, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 12, color: '#475569',
                            padding: '6px 10px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0'
                          }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: 5,
                              background: '#3b82f6', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, flexShrink: 0
                            }}>
                              {i + 1}
                            </span>
                            <span style={{
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {c.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Action Buttons */}
                  {msg.role === 'assistant' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        style={{
                          padding: '6px 12px',
                          background: copied === idx ? '#dcfce7' : '#f8fafc',
                          border: copied === idx ? '1px solid #86efac' : '1px solid #e2e8f0',
                          borderRadius: 8,
                          color: copied === idx ? '#16a34a' : '#64748b',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.2s',
                          fontWeight: 500
                        }}
                      >
                        {copied === idx ? <Check size={13} /> : <Copy size={13} />}
                        {copied === idx ? '복사됨' : '복사'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streamingContent && (
              <div style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                {/* AI Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  flexShrink: 0,
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  <Bot size={20} style={{ color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0ea5e9' }}>
                      TNT AI
                    </span>
                    <span style={{
                      fontSize: 11, color: '#3b82f6',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      응답 중...
                    </span>
                  </div>
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '18px 18px 18px 4px',
                    fontSize: 14, lineHeight: 1.8,
                    background: '#fff',
                    color: '#1e293b',
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(59,130,246,0.1)'
                  }}>
                    {streamingContent}
                    <span style={{
                      display: 'inline-block',
                      width: 8, height: 18,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      borderRadius: 2,
                      marginLeft: 2,
                      animation: 'blink 1s infinite'
                    }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input - Floating Style */}
      <div style={{
        padding: '16px 20px 20px',
        background: 'linear-gradient(180deg, rgba(248,250,252,0) 0%, #f8fafc 20%)',
        borderTop: 'none'
      }}>
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-end',
          padding: 8,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.3s ease'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentStore ? "메시지를 입력하세요..." : "먼저 스토어를 선택하세요"}
            disabled={loading || !currentStore}
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: 14,
              fontSize: 14,
              resize: 'none',
              minHeight: 44,
              maxHeight: 120,
              background: 'transparent',
              outline: 'none',
              lineHeight: 1.5,
              color: '#1e293b'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !currentStore}
            style={{
              width: 48, height: 48, borderRadius: 14, border: 'none',
              background: loading || !input.trim() || !currentStore
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: '#fff',
              cursor: loading || !input.trim() || !currentStore ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: loading || !input.trim() || !currentStore
                ? 'none'
                : '0 4px 12px rgba(59,130,246,0.3)',
              flexShrink: 0
            }}
          >
            {loading
              ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={18} />
            }
          </button>
        </div>
        {currentStore && (
          <div style={{
            marginTop: 12, paddingX: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 12, color: '#64748b'
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                background: '#f1f5f9',
                borderRadius: 6
              }}>
                <Database size={12} style={{ color: '#3b82f6' }} />
                {storeDisplayName}
              </span>
              <span style={{ color: '#94a3b8' }}>|</span>
              <span>{storeDocuments.length}개 문서</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                style={{
                  fontSize: 12, color: '#94a3b8',
                  background: 'none', border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2'
                  e.currentTarget.style.color = '#ef4444'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                대화 초기화
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        textarea::placeholder { color: #94a3b8; }
        textarea:focus { outline: none; }
      `}</style>
    </div>
  )
}
