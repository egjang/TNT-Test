import React from 'react'

/**
 * Standard UI 1 (CD) - 기초 컴포넌트
 * Atoms, Molecules, Color Palette, Typography
 */
export function StandardUICD1() {
  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Standard UI 1 (CD)
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        기초 컴포넌트 - Atoms, Molecules, Color Palette, Typography
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

    </div>
  )
}
