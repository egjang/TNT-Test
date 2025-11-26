import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { InquiryRow } from './StandardInquiryList'

interface StandardInquiryFormProps {
  inquiry?: InquiryRow | null
  onCancel: () => void
  onSave: () => void
}

export function StandardInquiryForm({ inquiry, onCancel, onSave }: StandardInquiryFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  useEffect(() => {
    if (inquiry) {
      setFormData({
        title: inquiry.title || '',
        inquiryStatus: inquiry.inquiryStatus || '신규접수',
        inquiryCategory: inquiry.inquiryCategory || '',
        customerName: inquiry.customerName || '',
        assigneeName: inquiry.assigneeName || '',
        content: '',
      })
    } else {
      setFormData({
        title: '',
        inquiryStatus: '신규접수',
        inquiryCategory: '제품문의',
        customerName: '',
        assigneeName: '',
        content: '',
      })
    }
  }, [inquiry])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSave()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
      {/* 폼 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {inquiry ? '문의 상세' : '문의 등록'}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>목록</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { key: 'basic', label: '기본정보' },
            { key: 'history', label: '처리이력' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{ padding: 20 }}>
        {activeTab === 'basic' && (
          <>
            {/* 기본 정보 섹션 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                문의 정보
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    제목 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="문의 제목을 입력하세요"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    분류 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <select
                    className="input"
                    value={formData.inquiryCategory}
                    onChange={(e) => handleChange('inquiryCategory', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">선택</option>
                    <option value="제품문의">제품문의</option>
                    <option value="재고/배송문의">재고/배송문의</option>
                    <option value="가격문의">가격문의</option>
                    <option value="기타문의">기타문의</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>상태</label>
                  <select
                    className="input"
                    value={formData.inquiryStatus}
                    onChange={(e) => handleChange('inquiryStatus', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="신규접수">신규접수</option>
                    <option value="확인 중">확인 중</option>
                    <option value="완료">완료</option>
                    <option value="보류">보류</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 고객 정보 섹션 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                고객 정보
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>고객명</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                    placeholder="고객명을 입력하세요"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>담당자</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.assigneeName}
                    onChange={(e) => handleChange('assigneeName', e.target.value)}
                    placeholder="담당자를 입력하세요"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* 문의 내용 섹션 */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                문의 내용
              </h4>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>내용</label>
                <textarea
                  className="input"
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="문의 내용을 입력하세요"
                  rows={6}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inquiry ? (
                [
                  { date: inquiry.openedAt ? new Date(inquiry.openedAt).toLocaleString() : '-', user: '시스템', action: '문의 등록' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 150 }}>{item.date}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, minWidth: 80 }}>{item.user}</div>
                    <div style={{ fontSize: 13 }}>{item.action}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  신규 등록 시에는 처리이력이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
