import React, { useEffect, useState } from 'react'

type Emp = { key?:string; empId:string; empName:string; deptName:string }

export function SalesAssignRightPanel() {
  const [emp, setEmp] = useState<Emp | null>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedEmployee'); return raw ? JSON.parse(raw) : null } catch { return null }
  })

  useEffect(() => {
    const onSel = () => {
      try { const raw = localStorage.getItem('tnt.sales.selectedEmployee'); setEmp(raw ? JSON.parse(raw) : null) } catch { setEmp(null) }
    }
    window.addEventListener('tnt.sales.employee.selected' as any, onSel)
    return () => window.removeEventListener('tnt.sales.employee.selected' as any, onSel)
  }, [])

  return (
    <div className="card" style={{ padding: 12, height: '100%', overflow: 'auto' }}>
      <div className="pane-header" style={{ position: 'sticky', top: 0, zIndex: 1 }}>배정 상세</div>
      {!emp ? (
        <div className="empty-state">직원을 선택하세요</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 6, columnGap: 8, marginTop: 12 }}>
          <div className="muted">부서</div><div>{emp.deptName || ''}</div>
          <div className="muted">사번</div><div>{emp.empId || ''}</div>
          <div className="muted">이름</div><div>{emp.empName || ''}</div>
          <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 6 }}>배정 작업 (준비중)</div>
            <div className="empty-state">목표 배정 UI가 여기에 표시됩니다.</div>
          </div>
        </div>
      )}
    </div>
  )
}
