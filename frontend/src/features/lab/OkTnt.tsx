import { useState, useEffect } from 'react'
import { Plus, Edit2, X, Calendar, Target, Users, CheckCircle, Clock, ChevronRight, RefreshCw, Search, UserPlus, UserMinus, Star, TrendingUp, TrendingDown, Equal, DollarSign, Percent, Hash, CheckSquare, Trash2, User } from 'lucide-react'

type OkrCycle = {
  id: number
  cycleName: string
  cycleTypeCd: string
  startDate: string
  endDate: string
  statusCd: string
}

type OkrItem = {
  id: number
  okrCycleId: number
  parentOkrItemId: number | null
  ownerId: string
  ownerName?: string
  okrTypeCd: string // O: Objective, KR: Key Result, IN: Initiative
  okrTitle: string
  okrDescription: string
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  targetDirection: string | null // GTE: >=, EQ: =, LTE: <=
  progressRate: number | null
  statusCd: string
  children?: OkrItem[]
  members?: OkrMember[]
}

type OkrMember = {
  id?: number
  okrItemId?: number
  assigneeId: string
  empName: string
  deptSeq?: number
  deptName?: string
  okrRoleCd: string // OWNER, CONTRIBUTOR
}

type Employee = {
  emp_id: string
  emp_name: string
  dept_name: string
  assignee_id: string
}

export function OkTnt() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cycles' | 'okr' | 'okrtree' | 'approval' | 'evaluation'>('okr')
  const [cycles, setCycles] = useState<OkrCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<OkrCycle | null>(null)
  const [okrTree, setOkrTree] = useState<OkrItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [showOkrModal, setShowOkrModal] = useState(false)
  const [editingCycle, setEditingCycle] = useState<OkrCycle | null>(null)
  const [editingOkr, setEditingOkr] = useState<OkrItem | null>(null)
  const [parentOkr, setParentOkr] = useState<OkrItem | null>(null)

  // Form states
  const [cycleForm, setCycleForm] = useState({ cycleName: '', cycleTypeCd: 'QUARTER', startDate: '', endDate: '', statusCd: 'PREPARING' })
  const [okrForm, setOkrForm] = useState({ okrTypeCd: 'O', okrTitle: '', okrDescription: '', targetValue: '', currentValue: '', unit: 'PERCENT', targetDirection: 'GTE' })

  // Member assignment states
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedMembers, setSelectedMembers] = useState<OkrMember[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)

  // Approval states
  const [pendingItems, setPendingItems] = useState<OkrItem[]>([])
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalItem, setApprovalItem] = useState<OkrItem | null>(null)
  const [approvalComment, setApprovalComment] = useState('')

  // Evaluation states
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [evalItem, setEvalItem] = useState<OkrItem | null>(null)
  const [evalForm, setEvalForm] = useState({ score: 3, achievementRate: '', comment: '', evaluationTypeCd: 'SELF' })

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'cycle' | 'okr', id: number, name: string } | null>(null)

  // 상위 목표 (okr_member를 통해 조회)
  const [myMemberItems, setMyMemberItems] = useState<OkrItem[]>([])
  const [selectedParentItem, setSelectedParentItem] = useState<OkrItem | null>(null)
  // 내 목표에서 선택된 항목 (하위 목표 표시용)
  const [selectedMyItem, setSelectedMyItem] = useState<OkrItem | null>(null)

  // 목표설명 툴팁 상태
  const [descTooltip, setDescTooltip] = useState<{ x: number; y: number; title: string; description: string } | null>(null)

  // 3패널 선택 상태: 목표(O) 선택 시 해당 KR만, KR 선택 시 해당 IN만 표시
  const [selectedOItem, setSelectedOItem] = useState<OkrItem | null>(null)
  const [selectedKRItem, setSelectedKRItem] = useState<OkrItem | null>(null)

  const loggedInAssigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
  const loggedInEmpName = localStorage.getItem('tnt.sales.empName') || ''

  useEffect(() => {
    loadCycles()
    loadEmployees()
  }, [])

  useEffect(() => {
    if (selectedCycle) {
      loadOkrTree(selectedCycle.id)
      loadMyMemberItems(selectedCycle.id)
      if (activeTab === 'approval') {
        loadPendingApprovals()
      }
    }
  }, [selectedCycle, activeTab])

  // 측정단위 표시 변환 함수
  function getUnitLabel(unit: string | undefined): string {
    switch (unit) {
      case 'PERCENT': return '%'
      case 'AMOUNT': return '원'
      case 'COUNT': return '개'
      case 'BOOLEAN': return ''
      default: return unit || ''
    }
  }

  // 멤버 아바타 렌더링 함수
  function renderMemberAvatars(members: OkrMember[] | undefined, size: number = 22) {
    if (!members || members.length === 0) return null
    const colors = [
      { bg: '#3b82f6', text: 'white' },
      { bg: '#10b981', text: 'white' },
      { bg: '#f59e0b', text: 'white' },
      { bg: '#8b5cf6', text: 'white' },
      { bg: '#ef4444', text: 'white' },
      { bg: '#06b6d4', text: 'white' },
      { bg: '#ec4899', text: 'white' },
      { bg: '#84cc16', text: 'white' },
    ]
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {members.map((member, idx) => {
            const name = member.empName?.slice(-2) || '??'
            const color = colors[idx % colors.length]
            return (
              <div
                key={idx}
                title={member.empName}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: color.bg,
                  color: color.text,
                  fontSize: size * 0.4,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: idx > 0 ? -size * 0.27 : 0,
                  border: '2px solid white',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                {name}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderOwnerAvatar(ownerName: string | undefined, ownerId: string, size: number = 22) {
    const name = ownerName?.slice(-2) || ownerId?.slice(0, 2) || '??'
    return (
      <div
        title={ownerName || ownerId}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#64748b',
          color: 'white',
          fontSize: size * 0.4,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        {name}
      </div>
    )
  }

  async function loadCycles() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/okr/cycles')
      if (res.ok) {
        const data = await res.json()
        setCycles(data)
        if (data.length > 0 && !selectedCycle) {
          const active = data.find((c: OkrCycle) => c.statusCd === 'ACTIVE') || data[0]
          setSelectedCycle(active)
        }
      }
    } catch (e) {
      console.error('Failed to load cycles', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadEmployees() {
    try {
      const res = await fetch('/api/v1/employees?depts=all')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (e) {
      console.error('Failed to load employees', e)
    }
  }

  async function loadMembers(itemId: number) {
    try {
      const res = await fetch(`/api/v1/okr/items/${itemId}/members`)
      if (res.ok) {
        const data = await res.json()
        setSelectedMembers(data.map((m: any) => ({
          id: m.id,
          okrItemId: m.okrItemId,
          assigneeId: m.assigneeId,
          empName: m.empName,
          deptName: m.deptName,
          okrRoleCd: m.okrRoleCd || 'CONTRIBUTOR'
        })))
      }
    } catch (e) {
      console.error('Failed to load members', e)
    }
  }

  async function loadOkrTree(cycleId: number) {
    try {
      const res = await fetch(`/api/v1/okr/cycles/${cycleId}/tree`)
      if (res.ok) {
        const data: OkrItem[] = await res.json()
        // 각 아이템에 멤버 정보 로드
        const loadMembersRecursive = async (items: OkrItem[]): Promise<OkrItem[]> => {
          return Promise.all(items.map(async (item) => {
            try {
              const memberRes = await fetch(`/api/v1/okr/items/${item.id}/members`)
              if (memberRes.ok) {
                item.members = await memberRes.json()
              }
            } catch { /* ignore */ }
            if (item.children && item.children.length > 0) {
              item.children = await loadMembersRecursive(item.children)
            }
            return item
          }))
        }
        const treeWithMembers = await loadMembersRecursive(data)
        setOkrTree(treeWithMembers)
      }
    } catch (e) {
      console.error('Failed to load OKR tree', e)
    }
  }

  async function loadMyMemberItems(cycleId: number) {
    if (!loggedInAssigneeId) return
    try {
      const res = await fetch(`/api/v1/okr/cycles/${cycleId}/member-items?assigneeId=${loggedInAssigneeId}`)
      if (res.ok) {
        const data: OkrItem[] = await res.json()
        // 상위 목표만 필터링 (parent_okr_item_id가 없는 항목만)
        const topLevelItems = data.filter(item => !item.parentOkrItemId)
        // 각 아이템의 멤버 정보 로드
        const itemsWithMembers = await Promise.all(
          topLevelItems.map(async (item) => {
            try {
              const memberRes = await fetch(`/api/v1/okr/items/${item.id}/members`)
              if (memberRes.ok) {
                const members = await memberRes.json()
                return { ...item, members }
              }
            } catch {
              // ignore
            }
            return item
          })
        )
        setMyMemberItems(itemsWithMembers)
      }
    } catch (e) {
      console.error('Failed to load member items', e)
    }
  }

  async function saveCycle() {
    try {
      const body = {
        ...cycleForm,
        id: editingCycle?.id
      }
      const url = editingCycle ? `/api/v1/okr/cycles/${editingCycle.id}` : '/api/v1/okr/cycles'
      const res = await fetch(url, {
        method: editingCycle ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setShowCycleModal(false)
        setEditingCycle(null)
        setCycleForm({ cycleName: '', cycleTypeCd: 'QUARTER', startDate: '', endDate: '', statusCd: 'PREPARING' })
        loadCycles()
      }
    } catch (e) {
      console.error('Failed to save cycle', e)
    }
  }

  function openDeleteModal(type: 'cycle' | 'okr', id: number, name: string) {
    setDeleteTarget({ type, id, name })
    setShowDeleteModal(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      const url = deleteTarget.type === 'cycle'
        ? `/api/v1/okr/cycles/${deleteTarget.id}`
        : `/api/v1/okr/items/${deleteTarget.id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        setShowDeleteModal(false)
        setDeleteTarget(null)
        if (deleteTarget.type === 'cycle') {
          loadCycles()
        } else if (selectedCycle) {
          loadOkrTree(selectedCycle.id)
          loadMyMemberItems(selectedCycle.id)
        }
      } else {
        const text = await res.text()
        alert(text || '삭제 실패')
      }
    } catch (e) {
      console.error('Failed to delete', e)
      alert('삭제에 실패했습니다.')
    }
  }

  async function updateItemStatus(itemId: number, statusCd: string) {
    try {
      const res = await fetch(`/api/v1/okr/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusCd })
      })
      if (res.ok && selectedCycle) {
        loadOkrTree(selectedCycle.id)
        loadMyMemberItems(selectedCycle.id)
      } else {
        alert('상태 변경 실패')
      }
    } catch (e) {
      console.error('Failed to update status', e)
      alert('상태 변경에 실패했습니다.')
    }
  }

  async function saveOkr() {
    if (!selectedCycle) {
      alert('사이클을 먼저 선택해주세요.')
      return
    }
    if (!okrForm.okrTitle.trim()) {
      alert('목표명을 입력해주세요.')
      return
    }
    try {
      const body = {
        item: {
          id: editingOkr?.id,
          okrCycleId: selectedCycle.id,
          parentOkrItemId: parentOkr?.id || null,
          ownerId: loggedInAssigneeId || 'system',
          okrTypeCd: okrForm.okrTypeCd,
          okrTitle: okrForm.okrTitle,
          okrDescription: okrForm.okrDescription,
          targetValue: okrForm.targetValue ? parseFloat(okrForm.targetValue) : null,
          currentValue: okrForm.currentValue ? parseFloat(okrForm.currentValue) : null,
          unit: okrForm.unit || null,
          targetDirection: okrForm.targetDirection || null,
          statusCd: 'DRAFT'
        },
        members: selectedMembers.map(m => ({
          assigneeId: m.assigneeId,
          empName: m.empName,
          deptName: m.deptName,
          okrRoleCd: m.okrRoleCd
        }))
      }
      const res = await fetch(editingOkr ? `/api/v1/okr/items/${editingOkr.id}` : '/api/v1/okr/items', {
        method: editingOkr ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setShowOkrModal(false)
        setEditingOkr(null)
        setParentOkr(null)
        setOkrForm({ okrTypeCd: 'O', okrTitle: '', okrDescription: '', targetValue: '', currentValue: '', unit: 'PERCENT', targetDirection: 'GTE' })
        setSelectedMembers([])
        setMemberSearch('')
        loadOkrTree(selectedCycle.id)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert('저장 실패: ' + (errorData.error || res.statusText))
      }
    } catch (e) {
      console.error('Failed to save OKR', e)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  function openEditCycle(cycle: OkrCycle) {
    setEditingCycle(cycle)
    setCycleForm({
      cycleName: cycle.cycleName,
      cycleTypeCd: cycle.cycleTypeCd,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      statusCd: cycle.statusCd
    })
    setShowCycleModal(true)
  }

  function openAddOkr(parent?: OkrItem, forceType?: 'O' | 'KR' | 'IN') {
    setEditingOkr(null)
    // 선택된 상위목표가 있으면 그것을 사용, 없으면 전달받은 parent 사용
    const effectiveParent = parent || selectedParentItem
    setParentOkr(effectiveParent || null)

    // 타입 결정: forceType이 있으면 그것 사용, 없으면 부모 타입에 따라 결정
    let defaultType: 'O' | 'KR' | 'IN' = 'O'
    if (forceType) {
      defaultType = forceType
    } else if (effectiveParent) {
      // O의 하위는 KR, KR의 하위는 IN
      defaultType = effectiveParent.okrTypeCd === 'O' ? 'KR' : 'IN'
    }

    setOkrForm({ okrTypeCd: defaultType, okrTitle: '', okrDescription: '', targetValue: '', currentValue: '', unit: 'PERCENT', targetDirection: 'GTE' })
    setSelectedMembers([])
    setMemberSearch('')
    setShowMemberDropdown(false)
    setShowOkrModal(true)
  }

  async function openEditOkr(okr: OkrItem) {
    setEditingOkr(okr)
    // 수정 시 상위 목표 찾기
    if (okr.parentOkrItemId) {
      const allItems = flattenOkrTree(okrTree)
      const parent = allItems.find(item => item.id === okr.parentOkrItemId)
      setParentOkr(parent || null)
    } else {
      setParentOkr(null)
    }
    setOkrForm({
      okrTypeCd: okr.okrTypeCd,
      okrTitle: okr.okrTitle,
      okrDescription: okr.okrDescription || '',
      targetValue: okr.targetValue?.toString() || '',
      currentValue: okr.currentValue?.toString() || '',
      unit: okr.unit || 'PERCENT',
      targetDirection: okr.targetDirection || 'GTE'
    })
    setSelectedMembers([])
    setMemberSearch('')
    setShowMemberDropdown(false)
    setShowOkrModal(true)
    // Load existing members
    await loadMembers(okr.id)
  }

  function addMember(emp: Employee) {
    if (selectedMembers.some(m => m.assigneeId === emp.assignee_id)) return
    setSelectedMembers([...selectedMembers, {
      assigneeId: emp.assignee_id,
      empName: emp.emp_name,
      deptName: emp.dept_name,
      okrRoleCd: 'CONTRIBUTOR'
    }])
    setMemberSearch('')
    setShowMemberDropdown(false)
  }

  function removeMember(assigneeId: string) {
    setSelectedMembers(selectedMembers.filter(m => m.assigneeId !== assigneeId))
  }

  function updateMemberRole(assigneeId: string, role: string) {
    setSelectedMembers(selectedMembers.map(m =>
      m.assigneeId === assigneeId ? { ...m, okrRoleCd: role } : m
    ))
  }

  const filteredEmployees = employees.filter(emp =>
    (emp.emp_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
     emp.dept_name?.toLowerCase().includes(memberSearch.toLowerCase())) &&
    !selectedMembers.some(m => m.assigneeId === emp.assignee_id)
  ).slice(0, 10)

  // Approval functions
  async function loadPendingApprovals() {
    if (!selectedCycle) return
    try {
      const res = await fetch(`/api/v1/okr/cycles/${selectedCycle.id}/pending-approvals`)
      if (res.ok) {
        const data = await res.json()
        setPendingItems(data)
      }
    } catch (e) {
      console.error('Failed to load pending approvals', e)
    }
  }

  async function submitForApproval(itemId: number) {
    try {
      const res = await fetch(`/api/v1/okr/items/${itemId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId: loggedInAssigneeId, comment: '승인 요청' })
      })
      if (res.ok) {
        if (selectedCycle) {
          loadOkrTree(selectedCycle.id)
          loadPendingApprovals()
        }
      }
    } catch (e) {
      console.error('Failed to submit for approval', e)
    }
  }

  async function handleApprove() {
    if (!approvalItem) return
    try {
      const res = await fetch(`/api/v1/okr/items/${approvalItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId: loggedInAssigneeId, comment: approvalComment || '승인' })
      })
      if (res.ok) {
        setShowApprovalModal(false)
        setApprovalItem(null)
        setApprovalComment('')
        if (selectedCycle) {
          loadOkrTree(selectedCycle.id)
          loadPendingApprovals()
        }
      }
    } catch (e) {
      console.error('Failed to approve', e)
    }
  }

  async function handleReject() {
    if (!approvalItem) return
    try {
      const res = await fetch(`/api/v1/okr/items/${approvalItem.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId: loggedInAssigneeId, comment: approvalComment || '반려' })
      })
      if (res.ok) {
        setShowApprovalModal(false)
        setApprovalItem(null)
        setApprovalComment('')
        if (selectedCycle) {
          loadOkrTree(selectedCycle.id)
          loadPendingApprovals()
        }
      }
    } catch (e) {
      console.error('Failed to reject', e)
    }
  }

  function openApprovalModal(item: OkrItem) {
    setApprovalItem(item)
    setApprovalComment('')
    setShowApprovalModal(true)
  }

  // Evaluation functions
  function openEvalModal(item: OkrItem, typeCd: string) {
    setEvalItem(item)
    setEvalForm({ score: 3, achievementRate: '', comment: '', evaluationTypeCd: typeCd })
    setShowEvalModal(true)
  }

  async function saveEvaluation() {
    if (!evalItem) return
    try {
      const res = await fetch(`/api/v1/okr/items/${evalItem.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorId: loggedInAssigneeId,
          evaluationTypeCd: evalForm.evaluationTypeCd,
          score: evalForm.score,
          achievementRate: evalForm.achievementRate ? parseFloat(evalForm.achievementRate) : null,
          comment: evalForm.comment
        })
      })
      if (res.ok) {
        setShowEvalModal(false)
        setEvalItem(null)
        setEvalForm({ score: 3, achievementRate: '', comment: '', evaluationTypeCd: 'SELF' })
      }
    } catch (e) {
      console.error('Failed to save evaluation', e)
    }
  }

  // Helper to flatten OKR tree
  function flattenOkrTree(items: OkrItem[]): OkrItem[] {
    const result: OkrItem[] = []
    items.forEach(item => {
      result.push(item)
      if (item.children) {
        result.push(...flattenOkrTree(item.children))
      }
    })
    return result
  }

  // Get evaluable items (IN_PROGRESS or COMPLETED)
  const evaluableItems = okrTree.flatMap(item => {
    const items: OkrItem[] = []
    if (['IN_PROGRESS', 'COMPLETED'].includes(item.statusCd)) {
      items.push(item)
    }
    if (item.children) {
      items.push(...item.children.filter(c => ['IN_PROGRESS', 'COMPLETED'].includes(c.statusCd)))
    }
    return items
  })

  const statusColors: Record<string, string> = {
    PREPARING: '#f59e0b',
    ACTIVE: '#10b981',
    CLOSED: '#6b7280',
    DRAFT: '#94a3b8',
    NOT_STARTED: '#3b82f6',
    IN_PROGRESS: '#10b981',
    COMPLETED: '#8b5cf6'
  }

  const statusLabels: Record<string, string> = {
    PREPARING: '준비중',
    ACTIVE: '진행중',
    CLOSED: '종료',
    DRAFT: '초안',
    NOT_STARTED: '시작전',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료'
  }

  const cycleTypeLabels: Record<string, string> = {
    QUARTER: '분기',
    HALF: '반기',
    YEAR: '연간'
  }

  // Dashboard stats
  const totalObjectives = okrTree.length
  const totalKRs = okrTree.reduce((acc, o) => acc + (o.children?.length || 0), 0)
  const avgProgress = okrTree.length > 0
    ? Math.round(okrTree.reduce((acc, o) => acc + (o.progressRate || 0), 0) / okrTree.length)
    : 0

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>OKR TNT</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>OKR 목표 관리 시스템</p>
        </div>
        {loggedInEmpName && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {loggedInEmpName}님 환영합니다
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {[
          { key: 'dashboard', label: '대시보드', icon: Target, disabled: true },
          { key: 'cycles', label: '사이클 관리', icon: Calendar, disabled: false },
          { key: 'okr', label: 'OKR 관리', icon: CheckCircle, disabled: false },
          { key: 'okrtree', label: 'Company OKR (Tree)', icon: ChevronRight, disabled: false },
          { key: 'approval', label: '승인 관리', icon: Users, disabled: true },
          { key: 'evaluation', label: '평가', icon: Star, disabled: true }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && setActiveTab(tab.key as any)}
            disabled={tab.disabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 6,
              background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
              color: tab.disabled ? '#9ca3af' : activeTab === tab.key ? '#fff' : 'var(--text)',
              border: 'none',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              opacity: tab.disabled ? 0.6 : 1
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.disabled && <span style={{ fontSize: 10, marginLeft: 2 }}>(준비중)</span>}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Cycle Selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>현재 사이클</label>
            <select
              value={selectedCycle?.id || ''}
              onChange={e => {
                const c = cycles.find(c => c.id === parseInt(e.target.value))
                if (c) setSelectedCycle(c)
              }}
              style={{
                padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 200
              }}
            >
              {cycles.map(c => (
                <option key={c.id} value={c.id}>{c.cycleName}</option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>목표(O)</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{totalObjectives}</div>
            </div>
            <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>핵심결과(KR)</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{totalKRs}</div>
            </div>
            <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>평균 달성률</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>{avgProgress}%</div>
            </div>
            <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>사이클 상태</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: statusColors[selectedCycle?.statusCd || 'PREPARING']
                }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {statusLabels[selectedCycle?.statusCd || 'PREPARING']}
                </span>
              </div>
            </div>
          </div>

          {/* Status Distribution & My OKR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Status Distribution */}
            <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>상태별 분포</h3>
              {(() => {
                const allItems = flattenOkrTree(okrTree)
                const statusCount: Record<string, number> = {}
                allItems.forEach(item => {
                  statusCount[item.statusCd] = (statusCount[item.statusCd] || 0) + 1
                })
                const total = allItems.length || 1
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(statusLabels).map(([key, label]) => {
                      const count = statusCount[key] || 0
                      const percent = Math.round((count / total) * 100)
                      return (
                        <div key={key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[key] }} />
                              {label}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{count}개 ({percent}%)</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percent}%`, background: statusColors[key], borderRadius: 3 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* My OKR */}
            <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>내 OKR</h3>
              {(() => {
                const allItems = flattenOkrTree(okrTree)
                const myItems = allItems.filter(item => item.ownerId === loggedInAssigneeId)
                if (myItems.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
                      담당 OKR이 없습니다.
                    </div>
                  )
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflow: 'auto' }}>
                    {myItems.map(item => (
                      <div key={item.id} style={{ padding: 12, background: 'var(--panel)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                            background: item.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
                            color: item.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
                          }}>{item.okrTypeCd}</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{item.okrTitle}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.progressRate || 0}%`, background: '#8b5cf6', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.progressRate || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* OKR Tree Preview */}
          <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>전체 OKR 현황</h3>
              <button
                onClick={() => selectedCycle && loadOkrTree(selectedCycle.id)}
                style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {okrTree.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                등록된 OKR이 없습니다. OKR 관리 탭에서 목표를 추가해주세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {okrTree.map(obj => (
                  <OkrTreeItem key={obj.id} item={obj} level={0} statusColors={statusColors} statusLabels={statusLabels} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>사이클 목록</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingCycle(null)
                setCycleForm({ cycleName: '', cycleTypeCd: 'QUARTER', startDate: '', endDate: '', statusCd: 'PREPARING' })
                setShowCycleModal(true)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> 사이클 추가
            </button>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)' }}>사이클명</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)' }}>유형</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)' }}>기간</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)' }}>상태</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)', width: 100 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map(cycle => (
                  <tr key={cycle.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{cycle.cycleName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{cycleTypeLabels[cycle.cycleTypeCd] || cycle.cycleTypeCd}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{cycle.startDate} ~ {cycle.endDate}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 12, fontSize: 12,
                        background: `${statusColors[cycle.statusCd]}20`,
                        color: statusColors[cycle.statusCd]
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[cycle.statusCd] }} />
                        {statusLabels[cycle.statusCd]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => openEditCycle(cycle)}
                        style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        title="수정"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal('cycle', cycle.id, cycle.cycleName)}
                        style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {cycles.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      등록된 사이클이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OKR Tab */}
      {activeTab === 'okr' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>OKR 관리</h2>
              <select
                value={selectedCycle?.id || ''}
                onChange={e => {
                  const c = cycles.find(c => c.id === parseInt(e.target.value))
                  if (c) setSelectedCycle(c)
                }}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: 13
                }}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>{c.cycleName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3열 레이아웃: 좌측 상위 목표, 중앙 핵심결과, 우측 실행과제 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* 좌측: 상위 목표 (전체 O 타입 표시) */}
            <div style={{
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: 16,
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} style={{ color: '#3b82f6' }} />
                  목표 (Objectives)
                </h3>
                <button
                  className="btn btn-primary"
                  onClick={() => openAddOkr(undefined, 'O')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    padding: '4px 10px', fontSize: 10, fontWeight: 600, minWidth: 70,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none', borderRadius: 12, color: '#fff',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(59, 130, 246, 0.4)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <Plus size={10} /> 목표 추가
                </button>
              </div>
              {okrTree.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>
                  등록된 목표가 없습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {okrTree.map(item => {
                    const isOwner = item.ownerId === loggedInAssigneeId
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: 10,
                          background: selectedOItem?.id === item.id ? '#dbeafe' : 'white',
                          borderRadius: 8,
                          border: selectedOItem?.id === item.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          setSelectedOItem(selectedOItem?.id === item.id ? null : item)
                          setSelectedKRItem(null) // O 선택 변경 시 KR 선택 해제
                        }}
                        onMouseEnter={(e) => {
                          if (item.okrDescription) {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setDescTooltip({ x: rect.right + 10, y: rect.top, title: item.okrTitle, description: item.okrDescription })
                          }
                        }}
                        onMouseLeave={() => setDescTooltip(null)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                            background: '#3b82f620',
                            color: '#3b82f6'
                          }}>O</span>
                          <span style={{ fontWeight: 500, fontSize: 12, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.okrTitle}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                          {renderOwnerAvatar(item.ownerName, item.ownerId, 20)}
                          {item.members && item.members.length > 0 && (
                            <div>{renderMemberAvatars(item.members, 20)}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <button
                            onClick={() => openAddOkr(item, 'KR')}
                            style={{
                              padding: '4px 10px',
                              fontSize: 10,
                              fontWeight: 600,
                              minWidth: 70,
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: 'none',
                              borderRadius: 12,
                              cursor: 'pointer',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 3,
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)'
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(16, 185, 129, 0.4)'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <Plus size={10} /> KR 추가
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isOwner ? (
                              <select
                                value={item.statusCd}
                                onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                style={{
                                  padding: '2px 6px', borderRadius: 10, fontSize: 9,
                                  background: `${statusColors[item.statusCd]}15`,
                                  color: statusColors[item.statusCd],
                                  border: `1px solid ${statusColors[item.statusCd]}30`,
                                  cursor: 'pointer', fontWeight: 600, outline: 'none'
                                }}
                              >
                                <option value="DRAFT">초안</option>
                                <option value="IN_PROGRESS">진행중</option>
                                <option value="COMPLETED">완료</option>
                              </select>
                            ) : (
                              <span style={{
                                padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 500,
                                background: `${statusColors[item.statusCd]}15`,
                                color: statusColors[item.statusCd]
                              }}>{statusLabels[item.statusCd]}</span>
                            )}
                            <button
                              onClick={() => isOwner && openEditOkr(item)}
                              disabled={!isOwner}
                              style={{ padding: 2, background: 'transparent', border: 'none', cursor: isOwner ? 'pointer' : 'not-allowed', color: isOwner ? 'var(--text-secondary)' : '#d1d5db', opacity: isOwner ? 1 : 0.5 }}
                              title={isOwner ? "수정" : "소유자만 수정 가능"}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => isOwner && openDeleteModal('okr', item.id, item.okrTitle)}
                              disabled={!isOwner}
                              style={{ padding: 2, background: 'transparent', border: 'none', cursor: isOwner ? 'pointer' : 'not-allowed', color: isOwner ? '#ef4444' : '#fca5a5', opacity: isOwner ? 1 : 0.5 }}
                              title={isOwner ? "삭제" : "소유자만 삭제 가능"}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 중앙: 핵심결과 (Key Results) - 선택된 O의 KR만 표시 */}
            {(() => {
              const allItems = flattenOkrTree(okrTree)
              // 선택된 O가 있으면 해당 O의 KR만, 없으면 모든 KR 표시
              const myKRItems = allItems.filter(item =>
                item.okrTypeCd === 'KR' &&
                (item.ownerId === loggedInAssigneeId || item.members?.some(m => m.assigneeId === loggedInAssigneeId)) &&
                (selectedOItem ? item.parentOkrItemId === selectedOItem.id : true)
              )

              return (
                <div style={{
                  background: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: 12,
                  border: '1px solid #a7f3d0',
                  padding: 20,
                  maxHeight: 'calc(100vh - 280px)',
                  overflowY: 'auto'
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={14} style={{ color: '#10b981' }} />
                      핵심결과 (Key Results)
                    </h3>
                  </div>
              {(() => {
                if (myKRItems.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontSize: 13 }}>
                      내가 담당하는 핵심결과가 없습니다.
                    </div>
                  )
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {myKRItems.map(item => {
                      const isOwner = item.ownerId === loggedInAssigneeId
                      const parentO = allItems.find(o => o.id === item.parentOkrItemId)
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: 10,
                            background: selectedKRItem?.id === item.id ? '#d1fae5' : 'white',
                            borderRadius: 8,
                            border: selectedKRItem?.id === item.id ? '2px solid #10b981' : '1px solid #a7f3d0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setSelectedKRItem(selectedKRItem?.id === item.id ? null : item)}
                          onMouseEnter={(e) => {
                            if (item.okrDescription) {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setDescTooltip({ x: rect.left, y: rect.bottom + 10, title: item.okrTitle, description: item.okrDescription })
                            }
                          }}
                          onMouseLeave={() => setDescTooltip(null)}
                        >
                          {parentO && (
                            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#3b82f6', fontWeight: 600 }}>O</span> {parentO.okrTitle}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{
                              padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                              background: '#10b98120',
                              color: '#10b981'
                            }}>KR</span>
                            <span style={{ fontWeight: 500, fontSize: 12, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.okrTitle}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            {renderOwnerAvatar(item.ownerName, item.ownerId, 20)}
                            {item.members && item.members.length > 0 && (
                              <div>{renderMemberAvatars(item.members, 20)}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <button
                              onClick={() => openAddOkr(item, 'IN')}
                              style={{
                                padding: '4px 10px',
                                fontSize: 10,
                                fontWeight: 600,
                                minWidth: 70,
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                border: 'none',
                                borderRadius: 12,
                                cursor: 'pointer',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 3,
                                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 3px 8px rgba(139, 92, 246, 0.4)'
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)'
                              }}
                            >
                              <Plus size={10} /> 과제 추가
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {isOwner ? (
                                <select
                                  value={item.statusCd}
                                  onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                  style={{
                                    padding: '2px 6px', borderRadius: 10, fontSize: 9,
                                    background: `${statusColors[item.statusCd]}15`,
                                    color: statusColors[item.statusCd],
                                    border: `1px solid ${statusColors[item.statusCd]}30`,
                                    cursor: 'pointer', fontWeight: 600, outline: 'none'
                                  }}
                                >
                                  <option value="DRAFT">초안</option>
                                  <option value="IN_PROGRESS">진행중</option>
                                  <option value="COMPLETED">완료</option>
                                </select>
                              ) : (
                                <span style={{
                                  padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 500,
                                  background: `${statusColors[item.statusCd]}15`,
                                  color: statusColors[item.statusCd]
                                }}>{statusLabels[item.statusCd]}</span>
                              )}
                              <button
                                onClick={() => isOwner && openEditOkr(item)}
                                disabled={!isOwner}
                                style={{ padding: 2, background: 'transparent', border: 'none', cursor: isOwner ? 'pointer' : 'not-allowed', color: isOwner ? 'var(--text-secondary)' : '#d1d5db', opacity: isOwner ? 1 : 0.5 }}
                                title={isOwner ? "수정" : "소유자만 수정 가능"}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => isOwner && openDeleteModal('okr', item.id, item.okrTitle)}
                                disabled={!isOwner}
                                style={{ padding: 2, background: 'transparent', border: 'none', cursor: isOwner ? 'pointer' : 'not-allowed', color: isOwner ? '#ef4444' : '#fca5a5', opacity: isOwner ? 1 : 0.5 }}
                                title={isOwner ? "삭제" : "소유자만 삭제 가능"}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
                </div>
              )
            })()}

            {/* 우측: 실행과제 (Initiatives) - 선택된 KR의 IN만 표시 */}
            {(() => {
              const allItems = flattenOkrTree(okrTree)
              // 선택된 KR이 있으면 해당 KR의 IN만, 없으면 모든 IN 표시
              const myINItems = allItems.filter(item =>
                item.okrTypeCd === 'IN' &&
                (item.ownerId === loggedInAssigneeId || item.members?.some(m => m.assigneeId === loggedInAssigneeId)) &&
                (selectedKRItem ? item.parentOkrItemId === selectedKRItem.id : true)
              )

              return (
                <div style={{
                  background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
                  borderRadius: 12,
                  border: '1px solid #ddd6fe',
                  padding: 16,
                  maxHeight: 'calc(100vh - 280px)',
                  overflowY: 'auto'
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckSquare size={14} style={{ color: '#8b5cf6' }} />
                      실행과제 (Initiatives)
                    </h3>
                  </div>
                  {myINItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>
                      내가 담당하는 실행과제가 없습니다.
                    </div>
                  ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myINItems.map(item => {
                    const isOwner = item.ownerId === loggedInAssigneeId
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: 10,
                          background: 'white',
                          borderRadius: 8,
                          border: '1px solid #ddd6fe',
                          cursor: item.okrDescription ? 'pointer' : 'default'
                        }}
                        onMouseEnter={(e) => {
                          if (item.okrDescription) {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setDescTooltip({ x: rect.left - 200, y: rect.top, title: item.okrTitle, description: item.okrDescription })
                          }
                        }}
                        onMouseLeave={() => setDescTooltip(null)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                            background: '#8b5cf620',
                            color: '#8b5cf6'
                          }}>IN</span>
                          <span style={{ fontWeight: 500, fontSize: 12, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.okrTitle}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                          {renderOwnerAvatar(item.ownerName, item.ownerId, 18)}
                          {item.members && item.members.length > 0 && (
                            <div>{renderMemberAvatars(item.members, 18)}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isOwner ? (
                              <select
                                value={item.statusCd}
                                onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                style={{
                                  padding: '2px 6px', borderRadius: 10, fontSize: 9,
                                  background: `${statusColors[item.statusCd]}15`,
                                  color: statusColors[item.statusCd],
                                  border: `1px solid ${statusColors[item.statusCd]}30`,
                                  cursor: 'pointer', fontWeight: 600, outline: 'none'
                                }}
                              >
                                <option value="DRAFT">초안</option>
                                <option value="IN_PROGRESS">진행중</option>
                                <option value="COMPLETED">완료</option>
                              </select>
                            ) : (
                              <span style={{
                                padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 500,
                                background: `${statusColors[item.statusCd]}15`,
                                color: statusColors[item.statusCd]
                              }}>{statusLabels[item.statusCd]}</span>
                            )}
                            <button
                              onClick={() => isOwner && openEditOkr(item)}
                              disabled={!isOwner}
                              style={{ padding: 2, background: 'transparent', border: 'none', cursor: isOwner ? 'pointer' : 'not-allowed', color: isOwner ? 'var(--text-secondary)' : '#d1d5db', opacity: isOwner ? 1 : 0.5 }}
                              title={isOwner ? "수정" : "소유자만 수정 가능"}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => isOwner && openDeleteModal('okr', item.id, item.okrTitle)}
                              disabled={!isOwner}
                              style={{ padding: 2, background: 'transparent', border: 'none', cursor: isOwner ? 'pointer' : 'not-allowed', color: isOwner ? '#ef4444' : '#fca5a5', opacity: isOwner ? 1 : 0.5 }}
                              title={isOwner ? "삭제" : "소유자만 삭제 가능"}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* OKR Tree Tab */}
      {activeTab === 'okrtree' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>OKR Tree</h2>
              <select
                value={selectedCycle?.id || ''}
                onChange={e => {
                  const c = cycles.find(c => c.id === parseInt(e.target.value))
                  if (c) setSelectedCycle(c)
                }}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: 13
                }}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>{c.cycleName}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => selectedCycle && loadOkrTree(selectedCycle.id)}
              style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Full OKR Tree */}
          <div style={{ background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            {okrTree.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                등록된 OKR이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {okrTree.map(item => (
                  <FullOkrTreeNode key={item.id} item={item} level={0} onEdit={openEditOkr} loggedInAssigneeId={loggedInAssigneeId} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Tab */}
      {activeTab === 'approval' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>승인 대기 목록</h2>
              <select
                value={selectedCycle?.id || ''}
                onChange={e => {
                  const c = cycles.find(c => c.id === parseInt(e.target.value))
                  if (c) setSelectedCycle(c)
                }}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: 13
                }}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>{c.cycleName}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadPendingApprovals}
              style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* My Draft OKRs - Submit for Approval */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>내 초안 OKR (승인 요청 가능)</h3>
            <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {okrTree.filter(item => item.statusCd === 'DRAFT' && item.ownerId === loggedInAssigneeId).length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  승인 요청 가능한 초안 OKR이 없습니다.
                </div>
              ) : (
                okrTree.filter(item => item.statusCd === 'DRAFT' && item.ownerId === loggedInAssigneeId).map(item => (
                  <div key={item.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: '#3b82f620', color: '#3b82f6'
                    }}>O</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{item.okrTitle}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                      background: `${statusColors[item.statusCd]}20`,
                      color: statusColors[item.statusCd]
                    }}>{statusLabels[item.statusCd]}</span>
                    <button
                      onClick={() => submitForApproval(item.id)}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      승인 요청
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Approval Items */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>승인 대기 중인 OKR</h3>
            <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {pendingItems.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Clock size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p>승인 대기 중인 OKR이 없습니다.</p>
                </div>
              ) : (
                pendingItems.map(item => (
                  <div key={item.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: item.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
                      color: item.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
                    }}>{item.okrTypeCd}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{item.okrTitle}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>작성자: {item.ownerName || item.ownerId}</div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                      background: '#f59e0b20', color: '#f59e0b'
                    }}>승인대기</span>
                    <button
                      onClick={() => openApprovalModal(item)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      검토
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Tab */}
      {activeTab === 'evaluation' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>OKR 평가</h2>
              <select
                value={selectedCycle?.id || ''}
                onChange={e => {
                  const c = cycles.find(c => c.id === parseInt(e.target.value))
                  if (c) setSelectedCycle(c)
                }}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: 13
                }}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>{c.cycleName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {evaluableItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Star size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>평가 가능한 OKR이 없습니다.</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>진행중 또는 완료된 OKR만 평가할 수 있습니다.</p>
              </div>
            ) : (
              evaluableItems.map(item => (
                <div key={item.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: item.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
                      color: item.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
                    }}>{item.okrTypeCd}</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{item.okrTitle}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                      background: `${statusColors[item.statusCd]}20`,
                      color: statusColors[item.statusCd]
                    }}>{statusLabels[item.statusCd]}</span>
                  </div>

                  {item.okrTypeCd === 'KR' && item.targetValue && (
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        진행률: {item.currentValue || 0} / {item.targetValue} {getUnitLabel(item.unit)}
                      </span>
                      <div style={{ flex: 1, maxWidth: 150, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(item.progressRate || 0, 100)}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{item.progressRate || 0}%</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => openEvalModal(item, 'SELF')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Star size={14} />
                      자기 평가
                    </button>
                    <button
                      onClick={() => openEvalModal(item, 'MANAGER')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Star size={14} />
                      상사 평가
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cycle Modal */}
      {showCycleModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}
          onClick={() => setShowCycleModal(false)}
        >
          <div
            style={{
              background: 'var(--panel)', borderRadius: 12, padding: 24,
              minWidth: 400, maxWidth: '90vw', border: '1px solid var(--border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>{editingCycle ? '사이클 수정' : '사이클 추가'}</h3>
              <button onClick={() => setShowCycleModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>사이클명 *</label>
                <input
                  type="text"
                  value={cycleForm.cycleName}
                  onChange={e => setCycleForm({ ...cycleForm, cycleName: e.target.value })}
                  placeholder="예: 2025 Q1"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>유형</label>
                  <select
                    value={cycleForm.cycleTypeCd}
                    onChange={e => setCycleForm({ ...cycleForm, cycleTypeCd: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                    }}
                  >
                    <option value="QUARTER">분기</option>
                    <option value="HALF">반기</option>
                    <option value="YEAR">연간</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>상태</label>
                  <select
                    value={cycleForm.statusCd}
                    onChange={e => setCycleForm({ ...cycleForm, statusCd: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                    }}
                  >
                    <option value="PREPARING">준비중</option>
                    <option value="ACTIVE">진행중</option>
                    <option value="CLOSED">종료</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>시작일 *</label>
                  <input
                    type="date"
                    value={cycleForm.startDate}
                    onChange={e => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>종료일 *</label>
                  <input
                    type="date"
                    value={cycleForm.endDate}
                    onChange={e => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCycleModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={saveCycle}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* OKR Modal */}
      {showOkrModal && (() => {
        const modalTitle = editingOkr
          ? (okrForm.okrTypeCd === 'O' ? '목표 수정' : okrForm.okrTypeCd === 'KR' ? '핵심결과 수정' : '실행과제 수정')
          : okrForm.okrTypeCd === 'IN'
            ? '실행과제 (Initiative) 추가'
            : okrForm.okrTypeCd === 'KR'
              ? '핵심결과 (Key Result) 추가'
              : '목표 (Objective) 추가'
        const modalColor = okrForm.okrTypeCd === 'O' ? '#3b82f6' : okrForm.okrTypeCd === 'KR' ? '#10b981' : '#8b5cf6'

        return (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}
          >
            <div
              style={{
                background: 'var(--panel)', borderRadius: 12, padding: 24,
                width: 600, maxWidth: '90vw', border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: modalColor
                  }} />
                  {modalTitle}
                </h3>
                <button onClick={() => setShowOkrModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* 상위 목표 표시 */}
              <div style={{
                padding: 12,
                background: parentOkr ? 'linear-gradient(135deg, #8b5cf615, #7c3aed15)' : '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
                border: parentOkr ? '2px solid #8b5cf6' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={16} style={{ color: parentOkr ? '#8b5cf6' : '#94a3b8' }} />
                  <span style={{ fontSize: 12, color: parentOkr ? '#7c3aed' : '#64748b', fontWeight: 500 }}>상위 목표</span>
                </div>
                {parentOkr ? (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>{parentOkr.okrTitle}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>담당: {parentOkr.ownerName || parentOkr.ownerId}</div>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    최상위 목표로 생성됩니다
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>유형</label>
                  <div
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6,
                      border: '1px solid var(--border)', background: parentOkr ? '#f1f5f9' : 'var(--bg)',
                      color: parentOkr ? '#64748b' : 'var(--text)', fontSize: 14
                    }}
                  >
                    {okrForm.okrTypeCd === 'O' ? '목표 (Objective)' : okrForm.okrTypeCd === 'KR' ? '핵심결과 (Key Result)' : '실행과제 (Initiative)'}
                  </div>
                </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  {okrForm.okrTypeCd === 'O' ? '목표명' : okrForm.okrTypeCd === 'KR' ? '핵심결과명' : '실행과제명'} *
                </label>
                <input
                  type="text"
                  value={okrForm.okrTitle}
                  onChange={e => setOkrForm({ ...okrForm, okrTitle: e.target.value })}
                  placeholder={okrForm.okrTypeCd === 'O' ? '예: 매출 20% 성장' : okrForm.okrTypeCd === 'KR' ? '예: 신규 고객 100명 확보' : '예: 마케팅 캠페인 실행'}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                  }}
                />
              </div>

              {/* Key Result(KR)일 때만 목표 방향, 목표값, 현재값, 측정단위 표시 */}
              {okrForm.okrTypeCd === 'KR' && (
                <>
                  {/* 목표 방향 (아이콘 버튼) */}
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>목표 방향</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { value: 'GTE', icon: <TrendingUp size={18} />, label: '이상', desc: '목표값 이상 달성' },
                        { value: 'EQ', icon: <Equal size={18} />, label: '동일', desc: '목표값과 동일' },
                        { value: 'LTE', icon: <TrendingDown size={18} />, label: '이하', desc: '목표값 이하 달성' }
                      ].map(dir => (
                        <button
                          key={dir.value}
                          type="button"
                          onClick={() => setOkrForm({ ...okrForm, targetDirection: dir.value })}
                          style={{
                            flex: 1, padding: '12px 8px', borderRadius: 8,
                            border: okrForm.targetDirection === dir.value ? '2px solid #3b82f6' : '1px solid var(--border)',
                            background: okrForm.targetDirection === dir.value ? '#3b82f610' : 'var(--bg)',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                          }}
                        >
                          <span style={{ color: okrForm.targetDirection === dir.value ? '#3b82f6' : 'var(--text-secondary)' }}>
                            {dir.icon}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: okrForm.targetDirection === dir.value ? '#3b82f6' : 'var(--text)' }}>
                            {dir.label}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{dir.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 목표값, 측정단위 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>목표값 *</label>
                      <input
                        type="number"
                        value={okrForm.targetValue}
                        onChange={e => setOkrForm({ ...okrForm, targetValue: e.target.value })}
                        placeholder="100"
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>측정단위 *</label>
                      <select
                        value={okrForm.unit}
                        onChange={e => setOkrForm({ ...okrForm, unit: e.target.value })}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                        }}
                      >
                        <option value="PERCENT">% (퍼센트)</option>
                        <option value="AMOUNT">금액 (원)</option>
                        <option value="COUNT">갯수 (개)</option>
                        <option value="BOOLEAN">완료여부</option>
                      </select>
                    </div>
                  </div>

                  {/* 측정단위 미리보기 */}
                  <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {okrForm.unit === 'PERCENT' && <Percent size={16} style={{ color: '#10b981' }} />}
                    {okrForm.unit === 'AMOUNT' && <DollarSign size={16} style={{ color: '#f59e0b' }} />}
                    {okrForm.unit === 'COUNT' && <Hash size={16} style={{ color: '#3b82f6' }} />}
                    {okrForm.unit === 'BOOLEAN' && <CheckSquare size={16} style={{ color: '#8b5cf6' }} />}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {okrForm.targetDirection === 'GTE' ? '≥' : okrForm.targetDirection === 'LTE' ? '≤' : '='}{' '}
                      {okrForm.targetValue || '0'}{' '}
                      {okrForm.unit === 'PERCENT' ? '%' : okrForm.unit === 'AMOUNT' ? '원' : okrForm.unit === 'COUNT' ? '개' : '(완료)'}
                      {' '}달성 목표
                    </span>
                  </div>
                </>
              )}

              {/* 목표 설명 */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>목표 설명</label>
                <textarea
                  value={okrForm.okrDescription}
                  onChange={e => setOkrForm({ ...okrForm, okrDescription: e.target.value })}
                  rows={6}
                  placeholder="목표에 대한 상세 설명을 입력하세요..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14, resize: 'vertical'
                  }}
                />
              </div>

              {/* 담당자 지정 섹션 */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={14} />
                  담당자 지정
                </label>

                {/* 검색 입력 */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => {
                        setMemberSearch(e.target.value)
                        setShowMemberDropdown(e.target.value.length > 0)
                      }}
                      onFocus={() => memberSearch.length > 0 && setShowMemberDropdown(true)}
                      placeholder="이름 또는 부서로 검색..."
                      style={{
                        width: '100%', padding: '10px 12px 10px 34px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                      }}
                    />
                  </div>

                  {/* 검색 결과 드롭다운 */}
                  {showMemberDropdown && filteredEmployees.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 200, overflow: 'auto', marginTop: 4
                    }}>
                      {filteredEmployees.map(emp => (
                        <div
                          key={emp.assignee_id}
                          onClick={() => addMember(emp)}
                          style={{
                            padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border)'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontWeight: 500 }}>{emp.emp_name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.dept_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 선택된 담당자 목록 */}
                {selectedMembers.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedMembers.map(member => (
                      <div
                        key={member.assigneeId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                          background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)'
                        }}
                      >
                        <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ flex: 1, fontWeight: 500 }}>{member.empName}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{member.deptName}</span>
                        <button
                          onClick={() => removeMember(member.assigneeId)}
                          style={{
                            padding: 4, background: 'transparent', border: 'none',
                            cursor: 'pointer', color: '#ef4444'
                          }}
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedMembers.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, background: 'var(--bg)', borderRadius: 6 }}>
                    담당자를 검색하여 추가하세요
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowOkrModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={saveOkr}>저장</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Approval Modal */}
      {showApprovalModal && approvalItem && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}
          onClick={() => setShowApprovalModal(false)}
        >
          <div
            style={{
              background: 'var(--panel)', borderRadius: 12, padding: 24,
              minWidth: 450, maxWidth: '90vw', border: '1px solid var(--border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>OKR 승인 검토</h3>
              <button onClick={() => setShowApprovalModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: approvalItem.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
                  color: approvalItem.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
                }}>{approvalItem.okrTypeCd === 'O' ? '목표' : '핵심결과'}</span>
                <span style={{ fontWeight: 600 }}>{approvalItem.okrTitle}</span>
              </div>
              {approvalItem.okrDescription && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{approvalItem.okrDescription}</p>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                작성자: {approvalItem.ownerName || approvalItem.ownerId}
              </div>
              {approvalItem.okrTypeCd === 'KR' && approvalItem.targetValue && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  목표: {approvalItem.targetValue} {approvalItem.unit}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>코멘트</label>
              <textarea
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                placeholder="승인/반려 사유를 입력하세요..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14, resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>취소</button>
              <button
                onClick={handleReject}
                style={{
                  padding: '8px 16px', borderRadius: 6, border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 500
                }}
              >
                반려
              </button>
              <button
                onClick={handleApprove}
                style={{
                  padding: '8px 16px', borderRadius: 6, border: 'none',
                  background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 500
                }}
              >
                승인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {showEvalModal && evalItem && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}
          onClick={() => setShowEvalModal(false)}
        >
          <div
            style={{
              background: 'var(--panel)', borderRadius: 12, padding: 24,
              minWidth: 480, maxWidth: '90vw', border: '1px solid var(--border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>
                {evalForm.evaluationTypeCd === 'SELF' ? '자기 평가' : '상사 평가'}
              </h3>
              <button onClick={() => setShowEvalModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {/* 평가 대상 OKR 정보 */}
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: evalItem.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
                  color: evalItem.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
                }}>{evalItem.okrTypeCd === 'O' ? '목표' : '핵심결과'}</span>
                <span style={{ fontWeight: 600 }}>{evalItem.okrTitle}</span>
              </div>
              {evalItem.okrDescription && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{evalItem.okrDescription}</p>
              )}
              {evalItem.okrTypeCd === 'KR' && evalItem.targetValue && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  목표: {evalItem.currentValue || 0} / {evalItem.targetValue} {evalItem.unit}
                  ({evalItem.progressRate || 0}%)
                </div>
              )}
            </div>

            {/* 점수 선택 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
                평가 점수
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    onClick={() => setEvalForm(f => ({ ...f, score }))}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 8,
                      border: evalForm.score === score ? '2px solid #f59e0b' : '1px solid var(--border)',
                      background: evalForm.score === score ? '#f59e0b20' : 'var(--bg)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                    }}
                  >
                    <Star
                      size={24}
                      fill={evalForm.score >= score ? '#f59e0b' : 'transparent'}
                      color={evalForm.score >= score ? '#f59e0b' : 'var(--text-secondary)'}
                    />
                    <span style={{ fontSize: 12, fontWeight: evalForm.score === score ? 600 : 400 }}>{score}점</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 달성률 입력 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                달성률 (%)
              </label>
              <input
                type="number"
                value={evalForm.achievementRate}
                onChange={e => setEvalForm(f => ({ ...f, achievementRate: e.target.value }))}
                placeholder="0 ~ 100"
                min={0}
                max={100}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14
                }}
              />
            </div>

            {/* 코멘트 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                평가 의견
              </label>
              <textarea
                value={evalForm.comment}
                onChange={e => setEvalForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="평가 의견을 입력하세요..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 14, resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowEvalModal(false)}>취소</button>
              <button
                className="btn btn-primary"
                onClick={saveEvaluation}
                style={{ background: '#f59e0b' }}
              >
                평가 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
        >
          <div
            style={{
              background: 'var(--panel)', borderRadius: 12, padding: 24, width: 400,
              border: '1px solid var(--border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Trash2 size={20} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                {deleteTarget.type === 'cycle' ? '사이클 삭제' : 'OKR 삭제'}
              </h3>
            </div>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              다음 항목을 삭제하시겠습니까?
            </p>
            <p style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '12px 16px',
              background: 'var(--bg)', borderRadius: 8, marginBottom: 16
            }}>
              {deleteTarget.name}
            </p>
            <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 20 }}>
              이 작업은 되돌릴 수 없습니다.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
              >
                취소
              </button>
              <button
                className="btn"
                onClick={confirmDelete}
                style={{ background: '#ef4444', color: 'white', border: 'none' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 목표설명 커스텀 툴팁 */}
      {descTooltip && (
        <div
          style={{
            position: 'fixed',
            left: descTooltip.x,
            top: descTooltip.y,
            background: '#fff',
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: 280,
            minWidth: 180
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
            {descTooltip.title}
          </div>
          <div style={{ color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {descTooltip.description}
          </div>
        </div>
      )}
    </div>
  )
}

// OKR Tree Item (read-only for dashboard)
function OkrTreeItem({ item, level, statusColors, statusLabels }: {
  item: OkrItem
  level: number
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.children && item.children.length > 0
  const progress = item.progressRate || 0

  return (
    <div style={{ marginLeft: level * 24 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: level === 0 ? 'var(--bg-secondary)' : 'transparent',
          borderRadius: 8, border: level === 0 ? '1px solid var(--border)' : 'none'
        }}
      >
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
        {!hasChildren && <div style={{ width: 16 }} />}

        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: item.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
          color: item.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
        }}>
          {item.okrTypeCd}
        </span>

        <span style={{ flex: 1, fontSize: 14, fontWeight: level === 0 ? 600 : 400 }}>{item.okrTitle}</span>

        {item.okrTypeCd === 'KR' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981', minWidth: 40, textAlign: 'right' }}>{progress}%</span>
          </div>
        )}

        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 11,
          background: `${statusColors[item.statusCd]}20`,
          color: statusColors[item.statusCd]
        }}>
          {statusLabels[item.statusCd]}
        </span>
      </div>

      {expanded && hasChildren && (
        <div style={{ marginTop: 8 }}>
          {item.children!.map(child => (
            <OkrTreeItem key={child.id} item={child} level={level + 1} statusColors={statusColors} statusLabels={statusLabels} />
          ))}
        </div>
      )}
    </div>
  )
}

// Full OKR Tree Node (for Company OKR Tree tab - matches OkrTree.tsx style)
function FullOkrTreeNode({ item, level, onEdit, loggedInAssigneeId }: {
  item: OkrItem
  level: number
  onEdit: (item: OkrItem) => void
  loggedInAssigneeId: string | null
}) {
  const hasChildren = item.children && item.children.length > 0
  const isOwner = item.ownerId === loggedInAssigneeId

  // 타입별 색상: O=파랑, KR=초록, IN=보라
  const typeColors: Record<string, { border: string; bg: string; text: string }> = {
    'O': { border: 'var(--primary)', bg: 'rgba(37, 99, 235, 0.1)', text: 'var(--primary)' },
    'KR': { border: 'var(--success)', bg: 'rgba(22, 163, 74, 0.1)', text: 'var(--success)' },
    'IN': { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' }
  }
  const colors = typeColors[item.okrTypeCd] || typeColors['O']

  // 상태 색상 및 라벨
  const statusColors: Record<string, string> = {
    DRAFT: '#94a3b8',
    IN_PROGRESS: '#10b981',
    COMPLETED: '#3b82f6',
    SUBMITTED: '#f59e0b',
    NOT_STARTED: '#6b7280'
  }
  const statusLabels: Record<string, string> = {
    DRAFT: '초안',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료',
    SUBMITTED: '승인대기',
    NOT_STARTED: '시작전'
  }
  const statusColor = statusColors[item.statusCd] || '#94a3b8'
  const statusLabel = statusLabels[item.statusCd] || item.statusCd

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        title={item.okrDescription || ''}
        style={{
          marginLeft: level * 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 6,
          background: 'var(--bg-secondary)',
          borderLeft: `4px solid ${colors.border}`,
          cursor: isOwner ? 'pointer' : 'default',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => isOwner && (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
        onClick={() => isOwner && onEdit(item)}
      >
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            background: colors.bg,
            color: colors.text
          }}
        >
          {item.okrTypeCd}
        </span>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{item.okrTitle}</span>
        {/* 소유자 */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 10px',
          borderRadius: 16,
          fontSize: 11,
          fontWeight: 500,
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #e2e8f0'
        }}>
          <User size={12} style={{ color: '#64748b' }} />
          <span>소유자</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>{item.ownerName || item.ownerId}</span>
        </span>
        {/* 참여자 */}
        {item.members && item.members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} style={{ color: '#10b981' }} />
            <span style={{ fontSize: 11, color: '#047857', fontWeight: 500 }}>참여자</span>
            <div style={{ display: 'flex', marginLeft: 2 }}>
              {item.members.map((m, idx) => {
                const fullName = m.empName || m.assigneeId || ''
                const displayName = fullName.length > 1 ? fullName.slice(1) : fullName
                return (
                  <div
                    key={idx}
                    title={fullName}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff',
                      marginLeft: idx > 0 ? -8 : 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    {displayName}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <span style={{
          padding: '3px 10px',
          borderRadius: 12,
          fontSize: 10,
          fontWeight: 600,
          background: `${statusColor}18`,
          color: statusColor,
          border: `1px solid ${statusColor}30`
        }}>
          {statusLabel}
        </span>
      </div>
      {hasChildren && (
        <div style={{ marginLeft: level * 24 + 12, borderLeft: '1px solid var(--border)', paddingLeft: 12, marginTop: 8 }}>
          {item.children!.map(child => (
            <FullOkrTreeNode key={child.id} item={child} level={level + 1} onEdit={onEdit} loggedInAssigneeId={loggedInAssigneeId} />
          ))}
        </div>
      )}
    </div>
  )
}

// OKR Editable Item (for OKR management tab)
function OkrEditableItem({ item, level, statusColors, statusLabels, onEdit, onAddChild }: {
  item: OkrItem
  level: number
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
  onEdit: (item: OkrItem) => void
  onAddChild: (parent: OkrItem) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.children && item.children.length > 0
  const progress = item.progressRate || 0

  return (
    <div style={{ marginLeft: level * 24 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: level === 0 ? 'var(--bg-secondary)' : 'transparent',
          borderRadius: 8, border: '1px solid var(--border)'
        }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        ) : (
          <div style={{ width: 16 }} />
        )}

        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: item.okrTypeCd === 'O' ? '#3b82f620' : '#10b98120',
          color: item.okrTypeCd === 'O' ? '#3b82f6' : '#10b981'
        }}>
          {item.okrTypeCd}
        </span>

        <span style={{ flex: 1, fontSize: 14, fontWeight: level === 0 ? 600 : 400 }}>{item.okrTitle}</span>

        {item.okrTypeCd === 'KR' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {item.currentValue || 0} / {item.targetValue || 0} {item.unit === 'PERCENT' ? '%' : item.unit === 'AMOUNT' ? '원' : item.unit === 'COUNT' ? '개' : ''}
            </span>
            <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{progress}%</span>
          </div>
        )}

        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 11,
          background: `${statusColors[item.statusCd]}20`,
          color: statusColors[item.statusCd]
        }}>
          {statusLabels[item.statusCd]}
        </span>

        <div style={{ display: 'flex', gap: 6 }}>
          {item.okrTypeCd === 'O' && (
            <button
              onClick={() => onAddChild(item)}
              title="KR 추가"
              style={{
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Plus size={12} /> KR 추가
            </button>
          )}
          <button
            onClick={() => onEdit(item)}
            title="수정"
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(100, 116, 139, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 116, 139, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(100, 116, 139, 0.3)'
            }}
          >
            <Edit2 size={12} /> 수정
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {item.children!.map(child => (
            <OkrEditableItem
              key={child.id}
              item={child}
              level={level + 1}
              statusColors={statusColors}
              statusLabels={statusLabels}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}
