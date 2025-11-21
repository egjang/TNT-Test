import React, { useEffect, useState } from 'react'

type ActivityDetail = {
  id: number
  subject?: string
  description?: string
  customerName?: string
  plannedStartAt?: string
  plannedEndAt?: string
  actualStartAt?: string
  activityStatus?: string
  activityType?: string
  channel?: string
  sfAccountId?: string
}

type Props = {
  activityId: number
  onBack: () => void
  onUpdated?: () => void
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDisplayDateTime(isoString?: string): string {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '-'

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]

  return `${month}/${day}(${weekDay}) ${hours}:${minutes}`
}

export function MobileActivityDetail({ activityId, onBack, onUpdated }: Props) {
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    activityStatus: '',
    activityType: '',
    channel: '',
    plannedStartAt: '',
    actualStartAt: ''
  })

  useEffect(() => {
    loadActivity()
  }, [activityId])

  async function loadActivity() {
    setLoading(true)
    setError(null)
    try {
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
      const empId = localStorage.getItem('tnt.sales.empId') || ''

      const params = new URLSearchParams()
      params.set('mineOnly', 'true')
      if (assigneeId) params.set('assigneeId', assigneeId)
      else if (empId) params.set('empId', empId)

      const res = await fetch(`/api/v1/sales-activities?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const list: ActivityDetail[] = Array.isArray(data) ? data : []
      const found = list.find(a => a.id === activityId)

      if (!found) throw new Error('활동을 찾을 수 없습니다')

      setActivity(found)
      setFormData({
        subject: found.subject || '',
        description: found.description || '',
        activityStatus: found.activityStatus || '',
        activityType: found.activityType || '',
        channel: found.channel || '',
        plannedStartAt: formatDateTime(found.plannedStartAt),
        actualStartAt: formatDateTime(found.actualStartAt)
      })
    } catch (e: any) {
      setError(e?.message || '활동 정보를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!activity) return

    setSaving(true)
    try {
      const body: any = {}
      if (formData.subject) body.subject = formData.subject
      if (formData.description) body.description = formData.description
      if (formData.activityStatus) body.activityStatus = formData.activityStatus
      if (formData.activityType) body.activityType = formData.activityType
      if (formData.channel) body.channel = formData.channel
      if (formData.plannedStartAt) body.plannedStartAt = new Date(formData.plannedStartAt).toISOString()
      if (formData.actualStartAt) body.actualStartAt = new Date(formData.actualStartAt).toISOString()

      const res = await fetch(`/api/v1/sales-activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      alert('저장되었습니다')
      setIsEditing(false)
      await loadActivity()
      if (onUpdated) onUpdated()
    } catch (e: any) {
      alert(e?.message || '저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  function getStatusColor(status?: string): string {
    switch (status) {
      case '완료':
        return 'bg-emerald-500'
      case '계획':
        return 'bg-blue-500'
      case '취소':
        return 'bg-slate-400'
      case '연기':
        return 'bg-amber-500'
      case '미방문':
        return 'bg-red-500'
      default:
        return 'bg-slate-400'
    }
  }

  const isIncomplete = activity?.activityStatus === '계획'

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">활동 상세</h1>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error || '활동을 찾을 수 없습니다'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">활동 상세</h1>
          </div>
          {isIncomplete && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              수정
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(activity.activityStatus)}`}>
            {activity.activityStatus || '상태없음'}
          </div>
        </div>

        {/* Detail Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">제목</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                placeholder="제목을 입력하세요"
              />
            ) : (
              <p className="text-slate-900 dark:text-white font-medium">{activity.subject || '-'}</p>
            )}
          </div>

          {/* Customer Name */}
          {activity.customerName && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">거래처</label>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>
                  business
                </span>
                <p className="text-slate-900 dark:text-white">{activity.customerName}</p>
              </div>
            </div>
          )}

          {/* Activity Type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">활동 유형</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.activityType}
                onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                placeholder="활동 유형"
              />
            ) : (
              <p className="text-slate-900 dark:text-white">{activity.activityType || '-'}</p>
            )}
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">채널</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                placeholder="채널"
              />
            ) : (
              <p className="text-slate-900 dark:text-white">{activity.channel || '-'}</p>
            )}
          </div>

          {/* Activity Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">상태</label>
            {isEditing ? (
              <select
                value={formData.activityStatus}
                onChange={(e) => setFormData({ ...formData, activityStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="계획">계획</option>
                <option value="완료">완료</option>
                <option value="취소">취소</option>
                <option value="연기">연기</option>
                <option value="미방문">미방문</option>
              </select>
            ) : (
              <p className="text-slate-900 dark:text-white">{activity.activityStatus || '-'}</p>
            )}
          </div>

          {/* Planned Start At */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">계획 시작일시</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formData.plannedStartAt}
                onChange={(e) => setFormData({ ...formData, plannedStartAt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>
                  schedule
                </span>
                <p className="text-slate-900 dark:text-white">{formatDisplayDateTime(activity.plannedStartAt)}</p>
              </div>
            )}
          </div>

          {/* Actual Start At (종료일시) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">종료일시</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formData.actualStartAt}
                onChange={(e) => setFormData({ ...formData, actualStartAt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>
                  event_available
                </span>
                <p className="text-slate-900 dark:text-white">{formatDisplayDateTime(activity.actualStartAt)}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">설명</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none"
                placeholder="설명을 입력하세요"
              />
            ) : (
              <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{activity.description || '-'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
