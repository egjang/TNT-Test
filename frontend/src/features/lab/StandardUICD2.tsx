import React, { useState } from 'react'
import { X } from 'lucide-react'

/**
 * Standard UI 2 (CD) - 화면 패턴
 * Modal/Popup, List View, Form View, Tab Form
 */
export function StandardUICD2() {
  const [showBasicModal, setShowBasicModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Standard UI 2 (CD)
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        화면 패턴 - Modal/Popup, List View, Form View, Tab Form
      </p>

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

        </div>
      </section>

      {/* Modal Instances */}
      {showBasicModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel)', borderRadius: 8, width: '100%', maxWidth: 560, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>기본 모달</h3>
              <button onClick={() => setShowBasicModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <p>기본 모달 내용입니다.</p>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowBasicModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={() => setShowBasicModal(false)}>확인</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel)', borderRadius: 8, width: '100%', maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>삭제 확인</h3>
            </div>
            <div style={{ padding: 20 }}>
              <p>정말 삭제하시겠습니까?</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>취소</button>
              <button className="btn btn-primary" style={{ background: 'var(--error)' }} onClick={() => setShowConfirmModal(false)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel)', borderRadius: 8, width: '100%', maxWidth: 800, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>신규 등록</h3>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>이름 <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="text" className="input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>이메일</label>
                  <input type="email" className="input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>전화번호</label>
                  <input type="tel" className="input" style={{ width: '100%' }} />
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
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={() => setShowFormModal(false)}>저장</button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel)', borderRadius: 8, width: '100%', maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>저장 완료</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>데이터가 성공적으로 저장되었습니다.</p>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowAlertModal(false)}>확인</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
