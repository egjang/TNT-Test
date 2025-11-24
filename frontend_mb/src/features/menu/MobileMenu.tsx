import { useState } from 'react'

export function MobileMenu({ onNavigate }: { onNavigate: (page: 'order' | 'activity' | 'activity-mgmt' | 'weekly-schedule') => void }) {
  const [empName] = useState(() => {
    try { return localStorage.getItem('tnt.sales.empName') || '사용자' } catch { return '사용자' }
  })

  function handleLogout() {
    try {
      localStorage.removeItem('tnt.sales.empId')
      localStorage.removeItem('tnt.sales.empName')
      localStorage.removeItem('tnt.sales.assigneeId')
      window.dispatchEvent(new CustomEvent('tnt.sales.login.changed', { detail: { loggedIn: false } }))
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sales Hub</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{empName}님, 환영합니다</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="p-4 space-y-4">
        {/* Order Card */}
        <button
          onClick={() => onNavigate('order')}
          className="w-full bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>
                receipt_long
              </span>
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">수주장 등록</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">신규 수주장을 등록합니다</p>
            </div>
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 24 }}>
              chevron_right
            </span>
          </div>
        </button>

        {/* Activity Management Card */}
        <button
          onClick={() => onNavigate('activity-mgmt')}
          className="w-full bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 32 }}>
                analytics
              </span>
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">활동관리</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">주간 계획 및 실적을 확인합니다</p>
            </div>
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 24 }}>
              chevron_right
            </span>
          </div>
        </button>

        {/* Activity Card */}
        <button
          onClick={() => onNavigate('activity')}
          className="w-full bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>
                event
              </span>
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">활동 등록</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">영업 활동을 등록합니다</p>
            </div>
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 24 }}>
              chevron_right
            </span>
          </div>
        </button>

        {/* Weekly Schedule Card */}
        <button
          onClick={() => onNavigate('weekly-schedule')}
          className="w-full bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-purple-600" style={{ fontSize: 32 }}>
                calendar_month
              </span>
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">주간일정</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">나의 주간 일정을 확인합니다</p>
            </div>
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 24 }}>
              chevron_right
            </span>
          </div>
        </button>

        {/* Inventory Card - 숨김 처리 */}
        {/* <button
          onClick={() => onNavigate('inventory')}
          className="w-full bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 32 }}>
                inventory_2
              </span>
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">재고현황</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">품목별 재고 aging을 확인합니다</p>
            </div>
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 24 }}>
              chevron_right
            </span>
          </div>
        </button> */}
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <p className="text-center text-xs text-slate-500 dark:text-slate-500">
          TNT Sales Mobile v1.0
        </p>
      </div>
    </div>
  )
}
