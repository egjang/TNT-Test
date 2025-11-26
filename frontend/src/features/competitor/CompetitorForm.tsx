import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { CompetitorRow } from './CompetitorList'

interface CompetitorFormProps {
  competitor?: CompetitorRow | null
  onCancel: () => void
  onSave: () => void
}

export function CompetitorForm({ competitor, onCancel, onSave }: CompetitorFormProps) {
  const [formData, setFormData] = useState({
    competitorName: '',
    country: '',
    homepage: '',
    foundedYear: '',
    description: '',
    marketPositionCd: '기술 리더',
    distributionModel: '직판'
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (competitor) {
      setFormData({
        competitorName: competitor.competitorName || '',
        country: competitor.country || '',
        homepage: competitor.homepage || '',
        foundedYear: competitor.foundedYear ? String(competitor.foundedYear) : '',
        description: competitor.description || '',
        marketPositionCd: competitor.marketPositionCd || '기술 리더',
        distributionModel: competitor.distributionModel || '직판'
      })
    } else {
      setFormData({
        competitorName: '',
        country: '',
        homepage: '',
        foundedYear: '',
        description: '',
        marketPositionCd: '기술 리더',
        distributionModel: '직판'
      })
    }
  }, [competitor])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.competitorName.trim()) {
      setMessage({ type: 'error', text: '경쟁사명을 입력해주세요.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const payload = {
        ...formData,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : null
      }

      let res: Response
      if (competitor) {
        // 수정
        res = await fetch(`/api/v1/competitors/${competitor.competitorId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        // 신규 등록
        res = await fetch('/api/v1/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        setMessage({ type: 'success', text: competitor ? '수정되었습니다.' : '등록되었습니다.' })
        setTimeout(() => onSave(), 1000)
      } else {
        setMessage({ type: 'error', text: '저장에 실패했습니다.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!competitor) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/competitors/${competitor.competitorId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '삭제되었습니다.' })
        setTimeout(() => onSave(), 1000)
      } else {
        setMessage({ type: 'error', text: '삭제에 실패했습니다.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '오류가 발생했습니다.' })
    } finally {
      setDeleting(false)
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
            {competitor ? '경쟁사 상세' : '경쟁사 등록'}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {competitor && (
            <button
              className="btn btn-secondary"
              onClick={handleDelete}
              disabled={deleting}
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--error)' }}
            >
              <Trash2 size={14} />
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>목록</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          padding: '12px 20px',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: message.type === 'success' ? '#047857' : '#b91c1c',
          borderBottom: '1px solid var(--border)'
        }}>
          {message.text}
        </div>
      )}

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { key: 'basic', label: '기본정보' },
            { key: 'products', label: '제품정보' },
            { key: 'analysis', label: '경쟁분석' },
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
                기본 정보
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    경쟁사명 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.competitorName}
                    onChange={(e) => handleChange('competitorName', e.target.value)}
                    placeholder="경쟁사명을 입력하세요"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>국가</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="국가를 입력하세요"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>홈페이지</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.homepage}
                    onChange={(e) => handleChange('homepage', e.target.value)}
                    placeholder="https://"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>설립연도</label>
                  <select
                    className="input"
                    value={formData.foundedYear}
                    onChange={(e) => handleChange('foundedYear', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">선택</option>
                    {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}년</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 분류 정보 섹션 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                분류 정보
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>시장 지위</label>
                  <select
                    className="input"
                    value={formData.marketPositionCd}
                    onChange={(e) => handleChange('marketPositionCd', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="기술 리더">기술 리더</option>
                    <option value="품질 강자">품질 강자</option>
                    <option value="가성비 중심">가성비 중심</option>
                    <option value="초저가 진입자">초저가 진입자</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>유통 모델</label>
                  <select
                    className="input"
                    value={formData.distributionModel}
                    onChange={(e) => handleChange('distributionModel', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="직판">직판</option>
                    <option value="총판">총판</option>
                    <option value="대리점">대리점</option>
                    <option value="온라인">온라인</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 설명 섹션 */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                상세 설명
              </h4>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>설명</label>
                <textarea
                  className="input"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="경쟁사에 대한 설명을 입력하세요"
                  rows={6}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <div>
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              {competitor ? (
                <p>경쟁사 제품 정보는 별도 메뉴에서 관리됩니다.</p>
              ) : (
                <p>경쟁사를 먼저 등록한 후 제품 정보를 추가할 수 있습니다.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div>
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              {competitor ? (
                <p>경쟁 분석 정보는 별도 메뉴에서 관리됩니다.</p>
              ) : (
                <p>경쟁사를 먼저 등록한 후 분석 정보를 추가할 수 있습니다.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
