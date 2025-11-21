import React, { useEffect, useState } from 'react'

export function MobileLogin() {
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('tnt.sales.empId')
    if (saved) setEmpId(saved)
  }, [])

  async function doLogin() {
    setMsg(null)
    if (!empId.trim()) { setMsg('사번을 입력해 주세요'); return }
    if (!password) { setMsg('비밀번호를 입력해 주세요'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: empId.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && (data?.ok || data?.empId)) {
        const name = (data.empName && String(data.empName)) || ''
        const assigneeId = (data.assigneeId != null) ? String(data.assigneeId) : ''
        try {
          localStorage.setItem('tnt.sales.empId', empId.trim())
          if (name) localStorage.setItem('tnt.sales.empName', name)
          if (assigneeId) localStorage.setItem('tnt.sales.assigneeId', assigneeId)
        } catch {}
        setMsg(null)
        try { window.dispatchEvent(new CustomEvent('tnt.sales.login.changed', { detail: { loggedIn: true } }) as any) } catch {}
      } else {
        setMsg(data?.error || '로그인 실패')
      }
    } catch (e:any) {
      setMsg(e?.message || '로그인 중 오류가 발생했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden font-display">
      <div className="flex flex-col items-center justify-center grow p-6 sm:p-8">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8">
            <svg className="h-12 w-auto text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 6L42 16V36L24 46L6 36V16L24 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
              <path d="M24 26L42 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
              <path d="M6 16L24 26L6 36" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
              <path d="M24 46V26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
            </svg>
          </div>
          {/* Headline & Body Text */}
          <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold leading-tight text-center">Sales Hub Login</h1>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-normal text-center mt-2 mb-8">Sign in to access your dashboard.</p>

          <div className="w-full flex flex-col gap-4">
            {/* Employee ID Input */}
            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">Employee ID</p>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <div className="text-slate-500 dark:text-slate-400 flex border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>badge</span>
                </div>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 rounded-l-none text-base"
                  placeholder="Enter your employee ID"
                  type="text"
                  value={empId}
                  onChange={(e)=>setEmpId(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); doLogin() } }}
                />
              </div>
            </label>

            {/* Password Input */}
            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">Password</p>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <div className="text-slate-500 dark:text-slate-400 flex border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
                </div>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 rounded-l-none border-r-0 pr-2 text-base"
                  placeholder="Enter your password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); doLogin() } }}
                />
                <button
                  type="button"
                  className="text-slate-500 dark:text-slate-400 flex border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 items-center justify-center pr-4 rounded-r-lg border-l-0 cursor-pointer"
                  onClick={()=> setShowPw(v=>!v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </label>
          </div>

          {/* Error Message Area */}
          {msg && (
            <div className="w-full mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-500 text-sm text-center">{msg || 'Invalid Employee ID or Password.'}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            className="flex items-center justify-center w-full h-12 px-6 mt-6 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary"
            onClick={doLogin}
            disabled={busy}
          >
            {busy ? 'Signing In…' : 'Sign In'}
          </button>

          {/* Forgot Password Link (no-op) */}
          <a className="mt-4 text-primary text-sm font-medium leading-normal hover:underline" href="#" onClick={(e)=> e.preventDefault()}>Forgot Password?</a>
        </div>
      </div>
    </div>
  )
}
