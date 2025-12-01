import { useState, useEffect } from 'react'
import {
  ChevronRight, ChevronDown, Monitor, Tablet, Smartphone, Keyboard,
  RefreshCw, Layers, ArrowRight, Check, AlertTriangle, Info,
  Code, FolderTree, Zap, Database, BarChart3, Bot, FileCode,
  Layout, Columns, PanelRight, Square, ArrowUpDown
} from 'lucide-react'

/**
 * Standard Navigation 3 - UX 원칙, 반응형 레이아웃, 키보드 단축키
 *
 * 목차:
 * 1. 핵심 UX 원칙
 * 2. 반응형 레이아웃
 * 3. 키보드 단축키
 * 4. 구현 권장 기술 스택
 */

export function StandardNavigation3() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'ux-principles': true,
    'responsive': false,
    'shortcuts': false,
    'tech-stack': false,
  })

  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [lastKeyPressed, setLastKeyPressed] = useState<string>('')

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Keyboard shortcut demo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = []
      if (e.ctrlKey || e.metaKey) key.push('Ctrl')
      if (e.shiftKey) key.push('Shift')
      if (e.altKey) key.push('Alt')
      if (e.key && e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        key.push(e.key.toUpperCase())
      }
      if (key.length > 0) {
        setLastKeyPressed(key.join(' + '))
        setTimeout(() => setLastKeyPressed(''), 1500)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Standard Navigation 3</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        UI Navigation 표준 설계 - UX 원칙, 반응형 레이아웃, 키보드 단축키
      </p>

      {/* ========== Section 1: 핵심 UX 원칙 ========== */}
      <section style={{ marginBottom: 24 }}>
        <div
          onClick={() => toggleSection('ux-principles')}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 12 }}
        >
          {expandedSections['ux-principles'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>1. 핵심 UX 원칙</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Context Preservation, Progressive Disclosure</div>
          </div>
        </div>

        {expandedSections['ux-principles'] && (
          <div className="card" style={{ padding: 16 }}>

            {/* 원칙 1: Context Preservation */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'var(--info-bg)',
                borderRadius: '8px 8px 0 0',
                borderBottom: '2px solid var(--info)'
              }}>
                <RefreshCw size={18} style={{ color: 'var(--info)' }} />
                <span style={{ fontWeight: 600 }}>원칙 1: Context Preservation (컨텍스트 유지)</span>
              </div>
              <div style={{ padding: 16, background: 'var(--panel)', borderRadius: '0 0 8px 8px', border: '1px solid var(--border)', borderTop: 'none' }}>
                <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--muted)' }}>
                  "사용자가 어디서 왔는지 항상 기억한다"
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                  {/* 목록 → 상세 */}
                  <div className="card" style={{ padding: 12 }}>
                    <h5 style={{ fontSize: 12, marginBottom: 8, fontWeight: 600 }}>목록에서 상세로 이동 시</h5>
                    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> 목록 스크롤 위치 유지
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> 필터/검색 조건 유지
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> 선택된 행 하이라이트 유지
                      </div>
                    </div>
                  </div>

                  {/* 상세 → 목록 */}
                  <div className="card" style={{ padding: 12 }}>
                    <h5 style={{ fontSize: 12, marginBottom: 8, fontWeight: 600 }}>상세에서 목록으로 복귀 시</h5>
                    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> 이전 목록 상태로 즉시 복원
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> "방금 본 항목" 표시
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> URL Query String 동기화
                      </div>
                    </div>
                  </div>
                </div>

                {/* 구현 코드 예시 */}
                <div style={{ padding: 12, background: '#1e293b', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', overflow: 'auto' }}>
                  <pre style={{ margin: 0 }}>{`// React Router + URL Query String 예시
const [searchParams, setSearchParams] = useSearchParams();

// 필터 상태를 URL에 저장
const handleFilterChange = (filters) => {
  setSearchParams({
    ...Object.fromEntries(searchParams),
    ...filters
  });
};

// 목록으로 복귀 시 상태 복원
useEffect(() => {
  const savedScroll = sessionStorage.getItem('list-scroll');
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll));
  }
}, []);`}</pre>
                </div>
              </div>
            </div>

            {/* 원칙 2: Progressive Disclosure */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'var(--success-bg)',
                borderRadius: '8px 8px 0 0',
                borderBottom: '2px solid var(--success)'
              }}>
                <Layers size={18} style={{ color: 'var(--success)' }} />
                <span style={{ fontWeight: 600 }}>원칙 2: Progressive Disclosure (점진적 정보 공개)</span>
              </div>
              <div style={{ padding: 16, background: 'var(--panel)', borderRadius: '0 0 8px 8px', border: '1px solid var(--border)', borderTop: 'none' }}>
                <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--muted)' }}>
                  "필요한 정보를 필요한 만큼만, 단계적으로 제공한다"
                </p>

                {/* 단계별 정보 공개 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { level: 'Level 1', label: '목록', desc: '핵심 컬럼만 표시' },
                    { level: 'Level 2', label: '상세', desc: '전체 정보 + 관련 데이터' },
                    { level: 'Level 3', label: '분석', desc: '시각화 + 통계' },
                    { level: 'Level 4', label: 'AI 인사이트', desc: '예측 + 추천' },
                  ].map((item, i) => (
                    <div key={item.level} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="card" style={{ padding: 12, textAlign: 'center', minWidth: 130 }}>
                        <span className="badge" style={{ marginBottom: 4 }}>{item.level}</span>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{item.desc}</div>
                      </div>
                      {i < 3 && <ArrowRight size={16} style={{ color: 'var(--muted)' }} />}
                    </div>
                  ))}
                </div>

                {/* 정보 밀도 가이드 */}
                <div style={{ padding: 12, background: 'var(--warning-bg)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                    <AlertTriangle size={14} style={{ color: 'var(--warning)' }} /> 정보 밀도 가이드
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                    <li><strong>목록:</strong> 거래처명, 지역, 등급, 최근매출, 담당자 (5개 권장)</li>
                    <li><strong>상세:</strong> 기본정보 + 담당자정보 + 거래현황 차트 + AI Quick Insight</li>
                    <li><strong>분석:</strong> 매출추이 + 거래패턴 + 동종업계비교 + 품목분석</li>
                    <li><strong>AI:</strong> 핵심발견 + 추천액션 + 대화형 Q&A</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 2: 반응형 레이아웃 ========== */}
      <section style={{ marginBottom: 24 }}>
        <div
          onClick={() => toggleSection('responsive')}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 12 }}
        >
          {expandedSections['responsive'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>2. 반응형 레이아웃</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Desktop, Tablet, Mobile 대응</div>
          </div>
        </div>

        {expandedSections['responsive'] && (
          <div className="card" style={{ padding: 16 }}>

            {/* Device Selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { key: 'desktop', icon: Monitor, label: 'Desktop', width: '1440px+' },
                { key: 'tablet', icon: Tablet, label: 'Tablet', width: '768-1439px' },
                { key: 'mobile', icon: Smartphone, label: 'Mobile', width: '<768px' },
              ].map((device) => {
                const Icon = device.icon
                return (
                  <button
                    key={device.key}
                    onClick={() => setActiveDevice(device.key as typeof activeDevice)}
                    className={activeDevice === device.key ? 'btn btn-primary' : 'btn'}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 20px' }}
                  >
                    <Icon size={18} />
                    <span style={{ fontSize: 12, fontWeight: activeDevice === device.key ? 600 : 400 }}>{device.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{device.width}</span>
                  </button>
                )
              })}
            </div>

            {/* Layout Preview */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Desktop Layout */}
              {activeDevice === 'desktop' && (
                <div>
                  <div style={{ padding: 8, background: 'var(--surface)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Columns size={14} /> Desktop (1440px+) - 3-Column Layout
                  </div>
                  <div style={{ display: 'flex', height: 200 }}>
                    <div style={{ width: '60%', padding: 16, borderRight: '1px solid var(--border)' }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--info-bg)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        gap: 6
                      }}>
                        <Layout size={16} /> 목록 (60%)
                      </div>
                    </div>
                    <div style={{ width: '40%', padding: 16 }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--accent-bg)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        gap: 6
                      }}>
                        <PanelRight size={16} /> Context Panel (40%)
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--info-bg)', fontSize: 11, lineHeight: 1.8 }}>
                    <strong>특징:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                      <li>좌측 목록 + 우측 Context Panel 동시 표시</li>
                      <li>Resizable 분할선으로 비율 조절 가능</li>
                      <li>AI 패널은 Context Panel 내 또는 슬라이드 오버레이</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tablet Layout */}
              {activeDevice === 'tablet' && (
                <div>
                  <div style={{ padding: 8, background: 'var(--surface)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <PanelRight size={14} /> Tablet (768-1439px) - Slide-over Panel
                  </div>
                  <div style={{ position: 'relative', height: 200 }}>
                    <div style={{ width: '100%', height: '100%', padding: 16 }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--info-bg)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        gap: 6
                      }}>
                        <Layout size={16} /> 목록 (100%)
                      </div>
                    </div>
                    {/* Slide-over Panel */}
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      width: '50%',
                      height: '100%',
                      background: 'var(--surface)',
                      borderLeft: '2px solid var(--primary)',
                      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        background: 'var(--accent-bg)',
                        padding: 16,
                        borderRadius: 6,
                        fontSize: 12,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <PanelRight size={16} />
                        상세 (Slide-over)
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--info-bg)', fontSize: 11, lineHeight: 1.8 }}>
                    <strong>특징:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                      <li>목록은 전체 너비 사용</li>
                      <li>상세/편집/분석은 슬라이드 패널로 표시</li>
                      <li>배경 클릭 또는 Esc로 패널 닫기</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Mobile Layout */}
              {activeDevice === 'mobile' && (
                <div>
                  <div style={{ padding: 8, background: 'var(--surface)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Square size={14} /> Mobile (&lt;768px) - Full-screen Views
                  </div>
                  <div style={{ display: 'flex', gap: 16, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                    {/* Screen 1: 목록 */}
                    <div style={{
                      width: 100,
                      height: 180,
                      border: '2px solid var(--border)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'var(--surface)'
                    }}>
                      <div style={{ padding: 4, background: 'var(--muted)', fontSize: 8, color: '#fff', textAlign: 'center' }}>목록</div>
                      <div style={{ padding: 8 }}>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} style={{ height: 20, background: 'var(--border)', marginBottom: 4, borderRadius: 2 }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: 4, borderTop: '1px solid var(--border)' }}>
                        <Layout size={10} />
                        <Info size={10} />
                        <BarChart3 size={10} />
                        <Bot size={10} />
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={20} style={{ color: 'var(--muted)' }} />

                    {/* Screen 2: 상세 */}
                    <div style={{
                      width: 100,
                      height: 180,
                      border: '2px solid var(--primary)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'var(--surface)'
                    }}>
                      <div style={{ padding: 4, background: 'var(--primary)', fontSize: 8, color: '#fff', textAlign: 'center' }}>상세</div>
                      <div style={{ padding: 8 }}>
                        <div style={{ height: 40, background: 'var(--info-bg)', marginBottom: 8, borderRadius: 4 }} />
                        <div style={{ height: 60, background: 'var(--accent-bg)', borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: 4, borderTop: '1px solid var(--border)' }}>
                        <Layout size={10} style={{ opacity: 0.4 }} />
                        <Info size={10} />
                        <BarChart3 size={10} style={{ opacity: 0.4 }} />
                        <Bot size={10} style={{ opacity: 0.4 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--info-bg)', fontSize: 11, lineHeight: 1.8 }}>
                    <strong>특징:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                      <li>전체 화면 전환 방식 (Full-screen)</li>
                      <li>하단 탭 네비게이션으로 화면 전환</li>
                      <li>스와이프 제스처로 이전/다음 이동</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Breakpoint 가이드 */}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--warning-bg)', borderRadius: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                <ArrowUpDown size={14} style={{ color: 'var(--warning)' }} /> Breakpoint 가이드
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.05)' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>Breakpoint</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Layout</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Context Panel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>≥1440px</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>3-Column</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>항상 표시</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>768-1439px</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>Slide-over</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>토글 버튼</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>&lt;768px</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>Full-screen</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>탭으로 전환</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 3: 키보드 단축키 ========== */}
      <section style={{ marginBottom: 24 }}>
        <div
          onClick={() => toggleSection('shortcuts')}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 12 }}
        >
          {expandedSections['shortcuts'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>3. 키보드 단축키</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>파워 유저를 위한 단축키 지원</div>
          </div>
        </div>

        {expandedSections['shortcuts'] && (
          <div className="card" style={{ padding: 16 }}>

            {/* Key Press Indicator */}
            <div className="card" style={{
              padding: 16,
              background: lastKeyPressed ? 'var(--success-bg)' : 'var(--surface)',
              textAlign: 'center',
              marginBottom: 20,
              transition: 'background 0.2s'
            }}>
              <Keyboard size={24} style={{ color: 'var(--muted)', marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                키보드를 눌러보세요
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 600,
                fontFamily: 'monospace',
                minHeight: 30,
                color: lastKeyPressed ? 'var(--success)' : 'var(--muted)'
              }}>
                {lastKeyPressed || '대기 중...'}
              </div>
            </div>

            {/* Shortcuts Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)', width: 140 }}>단축키</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)' }}>기능</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)', width: 120 }}>사용 화면</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'N', type: 'normal', action: '신규 생성', scope: '목록' },
                    { key: 'E', type: 'normal', action: '선택 항목 수정', scope: '목록/상세' },
                    { key: 'Del', type: 'normal', action: '선택 항목 삭제', scope: '목록/상세' },
                    { key: 'Enter', type: 'normal', action: '상세 보기', scope: '목록' },
                    { key: 'Esc', type: 'normal', action: '이전 화면 / 취소', scope: '전체' },
                    { key: 'Ctrl+S', type: 'ctrl', action: '저장', scope: '편집' },
                    { key: 'Ctrl+F', type: 'ctrl', action: '검색 포커스', scope: '목록' },
                    { key: 'A', type: 'normal', action: '분석 화면', scope: '상세' },
                    { key: 'I', type: 'ai', action: 'AI 인사이트 토글', scope: '전체' },
                    { key: '↑/↓', type: 'normal', action: '목록 이동', scope: '목록' },
                    { key: 'Space', type: 'normal', action: '선택 토글', scope: '목록' },
                    { key: 'Ctrl+A', type: 'ctrl', action: '전체 선택', scope: '목록' },
                  ].map((shortcut) => (
                    <tr key={shortcut.key}>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                        <span className="badge" style={{
                          background: shortcut.type === 'ctrl' ? 'var(--info-bg)' : shortcut.type === 'ai' ? 'var(--accent-bg)' : 'var(--surface)',
                          fontFamily: 'monospace'
                        }}>
                          {shortcut.key}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{shortcut.action}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>{shortcut.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 구현 코드 예시 */}
            <div style={{ marginTop: 16, padding: 12, background: '#1e293b', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', overflow: 'auto' }}>
              <pre style={{ margin: 0 }}>{`// React Hook 예시: useKeyboardShortcuts
import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) return;

      const key = [];
      if (e.ctrlKey || e.metaKey) key.push('ctrl');
      if (e.shiftKey) key.push('shift');
      key.push(e.key.toLowerCase());

      const combo = key.join('+');
      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// 사용 예시
useKeyboardShortcuts({
  'n': () => openCreateModal(),
  'e': () => openEditModal(),
  'ctrl+s': () => handleSave(),
  'escape': () => handleCancel(),
  'i': () => toggleAIPanel(),
});`}</pre>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 4: 구현 권장 기술 스택 ========== */}
      <section style={{ marginBottom: 24 }}>
        <div
          onClick={() => toggleSection('tech-stack')}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 12 }}
        >
          {expandedSections['tech-stack'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>4. 구현 권장 기술 스택</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>프론트엔드 기술 선택 가이드</div>
          </div>
        </div>

        {expandedSections['tech-stack'] && (
          <div className="card" style={{ padding: 16 }}>

            {/* Tech Stack Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {[
                { category: 'UI Framework', icon: Code, items: ['React + TypeScript'], note: '타입 안정성 + 컴포넌트 재사용' },
                { category: 'State Management', icon: Database, items: ['Zustand', 'Redux Toolkit'], note: 'Zustand: 간단한 앱 / RTK: 복잡한 앱' },
                { category: 'UI Components', icon: Layout, items: ['Ant Design', 'MUI', 'Shadcn/ui'], note: 'Ant Design 권장 (엔터프라이즈 친화적)' },
                { category: 'Data Grid', icon: Columns, items: ['AG Grid', 'TanStack Table'], note: 'AG Grid: 고급기능 / TanStack: 경량' },
                { category: 'Charts', icon: BarChart3, items: ['Recharts', 'ECharts'], note: 'Recharts: 간단 / ECharts: 고급 시각화' },
                { category: 'Form Management', icon: FileCode, items: ['React Hook Form + Zod'], note: '성능 최적화 + 타입 안전 검증' },
                { category: 'AI Integration', icon: Bot, items: ['OpenAI API', 'Claude API'], note: 'SSE 스트리밍으로 실시간 응답' },
                { category: 'Navigation', icon: Zap, items: ['React Router v6'], note: 'URL Query String 상태 관리' },
              ].map((tech) => {
                const Icon = tech.icon
                return (
                  <div key={tech.category} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tech.category}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      {tech.items.join(' / ')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tech.note}</div>
                  </div>
                )
              })}
            </div>

            {/* 프로젝트 구조 예시 */}
            <div style={{ marginTop: 20 }}>
              <h5 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FolderTree size={16} /> 권장 프로젝트 구조
              </h5>
              <div style={{ padding: 12, background: '#1e293b', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', overflow: 'auto' }}>
                <pre style={{ margin: 0 }}>{`src/
├── features/
│   ├── customer/                 # 도메인별 폴더
│   │   ├── components/           # 화면 컴포넌트
│   │   │   ├── CustomerList.tsx
│   │   │   ├── CustomerDetail.tsx
│   │   │   ├── CustomerForm.tsx
│   │   │   └── CustomerAnalysis.tsx
│   │   ├── hooks/                # 커스텀 훅
│   │   │   ├── useCustomerList.ts
│   │   │   └── useCustomerDetail.ts
│   │   ├── api/                  # API 호출
│   │   │   └── customerApi.ts
│   │   └── types/                # 타입 정의
│   │       └── customer.types.ts
│   └── shared/                   # 공통 기능
│       ├── components/
│       │   ├── DataGrid/
│       │   ├── SlidePanel/
│       │   └── AIInsightPanel/
│       └── hooks/
│           ├── useKeyboardShortcuts.ts
│           └── useContextPreservation.ts
├── stores/                       # 전역 상태
│   └── uiStore.ts
└── config/
    └── shortcuts.ts              # 단축키 설정`}</pre>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Summary */}
      <div className="card" style={{
        marginTop: 24,
        padding: 20,
        background: 'linear-gradient(135deg, var(--info-bg) 0%, var(--accent-bg) 100%)'
      }}>
        <h3 style={{ marginBottom: 16, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Layout size={20} /> Standard Navigation 요약
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { icon: Layout, title: 'Single Page', desc: '탭 기반 화면 전환' },
            { icon: PanelRight, title: 'Context Panel', desc: '빠른 정보 + AI 인사이트' },
            { icon: RefreshCw, title: '5 States', desc: '목록→상세→편집→분석→AI' },
            { icon: Keyboard, title: 'Keyboard-first', desc: '12개 핵심 단축키' },
            { icon: Monitor, title: 'Responsive', desc: 'Desktop/Tablet/Mobile' },
            { icon: Bot, title: 'Progressive AI', desc: '단계적 인사이트 제공' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="card" style={{ padding: 12, textAlign: 'center' }}>
                <Icon size={24} style={{ marginBottom: 4, color: 'var(--primary)' }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="card" style={{ marginTop: 24, padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={16} style={{ color: 'var(--success)' }} />
          Standard Navigation 시리즈 완료
        </p>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          Navigation 1: 기본 개념 | Navigation 2: 화면 레이아웃 | Navigation 3: UX/반응형/단축키
        </div>
      </div>
    </div>
  )
}
