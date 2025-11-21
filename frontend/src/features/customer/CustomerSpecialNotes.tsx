import React, { useEffect, useMemo, useState } from 'react'

type SpecialNote = {
  id: number
  noteTitle: string
  noteContent: string
  noteType?: string
  importanceLevel?: number
  createdBy: string
  createdAt: string
  updatedAt?: string | null
  updatedBy?: string | null
  createdByName?: string | null
  updatedByName?: string | null
}

type Props = {
  customerSeq: number
  customerId?: string
  empName?: string
}

const noteTypeOptions = [
  { value: 'Credit / Receivable', label: '신용·채권' },
  { value: 'Pricing / Terms', label: '가격·조건' },
  { value: 'Quality / Claim', label: '품질·클레임' },
  { value: 'Logistics / Delivery', label: '물류·납기' },
  { value: 'Contract / Legal', label: '계약·법무' },
  { value: 'Relationship / Strategic', label: '관계·전략' },
  { value: 'Operational', label: '운영 이슈' },
  { value: '기타', label: '기타' },
]

const getNoteTypeLabel = (type?: string) => {
  if (!type) return '미정'
  const option = noteTypeOptions.find((opt) => opt.value === type)
  return option?.label ?? type
}

const defaultFormState = {
  noteTitle: '',
  noteContent: '',
  noteType: '',
  importanceLevel: 1,
}

const formatShortDate = (value: string) => {
  try {
    const date = new Date(value)
    const yy = String(date.getFullYear()).slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${yy}-${mm}-${dd} ${hh}:${min}`
  } catch {
    return value
  }
}

const importanceLabel = (value?: number) => {
  if (value == null) return '중요도 미정'
  return ['하', '중', '상'][Math.min(Math.max(value, 0), 2)]
}

export function CustomerSpecialNotes({ customerSeq, customerId, empName }: Props) {
  const [notes, setNotes] = useState<SpecialNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState(() => ({ ...defaultFormState }))
  const [editingNote, setEditingNote] = useState<SpecialNote | null>(null)
  const loggedAssigneeId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('tnt.sales.assigneeId') ?? ''
  }, [])
  const [deleteTarget, setDeleteTarget] = useState<SpecialNote | null>(null)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [processingDelete, setProcessingDelete] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setError('고객 ID가 없어 특이사항을 불러올 수 없습니다.')
      setNotes([])
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/v1/customers/${customerId}/special-notes`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = await response.json()
        if (cancelled) return
        const list = Array.isArray(json) ? json : []
        list.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
        setNotes(list)
      } catch (err: any) {
        if (cancelled) return
        setError(err.message || '특이사항을 불러오지 못했습니다.')
        setNotes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [customerId, refreshTick])

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!customerId) return
    setCreating(true)
    setFormError(null)
    const isEditing = editingNote != null
    const actor = loggedAssigneeId || 'system'
    try {
      const payload: any = {
        customerId,
        customerSeq,
        noteTitle: formData.noteTitle.trim() || '특이사항',
        noteContent: formData.noteContent.trim(),
        noteType: formData.noteType || undefined,
        importanceLevel: formData.importanceLevel,
      }
      const url = isEditing
        ? `/api/v1/customers/${customerId}/special-notes/${editingNote!.id}`
        : `/api/v1/customers/${customerId}/special-notes`
      const method = isEditing ? 'PUT' : 'POST'
      if (isEditing) {
        payload.updatedBy = actor
      } else {
        payload.createdBy = actor
        payload.updatedBy = actor
      }
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => null)
        throw new Error(json?.error || `HTTP ${response.status}`)
      }
      closeForm()
      setRefreshTick((v) => v + 1)
    } catch (err: any) {
      setFormError(err.message || (isEditing ? '수정 중 오류가 발생했습니다.' : '등록 중 오류가 발생했습니다.'))
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (!showForm) return
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeForm()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [showForm])

  const resetForm = () => setFormData({ ...defaultFormState })

  const closeForm = () => {
    setShowForm(false)
    setEditingNote(null)
    resetForm()
    setFormError(null)
  }

  const openForm = (note?: SpecialNote) => {
    setEditingNote(note ?? null)
    setFormData({
      noteTitle: note?.noteTitle ?? '',
      noteContent: note?.noteContent ?? '',
      noteType: note?.noteType ?? '',
      importanceLevel: note?.importanceLevel ?? 1,
    })
    setFormError(null)
    setShowForm(true)
  }

  const handleDelete = (note: SpecialNote) => {
    setDeleteTarget(note)
  }

  const confirmDelete = async () => {
    if (!customerId || !deleteTarget) return
    const target = deleteTarget
    setFormError(null)
    setProcessingDelete(true)
    try {
      const actor = loggedAssigneeId || 'system'
      const response = await fetch(`/api/v1/customers/${customerId}/special-notes/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedBy: actor }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => null)
        throw new Error(json?.error || `HTTP ${response.status}`)
      }
      setAlertMessage('특이사항을 삭제했습니다.')
      setNotes((prev) => prev.filter((n) => n.id !== target.id))
      setRefreshTick((v) => v + 1)
    } catch (err: any) {
      setFormError(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setProcessingDelete(false)
      setDeleteTarget(null)
    }
  }

  useEffect(() => {
    if (!alertMessage) return
    const timer = window.setTimeout(() => setAlertMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [alertMessage])

  const importanceLevelClass = (level?: number) => {
    if (level == null) return 'unknown'
    if (level >= 2) return 'high'
    if (level === 1) return 'medium'
    return 'low'
  }

  return (
    <div className="special-notes">
      <header className="special-notes-header">
        <button className="btn btn-card btn-3d" type="button" onClick={() => openForm()}>
          신규
        </button>
      </header>

      {error ? (
        <div className="empty-state">{error}</div>
      ) : loading ? (
        <div className="empty-state">특이사항을 불러오는 중입니다…</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">등록된 특이사항이 없습니다.</div>
      ) : (
        <div className="special-notes-list">
          {notes.map((note) => (
            <article key={note.id} className="special-note-card">
              <div className="note-actions">
                <button
                  type="button"
                  className="note-edit-button"
                  aria-label="특이사항 수정"
                  onClick={() => openForm(note)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="note-delete-button"
                  aria-label="특이사항 삭제"
                  onClick={() => handleDelete(note)}
                >
                  🗑
                </button>
              </div>
              <div className="note-top">
                <span
                  className={`importance-dot level-${importanceLevelClass(note.importanceLevel)}`}
                  aria-label={`중요도 ${importanceLabel(note.importanceLevel)}`}
                >
                  {importanceLabel(note.importanceLevel)}
                </span>
                <div className="note-meta-info">
                <span className="note-type">{getNoteTypeLabel(note.noteType)}</span>
                  <strong className="note-date">{formatShortDate(note.updatedAt ?? note.createdAt)}</strong>
                </div>
              </div>
              <strong className="note-title">{note.noteTitle || '특이사항'}</strong>
              <p className="note-content">{note.noteContent}</p>
              <div className="special-note-meta">
                <span className="meta-pill">
                  <span className="meta-icon edit-icon" aria-hidden="true">
                    ✎
                  </span>
                  <span>수정자</span>
                  <strong>{note.updatedByName || note.updatedBy || '-'}</strong>
                </span>
                <span className="meta-pill">
                  <span className="meta-icon user-icon" aria-hidden="true">
                    👤
                  </span>
                  <span>등록자</span>
                  <strong>{note.createdByName || note.createdBy}</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="overlay-modal" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <button
              type="button"
              className="modal-close"
              aria-label="닫기"
              onClick={closeForm}
            >
              ×
            </button>
            <h4>특이사항 등록</h4>
            <form className="special-note-form" onSubmit={handleFormSubmit}>
              <label>
                <span>제목</span>
                <input
                  type="text"
                  value={formData.noteTitle}
                  onChange={(event) => setFormData((prev) => ({ ...prev, noteTitle: event.target.value }))}
                  placeholder="예: 신용이슈"
                  required
                />
              </label>
              <label>
                <span>유형</span>
                  <select
                    value={formData.noteType}
                    onChange={(event) => setFormData((prev) => ({ ...prev, noteType: event.target.value }))}
                  >
                    <option value="">선택 안 함</option>
                    {noteTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
              </label>
              <label>
                <span>중요도</span>
                <select
                  value={formData.importanceLevel}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, importanceLevel: Number(event.target.value) }))
                  }
                >
                  <option value={2}>상</option>
                  <option value={1}>중</option>
                  <option value={0}>하</option>
                </select>
              </label>
              <label>
                <span>내용</span>
                <textarea
                  value={formData.noteContent}
                  onChange={(event) => setFormData((prev) => ({ ...prev, noteContent: event.target.value }))}
                  rows={4}
                  required
                />
              </label>
              {formError ? <div className="empty-state">{formError}</div> : null}
              <footer>
                <button type="button" className="btn secondary" onClick={() => setShowForm(false)} disabled={creating}>
                  취소
                </button>
                <button type="submit" className="btn btn-card btn-3d" disabled={creating}>
                  {creating ? '등록 중…' : '등록'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="toast-message">
          <span>{alertMessage}</span>
          <button type="button" onClick={() => setAlertMessage(null)}>×</button>
        </div>
      )}

      {deleteTarget && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <p>
              <strong>{deleteTarget.noteTitle || '특이사항'}</strong>을(를) 삭제하시겠습니까?
              <br />
              삭제하면 되돌릴 수 없습니다.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn secondary" onClick={() => setDeleteTarget(null)} disabled={processingDelete}>
                취소
              </button>
              <button type="button" className="btn btn-card btn-3d" onClick={confirmDelete} disabled={processingDelete}>
                {processingDelete ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
)
}
