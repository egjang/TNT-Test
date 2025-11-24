import { useEffect, useState } from 'react'
import { MobileLogin } from './features/auth/MobileLogin'
import { MobileMenu } from './features/menu/MobileMenu'
import { MobileOrderForm } from './features/order/MobileOrderForm'
import { MobileActivityPage } from './features/activity/MobileActivityPage'
import { MobileActivityManagement } from './features/activity/MobileActivityManagement'
import { MobileWeeklySchedule } from './features/activity/MobileWeeklySchedule'

type Page = 'menu' | 'order' | 'activity' | 'activity-mgmt' | 'weekly-schedule'

export default function App() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    try { return !!localStorage.getItem('tnt.sales.empId') } catch { return false }
  })
  const [currentPage, setCurrentPage] = useState<Page>('menu')

  useEffect(() => {
    const onLogin = (e: any) => { setLoggedIn(!!(e?.detail?.loggedIn)) }
    window.addEventListener('tnt.sales.login.changed' as any, onLogin)
    return () => window.removeEventListener('tnt.sales.login.changed' as any, onLogin)
  }, [])

  // Reset to menu when logging in
  useEffect(() => {
    if (loggedIn) {
      setCurrentPage('menu')
    }
  }, [loggedIn])

  if (!loggedIn) {
    return <MobileLogin />
  }

  if (currentPage === 'order') {
    return <MobileOrderForm onBack={() => setCurrentPage('menu')} />
  }

  if (currentPage === 'activity') {
    return <MobileActivityPage onBack={() => setCurrentPage('menu')} />
  }

  if (currentPage === 'activity-mgmt') {
    return <MobileActivityManagement onBack={() => setCurrentPage('menu')} />
  }

  if (currentPage === 'weekly-schedule') {
    return <MobileWeeklySchedule onBack={() => setCurrentPage('menu')} />
  }

  return <MobileMenu onNavigate={(page) => setCurrentPage(page)} />
}
