import React, { useEffect, useMemo, useState } from 'react'
import { useDraggableModal } from '../../ui/useDraggableModal'
import closeIcon from '../../assets/icons/close.svg'
import docIcon from '../../assets/icons/doc.svg'

type Strategy = {
  id: string
  strategyType: string
  title: string
  summary: string
  fileUrl?: string
}

export function SalesStrategyPanel() {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const years = useMemo(() => { const arr:number[] = []; for (let y=2030;y>=2025;y--) arr.push(y); return arr }, [])
  const [items, setItems] = useState<Strategy[]>([])
  const [openNew, setOpenNew] = useState(false)
  const [strategyType, setStrategyType] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const modal = useDraggableModal('sales-strategy-new', openNew, undefined, { persist: false, resetOnOpen: true })
  // ESC to close (modal open only)
  useEffect(() => {
    if (!openNew) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenNew(false) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [openNew])

  // Load list for selected year
  useEffect(() => {
    (async () => {
      try {
        const u = new URL('/api/v1/strategy', window.location.origin)
        u.searchParams.set('year', String(year))
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const arr = await r.json()
        const mapped: Strategy[] = Array.isArray(arr) ? arr.map((x:any) => ({
          id: String(x?.id ?? ''),
          strategyType: String(x?.strategy_type ?? x?.strategyType ?? ''),
          title: String(x?.title ?? ''),
          summary: String(x?.summary ?? ''),
          fileUrl: String(x?.file_url ?? x?.fileUrl ?? '') || undefined,
        })) : []
        setItems(mapped)
      } catch (e:any) { /* ignore for wireframe */ setItems([]) }
    })()
  }, [year])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true); setError(null)
      const payload = {
        year,
        strategyType,
        title,
        summary,
        fileUrl: `https://example.invalid/sharepoint/test/${year}/${encodeURIComponent(title||'strategy')}.pdf`,
      }
      const url = editingId ? `/api/v1/strategy/${encodeURIComponent(editingId)}` : '/api/v1/strategy'
      const method = editingId ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const x = await r.json()
      const it: Strategy = {
        id: String(x?.id || editingId || Date.now()),
        strategyType: String(x?.strategy_type ?? x?.strategyType ?? strategyType),
        title: String(x?.title ?? title),
        summary: String(x?.summary ?? summary),
        fileUrl: String(x?.file_url ?? x?.fileUrl ?? payload.fileUrl),
      }
      setItems(prev => {
        if (editingId) return prev.map(p => p.id === editingId ? it : p)
        return [it, ...prev]
      })
      setOpenNew(false); setStrategyType(''); setTitle(''); setSummary(''); setEditingId(null)
    } catch (err:any) {
      setError(err?.message || '저장 실패')
    } finally { setSaving(false) }
  }

  return (
    <section style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding: 8 }}>
        <strong>영업전략</strong>
        <div style={{ marginLeft: 'auto', display:'inline-flex', alignItems:'center', gap:8 }}>
          <span className="muted">연도</span>
          <select className="search-input" value={year} onChange={(e)=> setYear(Number(e.target.value))} aria-label="연도" style={{ height: 28 }}>
            {years.map(y=> <option key={y} value={String(y)}>{y}년</option>)}
          </select>
          <button
            className="btn btn-card btn-3d"
            onClick={() => { setEditingId(null); setStrategyType(''); setTitle(''); setSummary(''); setError(null); setOpenNew(true) }}
          >
            새 전략
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow:'auto', padding: 8 }}>
        {items.length === 0 ? (
          <div className="muted" style={{ padding: 8 }}>등록된 전략이 없습니다. “새 전략”을 눌러 추가하세요.</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(1, minmax(0, 1fr))', gap: 8 }}>
            {items.map(it => (
              <article key={it.id} className="card" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <span className="badge" aria-label="전략유형" title="전략유형" style={{ fontSize: 10 }}>{it.strategyType || '유형'}</span>
                  <div style={{ fontWeight: 700, fontSize: 12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.title || '(제목)'}</div>
                  <div style={{ marginLeft: 'auto', display:'inline-flex', alignItems:'center', gap:8 }}>
                    {it.fileUrl ? (
                      <a href={it.fileUrl} target="_blank" rel="noreferrer" className="btn-plain" title="열기" aria-label="열기">
                        <img src={docIcon} className="icon" alt="열기" />
                      </a>
                    ) : (
                      <span className="muted">링크없음</span>
                    )}
                    <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }}
                      onClick={() => { setEditingId(it.id); setStrategyType(it.strategyType); setTitle(it.title); setSummary(it.summary || ''); setOpenNew(true) }}
                    >수정</button>
                  </div>
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>{it.summary || ''}</div>
              </article>
            ))}
          </div>
        )}
      </div>

      {openNew && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:60 }}>
          <div ref={modal.ref} className="card" style={{ ...(modal.style as any), width: 624, maxWidth: '92vw', background:'var(--panel)', padding: 12, fontSize: 12 }}>
            <div {...modal.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" title="닫기" onClick={()=> setOpenNew(false)} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8 }}>
              <h2 style={{ margin:0 }}>{editingId ? '영업전략 수정' : '새 영업전략'}</h2>
            </div>
            <form onSubmit={onSubmit}>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap: 8, alignItems:'center' }}>
                <label className="muted">연도</label>
                <input className="search-input" value={`${year}`} readOnly />
                <label className="muted">전략유형</label>
                <select className="search-input" value={strategyType} onChange={(e)=> setStrategyType(e.target.value)} required aria-label="전략유형">
                  <option value="" disabled>선택</option>
                  <option value="제품전략">제품전략</option>
                  <option value="고객전략">고객전략</option>
                  <option value="경쟁전략">경쟁전략</option>
                  <option value="신사업">신사업</option>
                  <option value="채널전략">채널전략</option>
                </select>
                <label className="muted">제목</label>
                <input className="search-input" placeholder="전략 제목" value={title} onChange={(e)=> setTitle(e.target.value)} required />
                <label className="muted">내용요약</label>
                <textarea className="search-input" placeholder="간단한 요약" rows={12} style={{ minHeight: 180 }} value={summary} onChange={(e)=> setSummary(e.target.value)} />
                <label className="muted">파일</label>
                <input type="file" />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop: 12 }}>
                {error ? <span className="error" style={{ marginRight: 'auto' }}>{error}</span> : null}
                <button type="submit" className="btn btn-card btn-3d" disabled={saving}>{saving ? '저장중…' : '저장'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
