import React from 'react'

type Props = { children: React.ReactNode }

export function BackendGuard({ children }: Props) {
  const [ok, setOk] = React.useState<boolean>(true)
  const [msg, setMsg] = React.useState<string>('')

  React.useEffect(() => {
    let stop = false
    async function ping() {
      try {
        const r = await fetch('/api/v1/health/db', { cache: 'no-store' })
        const d = await r.json().catch(()=>({}))
        if (!stop) {
          if (r.ok && d && (d.status === 'UP' || d.query === 1)) { setOk(true); setMsg('') }
          else { setOk(false); setMsg(String(d?.error || '백엔드 연결 오류')) }
        }
      } catch (e:any) {
        if (!stop) { setOk(false); setMsg(String(e?.message || '백엔드 연결 오류')) }
      }
    }
    ping()
    const id = setInterval(ping, 5000)
    return () => { stop = true; clearInterval(id) }
  }, [])

  return (
    <>
      {!ok && (
        <div style={{ position:'sticky', top:0, zIndex:100, background:'#fee', color:'#b91c1c', border:'1px solid #fecaca', padding:'8px 12px', fontSize:12 }}>
          백엔드가 응답하지 않습니다. 재시도 중… {msg ? `(${msg})` : ''}
        </div>
      )}
      {children}
    </>
  )
}

