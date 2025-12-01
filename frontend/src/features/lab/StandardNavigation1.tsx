import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  ArrowRight,
  List,
  FileText,
  Edit3,
  BarChart3,
  Bot,
  LayoutDashboard,
  PanelRightOpen,
  LayoutGrid,
  Sparkles,
  Keyboard,
  Monitor,
  Play
} from 'lucide-react'

/**
 * Standard Navigation 1 - 기본 개념 & State Machine
 *
 * 목차:
 * 1. Best Practice 분석 - 현대적 엔터프라이즈 UI 패턴
 * 2. Unified Workspace 패턴 개요
 * 3. Navigation State Machine
 */

export function StandardNavigation1() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'best-practice': true,
    'unified-workspace': false,
    'state-machine': false,
  })

  const [currentState, setCurrentState] = useState<'list' | 'view' | 'edit' | 'analysis' | 'insight'>('list')

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Standard Navigation 1
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        UI Navigation 표준 설계 - 기본 개념 & State Machine
      </p>

      {/* ========== Section 1: Best Practice 분석 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('best-practice')}
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            borderBottom: '2px solid var(--primary)',
            paddingBottom: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {expandedSections['best-practice'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          1. Best Practice 분석
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            현대적 엔터프라이즈 UI 패턴들
          </span>
        </h2>

        {expandedSections['best-practice'] && (
          <div style={{ display: 'grid', gap: 24 }}>

            {/* Pattern 1: Master-Detail */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-primary">Pattern 1</span>
                <LayoutDashboard size={18} />
                Master-Detail Pattern
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                사용처: Salesforce, SAP Fiori
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div className="card" style={{ flex: 1, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <List size={14} /> 좌측: Master (목록)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    • 검색/필터<br />
                    • 페이지네이션<br />
                    • 행 선택
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowRight size={20} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="card" style={{ flex: 1, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={14} /> 우측: Detail (상세)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    • 전체 정보 표시<br />
                    • 수정/삭제 액션<br />
                    • 관련 데이터
                  </div>
                </div>
              </div>
              <div className="badge badge-success" style={{ padding: '8px 12px' }}>
                <strong>장점:</strong> 컨텍스트 유지, 빠른 탐색, 목록↔상세 간 손쉬운 전환
              </div>
            </div>

            {/* Pattern 2: Split View + Action Panel */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge" style={{ background: '#8b5cf6', color: '#fff' }}>Pattern 2</span>
                <PanelRightOpen size={18} />
                Split View + Action Panel
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                사용처: Microsoft Dynamics, HubSpot
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div className="card" style={{ flex: 2, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>메인 목록</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    항목 클릭 시 슬라이드 패널로 상세 표시
                  </div>
                </div>
                <div className="card" style={{ flex: 1, padding: 12, background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Slide Panel →</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    상세 정보 오버레이
                  </div>
                </div>
              </div>
              <div className="badge badge-success" style={{ padding: '8px 12px' }}>
                <strong>장점:</strong> 화면 공간 효율, 목록 컨텍스트 유지
              </div>
            </div>

            {/* Pattern 3: Tab-based Navigation */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>Pattern 3</span>
                <LayoutGrid size={18} />
                Tab-based Navigation
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                사용처: Notion, Airtable
              </p>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {['테이블 뷰', '카드 뷰', '칸반 뷰', '차트 뷰'].map((tab, i) => (
                  <button
                    key={tab}
                    className={i === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ borderRadius: i === 0 ? '4px 0 0 4px' : i === 3 ? '0 4px 4px 0' : 0, borderLeft: i > 0 ? 'none' : undefined }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="badge badge-success" style={{ padding: '8px 12px' }}>
                <strong>장점:</strong> 동일 데이터를 다양한 뷰로 전환, 유연한 데이터 시각화
              </div>
            </div>

            {/* Pattern 4: AI Copilot Sidebar */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge" style={{ background: '#ec4899', color: '#fff' }}>Pattern 4</span>
                <Sparkles size={18} />
                AI Copilot Sidebar
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                사용처: GitHub Copilot, Salesforce Einstein
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div className="card" style={{ flex: 3, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>메인 작업 영역</div>
                </div>
                <div className="card" style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, var(--bg-secondary) 0%, #fdf4ff 100%)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Bot size={14} /> AI Panel
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    • 인사이트<br />
                    • 추천<br />
                    • Q&A
                  </div>
                </div>
              </div>
              <div className="badge badge-success" style={{ padding: '8px 12px' }}>
                <strong>장점:</strong> 업무 흐름 방해 없이 AI 인사이트 접근
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ========== Section 2: Unified Workspace 패턴 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('unified-workspace')}
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            borderBottom: '2px solid var(--primary)',
            paddingBottom: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {expandedSections['unified-workspace'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          2. Unified Workspace 패턴 (제안)
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            4가지 패턴을 통합한 최적의 UI 구조
          </span>
        </h2>

        {expandedSections['unified-workspace'] && (
          <div style={{ display: 'grid', gap: 24 }}>

            {/* 전체 레이아웃 다이어그램 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>전체 레이아웃 구조</h3>
              <div className="card" style={{ overflow: 'hidden', fontSize: 11 }}>
                {/* Header */}
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LayoutDashboard size={14} /> 거래처 관리
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🔍 검색</span>
                    <span>👤 사용자</span>
                  </span>
                </div>

                {/* Navigation Tabs */}
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--panel)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  gap: 4
                }}>
                  {[
                    { icon: <List size={12} />, label: '목록', active: true },
                    { icon: <FileText size={12} />, label: '상세', active: false },
                    { icon: <Edit3 size={12} />, label: '편집', active: false },
                    { icon: <BarChart3 size={12} />, label: '분석', active: false },
                    { icon: <Bot size={12} />, label: 'AI 인사이트', active: false },
                  ].map((tab) => (
                    <span
                      key={tab.label}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: tab.active ? 'var(--primary)' : 'transparent',
                        color: tab.active ? '#fff' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {tab.icon} {tab.label}
                    </span>
                  ))}
                </div>

                {/* Filter Bar */}
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap'
                }}>
                  <span className="badge">지역: 전체 ▼</span>
                  <span className="badge">업종: 전체 ▼</span>
                  <span className="badge">등급: 전체 ▼</span>
                  <span className="badge">+ 필터추가</span>
                  <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>초기화</span>
                </div>

                {/* Main Content + Context Panel */}
                <div style={{ display: 'flex' }}>
                  {/* Main Content Area */}
                  <div style={{ flex: 3, padding: 12, borderRight: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>☐</th>
                          <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처명</th>
                          <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>지역</th>
                          <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>매출</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <td style={{ padding: 6 }}>☑</td>
                          <td style={{ padding: 6, fontWeight: 600 }}>삼성전자</td>
                          <td style={{ padding: 6 }}>서울</td>
                          <td style={{ padding: 6 }}>500억</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 6 }}>☐</td>
                          <td style={{ padding: 6 }}>LG전자</td>
                          <td style={{ padding: 6 }}>서울</td>
                          <td style={{ padding: 6 }}>300억</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 6 }}>☐</td>
                          <td style={{ padding: 6 }}>현대차</td>
                          <td style={{ padding: 6 }}>울산</td>
                          <td style={{ padding: 6 }}>800억</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>총 1,234건 | 선택: 1건</div>
                  </div>

                  {/* Context Panel */}
                  <div style={{ flex: 1, padding: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={14} /> 선택된 항목
                    </div>
                    <div style={{ fontSize: 11, marginBottom: 12 }}>
                      <div>(주)삼성전자</div>
                      <div style={{ color: 'var(--text-secondary)' }}>등급: A+</div>
                      <div style={{ color: 'var(--text-secondary)' }}>최근거래: 2025-01-15</div>
                    </div>
                    <div className="card" style={{ padding: 8, background: 'linear-gradient(135deg, var(--panel) 0%, #fdf4ff 100%)', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Bot size={12} /> Quick Insight
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                        "이 거래처는 최근 3개월간 거래량이 23% 증가했습니다"
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary" style={{ flex: 1, fontSize: 10, padding: '4px 8px' }}>상세보기</button>
                      <button className="btn btn-secondary" style={{ flex: 1, fontSize: 10, padding: '4px 8px' }}>분석하기</button>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--panel)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: 8
                }}>
                  <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 12px' }}>+ 신규</button>
                  <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }}>✏️ 수정</button>
                  <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }}>🗑️ 삭제</button>
                  <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }}>📥 내보내기</button>
                </div>
              </div>
            </div>

            {/* 핵심 특징 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>핵심 특징</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  { icon: <Monitor size={20} />, title: 'Single Page Experience', desc: '탭 기반으로 화면 전환 없이 모든 기능 수행' },
                  { icon: <PanelRightOpen size={20} />, title: 'Context Panel', desc: '우측 접이식 패널로 빠른 정보 확인 + AI 인사이트' },
                  { icon: <Bot size={20} />, title: 'Progressive AI', desc: '목록→상세→분석→AI 순으로 점진적 인사이트 제공' },
                  { icon: <Keyboard size={20} />, title: 'Keyboard-first', desc: '파워 유저를 위한 단축키 지원' },
                  { icon: <Monitor size={20} />, title: 'Responsive', desc: '디바이스별 최적화된 레이아웃' },
                ].map((item) => (
                  <div key={item.title} className="card" style={{ padding: 12 }}>
                    <div style={{ color: 'var(--primary)', marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ========== Section 3: Navigation State Machine ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('state-machine')}
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            borderBottom: '2px solid var(--primary)',
            paddingBottom: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {expandedSections['state-machine'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          3. Navigation State Machine
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            화면 전환 Flow 및 State 다이어그램
          </span>
        </h2>

        {expandedSections['state-machine'] && (
          <div style={{ display: 'grid', gap: 24 }}>

            {/* Interactive State Machine */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={16} /> Interactive State Machine Demo
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                아래 버튼을 클릭하여 화면 상태 전환을 시뮬레이션해보세요.
              </p>

              {/* State Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { key: 'list', icon: <List size={14} />, label: '목록' },
                  { key: 'view', icon: <FileText size={14} />, label: '상세' },
                  { key: 'edit', icon: <Edit3 size={14} />, label: '편집' },
                  { key: 'analysis', icon: <BarChart3 size={14} />, label: '분석' },
                  { key: 'insight', icon: <Bot size={14} />, label: 'AI 인사이트' },
                ].map((state) => (
                  <button
                    key={state.key}
                    onClick={() => setCurrentState(state.key as typeof currentState)}
                    className={currentState === state.key ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {state.icon}
                    {state.label}
                  </button>
                ))}
              </div>

              {/* State Description */}
              <div className="card" style={{ padding: 16 }}>
                {currentState === 'list' && (
                  <div>
                    <h4 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <List size={18} /> 목록 (LIST) 상태
                    </h4>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <strong>주요 기능:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>검색 및 필터링</li>
                        <li>정렬 (컬럼 헤더 클릭)</li>
                        <li>페이지네이션</li>
                        <li>멀티 선택 (체크박스)</li>
                      </ul>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>전환 가능 상태:</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentState('view')} className="btn btn-ghost">행 클릭 → 상세</button>
                        <button onClick={() => setCurrentState('edit')} className="btn btn-ghost">[신규] → 편집</button>
                        <button onClick={() => setCurrentState('analysis')} className="btn btn-ghost">[분석] → 분석</button>
                      </div>
                    </div>
                  </div>
                )}
                {currentState === 'view' && (
                  <div>
                    <h4 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} /> 상세 (VIEW) 상태
                    </h4>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <strong>주요 기능:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>전체 정보 표시 (Split Panel)</li>
                        <li>관련 데이터 표시 (거래 현황, 차트)</li>
                        <li>AI Quick Insight 표시</li>
                      </ul>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>전환 가능 상태:</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentState('list')} className="btn btn-ghost">🔙 목록으로</button>
                        <button onClick={() => setCurrentState('edit')} className="btn btn-ghost">[수정] → 편집</button>
                        <button onClick={() => setCurrentState('analysis')} className="btn btn-ghost">[분석] → 분석</button>
                        <button onClick={() => setCurrentState('insight')} className="btn btn-ghost">[AI] → 인사이트</button>
                      </div>
                    </div>
                  </div>
                )}
                {currentState === 'edit' && (
                  <div>
                    <h4 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Edit3 size={18} /> 편집 (EDIT/CREATE) 상태
                    </h4>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <strong>주요 기능:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>폼 입력 (Inline Edit 방식)</li>
                        <li>유효성 검증 (실시간)</li>
                        <li>변경사항 감지 (Dirty Check)</li>
                      </ul>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>전환 가능 상태:</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentState('view')} className="btn btn-primary">[저장] → 상세</button>
                        <button onClick={() => setCurrentState('list')} className="btn btn-ghost">[취소] → 목록</button>
                      </div>
                    </div>
                    <div className="badge badge-warning" style={{ marginTop: 12, padding: '8px 12px' }}>
                      ⚠️ 변경사항이 있을 때 다른 화면으로 이동 시 확인 다이얼로그 표시
                    </div>
                  </div>
                )}
                {currentState === 'analysis' && (
                  <div>
                    <h4 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BarChart3 size={18} /> 분석 (ANALYSIS) 상태
                    </h4>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <strong>주요 기능:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>매출 추이 차트</li>
                        <li>거래 패턴 분석</li>
                        <li>동종업계 비교</li>
                        <li>리포트 다운로드</li>
                      </ul>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>전환 가능 상태:</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentState('list')} className="btn btn-ghost">🔙 목록으로</button>
                        <button onClick={() => setCurrentState('view')} className="btn btn-ghost">📄 상세로</button>
                        <button onClick={() => setCurrentState('insight')} className="btn btn-ghost">[AI 심층 분석] → 인사이트</button>
                      </div>
                    </div>
                  </div>
                )}
                {currentState === 'insight' && (
                  <div>
                    <h4 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bot size={18} /> AI 인사이트 (INSIGHT) 상태
                    </h4>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <strong>주요 기능:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>핵심 발견사항 표시</li>
                        <li>추천 액션 제안</li>
                        <li>추가 질문 대화 (Chat)</li>
                        <li>인사이트 적용</li>
                      </ul>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <strong>특징:</strong> 슬라이드 패널로 기존 화면 위에 오버레이
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>전환 가능 상태:</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentState('list')} className="btn btn-ghost">[적용] → 목록</button>
                        <button onClick={() => setCurrentState('view')} className="btn btn-ghost">[닫기] → 이전 화면</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* State Flow Diagram */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>State Flow 다이어그램</h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, fontSize: 11, overflow: 'auto', lineHeight: 1.6 }}>
{`                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
    ┌───────────────────────────┐                                 │
    │      📋 목록 (LIST)       │ ◀──────────────────────────────┤
    │  - 검색/필터              │                                 │
    │  - 정렬                   │                                 │
    │  - 페이지네이션            │                                 │
    └───────────┬───────────────┘                                 │
                │                                                 │
    ┌───────────┼───────────┬──────────────┬──────────────┐      │
    │ 행 클릭   │ [신규]    │ [수정]       │ [분석]       │      │
    ▼           ▼           ▼              ▼              │      │
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │      │
│📄 상세   │ │➕ 신규   │ │✏️ 수정   │ │📊 분석       │  │      │
│(VIEW)    │ │(CREATE)  │ │(EDIT)    │ │(ANALYSIS)    │  │      │
│          │ │          │ │          │ │              │  │      │
│ [수정]───┼─┼──────────┼▶│          │ │  [AI인사이트]┼──┤      │
│ [삭제]   │ │          │ │          │ │              │  │      │
│ [분석]───┼─┼──────────┼─┼──────────┼▶│              │  │      │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │      │
     │            │            │              │          │      │
     │ [목록]     │ [저장]     │ [저장]       │          ▼      │
     │            │ [취소]     │ [취소]       │    ┌──────────┐ │
     └────────────┴────────────┴──────────────┴───▶│🤖 AI     │ │
                                                   │인사이트   │ │
                                                   │(INSIGHT) │ │
                                                   │          │ │
                                                   │ [적용]───┼─┘
                                                   │ [닫기]   │
                                                   └──────────┘`}
              </pre>
            </div>

          </div>
        )}
      </section>

      {/* Footer */}
      <div className="card" style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          다음: <strong>Standard Navigation 2</strong> - 화면별 상세 레이아웃 (목록, 상세, 편집, 분석, AI 인사이트)
        </p>
      </div>
    </div>
  )
}
