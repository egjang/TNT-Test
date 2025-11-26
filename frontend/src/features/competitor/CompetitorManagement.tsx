import { useState } from 'react'
import { CompetitorList, CompetitorRow } from './CompetitorList'
import { CompetitorForm } from './CompetitorForm'

export function CompetitorManagement() {
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorRow | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleSelect = (competitor: CompetitorRow) => {
    setSelectedCompetitor(competitor)
    setIsCreating(false)
  }

  const handleCreate = () => {
    setSelectedCompetitor(null)
    setIsCreating(true)
  }

  const handleBack = () => {
    setSelectedCompetitor(null)
    setIsCreating(false)
  }

  const handleSave = () => {
    setIsCreating(false)
    setSelectedCompetitor(null)
    window.dispatchEvent(new CustomEvent('tnt.sales.competitor.reload'))
  }

  // 상세/등록 모드
  if (selectedCompetitor || isCreating) {
    return (
      <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
        <CompetitorForm
          competitor={selectedCompetitor}
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
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>경쟁사 관리</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          경쟁사 정보를 등록하고 관리합니다.
        </p>
      </div>

      {/* 목록 화면 */}
      <CompetitorList
        onSelect={handleSelect}
        onCreate={handleCreate}
        selectedId={selectedCompetitor?.competitorId}
      />
    </div>
  )
}
