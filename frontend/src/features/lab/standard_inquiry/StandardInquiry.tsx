import { useState } from 'react'
import { StandardInquiryList, InquiryRow } from './StandardInquiryList'
import { StandardInquiryForm } from './StandardInquiryForm'

export function StandardInquiry() {
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRow | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleSelect = (inquiry: InquiryRow) => {
    setSelectedInquiry(inquiry)
    setIsCreating(false)
  }

  const handleCreate = () => {
    setSelectedInquiry(null)
    setIsCreating(true)
  }

  const handleBack = () => {
    setSelectedInquiry(null)
    setIsCreating(false)
  }

  const handleSave = () => {
    setIsCreating(false)
    setSelectedInquiry(null)
    window.dispatchEvent(new CustomEvent('tnt.sales.inquiry.reload'))
  }

  // 상세/등록 모드
  if (selectedInquiry || isCreating) {
    return (
      <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
        <StandardInquiryForm
          inquiry={selectedInquiry}
          onCancel={handleBack}
          onSave={handleSave}
        />
      </div>
    )
  }

  // 목록 모드
  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>문의 관리</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          고객 문의 및 지원 요청을 관리합니다.
        </p>
      </div>

      {/* 목록 화면 */}
      <StandardInquiryList
        onSelect={handleSelect}
        onCreate={handleCreate}
        selectedId={selectedInquiry?.id}
      />
    </div>
  )
}
