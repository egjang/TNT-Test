import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Search,
  Filter,
  Download,
  Plus,
  Edit3,
  Trash2,
  BarChart3,
  Bot,
  Check,
  X,
  AlertTriangle,
  List,
  FileText,
  ArrowLeft
} from 'lucide-react'

/**
 * Standard Navigation 2 - 화면별 상세 레이아웃
 *
 * 목차:
 * 1. 목록 (LIST) 화면
 * 2. 상세 (VIEW) 화면 - Split Panel
 * 3. 편집 (EDIT/CREATE) 화면 - Inline Edit
 * 4. 분석 (ANALYSIS) 화면
 * 5. AI 인사이트 (INSIGHT) - 슬라이드 패널
 */

export function StandardNavigation2() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'list-view': true,
    'detail-view': false,
    'edit-view': false,
    'analysis-view': false,
    'insight-view': false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Sample Data
  const sampleData = [
    { id: 1, name: '(주)삼성전자', region: '서울', industry: '전자', grade: 'A+', sales: '500억', selected: true },
    { id: 2, name: 'LG전자', region: '서울', industry: '전자', grade: 'A', sales: '300억', selected: false },
    { id: 3, name: '현대자동차', region: '울산', industry: '자동차', grade: 'A+', sales: '800억', selected: false },
    { id: 4, name: 'SK하이닉스', region: '이천', industry: '반도체', grade: 'A', sales: '600억', selected: false },
  ]

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Standard Navigation 2
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        UI Navigation 표준 설계 - 화면별 상세 레이아웃
      </p>

      {/* ========== Section 1: 목록 (LIST) 화면 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('list-view')}
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
          {expandedSections['list-view'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <List size={20} />
          STATE 1: 목록 (LIST)
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            검색, 필터, 정렬, 페이지네이션이 포함된 목록 화면
          </span>
        </h2>

        {expandedSections['list-view'] && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* 레이아웃 구조 설명 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>레이아웃 구조</h3>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <span className="badge badge-primary">① Tabs</span>
                <span className="badge badge-success">② Filter Bar</span>
                <span className="badge badge-warning">③ Data Grid</span>
                <span className="badge" style={{ background: '#ec4899', color: '#fff' }}>④ Action Bar</span>
                <span className="badge" style={{ background: '#8b5cf6', color: '#fff' }}>⑤ Pagination</span>
              </div>
            </div>

            {/* 실제 목록 화면 데모 */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Tabs */}
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 4,
                fontSize: 12
              }}>
                <span style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <List size={12} /> 목록
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} /> 상세
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={12} /> 편집
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart3 size={12} /> 분석
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bot size={12} /> AI
                </span>
              </div>

              {/* Filter Bar */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--panel)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontSize: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Search size={14} />
                  <input className="input" placeholder="검색..." style={{ width: 120, padding: '4px 8px', fontSize: 12 }} />
                </div>
                <select className="select" style={{ padding: '4px 8px', fontSize: 12 }}>
                  <option>지역: 전체</option>
                  <option>서울</option>
                  <option>경기</option>
                </select>
                <select className="select" style={{ padding: '4px 8px', fontSize: 12 }}>
                  <option>업종: 전체</option>
                  <option>전자</option>
                  <option>자동차</option>
                </select>
                <select className="select" style={{ padding: '4px 8px', fontSize: 12 }}>
                  <option>등급: 전체</option>
                  <option>A+</option>
                  <option>A</option>
                  <option>B</option>
                </select>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Filter size={14} /> 필터추가
                </button>
                <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>초기화</span>
              </div>

              {/* Data Grid */}
              <div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid var(--border)', width: 40 }}>
                        <input type="checkbox" />
                      </th>
                      <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid var(--border)' }}>거래처명 ▼</th>
                      <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid var(--border)' }}>지역</th>
                      <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid var(--border)' }}>업종</th>
                      <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid var(--border)' }}>등급</th>
                      <th style={{ padding: 10, textAlign: 'right', borderBottom: '2px solid var(--border)' }}>최근매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((row, i) => (
                      <tr
                        key={row.id}
                        style={{
                          background: row.selected ? 'var(--bg-secondary)' : (i % 2 === 0 ? 'var(--panel)' : 'var(--bg-secondary)'),
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                          <input type="checkbox" checked={row.selected} readOnly />
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: row.selected ? 600 : 400 }}>{row.name}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.region}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.industry}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                          <span className={row.grade === 'A+' ? 'badge badge-success' : 'badge badge-primary'}>
                            {row.grade}
                          </span>
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{row.sales}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-secondary)' }}>
                  총 1,234건 | 선택: 1건
                </div>
              </div>

              {/* Action Bar + Pagination */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--panel)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={14} /> 신규
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Edit3 size={14} /> 수정
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={14} /> 삭제
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BarChart3 size={14} /> 분석
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Download size={14} /> 내보내기
                  </button>
                </div>
                {/* Pagination */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>◀</button>
                  <button className="btn btn-primary" style={{ padding: '4px 8px' }}>1</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>2</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>3</button>
                  <span>...</span>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>10</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>▶</button>
                </div>
              </div>
            </div>

            {/* 구현 가이드 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>구현 가이드</h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
{`// 권장 라이브러리
- 데이터 그리드: AG Grid 또는 TanStack Table
- 정렬: 컬럼 헤더 클릭으로 ASC/DESC 토글
- 필터: URL Query String으로 상태 관리 (북마크/공유 가능)
- 선택: Shift+Click으로 범위 선택, Ctrl+Click으로 개별 토글`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 2: 상세 (VIEW) 화면 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('detail-view')}
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
          {expandedSections['detail-view'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <FileText size={20} />
          STATE 2: 상세 (VIEW)
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            Split Panel 방식의 상세 정보 표시
          </span>
        </h2>

        {expandedSections['detail-view'] && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* 실제 상세 화면 데모 */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Tabs */}
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 4,
                fontSize: 12
              }}>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <List size={12} /> 목록
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} /> 상세
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={12} /> 편집
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart3 size={12} /> 분석
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bot size={12} /> AI
                </span>
              </div>

              {/* Header with back button */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--panel)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowLeft size={14} /> 목록으로
                  </button>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>(주)삼성전자</span>
                  <span className="badge badge-success">A+</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Edit3 size={14} /> 수정
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--error)' }}>
                    <Trash2 size={14} /> 삭제
                  </button>
                </div>
              </div>

              {/* Split Content */}
              <div style={{ display: 'flex', minHeight: 280 }}>
                {/* Left: 기본 정보 */}
                <div style={{ flex: 1, padding: 16, borderRight: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>기본 정보</h4>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <tbody>
                      {[
                        ['거래처코드', 'C-2025-0001'],
                        ['거래처명', '(주)삼성전자'],
                        ['대표자', '이재용'],
                        ['사업자번호', '124-81-00998'],
                        ['주소', '서울시 서초구 서초대로74길 11'],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td style={{ padding: '8px 0', color: 'var(--text-secondary)', width: 100 }}>{label}</td>
                          <td style={{ padding: '8px 0' }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4 style={{ marginTop: 20, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>담당자 정보</h4>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <tbody>
                      {[
                        ['담당자', '김영업'],
                        ['연락처', '010-1234-5678'],
                        ['이메일', 'kim@samsung.com'],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td style={{ padding: '8px 0', color: 'var(--text-secondary)', width: 100 }}>{label}</td>
                          <td style={{ padding: '8px 0' }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right: 거래 현황 + AI */}
                <div style={{ flex: 1, padding: 16, background: 'var(--bg-secondary)' }}>
                  <h4 style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BarChart3 size={16} /> 거래 현황
                  </h4>
                  {/* Simple Chart Placeholder */}
                  <div style={{
                    height: 80,
                    background: 'linear-gradient(to top, var(--primary) 0%, var(--bg-secondary) 100%)',
                    borderRadius: 6,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-around',
                    padding: 8
                  }}>
                    {[60, 75, 45, 90, 80, 95].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: 20,
                          height: `${h}%`,
                          background: 'var(--primary)',
                          borderRadius: '4px 4px 0 0'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    <span>1월</span><span>2월</span><span>3월</span><span>4월</span><span>5월</span><span>6월</span>
                  </div>

                  {/* AI Quick Insight */}
                  <div className="card" style={{
                    padding: 12,
                    background: 'linear-gradient(135deg, var(--panel) 0%, #fdf4ff 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Bot size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>AI Quick Insight</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      "전년 동기 대비 매출 23%↑. 신제품 출시 효과로 추정됩니다. 추가 영업 기회가 존재합니다."
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <BarChart3 size={12} /> 상세분석
                      </button>
                      <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Bot size={12} /> 더보기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 구현 가이드 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>구현 가이드</h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
{`// 레이아웃
- 좌측 60% + 우측 40% 비율 권장 (조절 가능)
- 차트: Recharts 또는 ECharts 사용
- AI Insight: 비동기 로딩으로 UX 최적화
- 키보드: E키로 수정 모드 진입`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 3: 편집 (EDIT) 화면 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('edit-view')}
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
          {expandedSections['edit-view'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <Edit3 size={20} />
          STATE 3: 편집 (EDIT/CREATE)
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            Inline Edit 방식의 폼 입력 화면
          </span>
        </h2>

        {expandedSections['edit-view'] && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* 실제 편집 화면 데모 */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Tabs */}
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 4,
                fontSize: 12
              }}>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <List size={12} /> 목록
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} /> 상세
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={12} /> 편집
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart3 size={12} /> 분석
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bot size={12} /> AI
                </span>
              </div>

              {/* Header */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--panel)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} /> 거래처 수정
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={14} /> 저장
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={14} /> 취소
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div style={{ padding: 20 }}>
                {/* 기본 정보 섹션 */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>기본 정보</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: '12px 16px', alignItems: 'center', fontSize: 13 }}>
                    <label style={{ color: 'var(--text-secondary)' }}>거래처코드</label>
                    <input className="input" value="C-2025-0001" disabled style={{ background: 'var(--bg-secondary)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(자동생성)</span>

                    <label style={{ color: 'var(--text-secondary)' }}>거래처명 <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input className="input" defaultValue="(주)삼성전자" />
                    <span></span>

                    <label style={{ color: 'var(--text-secondary)' }}>대표자 <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input className="input" defaultValue="이재용" />
                    <span></span>

                    <label style={{ color: 'var(--text-secondary)' }}>사업자번호 <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input className="input" defaultValue="124-81-00998" style={{ borderColor: 'var(--success)' }} />
                    <span style={{ color: 'var(--success)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> 유효
                    </span>

                    <label style={{ color: 'var(--text-secondary)' }}>업종</label>
                    <select className="select">
                      <option>전자</option>
                      <option>자동차</option>
                      <option>반도체</option>
                    </select>
                    <span></span>

                    <label style={{ color: 'var(--text-secondary)' }}>등급</label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {['A+', 'A', 'B', 'C'].map((grade, i) => (
                        <label key={grade} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="radio" name="grade" defaultChecked={i === 0} style={{ accentColor: 'var(--primary)' }} />
                          {grade}
                        </label>
                      ))}
                    </div>
                    <span></span>
                  </div>
                </div>

                {/* 담당자 정보 섹션 */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>담당자 정보</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: '12px 16px', alignItems: 'center', fontSize: 13 }}>
                    <label style={{ color: 'var(--text-secondary)' }}>담당자</label>
                    <input className="input" defaultValue="김영업" />
                    <span></span>

                    <label style={{ color: 'var(--text-secondary)' }}>연락처</label>
                    <input className="input" defaultValue="010-1234-5678" />
                    <span></span>

                    <label style={{ color: 'var(--text-secondary)' }}>이메일</label>
                    <input className="input" defaultValue="kim@samsung.com" style={{ borderColor: 'var(--success)' }} />
                    <span style={{ color: 'var(--success)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> 유효
                    </span>
                  </div>
                </div>

                {/* Dirty State Warning */}
                <div className="badge badge-warning" style={{
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12
                }}>
                  <AlertTriangle size={16} />
                  <span>변경사항이 있습니다. 저장하지 않고 나가시겠습니까?</span>
                </div>
              </div>
            </div>

            {/* 구현 가이드 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>구현 가이드</h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
{`// 폼 관리
- 폼 상태 관리: React Hook Form + Zod 권장
- Dirty Check: beforeunload 이벤트 + 라우터 가드
- 실시간 검증: 입력 필드 blur 시 또는 debounce (300ms)
- 키보드: Ctrl+S로 저장, Esc로 취소`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 4: 분석 (ANALYSIS) 화면 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('analysis-view')}
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
          {expandedSections['analysis-view'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <BarChart3 size={20} />
          STATE 4: 분석 (ANALYSIS)
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            데이터 시각화 및 인사이트 화면
          </span>
        </h2>

        {expandedSections['analysis-view'] && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* 실제 분석 화면 데모 */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Tabs */}
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 4,
                fontSize: 12
              }}>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <List size={12} /> 목록
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} /> 상세
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={12} /> 편집
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart3 size={12} /> 분석
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bot size={12} /> AI
                </span>
              </div>

              {/* Header */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--panel)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={18} /> 거래처 분석: (주)삼성전자
                </span>
                <button className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Download size={14} /> 리포트 다운
                </button>
              </div>

              {/* Analysis Content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
                {/* 매출 추이 */}
                <div className="card" style={{ padding: 16 }}>
                  <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BarChart3 size={16} /> 매출 추이
                  </h4>
                  <div style={{
                    height: 100,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-around',
                    padding: 8,
                    background: 'var(--bg-secondary)',
                    borderRadius: 6
                  }}>
                    {[
                      { label: 'Q1', value: 60 },
                      { label: 'Q2', value: 75 },
                      { label: 'Q3', value: 85 },
                      { label: 'Q4', value: 95 },
                    ].map((q) => (
                      <div key={q.label} style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 40,
                          height: `${q.value}%`,
                          background: 'var(--primary)',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: 4
                        }} />
                        <span style={{ fontSize: 10 }}>{q.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 거래 패턴 */}
                <div className="card" style={{ padding: 16 }}>
                  <h4 style={{ marginBottom: 12 }}>거래 패턴</h4>
                  <div style={{ fontSize: 13 }}>
                    {[
                      { label: '주문빈도', value: '월 4.2회' },
                      { label: '평균단가', value: '2.3억' },
                      { label: '결제주기', value: 'D+30' },
                      { label: '신용도', value: '우수 (98점)' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 거래 비교 */}
                <div className="card" style={{ padding: 16 }}>
                  <h4 style={{ marginBottom: 12 }}>거래 비교 (동종업계)</h4>
                  {[
                    { name: '삼성전자', value: 100 },
                    { name: 'SK하이닉스', value: 80 },
                    { name: 'LG전자', value: 60 },
                  ].map((item) => (
                    <div key={item.name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>{item.name}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                        <div style={{ width: `${item.value}%`, height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 주요 거래 품목 */}
                <div className="card" style={{ padding: 16 }}>
                  <h4 style={{ marginBottom: 12 }}>주요 거래 품목</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Pie Chart Placeholder */}
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: `conic-gradient(var(--primary) 0% 45%, var(--success) 45% 75%, var(--warning) 75% 100%)`,
                    }} />
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 12, height: 12, background: 'var(--primary)', borderRadius: 2 }} />
                        반도체 (45%)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 12, height: 12, background: 'var(--success)', borderRadius: 2 }} />
                        디스플레이 (30%)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, background: 'var(--warning)', borderRadius: 2 }} />
                        가전 (25%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI 심층 분석 버튼 */}
              <div style={{ padding: 16, textAlign: 'center', background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary" style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Bot size={18} /> AI 심층 분석 요청
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 5: AI 인사이트 (INSIGHT) 화면 ========== */}
      <section style={{ marginBottom: 48 }}>
        <h2
          onClick={() => toggleSection('insight-view')}
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
          {expandedSections['insight-view'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <Bot size={20} />
          STATE 5: AI 인사이트 (INSIGHT)
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            슬라이드 패널 형태의 AI 분석 결과
          </span>
        </h2>

        {expandedSections['insight-view'] && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* 실제 AI 인사이트 화면 데모 */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Tabs */}
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 4,
                fontSize: 12
              }}>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <List size={12} /> 목록
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} /> 상세
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={12} /> 편집
                </span>
                <span style={{ padding: '6px 12px', background: 'var(--panel)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart3 size={12} /> 분석
                </span>
                <span style={{ padding: '6px 12px', background: '#8b5cf6', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bot size={12} /> AI
                </span>
              </div>

              {/* Split: Original View + AI Panel */}
              <div style={{ display: 'flex', minHeight: 360 }}>
                {/* Left: 기존 화면 (흐리게) */}
                <div style={{ flex: 2, padding: 16, background: 'var(--bg-secondary)', opacity: 0.6 }}>
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: 80 }}>
                    <p style={{ fontSize: 14 }}>기존 화면 유지</p>
                    <p style={{ fontSize: 12 }}>(목록/상세/분석 중 하나)</p>
                  </div>
                </div>

                {/* Right: AI Panel */}
                <div style={{
                  flex: 1,
                  padding: 16,
                  background: 'linear-gradient(180deg, #fdf4ff 0%, var(--panel) 100%)',
                  borderLeft: '2px solid #8b5cf6',
                  minWidth: 280
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bot size={20} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>AI 인사이트</span>
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                      <X size={14} /> 닫기
                    </button>
                  </div>

                  {/* 핵심 발견사항 */}
                  <div style={{ marginBottom: 16 }}>
                    <h5 style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>💡 핵심 발견사항</h5>
                    <div className="card" style={{ padding: 12, fontSize: 12, lineHeight: 1.8 }}>
                      <p>1. 이 거래처는 지난 분기 대비 <strong style={{ color: 'var(--success)' }}>23% 성장</strong>했으며, 업계 평균(15%) 상회</p>
                      <p>2. 반도체 품목 수요가 <strong style={{ color: 'var(--primary)' }}>급증하는 패턴</strong> 감지</p>
                      <p>3. 결제 지연 위험 <strong style={{ color: 'var(--success)' }}>낮음</strong> (신용점수 98점)</p>
                    </div>
                  </div>

                  {/* 추천 액션 */}
                  <div style={{ marginBottom: 16 }}>
                    <h5 style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>🎯 추천 액션</h5>
                    <div className="card" style={{ padding: 12, fontSize: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                        <span>반도체 물량 확대 제안</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                        <span>장기 계약 협상 시도</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                        <span>신제품 프로모션 진행</span>
                      </label>
                    </div>
                  </div>

                  {/* 추가 질문 */}
                  <div>
                    <h5 style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>💬 추가 질문하기</h5>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        placeholder="경쟁사 대비 우위점은?"
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 12px' }}>
                        전송
                      </button>
                    </div>
                  </div>

                  {/* 적용 버튼 */}
                  <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Check size={14} /> 적용
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1 }}>
                      초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 구현 가이드 */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>구현 가이드</h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
{`// AI 패널
- 슬라이드 애니메이션: transform: translateX() + transition
- AI 응답 스트리밍: Server-Sent Events 또는 WebSocket
- 추천 액션: 체크 시 즉시 영업 활동에 등록 가능
- 키보드: I키로 AI 패널 토글, Esc로 닫기`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="card" style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          다음: <strong>Standard Navigation 3</strong> - UX 원칙, 반응형 레이아웃, 키보드 단축키
        </p>
      </div>
    </div>
  )
}
