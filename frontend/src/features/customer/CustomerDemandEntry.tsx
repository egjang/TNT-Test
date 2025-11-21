import React, { useEffect, useMemo, useState } from 'react'
import { tone } from '../../ui/tone'
import { SubjectInput } from '../../components/SubjectInput'

type Props = {
  customerName?: string
  customerSeq: number
  empSeq?: number
  empName?: string
  onSuccess?: () => void
}

export function CustomerDemandEntry({ customerName, customerSeq, empSeq, empName, onSuccess }: Props) {
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [units, setUnits] = useState<string[]>([])

  const [subcategory, setSubcategory] = useState('')
  const [supplier, setSupplier] = useState('')
  const [unit, setUnit] = useState('')
  const [share, setShare] = useState<string>('')

  const [loading, setLoading] = useState({ subcats: false, suppliers: false, units: false, submit: false })
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadSubcats() {
      setLoading((p) => ({ ...p, subcats: true })); setError(null)
      try {
        const res = await fetch('/api/v1/supplier/subcategories')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setSubcategories(data || [])
      } catch (e: any) {
        setError(e.message || '중분류 목록을 불러오지 못했습니다')
      } finally {
        setLoading((p) => ({ ...p, subcats: false }))
      }
    }
    loadSubcats()
  }, [])

  useEffect(() => {
    setSupplier(''); setSuppliers([])
    setUnit(''); setUnits([])
    if (!subcategory) return
    async function loadSuppliers() {
      setLoading((p) => ({ ...p, suppliers: true })); setError(null)
      try {
        const q = new URLSearchParams({ subcategory })
        const res = await fetch(`/api/v1/supplier/names?${q.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setSuppliers(data || [])
      } catch (e: any) {
        setError(e.message || '공급사 목록을 불러오지 못했습니다')
      } finally {
        setLoading((p) => ({ ...p, suppliers: false }))
      }
    }
    loadSuppliers()
  }, [subcategory])

  useEffect(() => {
    setUnit(''); setUnits([])
    if (!subcategory || !supplier) return
    async function loadUnits() {
      setLoading((p) => ({ ...p, units: true })); setError(null)
      try {
        const q = new URLSearchParams({ subcategory, supplier })
        const res = await fetch(`/api/v1/supplier/units?${q.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setUnits(data || [])
      } catch (e: any) {
        setError(e.message || '영업관리단위를 불러오지 못했습니다')
      } finally {
        setLoading((p) => ({ ...p, units: false }))
      }
    }
    loadUnits()
  }, [subcategory, supplier])

  const shareHint = useMemo(() => {
    if (!share) return ''
    const n = Number(share)
    if (!isFinite(n)) return '숫자를 입력하세요'
    const p = n <= 1 ? n * 100 : n
    return tone.hint.sharePreview(p)
  }, [share])

  async function submit() {
    setOkMsg(null)
    setError(null)
    if (!subcategory || !supplier || !unit) { setError('중분류/공급사/영업관리단위를 선택하세요'); return }
    const v = Number(share)
    if (!isFinite(v) || v <= 0) { setError('점유율을 올바르게 입력하세요'); return }
    setLoading((p) => ({ ...p, submit: true }))
    try {
      const body = {
        customerSeq,
        customerName: customerName || undefined,
        empSeq: (empSeq && empSeq > 0) ? empSeq : undefined,
        empName: empName || undefined,
        itemSubcategory: subcategory,
        supplierName: supplier,
        salesMgmtUnit: unit,
        share: v,
      }
      const res = await fetch('/api/v1/demand/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setOkMsg('등록되었습니다')
      if (onSuccess) onSuccess()
    } catch (e: any) {
      setError(e.message || '등록 중 오류가 발생했습니다')
    } finally {
      setLoading((p) => ({ ...p, submit: false }))
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>수요등록</h3>
      <div className="card" style={{ padding: 12 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div className="field">
            <label>중분류</label>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
              <option value="">선택하세요</option>
              {subcategories.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {loading.subcats && <div className="muted" style={{ marginTop: 4 }}>불러오는 중…</div>}
          </div>
          <div className="field">
            <label>공급사</label>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={!subcategory || loading.suppliers}>
              <option value="">선택하세요</option>
              {suppliers.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>영업관리단위</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!subcategory || !supplier || loading.units}>
              <option value="">선택하세요</option>
              {units.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>점유율(%)</label>
            <SubjectInput
              value={share}
              onChange={(v) => setShare(v)}
              placeholder="예: 0.25 또는 25"
            />
            {shareHint && <div className="muted" style={{ marginTop: 4 }}>{shareHint}</div>}
          </div>
        </div>
        {error && <div className="error" style={{ marginTop: 8 }}>{error || tone.errorGeneric}</div>}
        {okMsg && <div className="muted" style={{ marginTop: 8 }}>{okMsg}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={submit} disabled={loading.submit}>
            {loading.submit ? tone.fetching : (customerName ? `${customerName}에 ${tone.action.register}` : tone.action.register)}
          </button>
        </div>
      </div>
    </section>
  )
}
