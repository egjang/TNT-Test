import React, { useState } from 'react'
import { X } from 'lucide-react'

/**
 * Standard UI (CD) - Component Documentation
 * 컴포넌트 문서화 및 예제를 제공하는 페이지
 */
export function StandardUICD() {
  const [showBasicModal, setShowBasicModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Standard UI (CD)
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        TNT Sales 표준 UI 컴포넌트 문서화 및 데모
      </p>

      {/* Atoms Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Atoms - 원자 컴포넌트
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Button */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Button</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn" disabled>Disabled</button>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-ghost">Ghost</button>
<button className="btn" disabled>Disabled</button>`}
            </pre>
          </div>

          {/* Input */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Input</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400, marginBottom: 8 }}>
              <input type="text" className="input" placeholder="기본 입력" />
              <input type="text" className="input" placeholder="비활성화" disabled />
              <input type="number" className="input" placeholder="숫자 입력" />
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<input type="text" className="input" placeholder="기본 입력" />
<input type="text" className="input" disabled />
<input type="number" className="input" placeholder="숫자 입력" />`}
            </pre>
          </div>

          {/* Card */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Card</h3>
            <div style={{ maxWidth: 400, marginBottom: 8 }}>
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title">카드 제목</h4>
                </div>
                <div className="card-body">
                  <p>카드 본문 내용입니다.</p>
                </div>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<div className="card">
  <div className="card-header">
    <h4 className="card-title">카드 제목</h4>
  </div>
  <div className="card-body">
    <p>카드 본문 내용입니다.</p>
  </div>
</div>`}
            </pre>
          </div>

          {/* Badge */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Badge</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="badge">Default</span>
              <span className="badge badge-primary">Primary</span>
              <span className="badge badge-success">Success</span>
              <span className="badge badge-warning">Warning</span>
              <span className="badge badge-error">Error</span>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<span className="badge">Default</span>
<span className="badge badge-primary">Primary</span>
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-error">Error</span>`}
            </pre>
          </div>

        </div>
      </section>

      {/* Molecules Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Molecules - 분자 컴포넌트
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Select - Dropdown */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Select - Dropdown (드롭다운)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              기본 선택 컴포넌트입니다. 옵션이 많거나 공간이 제한된 경우 사용합니다.
            </p>
            <div style={{ maxWidth: 400, marginBottom: 8 }}>
              <select className="select">
                <option>옵션 1</option>
                <option>옵션 2</option>
                <option>옵션 3</option>
              </select>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<select className="select">
  <option>옵션 1</option>
  <option>옵션 2</option>
  <option>옵션 3</option>
</select>`}
            </pre>
          </div>

          {/* Select - Radio */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Select - Radio (라디오 버튼)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              옵션이 2~5개이고 모든 옵션을 한눈에 보여줘야 할 때 사용합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="demo-radio" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>옵션 1</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="demo-radio" style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>옵션 2</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="demo-radio" style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>옵션 3</span>
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>가로 배열:</p>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="demo-radio-h" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                  <span>옵션 1</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="demo-radio-h" style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                  <span>옵션 2</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="demo-radio-h" style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                  <span>옵션 3</span>
                </label>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// 세로 배열
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <input type="radio" name="group" checked />
    <span>옵션 1</span>
  </label>
  <label>...</label>
</div>

// 가로 배열
<div style={{ display: 'flex', gap: 16 }}>
  <label>...</label>
</div>`}
            </pre>
          </div>

          {/* Select - Button Group */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Select - Button Group (버튼 그룹)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              토글 형태의 선택이 필요할 때 사용합니다. 상태나 뷰 전환에 적합합니다.
            </p>
            <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
              <button className="btn btn-primary" style={{ borderRadius: '4px 0 0 4px' }}>일간</button>
              <button className="btn btn-secondary" style={{ borderRadius: 0, borderLeft: 'none' }}>주간</button>
              <button className="btn btn-secondary" style={{ borderRadius: '0 4px 4px 0', borderLeft: 'none' }}>월간</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>분리형:</p>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-primary">전체</button>
                <button className="btn btn-secondary">진행중</button>
                <button className="btn btn-secondary">완료</button>
                <button className="btn btn-secondary">취소</button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>캡슐형 (Pill Style):</p>
              <div style={{
                display: 'inline-flex',
                gap: 0,
                background: 'var(--bg-secondary)',
                borderRadius: 20,
                padding: 4,
                border: '1px solid var(--border)'
              }}>
                <button style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  background: 'var(--panel)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>ALL</button>
                <button style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text-secondary)'
                }}>TNT</button>
                <button style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text-secondary)'
                }}>DYS</button>
              </div>
            </div>
            {/* 선택 유형 비교 테이블 */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>선택 컴포넌트 사용 가이드</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>유형</th>
                    <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>옵션 수</th>
                    <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>선택 방식</th>
                    <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>사용 시점</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Dropdown</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>5개 이상</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>단일 선택</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>공간 절약, 많은 옵션</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Radio</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>2~5개</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>단일 선택</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>모든 옵션 노출 필요</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Button Group</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>2~4개</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>단일 선택</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>뷰/상태 전환, 필터</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Checkbox</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>제한 없음</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>다중 선택</td>
                    <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>복수 항목 선택 필요</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// 연결형 버튼 그룹
<div style={{ display: 'flex', gap: 0 }}>
  <button className="btn btn-primary"
    style={{ borderRadius: '4px 0 0 4px' }}>일간</button>
  <button className="btn btn-secondary"
    style={{ borderRadius: 0, borderLeft: 'none' }}>주간</button>
  <button className="btn btn-secondary"
    style={{ borderRadius: '0 4px 4px 0', borderLeft: 'none' }}>월간</button>
</div>

// 분리형 버튼 그룹
<div style={{ display: 'flex', gap: 4 }}>
  <button className="btn btn-primary">전체</button>
  <button className="btn btn-secondary">진행중</button>
  <button className="btn btn-secondary">완료</button>
</div>

// 캡슐형 버튼 그룹 (Pill Style)
<div style={{
  display: 'inline-flex',
  background: 'var(--bg-secondary)',
  borderRadius: 20,
  padding: 4,
  border: '1px solid var(--border)'
}}>
  <button style={{
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: 16,
    background: 'var(--panel)', // 선택된 버튼
    color: 'var(--text-primary)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  }}>ALL</button>
  <button style={{
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: 16,
    background: 'transparent', // 미선택 버튼
    color: 'var(--text-secondary)'
  }}>TNT</button>
  <button style={{...}}>DYS</button>
</div>`}
            </pre>
          </div>

          {/* Select - Checkbox */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Select - Checkbox (체크박스)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              다중 선택이 가능한 경우 사용합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>옵션 1</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>옵션 2</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>옵션 3</span>
              </label>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <input type="checkbox" checked />
  <span>옵션 1</span>
</label>`}
            </pre>
          </div>

          {/* Search Input */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Search Input</h3>
            <div style={{ maxWidth: 400, marginBottom: 8 }}>
              <div style={{ position: 'relative' }}>
                <input type="text" className="input" placeholder="검색..." style={{ paddingLeft: 36 }} />
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`<div style={{ position: 'relative' }}>
  <input type="text" className="input" placeholder="검색..."
    style={{ paddingLeft: 36 }} />
  <svg style={{ position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)', width: 16, height: 16 }}>
    {/* Search Icon */}
  </svg>
</div>`}
            </pre>
          </div>

        </div>
      </section>

      {/* Color Palette */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Color Palette - 색상 팔레트
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { name: '--primary', label: 'Primary' },
            { name: '--secondary', label: 'Secondary' },
            { name: '--success', label: 'Success' },
            { name: '--warning', label: 'Warning' },
            { name: '--error', label: 'Error' },
            { name: '--bg-primary', label: 'Background Primary' },
            { name: '--bg-secondary', label: 'Background Secondary' },
            { name: '--text-primary', label: 'Text Primary' },
            { name: '--text-secondary', label: 'Text Secondary' },
            { name: '--border', label: 'Border' },
          ].map((color) => (
            <div key={color.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                height: 60,
                background: `var(${color.name})`,
                borderRadius: 4,
                border: '1px solid var(--border)'
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{color.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{color.name}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Typography - 타이포그래피
        </h2>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700 }}>Heading 1 (32px, 700)</h1>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'<h1>'}</code>
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Heading 2 (24px, 600)</h2>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'<h2>'}</code>
          </div>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600 }}>Heading 3 (20px, 600)</h3>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'<h3>'}</code>
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 600 }}>Heading 4 (16px, 600)</h4>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'<h4>'}</code>
          </div>
          <div>
            <p style={{ fontSize: 14 }}>Body Text (14px, 400)</p>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'<p>'}</code>
          </div>
          <div>
            <small style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Small Text (12px, 400)</small>
            <br />
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'<small>'}</code>
          </div>
        </div>
      </section>

      {/* Modal / Popup Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Modal / Popup - 팝업 표준
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Basic Modal */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Basic Modal (기본 모달)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              일반적인 정보 표시나 간단한 내용을 보여주는 기본 모달입니다.
            </p>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={() => setShowBasicModal(true)}>기본 모달 열기</button>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Modal 구조
<div className="modal-overlay">
  <div className="modal">
    <div className="modal-header">
      <h3>모달 제목</h3>
      <button className="modal-close"><X size={20} /></button>
    </div>
    <div className="modal-body">
      {/* 모달 내용 */}
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">취소</button>
      <button className="btn btn-primary">확인</button>
    </div>
  </div>
</div>`}
            </pre>
          </div>

          {/* Confirm Modal */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Confirm Modal (확인 모달)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              사용자의 확인이 필요한 작업 전에 표시하는 모달입니다. 삭제, 저장 등의 중요 작업에 사용합니다.
            </p>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(true)}>확인 모달 열기</button>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Confirm Modal 패턴
<div className="modal-overlay">
  <div className="modal modal-sm">
    <div className="modal-header">
      <h3>삭제 확인</h3>
    </div>
    <div className="modal-body">
      <p>정말 삭제하시겠습니까?</p>
      <p className="text-secondary">이 작업은 되돌릴 수 없습니다.</p>
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">취소</button>
      <button className="btn btn-error">삭제</button>
    </div>
  </div>
</div>`}
            </pre>
          </div>

          {/* Form Modal */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Form Modal (폼 모달)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              데이터 입력이 필요한 경우 사용하는 모달입니다. 등록, 수정 화면에 사용합니다.
            </p>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={() => setShowFormModal(true)}>폼 모달 열기</button>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Form Modal 패턴 (2열 배열)
<div className="modal-overlay">
  <div className="modal modal-lg">
    <div className="modal-header">
      <h3>신규 등록</h3>
      <button className="modal-close"><X size={20} /></button>
    </div>
    <div className="modal-body">
      {/* 2열 그리드 배열 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label>이름 *</label>
          <input type="text" className="input" />
        </div>
        <div className="form-group">
          <label>이메일</label>
          <input type="email" className="input" />
        </div>
        <div className="form-group">
          <label>전화번호</label>
          <input type="tel" className="input" />
        </div>
        <div className="form-group">
          <label>부서</label>
          <select className="input">...</select>
        </div>
      </div>
      {/* 전체 너비 필드 */}
      <div className="form-group">
        <label>설명</label>
        <textarea className="input" rows={3} />
      </div>
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">취소</button>
      <button className="btn btn-primary">저장</button>
    </div>
  </div>
</div>`}
            </pre>
          </div>

          {/* Alert Modal */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Alert Modal (알림 모달)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              성공, 경고, 에러 등의 알림을 표시하는 모달입니다.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-success" onClick={() => setShowAlertModal(true)}>알림 모달 열기</button>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Alert Modal 패턴 (Success / Warning / Error)
<div className="modal-overlay">
  <div className="modal modal-sm modal-alert">
    <div className="modal-body" style={{ textAlign: 'center' }}>
      <div className="alert-icon alert-success">✓</div>
      <h3>저장 완료</h3>
      <p>데이터가 성공적으로 저장되었습니다.</p>
    </div>
    <div className="modal-footer" style={{ justifyContent: 'center' }}>
      <button className="btn btn-primary">확인</button>
    </div>
  </div>
</div>`}
            </pre>
          </div>

          {/* Modal Size Guide */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Modal Size Guide (크기 가이드)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 12 }}>
              <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Small (SM)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>width: 400px</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>확인/알림용</div>
              </div>
              <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Medium (MD)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>width: 560px</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>기본 (Default)</div>
              </div>
              <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Large (LG)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>width: 800px</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>폼/상세 화면</div>
              </div>
              <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Full (XL)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>width: 90vw</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>대형 테이블/그리드</div>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Modal 크기 클래스
.modal-sm  { max-width: 400px; }
.modal     { max-width: 560px; }  /* default */
.modal-lg  { max-width: 800px; }
.modal-xl  { max-width: 90vw; }`}
            </pre>
          </div>

        </div>
      </section>

      {/* List View Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          List View - 목록 조회 화면
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Standard List View */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Standard List View (표준 목록 조회)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              검색 조건 영역 + 테이블 + 페이지네이션으로 구성된 표준 목록 조회 화면입니다.
            </p>

            {/* Demo */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
              {/* Search Area */}
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처명</label>
                    <input type="text" className="input" placeholder="거래처명" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>상태</label>
                    <select className="input" style={{ width: '100%' }}>
                      <option value="">전체</option>
                      <option value="active">활성</option>
                      <option value="inactive">비활성</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>시작일</label>
                    <input type="date" className="input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>종료일</label>
                    <input type="date" className="input" style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-secondary">초기화</button>
                  <button className="btn btn-primary">검색</button>
                </div>
              </div>

              {/* Table Toolbar */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  총 <strong style={{ color: 'var(--text-primary)' }}>156</strong>건
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary">Excel</button>
                  <button className="btn btn-primary">신규 등록</button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}>
                        <input type="checkbox" />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>No</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처코드</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처명</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>담당자</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>상태</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>매출액</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { no: 1, code: 'C001', name: '(주)ABC상사', manager: '김영업', status: '활성', sales: '125,000,000', date: '2024-01-15' },
                      { no: 2, code: 'C002', name: '대한무역', manager: '이담당', status: '활성', sales: '98,500,000', date: '2024-01-14' },
                      { no: 3, code: 'C003', name: '글로벌테크', manager: '박매니저', status: '비활성', sales: '45,200,000', date: '2024-01-12' },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <input type="checkbox" />
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.no}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>{row.code}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.manager}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            background: row.status === '활성' ? 'var(--success)' : 'var(--bg-secondary)',
                            color: row.status === '활성' ? 'var(--on-accent)' : 'var(--text-secondary)'
                          }}>{row.status}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{row.sales}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>«</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>‹</button>
                <button className="btn btn-primary" style={{ padding: '4px 8px', minWidth: 32 }}>1</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>2</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>3</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>4</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>5</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>›</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>»</button>
              </div>
            </div>

            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// 목록 조회 화면 구조
<div className="list-view">
  {/* 검색 조건 영역 */}
  <div className="search-area">
    <div className="search-grid">
      <FormField label="거래처명" />
      <FormField label="상태" type="select" />
      <FormField label="시작일" type="date" />
      <FormField label="종료일" type="date" />
    </div>
    <div className="search-buttons">
      <button className="btn btn-secondary">초기화</button>
      <button className="btn btn-primary">검색</button>
    </div>
  </div>

  {/* 테이블 툴바 */}
  <div className="table-toolbar">
    <span>총 {count}건</span>
    <div>
      <button>Excel</button>
      <button>신규 등록</button>
    </div>
  </div>

  {/* 테이블 */}
  <table>
    <thead>...</thead>
    <tbody>...</tbody>
  </table>

  {/* 페이지네이션 */}
  <Pagination />
</div>`}
            </pre>
          </div>

          {/* List View Layout Guide */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>List View Layout Guide (레이아웃 가이드)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>영역</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>구성요소</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>설명</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>검색 조건</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>Input, Select, DatePicker</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>4열 그리드 배열, 배경색 구분</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>테이블 툴바</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>건수, Excel, 등록 버튼</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>좌측 건수, 우측 액션 버튼</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>테이블</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>체크박스, 데이터 컬럼</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>행 호버, 클릭 시 상세 이동</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>페이지네이션</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>페이지 번호, 이전/다음</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>중앙 정렬</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Infinite Scroll List View */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Infinite Scroll List View (무한 스크롤 목록 조회)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              페이지네이션 대신 스크롤 시 자동으로 데이터를 추가 로드하는 목록 조회 화면입니다. 대용량 데이터를 끊김 없이 탐색할 때 사용합니다.
            </p>

            {/* Demo */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
              {/* Search Area */}
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처명</label>
                    <input type="text" className="input" placeholder="거래처명" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>상태</label>
                    <select className="input" style={{ width: '100%' }}>
                      <option value="">전체</option>
                      <option value="active">활성</option>
                      <option value="inactive">비활성</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>시작일</label>
                    <input type="date" className="input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>종료일</label>
                    <input type="date" className="input" style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-secondary">초기화</button>
                  <button className="btn btn-primary">검색</button>
                </div>
              </div>

              {/* Table Toolbar */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  총 <strong style={{ color: 'var(--text-primary)' }}>1,024</strong>건 (현재 50건 로드됨)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary">Excel</button>
                  <button className="btn btn-primary">신규 등록</button>
                </div>
              </div>

              {/* Table with Scroll Container */}
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}>
                        <input type="checkbox" />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>No</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처코드</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처명</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>담당자</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>상태</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>매출액</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { no: 1, code: 'C001', name: '(주)ABC상사', manager: '김영업', status: '활성', sales: '125,000,000', date: '2024-01-15' },
                      { no: 2, code: 'C002', name: '대한무역', manager: '이담당', status: '활성', sales: '98,500,000', date: '2024-01-14' },
                      { no: 3, code: 'C003', name: '글로벌테크', manager: '박매니저', status: '비활성', sales: '45,200,000', date: '2024-01-12' },
                      { no: 4, code: 'C004', name: '한국전자', manager: '최부장', status: '활성', sales: '78,900,000', date: '2024-01-11' },
                      { no: 5, code: 'C005', name: '세계물산', manager: '정과장', status: '활성', sales: '156,700,000', date: '2024-01-10' },
                      { no: 6, code: 'C006', name: '미래산업', manager: '강대리', status: '비활성', sales: '32,100,000', date: '2024-01-09' },
                      { no: 7, code: 'C007', name: '동양화학', manager: '임사원', status: '활성', sales: '89,400,000', date: '2024-01-08' },
                      { no: 8, code: 'C008', name: '서울식품', manager: '한주임', status: '활성', sales: '67,200,000', date: '2024-01-07' },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <input type="checkbox" />
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.no}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>{row.code}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.manager}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            background: row.status === '활성' ? 'var(--success)' : 'var(--bg-secondary)',
                            color: row.status === '활성' ? 'var(--on-accent)' : 'var(--text-secondary)'
                          }}>{row.status}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{row.sales}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Loading Indicator at bottom */}
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      border: '2px solid var(--border)',
                      borderTop: '2px solid var(--primary)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>더 불러오는 중...</span>
                  </div>
                </div>
              </div>

              {/* Scroll Info Footer */}
              <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                스크롤하여 더 많은 데이터 로드 | 50건씩 자동 추가
              </div>
            </div>

            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// 무한 스크롤 목록 조회 화면 구조
const [items, setItems] = useState<Item[]>([])
const [page, setPage] = useState(0)
const [hasMore, setHasMore] = useState(true)
const [loading, setLoading] = useState(false)
const containerRef = useRef<HTMLDivElement>(null)

// 스크롤 감지 및 데이터 로드
useEffect(() => {
  const container = containerRef.current
  if (!container) return

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = container
    // 하단 100px 전에 도달하면 추가 로드
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loading) {
      loadMore()
    }
  }

  container.addEventListener('scroll', handleScroll)
  return () => container.removeEventListener('scroll', handleScroll)
}, [hasMore, loading])

// 추가 데이터 로드
const loadMore = async () => {
  setLoading(true)
  const newItems = await fetchItems(page + 1)
  setItems(prev => [...prev, ...newItems])
  setPage(prev => prev + 1)
  setHasMore(newItems.length > 0)
  setLoading(false)
}

<div className="infinite-scroll-list">
  {/* 검색 조건 영역 */}
  <div className="search-area">...</div>

  {/* 테이블 툴바 */}
  <div className="table-toolbar">
    <span>총 {total}건 (현재 {items.length}건 로드됨)</span>
  </div>

  {/* 스크롤 컨테이너 */}
  <div ref={containerRef} style={{ maxHeight: 400, overflow: 'auto' }}>
    <table>
      <thead style={{ position: 'sticky', top: 0 }}>...</thead>
      <tbody>{items.map(...)}</tbody>
    </table>

    {/* 로딩 인디케이터 */}
    {loading && <LoadingSpinner />}

    {/* 더 이상 데이터 없음 */}
    {!hasMore && <div>모든 데이터를 불러왔습니다</div>}
  </div>
</div>`}
            </pre>
          </div>

          {/* Infinite Scroll Layout Guide */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Infinite Scroll Layout Guide (무한 스크롤 레이아웃 가이드)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>영역</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>구성요소</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>설명</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>검색 조건</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>Input, Select, DatePicker</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>4열 그리드 배열, 배경색 구분</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>테이블 툴바</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>총 건수, 현재 로드 건수</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>진행 상황 표시</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>테이블 헤더</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>체크박스, 데이터 컬럼</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>position: sticky로 고정</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>스크롤 영역</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>테이블, 로딩 인디케이터</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>maxHeight 설정, overflow: auto</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>로딩 상태</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>스피너, 텍스트</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>하단 100px 전 트리거</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Form View Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Form View - 폼 조회/등록 화면
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Standard Form View */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Standard Form View (표준 폼 화면)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              데이터 조회/등록/수정에 사용되는 표준 폼 화면입니다.
            </p>

            {/* Demo */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
              {/* Form Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>거래처 상세</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary">목록</button>
                  <button className="btn btn-primary">수정</button>
                </div>
              </div>

              {/* Form Body */}
              <div style={{ padding: 20 }}>
                {/* Section */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>기본 정보</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처코드</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>C001</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처명</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>(주)ABC상사</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>대표자</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>홍길동</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>사업자번호</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>123-45-67890</div>
                    </div>
                  </div>
                </div>

                {/* Section */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>연락처 정보</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>전화번호</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>02-1234-5678</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>팩스번호</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>02-1234-5679</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>주소</label>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 14 }}>서울시 강남구 테헤란로 123 ABC빌딩 5층</div>
                    </div>
                  </div>
                </div>

                {/* Section - Edit Mode */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>담당자 정보 (수정 모드)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>담당자명 <span style={{ color: 'var(--error)' }}>*</span></label>
                      <input type="text" className="input" defaultValue="김영업" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>담당자 연락처</label>
                      <input type="text" className="input" defaultValue="010-1234-5678" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>이메일</label>
                      <input type="email" className="input" defaultValue="kim@abc.com" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>부서</label>
                      <select className="input" style={{ width: '100%' }}>
                        <option>영업팀</option>
                        <option>구매팀</option>
                        <option>관리팀</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// 폼 화면 구조
<div className="form-view">
  {/* 폼 헤더 */}
  <div className="form-header">
    <h3>거래처 상세</h3>
    <div className="form-actions">
      <button className="btn btn-secondary">목록</button>
      <button className="btn btn-primary">수정</button>
    </div>
  </div>

  {/* 폼 바디 */}
  <div className="form-body">
    {/* 섹션 단위로 구분 */}
    <section>
      <h4>기본 정보</h4>
      <div className="form-grid">
        {/* 조회 모드: 읽기 전용 */}
        <FormField label="거래처코드" value="C001" readOnly />

        {/* 수정 모드: 입력 가능 */}
        <FormField label="거래처명" required>
          <input className="input" />
        </FormField>
      </div>
    </section>
  </div>
</div>`}
            </pre>
          </div>

        </div>
      </section>

      {/* Tab Form Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Tab Form - 탭 전환 폼 화면
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Tab Form Demo */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Tab Form View (탭 폼 화면)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              여러 섹션의 정보를 탭으로 구분하여 표시하는 폼 화면입니다.
            </p>

            {/* Demo */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
              {/* Form Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>거래처 상세 (탭)</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary">목록</button>
                  <button className="btn btn-primary">저장</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
                <div style={{ display: 'flex', gap: 0 }}>
                  {['basic', 'contact', 'sales', 'history'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: activeTab === tab ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {tab === 'basic' && '기본정보'}
                      {tab === 'contact' && '연락처'}
                      {tab === 'sales' && '매출현황'}
                      {tab === 'history' && '이력'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div style={{ padding: 20 }}>
                {activeTab === 'basic' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처코드</label>
                      <input type="text" className="input" defaultValue="C001" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처명 <span style={{ color: 'var(--error)' }}>*</span></label>
                      <input type="text" className="input" defaultValue="(주)ABC상사" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>대표자</label>
                      <input type="text" className="input" defaultValue="홍길동" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>사업자번호</label>
                      <input type="text" className="input" defaultValue="123-45-67890" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>업종</label>
                      <select className="input" style={{ width: '100%' }}>
                        <option>제조업</option>
                        <option>도소매업</option>
                        <option>서비스업</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>상태</label>
                      <select className="input" style={{ width: '100%' }}>
                        <option>활성</option>
                        <option>비활성</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>담당자명</label>
                      <input type="text" className="input" defaultValue="김영업" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>연락처</label>
                      <input type="text" className="input" defaultValue="010-1234-5678" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>이메일</label>
                      <input type="email" className="input" defaultValue="kim@abc.com" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>팩스</label>
                      <input type="text" className="input" defaultValue="02-1234-5679" style={{ width: '100%' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>주소</label>
                      <input type="text" className="input" defaultValue="서울시 강남구 테헤란로 123" style={{ width: '100%' }} />
                    </div>
                  </div>
                )}

                {activeTab === 'sales' && (
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>년월</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>매출액</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>수금액</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>미수금</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>2024-01</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>50,000,000</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>45,000,000</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', color: 'var(--error)' }}>5,000,000</td></tr>
                        <tr><td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>2023-12</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>48,000,000</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>48,000,000</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>0</td></tr>
                        <tr><td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>2023-11</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>52,000,000</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>52,000,000</td><td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>0</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { date: '2024-01-15 14:30', user: '김영업', action: '담당자 정보 수정' },
                        { date: '2024-01-10 09:15', user: '이관리', action: '연락처 정보 수정' },
                        { date: '2024-01-05 11:00', user: '김영업', action: '신규 등록' },
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 130 }}>{item.date}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, minWidth: 80 }}>{item.user}</div>
                          <div style={{ fontSize: 13 }}>{item.action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// 탭 폼 화면 구조
const [activeTab, setActiveTab] = useState('basic')

<div className="tab-form-view">
  {/* 폼 헤더 */}
  <div className="form-header">
    <h3>거래처 상세</h3>
    <div className="form-actions">
      <button>목록</button>
      <button>저장</button>
    </div>
  </div>

  {/* 탭 */}
  <div className="tabs">
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key)}
        className={activeTab === tab.key ? 'active' : ''}
      >
        {tab.label}
      </button>
    ))}
  </div>

  {/* 탭 컨텐츠 */}
  <div className="tab-content">
    {activeTab === 'basic' && <BasicInfoForm />}
    {activeTab === 'contact' && <ContactForm />}
    {activeTab === 'sales' && <SalesTable />}
    {activeTab === 'history' && <HistoryList />}
  </div>
</div>`}
            </pre>
          </div>

          {/* Tab Style Guide */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Tab Style Guide (탭 스타일 가이드)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Underline Tab (기본)</p>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  <button style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 600 }}>탭 1</button>
                  <button style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-secondary)' }}>탭 2</button>
                  <button style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-secondary)' }}>탭 3</button>
                </div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Box Tab</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 4, color: 'var(--on-accent)', fontWeight: 600 }}>탭 1</button>
                  <button style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 4, color: 'var(--text-secondary)' }}>탭 2</button>
                  <button style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 4, color: 'var(--text-secondary)' }}>탭 3</button>
                </div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>스타일</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>사용 시점</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>특징</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Underline</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>폼 화면, 상세 화면</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>기본 스타일, 깔끔한 느낌</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Box</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>필터, 뷰 전환</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>버튼 형태, 강조 효과</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Progress Bar Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Progress Bar - 진행률 표시
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Basic Progress Bar */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Basic Progress Bar (기본 진행률)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              작업의 진행 상태를 시각적으로 표시합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {/* 0% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>대기</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>0%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              {/* 35% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>데이터 로딩</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>35%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              {/* 70% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>처리 중</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>70%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '70%', height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              {/* 100% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>완료</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>100%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--success)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Basic Progress Bar
<div className="progress-wrapper">
  <div className="progress-label">
    <span>데이터 로딩</span>
    <span>35%</span>
  </div>
  <div className="progress-track">
    <div className="progress-bar" style={{ width: '35%' }} />
  </div>
</div>

// CSS
.progress-track {
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}`}
            </pre>
          </div>

          {/* Progress Bar Colors */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Progress Bar Colors (색상 변형)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              상태에 따른 색상을 적용합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {/* Primary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Primary</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                </div>
              </div>
              {/* Success */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Success</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--success)', borderRadius: 4 }} />
                </div>
              </div>
              {/* Warning */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Warning</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '75%', height: '100%', background: 'var(--warning)', borderRadius: 4 }} />
                </div>
              </div>
              {/* Error */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Error</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '30%', height: '100%', background: 'var(--error)', borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar Sizes */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Progress Bar Sizes (크기 변형)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {/* Small */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Small (4px)</span>
                <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
                </div>
              </div>
              {/* Default */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Default (8px)</span>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                </div>
              </div>
              {/* Large */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Large (12px)</span>
                <div style={{ height: 12, background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--primary)', borderRadius: 6 }} />
                </div>
              </div>
              {/* XLarge with label inside */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>XLarge (20px) - 내부 라벨</span>
                <div style={{ height: 20, background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--on-accent)', fontWeight: 500 }}>60%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step Progress */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Step Progress (단계 진행률)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              프로세스의 단계별 진행 상태를 표시합니다.
            </p>
            <div style={{ marginBottom: 16 }}>
              {/* Step Progress Demo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 20px' }}>
                {/* Line */}
                <div style={{ position: 'absolute', left: 60, right: 60, top: '50%', height: 2, background: 'var(--bg-secondary)', transform: 'translateY(-50%)' }}>
                  <div style={{ width: '66%', height: '100%', background: 'var(--primary)' }} />
                </div>
                {/* Steps */}
                {[
                  { label: '주문접수', status: 'completed' },
                  { label: '결제완료', status: 'completed' },
                  { label: '배송중', status: 'current' },
                  { label: '배송완료', status: 'pending' },
                ].map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      background: step.status === 'completed' ? 'var(--success)' :
                        step.status === 'current' ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: step.status === 'pending' ? 'var(--text-secondary)' : 'var(--on-accent)',
                      border: step.status === 'current' ? '3px solid var(--primary)' : 'none',
                      boxSizing: 'border-box'
                    }}>
                      {step.status === 'completed' ? '✓' : idx + 1}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: step.status === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: step.status === 'current' ? 600 : 400
                    }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Step Progress 구조
<div className="step-progress">
  <div className="step-line">
    <div className="step-line-fill" style={{ width: '66%' }} />
  </div>
  {steps.map((step, idx) => (
    <div className={\`step \${step.status}\`}>
      <div className="step-circle">
        {step.status === 'completed' ? '✓' : idx + 1}
      </div>
      <span className="step-label">{step.label}</span>
    </div>
  ))}
</div>

// Status: 'completed' | 'current' | 'pending'`}
            </pre>
          </div>

          {/* Circular Progress */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Circular Progress (원형 진행률)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              원형으로 진행률을 표시합니다. 달성률, KPI 등에 적합합니다.
            </p>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* 25% */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--error)" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 35 * 0.25} ${2 * Math.PI * 35}`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 16, fontWeight: 600 }}>25%</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>미달</span>
              </div>
              {/* 50% */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--warning)" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 35 * 0.5} ${2 * Math.PI * 35}`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 16, fontWeight: 600 }}>50%</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>진행중</span>
              </div>
              {/* 75% */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--primary)" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 35 * 0.75} ${2 * Math.PI * 35}`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 16, fontWeight: 600 }}>75%</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>양호</span>
              </div>
              {/* 100% */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--success)" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 35 * 1} ${2 * Math.PI * 35}`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 16, fontWeight: 600 }}>100%</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>달성</span>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Circular Progress (SVG)
const CircularProgress = ({ percent, color, size = 80 }) => {
  const r = (size - 10) / 2  // radius
  const circumference = 2 * Math.PI * r

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
        {/* Progress circle */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={\`\${circumference * percent / 100} \${circumference}\`}
          strokeLinecap="round" />
      </svg>
      <div className="percent-label">{percent}%</div>
    </div>
  )
}`}
            </pre>
          </div>

          {/* Progress Bar Usage Guide */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Progress Bar Usage Guide (사용 가이드)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>유형</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>사용 시점</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>색상 기준</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Linear</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>파일 업로드, 데이터 로딩</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>Primary → Success (완료 시)</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Step</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>주문 프로세스, 워크플로우</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>Success (완료), Primary (현재)</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Circular</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>KPI 달성률, 목표 대비 실적</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>Error (&lt;50%), Warning (50-80%), Success (≥80%)</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Basic Modal */}
      {showBasicModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowBasicModal(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, width: '100%', maxWidth: 560, margin: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>기본 모달</h3>
              <button onClick={() => setShowBasicModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p>기본 모달의 본문 내용입니다.</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                일반적인 정보 표시나 안내 메시지를 보여줄 때 사용합니다.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setShowBasicModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={() => setShowBasicModal(false)}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowConfirmModal(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, width: '100%', maxWidth: 400, margin: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>삭제 확인</h3>
            </div>
            <div style={{ padding: 20 }}>
              <p>정말 삭제하시겠습니까?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>취소</button>
              <button className="btn" style={{ background: 'var(--error)', color: 'var(--on-accent)' }} onClick={() => setShowConfirmModal(false)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowFormModal(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, width: '100%', maxWidth: 800, margin: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>신규 등록</h3>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>이름 *</label>
                  <input type="text" className="input" placeholder="이름을 입력하세요" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>이메일</label>
                  <input type="email" className="input" placeholder="이메일을 입력하세요" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>전화번호</label>
                  <input type="tel" className="input" placeholder="전화번호를 입력하세요" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>부서</label>
                  <select className="input" style={{ width: '100%' }}>
                    <option value="">부서 선택</option>
                    <option value="sales">영업팀</option>
                    <option value="dev">개발팀</option>
                    <option value="hr">인사팀</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>설명</label>
                <textarea className="input" rows={3} placeholder="설명을 입력하세요" style={{ width: '100%', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={() => setShowFormModal(false)}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAlertModal(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, width: '100%', maxWidth: 400, margin: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '32px 20px 16px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                color: 'var(--on-accent)', fontSize: 32
              }}>✓</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>저장 완료</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                데이터가 성공적으로 저장되었습니다.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 20px 24px' }}>
              <button className="btn btn-primary" onClick={() => setShowAlertModal(false)}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast / Notification Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Toast / Notification - 알림 메시지
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Toast Types */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Toast Types (토스트 유형)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              사용자 액션에 대한 피드백을 제공하는 임시 알림입니다. 3-5초 후 자동으로 사라집니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {/* Success Toast */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--panel)', border: '1px solid var(--success)', borderLeft: '4px solid var(--success)',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>저장 완료</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>데이터가 성공적으로 저장되었습니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
              {/* Error Toast */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--panel)', border: '1px solid var(--error)', borderLeft: '4px solid var(--error)',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>!</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>오류 발생</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>요청을 처리하는 중 오류가 발생했습니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
              {/* Warning Toast */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--panel)', border: '1px solid var(--warning)', borderLeft: '4px solid var(--warning)',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>⚠</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>주의</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>세션이 10분 후 만료됩니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
              {/* Info Toast */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--panel)', border: '1px solid var(--primary)', borderLeft: '4px solid var(--primary)',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>i</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>알림</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>새로운 업데이트가 있습니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>유형</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>사용 시점</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>지속 시간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--success)' }}>Success</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>저장, 삭제, 전송 완료</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>3초</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--error)' }}>Error</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>API 오류, 유효성 검사 실패</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>수동 닫기</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--warning)' }}>Warning</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>세션 만료, 권한 경고</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>5초</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--primary)' }}>Info</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>안내, 업데이트 알림</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>3초</td>
                </tr>
              </tbody>
            </table>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Toast 사용 예시
showToast({
  type: 'success' | 'error' | 'warning' | 'info',
  title: '저장 완료',
  message: '데이터가 성공적으로 저장되었습니다.',
  duration: 3000 // ms, error는 수동 닫기
})`}
            </pre>
          </div>

        </div>
      </section>

      {/* Loading / Skeleton Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Loading / Skeleton - 로딩 상태
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Spinner */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Spinner (스피너)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              데이터 로딩 중 표시하는 회전 애니메이션입니다.
            </p>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 16 }}>
              {/* Small */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 16, height: 16, border: '2px solid var(--bg-secondary)',
                  borderTop: '2px solid var(--primary)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Small</span>
              </div>
              {/* Medium */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 24, height: 24, border: '3px solid var(--bg-secondary)',
                  borderTop: '3px solid var(--primary)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Medium</span>
              </div>
              {/* Large */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 40, height: 40, border: '4px solid var(--bg-secondary)',
                  borderTop: '4px solid var(--primary)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Large</span>
              </div>
              {/* With Text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{
                  width: 16, height: 16, border: '2px solid var(--panel)',
                  borderTop: '2px solid var(--primary)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: 13 }}>로딩 중...</span>
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          {/* Skeleton */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Skeleton (스켈레톤)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              콘텐츠 로딩 전 레이아웃을 미리 보여주는 플레이스홀더입니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Card Skeleton */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Card Skeleton</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-secondary)', animation: 'pulse 2s infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '60%', background: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 8, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '80%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                  </div>
                </div>
              </div>
              {/* Table Skeleton */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Table Skeleton</p>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ height: 12, width: '20%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '30%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '25%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '25%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                  </div>
                ))}
              </div>
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Skeleton 사용 예시
{loading ? (
  <div className="skeleton skeleton-text" />
) : (
  <span>{data.name}</span>
)}

// CSS
.skeleton {
  background: var(--bg-secondary);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}`}
            </pre>
          </div>

          {/* Full Page Loading */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Full Page Loading (전체 페이지 로딩)</h3>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 24, background: 'var(--bg-secondary)', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, margin: '0 auto 16px',
                border: '4px solid var(--panel)', borderTop: '4px solid var(--primary)',
                borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>데이터를 불러오는 중입니다</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>잠시만 기다려 주세요...</div>
            </div>
          </div>

        </div>
      </section>

      {/* Empty State Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Empty State - 빈 상태
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Empty State Types (빈 상태 유형)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              데이터가 없거나 검색 결과가 없을 때 표시하는 상태입니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* No Data */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 데이터가 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>새로운 항목을 등록해 주세요.</div>
                <button className="btn btn-primary">+ 신규 등록</button>
              </div>
              {/* No Search Result */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>검색 결과가 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>다른 검색어로 시도해 보세요.</div>
                <button className="btn btn-secondary">검색 조건 초기화</button>
              </div>
              {/* Error State */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>⚠️</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--error)' }}>데이터를 불러올 수 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>네트워크 연결을 확인해 주세요.</div>
                <button className="btn btn-secondary">다시 시도</button>
              </div>
              {/* No Permission */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🔒</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>접근 권한이 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>관리자에게 권한을 요청하세요.</div>
                <button className="btn btn-secondary">권한 요청</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>상태</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>아이콘</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>메시지</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>데이터 없음</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>📋 / 빈 박스</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>등록된 데이터가 없습니다</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>신규 등록 버튼</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>검색 결과 없음</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>🔍 / 돋보기</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>검색 결과가 없습니다</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>초기화 버튼</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>오류 발생</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>⚠️ / 경고</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>데이터를 불러올 수 없습니다</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>다시 시도 버튼</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>권한 없음</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>🔒 / 자물쇠</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>접근 권한이 없습니다</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>권한 요청 버튼</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Form Validation Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Form Validation - 폼 유효성 검사
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Validation States (유효성 검사 상태)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              입력값의 유효성 검사 결과를 시각적으로 표시합니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Normal */}
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>기본 상태</label>
                <input type="text" className="input" placeholder="입력하세요" style={{ width: '100%' }} />
              </div>
              {/* Error */}
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>오류 상태</label>
                <input type="text" className="input" value="잘못된 입력" style={{ width: '100%', borderColor: 'var(--error)' }} readOnly />
                <span style={{ fontSize: 11, color: 'var(--error)', marginTop: 4, display: 'block' }}>올바른 형식으로 입력해주세요.</span>
              </div>
              {/* Success */}
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>성공 상태</label>
                <input type="text" className="input" value="올바른 입력" style={{ width: '100%', borderColor: 'var(--success)' }} readOnly />
                <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 4, display: 'block' }}>✓ 사용 가능합니다.</span>
              </div>
            </div>

            {/* Required Field */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>필수 입력 표시</h4>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    이름 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="text" className="input" placeholder="필수 입력" style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    비고 <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(선택)</span>
                  </label>
                  <input type="text" className="input" placeholder="선택 입력" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>검사 유형</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>검사 시점</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>에러 메시지 예시</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>필수값</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>blur / submit</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>필수 입력 항목입니다.</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>이메일 형식</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>blur</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>올바른 이메일 형식으로 입력해주세요.</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>전화번호</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>blur</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>올바른 전화번호 형식으로 입력해주세요.</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>숫자 범위</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>change</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>0 ~ 100 사이의 값을 입력해주세요.</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>중복 확인</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>blur / 버튼</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>이미 사용 중인 코드입니다.</td>
                </tr>
              </tbody>
            </table>

            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Form Validation 예시
<div className="form-group">
  <label>이메일 <span className="required">*</span></label>
  <input
    type="email"
    className={\`input \${error ? 'input-error' : ''}\`}
    onBlur={validate}
  />
  {error && <span className="error-message">{error}</span>}
</div>

// CSS
.input-error { border-color: var(--error); }
.error-message { color: var(--error); font-size: 11px; }`}
            </pre>
          </div>

        </div>
      </section>

      {/* File Upload Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          File Upload - 파일 업로드
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upload Types (업로드 유형)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              파일 업로드 UI 패턴입니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Drag & Drop */}
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Drag & Drop</p>
                <div style={{
                  border: '2px dashed var(--border)', borderRadius: 8, padding: 32, textAlign: 'center',
                  background: 'var(--bg-secondary)', cursor: 'pointer'
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📁</div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>파일을 여기에 끌어다 놓으세요</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>또는 <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>파일 선택</span></div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>최대 10MB / PDF, Excel, Image</div>
                </div>
              </div>
              {/* Button Upload */}
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Button Upload</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <button className="btn btn-secondary">📎 파일 선택</button>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>선택된 파일 없음</span>
                </div>
                {/* File List */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span style={{ fontSize: 13 }}>report_2024.xlsx</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(2.3MB)</span>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🖼️</span>
                      <span style={{ fontSize: 13 }}>image.png</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(0.8MB)</span>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>✕</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Upload Progress (업로드 진행률)</h4>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>large_file.zip</span>
                      <span>65%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: '65%', height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
                    </div>
                  </div>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>⏸</button>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>유형</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>사용 시점</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>특징</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Drag & Drop</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>다수 파일, 대용량</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>넓은 영역, 직관적</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500 }}>Button</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>단일 파일, 좁은 공간</td>
                  <td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>컴팩트, 인라인</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Data Display Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Data Display - 데이터 표시
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Statistics Cards */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Statistics Cards (통계 카드)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              주요 KPI나 요약 정보를 표시하는 카드입니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>총 매출</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>₩12.5억</div>
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>▲ 12.5% vs 전월</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>신규 거래처</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>127건</div>
                <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>▼ 3.2% vs 전월</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>처리 대기</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>23건</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>긴급 5건 포함</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>목표 달성률</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>87%</div>
                <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: '87%', height: '100%', background: 'var(--success)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Description List */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Description List (상세 정보)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              레이블-값 쌍으로 상세 정보를 표시합니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Horizontal */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600 }}>가로 배열</div>
                <div style={{ padding: 12 }}>
                  {[
                    { label: '거래처명', value: '(주)테스트회사' },
                    { label: '사업자번호', value: '123-45-67890' },
                    { label: '담당자', value: '홍길동' },
                    { label: '연락처', value: '02-1234-5678' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', padding: '8px 0', borderBottom: idx < 3 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ width: 100, fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Grid */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600 }}>그리드 배열</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 12, gap: 12 }}>
                  {[
                    { label: '등록일', value: '2024-01-15' },
                    { label: '수정일', value: '2024-03-20' },
                    { label: '상태', value: '활성' },
                    { label: '등급', value: 'VIP' },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Timeline (타임라인)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              이력이나 활동 기록을 시간순으로 표시합니다.
            </p>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, maxWidth: 500 }}>
              {[
                { time: '2024-03-20 14:30', title: '주문 완료', desc: '주문번호: ORD-2024-0320', status: 'success' },
                { time: '2024-03-20 10:15', title: '결제 승인', desc: '신용카드 결제', status: 'success' },
                { time: '2024-03-19 16:45', title: '견적서 발송', desc: '이메일 발송 완료', status: 'info' },
                { time: '2024-03-18 09:00', title: '상담 접수', desc: '제품 문의', status: 'default' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, paddingBottom: idx < 3 ? 16 : 0, position: 'relative' }}>
                  {/* Line */}
                  {idx < 3 && (
                    <div style={{
                      position: 'absolute', left: 7, top: 20, width: 2, height: 'calc(100% - 8px)',
                      background: 'var(--border)'
                    }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    background: item.status === 'success' ? 'var(--success)' :
                      item.status === 'info' ? 'var(--primary)' : 'var(--bg-secondary)',
                    border: item.status === 'default' ? '2px solid var(--border)' : 'none'
                  }} />
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Keyboard Shortcuts Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Keyboard Shortcuts - 키보드 단축키
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Standard Shortcuts (표준 단축키)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              업무 효율을 높이는 표준 키보드 단축키입니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600 }}>일반</div>
                <div style={{ padding: 12 }}>
                  {[
                    { key: 'Ctrl + S', action: '저장' },
                    { key: 'Ctrl + N', action: '신규 등록' },
                    { key: 'Ctrl + F', action: '검색' },
                    { key: 'Esc', action: '취소 / 닫기' },
                    { key: 'Enter', action: '확인 / 실행' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < 4 ? '1px solid var(--border)' : 'none' }}>
                      <kbd style={{ padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{item.key}</kbd>
                      <span style={{ fontSize: 13 }}>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600 }}>테이블/목록</div>
                <div style={{ padding: 12 }}>
                  {[
                    { key: '↑ / ↓', action: '행 이동' },
                    { key: 'Space', action: '행 선택' },
                    { key: 'Ctrl + A', action: '전체 선택' },
                    { key: 'Delete', action: '선택 삭제' },
                    { key: 'Ctrl + E', action: 'Excel 내보내기' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < 4 ? '1px solid var(--border)' : 'none' }}>
                      <kbd style={{ padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{item.key}</kbd>
                      <span style={{ fontSize: 13 }}>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
