import React, { useEffect, useState } from 'react'
import { flags } from '../../config/flags'
import { LogoutButton } from '../../ui/LogoutButton'
import { LogIn, Settings, ChevronRight, type LucideIcon } from 'lucide-react'
import { getMenuVisibility, isMenuEnabled, onMenuVisibilityChange } from '../../config/menuVisibility'
import { getAllMenuItems, type MenuItem } from './items'

type Props = {
  selectedKey: string
  onSelect: (key: string) => void
  collapsed?: boolean
  onExpand?: () => void
  disabled?: boolean
}

type Item = { key: string; label: string; icon?: LucideIcon; children?: Item[]; disabled?: boolean }

export function Menu({ selectedKey, onSelect, collapsed = false, onExpand, disabled = false }: Props) {
  // Collapse state for groups; default: all collapsed on first load
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [, setVer] = useState(0)
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [loggedInEmpId, setLoggedInEmpId] = useState<string | null>(null)
  const [loggedInEmpName, setLoggedInEmpName] = useState<string | null>(null)
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileBoxRef = React.useRef<HTMLDivElement | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwEmpId, setPwEmpId] = useState('')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwNew2, setPwNew2] = useState('')
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('tnt.sales.empId')
    if (saved) setLoggedInEmpId(saved)
    const savedName = localStorage.getItem('tnt.sales.empName')
    if (savedName) setLoggedInEmpName(savedName)
    // If assigneeId exists, keep it; otherwise it will be set on next login
  }, [])

  // Close password-change modal on ESC
  useEffect(() => {
    if (!pwOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPwOpen(false) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [pwOpen])

  async function doChangePw() {
    setPwMsg(null)
    const emp = pwEmpId.trim() || empId.trim()
    if (!emp) { setPwMsg('사번을 입력해 주세요'); return }
    if (!pwCurrent || !pwNew || !pwNew2) { setPwMsg('현재/새 비밀번호를 입력해 주세요'); return }
    if (pwNew !== pwNew2) { setPwMsg('새 비밀번호 확인이 일치하지 않습니다'); return }
    try {
      setPwBusy(true)
      const res = await fetch('/api/v1/auth/change-password', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ empId: emp, currentPassword: pwCurrent, newPassword: pwNew })
      })
      const data = await res.json().catch(()=> ({}))
      if (res.ok && data?.ok) {
        setPwMsg('비밀번호 변경 성공')
        setTimeout(()=> { setPwOpen(false); setPwMsg(null); setPwEmpId(''); setPwCurrent(''); setPwNew(''); setPwNew2('') }, 1000)
      } else {
        setPwMsg(data?.error || `오류: HTTP ${res.status}`)
      }
    } catch {
      setPwMsg('비밀번호 변경 중 오류가 발생했습니다')
    } finally { setPwBusy(false) }
  }

  async function doLogin() {
    setAuthMsg(null)
    if (!empId.trim()) {
      setAuthMsg('사번을 입력해 주세요')
      return
    }
    if (!password) {
      setAuthMsg('비밀번호를 입력해 주세요')
      return
    }
    setAuthBusy(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: empId.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        const name = (data.empName && String(data.empName)) || ''
        const assigneeId = (data.assigneeId != null) ? String(data.assigneeId) : ''
        setLoggedInEmpId(empId.trim())
        setLoggedInEmpName(name || null)
        localStorage.setItem('tnt.sales.empId', empId.trim())
        if (name) try { localStorage.setItem('tnt.sales.empName', name) } catch {}
        if (assigneeId) try { localStorage.setItem('tnt.sales.assigneeId', assigneeId) } catch {}
        setEmpId('')
        setPassword('')
        setAuthMsg(null)
        try { window.dispatchEvent(new CustomEvent('tnt.sales.login.changed', { detail: { loggedIn: true } }) as any) } catch {}
      } else {
        setAuthMsg(data?.error || '사용자가 존재하지 않습니다')
      }
    } catch (e: any) {
      setAuthMsg('로그인 중 오류가 발생했습니다')
    } finally {
      setAuthBusy(false)
    }
  }

  function doLogout() {
    setLoggedInEmpId(null)
    setLoggedInEmpName(null)
    localStorage.removeItem('tnt.sales.empId')
    localStorage.removeItem('tnt.sales.empName')
    localStorage.removeItem('tnt.sales.empSeq')
    localStorage.removeItem('tnt.sales.assigneeId')
    setAuthMsg(null)
    try { window.dispatchEvent(new CustomEvent('tnt.sales.login.changed', { detail: { loggedIn: false } }) as any) } catch {}
  }

  function toggle(key: string) {
    setOpen((prev) => {
      const willOpen = !prev[key]
      if (willOpen) {
        // Open only this group, close others
        return { [key]: true }
      }
      // Close all if toggling an open group
      return {}
    })
  }

  // React to visibility changes from settings
  useEffect(() => {
    const off = onMenuVisibilityChange(() => setVer((v) => v + 1))
    return off
  }, [])

  // Close profile menu on outside click / ESC
  useEffect(() => {
    if (!profileMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!profileBoxRef.current) return
      if (!profileBoxRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false)
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [profileMenuOpen])

  // Apply visibility filters
  const items: Item[] = (() => {
    const vis = getMenuVisibility()
    const all = getAllMenuItems() as Item[]
    const filtered: Item[] = []
    for (const it of all) {
      if (!isMenuEnabled(it.key)) continue
      if (it.children?.length) {
        const kids = it.children.filter((c) => isMenuEnabled(c.key))
        filtered.push({ ...it, children: kids })
      } else {
        filtered.push(it)
      }
    }
    return filtered
  })()

  if (collapsed) {
    // Collapsed: show only top-level icons; clicking expands and selects the group
    return (
      <nav className="menu" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', paddingTop: 6 }}>
        <ul style={{ flex: 1, overflow: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 6, opacity: disabled ? .5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
          {items.map((it) => (
            <li key={it.key} style={{ display: 'flex', justifyContent: 'center' }}>
              {/** Disable top-level item when requested */}
              <button
                data-key={it.key}
                className={selectedKey === it.key ? 'active' : ''}
                title={it.label}
                aria-label={it.label}
                disabled={disabled || it.disabled}
                aria-disabled={disabled || it.disabled || undefined}
                onClick={() => {
                  if (disabled || it.disabled) return
                  onExpand?.();
                  // If group, open and navigate to first non-disabled child
                  if (it.children?.length) {
                    const first = it.children.find((c) => !c.disabled)
                    if (first) onSelect(first.key)
                  } else {
                    onSelect(it.key)
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 6, opacity: it.disabled ? 0.5 : 1, cursor: it.disabled ? 'not-allowed' : 'pointer' }}
              >
                {it.icon && <it.icon size={20} />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <nav className="menu" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ul style={{ flex: 1, overflow: 'auto', opacity: disabled ? .5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
        {items.map((it) => (
          <li key={it.key}>
            <button
              data-key={it.key}
              className={selectedKey === it.key ? 'active' : ''}
              title={it.label}
               disabled={disabled || it.disabled}
               aria-disabled={disabled || it.disabled || undefined}
              onClick={() => {
                if (disabled || it.disabled) return
                // For groups, open submenu and navigate to first child
                if (it.children?.length) {
                  toggle(it.key)
                  const first = it.children.find((c) => !c.disabled)
                  if (first) onSelect(first.key)
                } else {
                  onSelect(it.key)
                }
              }}
              style={{ opacity: it.disabled ? 0.5 : 1, cursor: it.disabled ? 'not-allowed' : undefined }}
            >
              {it.icon && <it.icon size={18} className="icon" />}
              <span>{it.label}</span>
            </button>
            {it.children?.length && open[it.key] ? (
              <ul className="submenu">
                {it.children.map((sub) => (
                  <li key={sub.key}>
                    <button
                      data-key={sub.key}
                      className={selectedKey === sub.key ? 'active' : ''}
                      title={sub.label}
                      disabled={disabled || sub.disabled}
                      aria-disabled={disabled || sub.disabled || undefined}
                      onClick={() => {
                        if (disabled || sub.disabled) return
                        onSelect(sub.key)
                        if (sub.key === 'demand:list') {
                          try { window.dispatchEvent(new CustomEvent('tnt.sales.demand.refresh', { detail: { source: 'menu' } })) } catch {}
                        }
                      }}
                      style={{ opacity: sub.disabled ? 0.5 : 1, cursor: sub.disabled ? 'not-allowed' : undefined }}
                    >
                      <ChevronRight size={16} className="icon" />
                      <span>{sub.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        {loggedInEmpId ? (
          <div ref={profileBoxRef} style={{ position: 'relative' }}>
            <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {loggedInEmpName ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileMenuOpen((o) => !o) } }}
                  title="사용자 메뉴"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  style={{ cursor: 'pointer' }}
                >
                  {loggedInEmpName} ({loggedInEmpId})
                </span>
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileMenuOpen((o) => !o) } }}
                  title="사용자 메뉴"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  style={{ cursor: 'pointer' }}
                >
                  {loggedInEmpId}
                </span>
              )}
            </div>
            {profileMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  zIndex: 50,
                  left: 0,
                  top: 22,
                  minWidth: 140,
                  background: '#fff',
                  color: '#111',
                  fontSize: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                }}
              >
                <button
                  role="menuitem"
                  onClick={() => { onSelect('settings'); setProfileMenuOpen(false) }}
                  className={selectedKey === 'settings' ? 'active' : ''}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', width: '100%', background: 'transparent', color: 'inherit' }}
                >
                  <Settings size={16} className="icon" />
                  <span>환경설정</span>
                </button>
              </div>
            )}
            <LogoutButton onClick={doLogout} />
          </div>
        ) : (
          <div>
            <div className="muted" style={{ marginBottom: 6, fontSize: 12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>로그인</span>
              <span
                role="button"
                tabIndex={0}
                title="비밀번호 변경"
                aria-label="비밀번호 변경"
                onClick={() => setPwOpen(true)}
                onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); setPwOpen(true) } }}
                style={{ cursor:'pointer', color: 'inherit' }}
              >
                비번변경
              </span>
            </div>
            <input
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
              placeholder="사번"
              style={{ width: '100%', height: 28, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12 }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
              type="password"
              placeholder="비밀번호"
              style={{ width: '100%', height: 28, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, marginTop: 6 }}
            />
            <div style={{ display: 'flex', marginTop: 8, justifyContent: 'flex-end' }}>
              <span
                role="button"
                tabIndex={0}
                className="icon-button"
                onClick={() => { if (!authBusy) doLogin() }}
                onKeyDown={(e) => { if (!authBusy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); doLogin() } }}
                aria-label="로그인"
                title="로그인"
                aria-disabled={authBusy ? true : undefined}
              >
                <LogIn size={18} className="icon" />
              </span>
            </div>
          </div>
        )}
        {authMsg && (
          <div
            className={authMsg.includes('오류') ? 'error' : 'muted'}
            style={{ marginTop: 8, fontSize: 11 }}
          >
            {authMsg}
          </div>
        )}
      </div>
      {pwOpen && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }} onClick={()=> setPwOpen(false)}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 280, maxWidth: '86vw' }} onClick={(e)=> e.stopPropagation()}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>비밀번호 변경</div>
            <input
              value={pwEmpId}
              onChange={(e)=> setPwEmpId(e.target.value)}
              placeholder="사번"
              style={{ width:'100%', height: 28, padding:'6px 8px', borderRadius: 6, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', fontSize:12, marginTop: 6 }}
            />
            <input
              value={pwCurrent}
              onChange={(e)=> setPwCurrent(e.target.value)}
              type="password"
              placeholder="현재 비밀번호"
              style={{ width:'100%', height: 28, padding:'6px 8px', borderRadius: 6, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', fontSize:12, marginTop: 6 }}
            />
            <input
              value={pwNew}
              onChange={(e)=> setPwNew(e.target.value)}
              type="password"
              placeholder="새 비밀번호"
              style={{ width:'100%', height: 28, padding:'6px 8px', borderRadius: 6, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', fontSize:12, marginTop: 6 }}
            />
            <input
              value={pwNew2}
              onChange={(e)=> setPwNew2(e.target.value)}
              type="password"
              placeholder="새 비밀번호 확인"
              style={{ width:'100%', height: 28, padding:'6px 8px', borderRadius: 6, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', fontSize:12, marginTop: 6 }}
            />
            {pwMsg && <div className={pwMsg.includes('성공') ? 'success' : 'error'} style={{ marginTop: 8 }}>{pwMsg}</div>}
            <div style={{ display:'flex', justifyContent:'center', gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-card btn-3d"
                onClick={()=> setPwOpen(false)}
                style={{ fontSize: 11, display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 0 }}
              >
                닫기
              </button>
              <button
                className="btn btn-card btn-3d"
                onClick={doChangePw}
                aria-disabled={pwBusy ? true : undefined}
                style={{ fontSize: 11, display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 0 }}
              >
                {pwBusy ? '변경 중…' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
