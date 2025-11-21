import React, { useEffect, useState } from 'react'

type Activity = {
  id: number
  subject?: string
  customerName?: string
  plannedStartAt?: string
  activityStatus?: string
  activityType?: string
}

type WeekRange = {
  start: Date
  end: Date
}

function getWeekRange(offsetWeeks: number = 0): WeekRange {
  const now = new Date()
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay

  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + (offsetWeeks * 7))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(isoString?: string): string {
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

export function MobileWeeklySchedule({ onBack }: { onBack: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)

  const weekRange = getWeekRange(weekOffset)
  const weekLabel = `${formatDate(weekRange.start)} ~ ${formatDate(weekRange.end)}`

  // Filter activities based on toggle
  const filteredActivities = showOnlyIncomplete
    ? activities.filter(a => a.activityStatus === '계획')
    : activities

  useEffect(() => {
    loadActivities()
  }, [weekOffset])

  async function loadActivities() {
    setLoading(true)
    setError(null)
    try {
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
      const empId = localStorage.getItem('tnt.sales.empId') || ''

      const params = new URLSearchParams()
      params.set('mineOnly', 'true')
      if (assigneeId) params.set('assigneeId', assigneeId)
      else if (empId) params.set('empId', empId)
      params.set('start', weekRange.start.toISOString())
      params.set('end', weekRange.end.toISOString())
      params.set('onlyRoot', 'true')

      const res = await fetch(`/api/v1/sales-activities?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const list: Activity[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: Number(r.id),
        subject: r.subject,
        customerName: r.customerName,
        plannedStartAt: r.plannedStartAt,
        activityStatus: r.activityStatus,
        activityType: r.activityType,
      }))

      // Sort by plannedStartAt
      list.sort((a, b) => {
        const dateA = a.plannedStartAt ? new Date(a.plannedStartAt).getTime() : 0
        const dateB = b.plannedStartAt ? new Date(b.plannedStartAt).getTime() : 0
        return dateA - dateB
      })

      setActivities(list)
    } catch (e: any) {
      setError(e?.message || '활동 목록을 불러오지 못했습니다')
      setActivities([])
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
              arrow_back
            </span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">주간일정</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{weekLabel}</p>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            이전주
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            이번주
          </button>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            다음주
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-center gap-2 px-4 pb-3">
          <button
            onClick={() => setShowOnlyIncomplete(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showOnlyIncomplete
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setShowOnlyIncomplete(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlyIncomplete
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            미완료
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700" style={{ fontSize: 64 }}>
              event_busy
            </span>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {showOnlyIncomplete ? '미완료 활동이 없습니다' : '이번 주에 등록된 활동이 없습니다'}
            </p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {showOnlyIncomplete ? '미완료' : '전체'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredActivities.length}</p>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">완료</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {activities.filter(a => a.activityStatus === '완료').length}
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">계획</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {activities.filter(a => a.activityStatus === '계획').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity List */}
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-start gap-3">
                  {/* Status Badge */}
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${getStatusColor(activity.activityStatus)}`} />

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2">
                      {activity.subject || '(제목 없음)'}
                    </h3>

                    {/* Customer Name */}
                    {activity.customerName && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 16 }}>
                          business
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {activity.customerName}
                        </p>
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          schedule
                        </span>
                        <span>{formatDateTime(activity.plannedStartAt)}</span>
                      </div>
                      {activity.activityType && (
                        <>
                          <span>•</span>
                          <span>{activity.activityType}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Label */}
                  <div className={`px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0 ${getStatusColor(activity.activityStatus)}`}>
                    {activity.activityStatus || '상태없음'}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
