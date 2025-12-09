import { useState, useEffect, useMemo } from 'react'
import { X, RefreshCw, Plus, MessageSquare, TrendingUp, Calendar, DollarSign, FileText, ShoppingCart, CheckCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { useCreditWorkflow } from './CreditWorkflowContext'

// 토스트 메시지 컴포넌트
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 20px',
        background: type === 'success' ? '#10b981' : '#ef4444',
        color: 'white',
        borderRadius: 10,
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        fontSize: 14,
        fontWeight: 600
      }}>
        {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 8,
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <X size={12} />
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

// 해제 품의 등록 팝업 컴포넌트
function UnblockRequestModal({
  isOpen,
  onClose,
  customerSeq,
  customerName,
  companyType,
  meetingId,
  avgSales3Month,
  onSubmit
}: {
  isOpen: boolean
  onClose: () => void
  customerSeq: number
  customerName: string
  companyType: string
  meetingId?: number | null
  avgSales3Month: number
  onSubmit: () => void
}) {
  const [reasonText, setReasonText] = useState('')
  const [collectionPlan, setCollectionPlan] = useState('')
  const [targetUnblockDate, setTargetUnblockDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async () => {
    if (!reasonText.trim()) {
      setToast({ message: '해제 사유를 입력해주세요.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const empId = localStorage.getItem('tnt.sales.empId') || ''
      const empName = localStorage.getItem('tnt.sales.empName') || ''

      const res = await fetch('/api/v1/credit/unblock-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyType,
          meetingId: meetingId || null,
          customerSeq,
          customerName,
          assigneeId: empId,
          reasonText,
          collectionPlan: collectionPlan || null,
          targetUnblockDate: targetUnblockDate || null,
          summaryLast3mSalesAvg: avgSales3Month,
          createdBy: empName || empId
        })
      })

      if (!res.ok) throw new Error('등록 실패')
      const data = await res.json()

      if (data.success) {
        setToast({ message: '해제 품의가 등록되었습니다.', type: 'success' })
        onSubmit()
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        throw new Error(data.error || '등록 실패')
      }
    } catch (err) {
      console.error('해제 품의 등록 실패:', err)
      setToast({ message: '등록에 실패했습니다.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          width: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>매출통제 해제 품의 등록</h3>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={14} color="#6b7280" />
            </button>
          </div>

          {/* 내용 */}
          <div style={{ padding: 20 }}>
            {/* 거래처 정보 */}
            <div style={{
              background: '#f9fafb',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>거래처</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{customerName}</div>
            </div>

            {/* 해제 사유 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                해제 사유 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="매출통제 해제가 필요한 사유를 입력하세요"
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 수금 계획 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                수금 계획
              </label>
              <textarea
                value={collectionPlan}
                onChange={(e) => setCollectionPlan(e.target.value)}
                placeholder="예상 수금 계획을 입력하세요"
                style={{
                  width: '100%',
                  minHeight: 60,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 희망 해제일 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                희망 해제일
              </label>
              <input
                type="date"
                value={targetUnblockDate}
                onChange={(e) => setTargetUnblockDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 참고 정보 */}
            <div style={{
              background: '#eff6ff',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginBottom: 4 }}>참고 정보</div>
              <div style={{ fontSize: 12, color: '#374151' }}>
                3개월 평균매출: ₩{avgSales3Month.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: 'white',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                background: '#f59e0b',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// 해제 품의 수정 팝업 컴포넌트
function UnblockEditModal({
  isOpen,
  onClose,
  unblockRequest,
  avgSales3Month,
  onSubmit
}: {
  isOpen: boolean
  onClose: () => void
  unblockRequest: any
  avgSales3Month: number
  onSubmit: () => void
}) {
  const [reasonText, setReasonText] = useState(unblockRequest?.reason_text || '')
  const [collectionPlan, setCollectionPlan] = useState(unblockRequest?.collection_plan || '')
  const [targetUnblockDate, setTargetUnblockDate] = useState(unblockRequest?.target_unblock_date?.slice(0, 10) || '')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (unblockRequest) {
      setReasonText(unblockRequest.reason_text || '')
      setCollectionPlan(unblockRequest.collection_plan || '')
      setTargetUnblockDate(unblockRequest.target_unblock_date?.slice(0, 10) || '')
    }
  }, [unblockRequest])

  const handleSubmit = async () => {
    if (!reasonText.trim()) {
      setToast({ message: '해제 사유를 입력해주세요.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const empName = localStorage.getItem('tnt.sales.empName') || localStorage.getItem('tnt.sales.empId') || ''

      const res = await fetch(`/api/v1/credit/unblock-requests/${unblockRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasonText,
          collectionPlan: collectionPlan || null,
          targetUnblockDate: targetUnblockDate || null,
          updatedBy: empName
        })
      })

      if (!res.ok) throw new Error('수정 실패')
      const data = await res.json()

      if (data.success) {
        setToast({ message: '해제 품의가 수정되었습니다.', type: 'success' })
        onSubmit()
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        throw new Error(data.error || '수정 실패')
      }
    } catch (err) {
      console.error('해제 품의 수정 실패:', err)
      setToast({ message: '수정에 실패했습니다.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !unblockRequest) return null

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          width: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>매출통제 해제 품의 수정</h3>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={14} color="#6b7280" />
            </button>
          </div>

          {/* 내용 */}
          <div style={{ padding: 20 }}>
            {/* 거래처 정보 */}
            <div style={{
              background: '#f9fafb',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>거래처</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{unblockRequest.customer_name}</div>
            </div>

            {/* 해제 사유 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                해제 사유 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="매출통제 해제가 필요한 사유를 입력하세요"
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 수금 계획 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                수금 계획
              </label>
              <textarea
                value={collectionPlan}
                onChange={(e) => setCollectionPlan(e.target.value)}
                placeholder="예상 수금 계획을 입력하세요"
                style={{
                  width: '100%',
                  minHeight: 60,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 희망 해제일 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                희망 해제일
              </label>
              <input
                type="date"
                value={targetUnblockDate}
                onChange={(e) => setTargetUnblockDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 참고 정보 */}
            <div style={{
              background: '#eff6ff',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginBottom: 4 }}>참고 정보</div>
              <div style={{ fontSize: 12, color: '#374151' }}>
                3개월 평균매출: ₩{avgSales3Month.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: 'white',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                background: '#3b82f6',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? '수정 중...' : '수정'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// 활동 이력 등록 팝업 컴포넌트
function ActivityModal({
  isOpen,
  onClose,
  customerSeq,
  customerName,
  companyType,
  meetingId,
  onSubmit
}: {
  isOpen: boolean
  onClose: () => void
  customerSeq: number
  customerName: string
  companyType: string
  meetingId?: number | null
  onSubmit: () => void
}) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [activityType] = useState('채권관리')
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().split('T')[0])
  const [activityMethod, setActivityMethod] = useState('방문')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setToast({ message: '제목을 입력해주세요.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const empId = localStorage.getItem('tnt.sales.empId') || ''
      const empName = localStorage.getItem('tnt.sales.empName') || ''

      const res = await fetch('/api/v1/credit/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerSeq,
          companyType,
          subject,
          description,
          activityType,
          activityDate,
          activityMethod,
          assigneeId: empId,
          meetingId: meetingId || null,
          createdBy: empName || empId
        })
      })

      if (!res.ok) throw new Error('등록 실패')
      const data = await res.json()

      if (data.success) {
        setToast({ message: '활동 이력이 등록되었습니다.', type: 'success' })
        onSubmit()
        setTimeout(() => {
          setSubject('')
          setDescription('')
          onClose()
        }, 1500)
      } else {
        throw new Error(data.error || '등록 실패')
      }
    } catch (err) {
      console.error('활동 이력 등록 실패:', err)
      setToast({ message: '등록에 실패했습니다.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          width: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>채권회의 활동 이력 등록</h3>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={14} color="#6b7280" />
            </button>
          </div>

          {/* 내용 */}
          <div style={{ padding: 20 }}>
            {/* 거래처 정보 + 활동유형 (한 줄) */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{
                flex: 1,
                background: '#f9fafb',
                borderRadius: 8,
                padding: 12
              }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>거래처</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{customerName}</div>
              </div>
              <div style={{
                flex: 1,
                background: '#f9fafb',
                borderRadius: 8,
                padding: 12
              }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>활동유형</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>{activityType}</div>
              </div>
            </div>

            {/* 수행일자 + 활동방법 (한 줄) */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {/* 수행일자 */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                  수행일자
                </label>
                <input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {/* 활동방법 */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                  활동방법
                </label>
                <select
                  value={activityMethod}
                  onChange={(e) => setActivityMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="방문">방문</option>
                  <option value="전화">전화</option>
                  <option value="문자/메일/팩스">문자/메일/팩스</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>

            {/* 제목 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                제목 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="활동 제목을 입력하세요"
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 내용 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                내용
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="활동 내용을 입력하세요"
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* 푸터 */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: 'white',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                background: '#f59e0b',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

type ActivityItem = {
  id: number
  subject: string
  description: string
  activityType: string
  activityStatus: string
  plannedStartAt: string
  createdAt: string
  createdBy: string
  ownerId?: string
  ownerName?: string
  meetingId?: number
}

type CollectionItem = {
  collection_date: string
  amount: number
  count: number
  method: string
}

type MonthlyCollection = {
  month: string
  amount: number
}

type RecentTransaction = {
  salesMgmtUnit: string
  itemName: string
  quantity: number
  amount: number
}

type MonthlySales = {
  month: string
  amount: number
}

type MeetingCustomerOpinion = {
  id: number
  meetingId: number
  meetingCode: string
  meetingName: string
  meetingDate: string
  decisionComment: string
  reviewFlag: boolean
  createdAt: string
  createdBy: string
}

export function CreditWorkflowRightPanel() {
  const { selectedCustomer, setSelectedCustomer, meetingDate, meetingId, meetingStatus, opinionRefreshTrigger } = useCreditWorkflow()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [monthlyCollections, setMonthlyCollections] = useState<MonthlyCollection[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [monthlySales3Month, setMonthlySales3Month] = useState<MonthlySales[]>([])
  const [avgSales3Month, setAvgSales3Month] = useState<number>(0)
  const [unblockRequests, setUnblockRequests] = useState<any[]>([])
  const [customerOpinions, setCustomerOpinions] = useState<MeetingCustomerOpinion[]>([])
  const [loading, setLoading] = useState(false)
  const [showUnblockModal, setShowUnblockModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; activityId: number | null }>({ show: false, activityId: null })
  const [unblockDeleteConfirm, setUnblockDeleteConfirm] = useState<{ show: boolean; requestId: number | null }>({ show: false, requestId: null })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [hoveredActivityId, setHoveredActivityId] = useState<number | null>(null)
  const [hoveredUnblockId, setHoveredUnblockId] = useState<number | null>(null)
  const [showUnblockEditModal, setShowUnblockEditModal] = useState(false)
  const [editingUnblockRequest, setEditingUnblockRequest] = useState<any>(null)
  const [opinionEditModal, setOpinionEditModal] = useState<{ show: boolean; opinion: MeetingCustomerOpinion | null }>({ show: false, opinion: null })
  const [opinionDeleteConfirm, setOpinionDeleteConfirm] = useState<{ show: boolean; opinionId: number | null }>({ show: false, opinionId: null })
  const [editingOpinionComment, setEditingOpinionComment] = useState('')

  // 미수 지표 state
  const [receivableMetrics, setReceivableMetrics] = useState<{
    sales12Month: number
    arToSalesRatio: number
    totalAr: number
    collection90Days: number
    sales90Days: number
    collectionToSalesRatio: number
  } | null>(null)

  // 섹션 접기/펴기 상태 (기본값: 모두 접힘)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    opinions: true,
    activities: true,
    unblock: true,
    receivableMetrics: true,
    collections: true,
    monthlyCollections: true,
    avgSales: true,
    transactions: true
  })

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getCompanyIcon = (companyType: string) => {
    if (companyType === 'TNT') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          background: '#3b82f6',
          color: 'white',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          marginRight: 4,
        }}>
          T
        </span>
      )
    } else if (companyType === 'DYS') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          background: '#10b981',
          color: 'white',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          marginRight: 4,
        }}>
          D
        </span>
      )
    }
    return null
  }

  const getRiskBadge = (riskLevel: string) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: '50%',
      color: 'white',
      fontSize: 10,
      fontWeight: 700,
    }
    if (riskLevel === 'high') {
      return <span style={{ ...baseStyle, background: '#ef4444' }}>고</span>
    } else if (riskLevel === 'medium') {
      return <span style={{ ...baseStyle, background: '#f59e0b' }}>중</span>
    } else if (riskLevel === 'low') {
      return <span style={{ ...baseStyle, background: '#10b981' }}>저</span>
    }
    return <span style={{ ...baseStyle, background: '#6b7280' }}>-</span>
  }

  const fetchCustomerOpinions = async () => {
    if (!selectedCustomer?.customerSeq) return

    try {
      const res = await fetch(`/api/v1/credit/customers/${selectedCustomer.customerSeq}/opinions`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()

      setCustomerOpinions((data.opinions || []).map((item: any) => ({
        id: item.id,
        meetingId: item.meeting_id,
        meetingCode: item.meeting_code,
        meetingName: item.meeting_name,
        meetingDate: item.meeting_date,
        decisionComment: item.decision_comment,
        reviewFlag: item.review_flag,
        createdAt: item.created_at,
        createdBy: item.created_by,
      })))
    } catch (err) {
      console.error('연체 의견 조회 실패:', err)
      setCustomerOpinions([])
    }
  }

  const fetchActivities = async () => {
    if (!selectedCustomer?.customerSeq) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('customerSeq', String(selectedCustomer.customerSeq))
      params.append('companyType', selectedCustomer.companyType || '')
      params.append('externalId', 'ar_meeting')

      const res = await fetch(`/api/v1/credit/activities?${params.toString()}`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()

      setActivities((data.items || []).map((item: any) => ({
        id: item.id,
        subject: item.subject,
        description: item.description,
        activityType: item.activity_type,
        activityStatus: item.activity_status,
        plannedStartAt: item.planned_start_at,
        createdAt: item.created_at,
        createdBy: item.created_by,
        ownerId: item.sf_owner_id,
        ownerName: item.owner_name,
        meetingId: item.meeting_id,
      })))
    } catch (err) {
      console.error('활동 이력 조회 실패:', err)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerDetails = async () => {
    if (!selectedCustomer?.customerSeq) return

    try {
      const params = new URLSearchParams()
      params.append('customerSeq', String(selectedCustomer.customerSeq))
      params.append('companyType', selectedCustomer.companyType || '')
      if (meetingDate) {
        params.append('meetingDate', meetingDate)
      }
      if (meetingId) {
        params.append('meetingId', String(meetingId))
      }

      const res = await fetch(`/api/v1/credit/customer-details?${params.toString()}`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()

      setCollections(data.collections || [])
      setMonthlyCollections(data.monthlyCollections || [])
      // snake_case -> camelCase 매핑 (최근 90일 영업관리단위, 품목별 그룹화)
      setRecentTransactions((data.recentTransactions || []).map((item: any) => ({
        salesMgmtUnit: item.sales_mgmt_unit,
        itemName: item.item_name,
        quantity: item.quantity,
        amount: item.amount,
      })))
      setMonthlySales3Month(data.monthlySales3Month || [])
      setAvgSales3Month(data.avgSales3Month || 0)
      setUnblockRequests(data.unblockRequests || [])
    } catch (err) {
      console.error('거래처 상세 조회 실패:', err)
      setCollections([])
      setMonthlyCollections([])
      setRecentTransactions([])
      setMonthlySales3Month([])
      setAvgSales3Month(0)
      setUnblockRequests([])
    }
  }

  // 미수 지표 조회
  const fetchReceivableMetrics = async () => {
    if (!selectedCustomer?.customerSeq) return

    try {
      const params = new URLSearchParams()
      params.append('customerSeq', String(selectedCustomer.customerSeq))
      params.append('companyType', selectedCustomer.companyType || 'TNT')
      if (selectedCustomer.totalAr) {
        params.append('totalAr', String(selectedCustomer.totalAr))
      }

      const res = await fetch(`/api/v1/credit/receivable-metrics?${params.toString()}`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()

      if (data.success) {
        setReceivableMetrics({
          sales12Month: data.sales12Month || 0,
          arToSalesRatio: data.arToSalesRatio || 0,
          totalAr: data.totalAr || 0,
          collection90Days: data.collection90Days || 0,
          sales90Days: data.sales90Days || 0,
          collectionToSalesRatio: data.collectionToSalesRatio || 0
        })
      }
    } catch (err) {
      console.error('미수 지표 조회 실패:', err)
      setReceivableMetrics(null)
    }
  }

  // 활동 이력 삭제 확인 모달 열기
  const openDeleteConfirm = (activityId: number) => {
    setDeleteConfirm({ show: true, activityId })
  }

  // 활동 이력 삭제 실행
  const executeDeleteActivity = async () => {
    if (!deleteConfirm.activityId) return

    try {
      const res = await fetch(`/api/v1/credit/activities/${deleteConfirm.activityId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('삭제 실패')
      const data = await res.json()
      if (data.success) {
        setToast({ message: '활동 이력이 삭제되었습니다.', type: 'success' })
        fetchActivities()
      } else {
        throw new Error(data.error || '삭제 실패')
      }
    } catch (err) {
      console.error('활동 이력 삭제 실패:', err)
      setToast({ message: '삭제에 실패했습니다.', type: 'error' })
    } finally {
      setDeleteConfirm({ show: false, activityId: null })
    }
  }

  useEffect(() => {
    if (selectedCustomer?.customerSeq) {
      fetchActivities()
      fetchCustomerDetails()
      fetchCustomerOpinions()
      fetchReceivableMetrics()
    } else {
      setActivities([])
      setCollections([])
      setMonthlyCollections([])
      setRecentTransactions([])
      setMonthlySales3Month([])
      setAvgSales3Month(0)
      setUnblockRequests([])
      setCustomerOpinions([])
      setReceivableMetrics(null)
    }
  }, [selectedCustomer?.customerSeq, selectedCustomer?.companyType, meetingDate, meetingId])

  // 연체 의견 새로고침 트리거
  useEffect(() => {
    if (selectedCustomer?.customerSeq && opinionRefreshTrigger > 0) {
      fetchCustomerOpinions()
    }
  }, [opinionRefreshTrigger])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    // yyyyMMdd 형식 (예: 20251205) 처리
    if (/^\d{8}$/.test(dateStr)) {
      const y = dateStr.slice(0, 4)
      const m = dateStr.slice(4, 6)
      const d = dateStr.slice(6, 8)
      return `${y}. ${m}. ${d}.`
    }
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined) return '-'
    return `₩${value.toLocaleString('ko-KR')}`
  }

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '-'
    // YYYY-MM 형식 가정
    const parts = monthStr.split('-')
    if (parts.length >= 2) {
      const year = parts[0].slice(2) // 2025 -> 25
      const month = parts[1] // 01, 12 등
      return `${year}년 ${month}월`
    }
    return monthStr
  }

  // 백엔드에서 날짜별 GROUP BY된 데이터를 받아 매핑
  const groupedCollections = useMemo(() => {
    if (!collections || collections.length === 0) return []

    return collections.map(item => ({
      date: item.collection_date || '',
      totalAmount: item.amount || 0,
      count: item.count || 1,
      methods: item.method ? item.method.split(', ').filter((m: string) => m.trim() !== '') : []
    }))
  }, [collections])

  if (!selectedCustomer) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#9ca3af',
        padding: 24,
        textAlign: 'center'
      }}>
        <MessageSquare size={40} strokeWidth={1} />
        <div style={{ fontSize: 14, marginTop: 12, marginBottom: 8 }}>거래처 상세 정보</div>
        <div style={{ fontSize: 12 }}>왼쪽 목록에서 거래처를 선택하세요</div>
      </div>
    )
  }

  const SectionHeader = ({ icon: Icon, title, sectionKey, isCollapsed, onToggle }: { icon: any, title: string, sectionKey: string, isCollapsed: boolean, onToggle: (key: string) => void }) => (
    <div
      onClick={() => onToggle(sectionKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px',
        background: '#1e3a5f',
        borderRadius: 6,
        marginBottom: isCollapsed ? 0 : 8,
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <Icon size={16} color="white" />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'white', flex: 1 }}>{title}</span>
      {isCollapsed ? <ChevronDown size={16} color="white" /> : <ChevronUp size={16} color="white" />}
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {getCompanyIcon(selectedCustomer.companyType || '')}
          <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedCustomer.customerName || '-'}</span>
          {getRiskBadge(selectedCustomer.riskLevel || '')}
        </div>
        <button
          onClick={() => setSelectedCustomer(null)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: '#f3f4f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={14} color="#6b7280" />
        </button>
      </div>

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 12, marginTop: 8 }}>로딩 중...</p>
          </div>
        ) : (
          <>
            {/* 0. 연체 의견 */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={FileText} title="연체 의견" sectionKey="opinions" isCollapsed={collapsedSections.opinions} onToggle={toggleSection} />
              {!collapsedSections.opinions && (
                customerOpinions.length === 0 ? (
                  <div style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    padding: 12,
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderRadius: 6
                  }}>
                    등록된 연체 의견이 없습니다
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {customerOpinions.map((opinion) => {
                      const isOtherMeeting = opinion.meetingId !== meetingId
                      const isFinished = meetingStatus === 'FINISHED'
                      const isDisabled = isOtherMeeting || isFinished
                      const getTooltip = () => {
                        if (isFinished) return '종료된 회의입니다'
                        if (isOtherMeeting) return '다른 회의에서 생성된 데이터입니다'
                        return ''
                      }
                      return (
                      <div
                        key={opinion.id}
                        style={{
                          background: '#f9fafb',
                          borderRadius: 6,
                          padding: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {formatDate(opinion.meetingDate)} · {opinion.meetingName || opinion.meetingCode || '-'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              onClick={() => {
                                if (isDisabled) return
                                setOpinionEditModal({ show: true, opinion })
                                setEditingOpinionComment(opinion.decisionComment || '')
                              }}
                              disabled={isDisabled}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 2,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: isDisabled ? '#d1d5db' : '#9ca3af',
                                opacity: isDisabled ? 0.5 : 1
                              }}
                              onMouseOver={(e) => { if (!isDisabled) e.currentTarget.style.color = '#3b82f6' }}
                              onMouseOut={(e) => { if (!isDisabled) e.currentTarget.style.color = '#9ca3af' }}
                              title={isDisabled ? getTooltip() : '수정'}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (isDisabled) return
                                setOpinionDeleteConfirm({ show: true, opinionId: opinion.id })
                              }}
                              disabled={isDisabled}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 2,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: isDisabled ? '#d1d5db' : '#9ca3af',
                                opacity: isDisabled ? 0.5 : 1
                              }}
                              onMouseOver={(e) => { if (!isDisabled) e.currentTarget.style.color = '#ef4444' }}
                              onMouseOut={(e) => { if (!isDisabled) e.currentTarget.style.color = '#9ca3af' }}
                              title={isDisabled ? getTooltip() : '삭제'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {opinion.decisionComment && (
                          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                            {opinion.decisionComment}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                          작성: {opinion.createdBy || '-'}
                        </div>
                      </div>
                    )})}
                  </div>
                )
              )}
            </div>

            {/* 1. 채권회의 활동 이력 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: '#1e3a5f',
                  borderRadius: 6,
                  marginBottom: collapsedSections.activities ? 0 : 8,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => toggleSection('activities')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <MessageSquare size={16} color="white" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>채권회의 활동 이력</span>
                  {collapsedSections.activities ? <ChevronDown size={16} color="white" /> : <ChevronUp size={16} color="white" />}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowActivityModal(true) }}
                  disabled={meetingStatus === 'FINISHED'}
                  title={meetingStatus === 'FINISHED' ? '종료된 회의입니다' : ''}
                  style={{
                    padding: '3px 8px',
                    background: meetingStatus === 'FINISHED' ? '#9ca3af' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: meetingStatus === 'FINISHED' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    opacity: meetingStatus === 'FINISHED' ? 0.7 : 1
                  }}
                >
                  <Plus size={10} />
                  등록
                </button>
              </div>
              {!collapsedSections.activities && (activities.length === 0 ? (
                <div style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  padding: 12,
                  textAlign: 'center',
                  background: '#f9fafb',
                  borderRadius: 6
                }}>
                  등록된 활동 이력이 없습니다
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activities.slice(0, 5).map((activity) => {
                    const isOtherMeeting = activity.meetingId !== meetingId
                    const isFinished = meetingStatus === 'FINISHED'
                    const isDisabled = isOtherMeeting || isFinished
                    const getTooltip = () => {
                      if (isFinished) return '종료된 회의입니다'
                      if (isOtherMeeting) return '다른 회의에서 생성된 데이터입니다'
                      return '삭제'
                    }
                    return (
                    <div
                      key={activity.id}
                      style={{
                        background: '#f9fafb',
                        borderRadius: 6,
                        padding: 10,
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredActivityId(activity.id)}
                      onMouseLeave={() => setHoveredActivityId(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#111827', flex: 1 }}>
                          {activity.subject || '(제목 없음)'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            padding: '2px 5px',
                            background: activity.activityStatus === 'completed' ? '#dcfce7' : '#fef3c7',
                            color: activity.activityStatus === 'completed' ? '#166534' : '#92400e',
                            borderRadius: 3,
                            fontSize: 9,
                            fontWeight: 600
                          }}>
                            {activity.activityStatus === 'completed' ? '완료' : activity.activityStatus === '계획' ? '계획' : '진행중'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isDisabled) {
                                openDeleteConfirm(activity.id)
                              }
                            }}
                            disabled={isDisabled}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 2,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: isDisabled ? '#d1d5db' : '#9ca3af',
                              opacity: isDisabled ? 0.5 : 1
                            }}
                            onMouseOver={(e) => { if (!isDisabled) e.currentTarget.style.color = '#ef4444' }}
                            onMouseOut={(e) => { if (!isDisabled) e.currentTarget.style.color = '#9ca3af' }}
                            title={getTooltip()}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {activity.description && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, lineHeight: 1.4 }}>
                          {activity.description.length > 50 ? activity.description.substring(0, 50) + '...' : activity.description}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>
                        {formatDate(activity.plannedStartAt)} · {activity.ownerName || activity.createdBy || activity.ownerId || '-'}
                      </div>

                      {/* 툴팁 버블 - 아래쪽에 표시 */}
                      {hoveredActivityId === activity.id && activity.description && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '100%',
                          marginTop: 4,
                          background: '#1f2937',
                          color: 'white',
                          borderRadius: 8,
                          padding: 12,
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          zIndex: 100
                        }}>
                          {/* 화살표 */}
                          <div style={{
                            position: 'absolute',
                            left: 20,
                            top: -6,
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: '6px solid #1f2937'
                          }} />
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>
                            {activity.subject || '(제목 없음)'}
                          </div>
                          <div style={{ fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {activity.description}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, borderTop: '1px solid #374151', paddingTop: 8 }}>
                            {formatDate(activity.plannedStartAt)} · {activity.createdBy || '-'}
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              ))}
            </div>

            {/* 2. 매출통제 해제 품의 이력 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: '#1e3a5f',
                  borderRadius: 6,
                  marginBottom: collapsedSections.unblock ? 0 : 8,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => toggleSection('unblock')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <FileText size={16} color="white" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>매출통제 해제 품의 이력</span>
                  {collapsedSections.unblock ? <ChevronDown size={16} color="white" /> : <ChevronUp size={16} color="white" />}
                </div>
                {(() => {
                  // 현재 미팅에 이미 등록된 품의가 있는지 확인
                  const hasCurrentMeetingRequest = unblockRequests.some(req => req.meeting_id === meetingId)
                  const isFinished = meetingStatus === 'FINISHED'
                  const isDisabled = hasCurrentMeetingRequest || isFinished
                  const getTitle = () => {
                    if (isFinished) return '종료된 회의입니다'
                    if (hasCurrentMeetingRequest) return '이 미팅에서 이미 품의가 등록되었습니다'
                    return ''
                  }
                  return (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowUnblockModal(true) }}
                      disabled={isDisabled}
                      title={getTitle()}
                      style={{
                        padding: '3px 8px',
                        background: isDisabled ? '#9ca3af' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        opacity: isDisabled ? 0.7 : 1
                      }}
                    >
                      <Plus size={10} />
                      생성
                    </button>
                  )
                })()}
              </div>
              {!collapsedSections.unblock && (
                <div>
                  {unblockRequests.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {unblockRequests.map((req, idx) => {
                        const isOtherMeeting = req.meeting_id !== meetingId
                        const isFinished = meetingStatus === 'FINISHED'
                        const isNotSubmitted = req.request_status !== 'SUBMITTED'
                        const isDisabled = isOtherMeeting || isFinished || isNotSubmitted
                        const getTooltip = (action: string) => {
                          if (isFinished) return '종료된 회의입니다'
                          if (isOtherMeeting) return '다른 회의에서 생성된 데이터입니다'
                          if (isNotSubmitted) return '제출 상태만 ' + action + ' 가능'
                          return action
                        }
                        return (
                        <div
                          key={req.id || idx}
                          style={{
                            padding: 8,
                            background: idx === 0 ? '#fef3c7' : 'white',
                            borderRadius: 4,
                            border: '1px solid #fcd34d',
                            position: 'relative',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={() => setHoveredUnblockId(req.id || idx)}
                          onMouseLeave={() => setHoveredUnblockId(null)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: '#6b7280' }}>
                              {formatDate(req.created_at)} | {req.created_by || '-'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 9,
                                padding: '1px 4px',
                                background: req.request_status === 'SUBMITTED' ? '#3b82f6' :
                                  req.request_status === 'APPROVED_1ST' ? '#f59e0b' :
                                    req.request_status === 'APPROVED_FINAL' ? '#10b981' :
                                      req.request_status === 'REJECTED' ? '#ef4444' :
                                        req.request_status === 'WITHDRAWN' ? '#6b7280' : '#3b82f6',
                                color: 'white',
                                borderRadius: 3
                              }}>
                                {req.request_status === 'SUBMITTED' ? '제출' :
                                  req.request_status === 'APPROVED_1ST' ? '1차승인' :
                                    req.request_status === 'APPROVED_FINAL' ? '최종승인' :
                                      req.request_status === 'REJECTED' ? '반려' :
                                        req.request_status === 'WITHDRAWN' ? '철회' : '제출'}
                              </span>
                              {/* 수정 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isDisabled) return
                                  setEditingUnblockRequest(req)
                                  setShowUnblockEditModal(true)
                                }}
                                disabled={isDisabled}
                                style={{
                                  padding: 2,
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: isDisabled ? 0.5 : 1
                                }}
                                title={getTooltip('수정')}
                              >
                                <Pencil size={12} color={isDisabled ? '#d1d5db' : '#3b82f6'} />
                              </button>
                              {/* 삭제 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isDisabled) return
                                  setUnblockDeleteConfirm({ show: true, requestId: req.id })
                                }}
                                disabled={isDisabled}
                                style={{
                                  padding: 2,
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: isDisabled ? 0.5 : 1
                                }}
                                title={getTooltip('삭제')}
                              >
                                <Trash2 size={12} color={isDisabled ? '#d1d5db' : '#ef4444'} />
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                            {req.reason_text && req.reason_text.length > 50 ? req.reason_text.substring(0, 50) + '...' : req.reason_text}
                          </p>
                          {req.collection_plan && (
                            <p style={{ fontSize: 11, color: '#78716c', margin: '4px 0 0', lineHeight: 1.4 }}>
                              수금계획: {req.collection_plan && req.collection_plan.length > 30 ? req.collection_plan.substring(0, 30) + '...' : req.collection_plan}
                            </p>
                          )}

                          {/* 툴팁 버블 */}
                          {hoveredUnblockId === (req.id || idx) && (req.reason_text || req.collection_plan) && (
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: '100%',
                              marginTop: 4,
                              background: '#1f2937',
                              color: 'white',
                              borderRadius: 8,
                              padding: 12,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                              zIndex: 100
                            }}>
                              <div style={{
                                position: 'absolute',
                                left: 20,
                                top: -6,
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderBottom: '6px solid #1f2937'
                              }} />
                              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6 }}>
                                {formatDate(req.created_at)} | {req.created_by || '-'}
                              </div>
                              {req.reason_text && (
                                <div style={{ fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                                  <span style={{ fontWeight: 600 }}>사유: </span>{req.reason_text}
                                </div>
                              )}
                              {req.collection_plan && (
                                <div style={{ fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', borderTop: '1px solid #374151', paddingTop: 8 }}>
                                  <span style={{ fontWeight: 600 }}>수금계획: </span>{req.collection_plan}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>등록된 의견이 없습니다</p>
                  )}
                </div>
              )}
            </div>

            {/* 3. 미수 지표 */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={TrendingUp} title="미수 지표" sectionKey="receivableMetrics" isCollapsed={collapsedSections.receivableMetrics} onToggle={toggleSection} />
              {!collapsedSections.receivableMetrics && (
                receivableMetrics ? (
                  (() => {
                    // 12개월 기간 계산 (이달 제외, 직전 12개월)
                    const now = new Date()
                    const toDate = new Date(now.getFullYear(), now.getMonth(), 0) // 지난달 말일
                    const fromDate = new Date(toDate.getFullYear(), toDate.getMonth() - 11, 1) // 12개월 전 1일
                    const fromStr = `${String(fromDate.getFullYear()).slice(2)}년${fromDate.getMonth() + 1}월`
                    const toStr = `${String(toDate.getFullYear()).slice(2)}년${toDate.getMonth() + 1}월`

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 0' }}>
                        {/* 총미수/12개월 매출 비율 */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: 8,
                          padding: 10,
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>
                            총미수액/12개월 매출({fromStr}~{toStr})
                          </div>
                          <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: receivableMetrics.arToSalesRatio > 100 ? '#ef4444' : receivableMetrics.arToSalesRatio > 50 ? '#f59e0b' : '#10b981'
                          }}>
                            {receivableMetrics.arToSalesRatio.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                            {formatCurrency(receivableMetrics.totalAr)}/{formatCurrency(receivableMetrics.sales12Month)}
                          </div>
                        </div>

                        {/* 최근 90일 수금/매출 비율 */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: 8,
                          padding: 10,
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                            최근 90일 수금/매출
                          </div>
                          <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: receivableMetrics.collectionToSalesRatio >= 80 ? '#10b981' : receivableMetrics.collectionToSalesRatio >= 50 ? '#f59e0b' : '#ef4444'
                          }}>
                            {receivableMetrics.collectionToSalesRatio.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                            {formatCurrency(receivableMetrics.collection90Days)}/{formatCurrency(receivableMetrics.sales90Days)}
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div style={{ fontSize: 12, color: '#9ca3af', padding: 8, textAlign: 'center' }}>
                    지표 데이터 없음
                  </div>
                )
              )}
            </div>

            {/* 4. 수금 현황 (날짜별 그룹핑) */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={DollarSign} title="수금 현황" sectionKey="collections" isCollapsed={collapsedSections.collections} onToggle={toggleSection} />
              {!collapsedSections.collections && (
                groupedCollections.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9ca3af', padding: 8, textAlign: 'center' }}>
                    수금 내역이 없습니다
                  </div>
                ) : (
                  <div style={{ fontSize: 11 }}>
                    {groupedCollections.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr 90px',
                          gap: 8,
                          padding: '6px 0',
                          borderBottom: idx < groupedCollections.length - 1 ? '1px solid #f3f4f6' : 'none'
                        }}
                      >
                        <span style={{ color: '#6b7280' }}>
                          {formatDate(item.date)}
                          {item.count > 1 && (
                            <span style={{ color: '#9ca3af', fontSize: 10, marginLeft: 2 }}>({item.count}회)</span>
                          )}
                        </span>
                        <span style={{ color: '#374151', textAlign: 'left' }}>
                          {item.methods.length > 0 ? item.methods.join(', ') : '-'}
                        </span>
                        <span style={{ fontWeight: 600, color: '#10b981', textAlign: 'right' }}>{formatCurrency(item.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* 4. 월별 수금내역 (최근 12개월) */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={Calendar} title="월별 수금내역 (12개월)" sectionKey="monthlyCollections" isCollapsed={collapsedSections.monthlyCollections} onToggle={toggleSection} />
              {!collapsedSections.monthlyCollections && (
                monthlyCollections.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9ca3af', padding: 8, textAlign: 'center' }}>
                    월별 수금 내역이 없습니다
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6
                  }}>
                    {monthlyCollections.slice(0, 12).map((item, idx) => (
                      <div key={idx} style={{
                        background: idx < 3 ? '#ecfdf5' : '#f9fafb',
                        borderRadius: 6,
                        padding: 6,
                        textAlign: 'center',
                        border: idx < 3 ? '1px solid #10b981' : '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: 9, color: '#6b7280' }}>{formatMonth(item.month)}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: idx < 3 ? '#059669' : '#111827' }}>{formatCurrency(item.amount)}</div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* 5. 3개월 평균매출 */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={TrendingUp} title="3개월 평균매출" sectionKey="avgSales" isCollapsed={collapsedSections.avgSales} onToggle={toggleSection} />
              {!collapsedSections.avgSales && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  {/* 평균 */}
                  <div style={{
                    background: '#eff6ff',
                    borderRadius: 6,
                    padding: 10,
                    textAlign: 'center',
                    minWidth: 90,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>평균</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>
                      {formatCurrency(avgSales3Month)}
                    </div>
                  </div>
                  {/* 월별 매출 목록 */}
                  {monthlySales3Month.length > 0 && monthlySales3Month.map((item, idx) => (
                    <div key={idx} style={{
                      flex: 1,
                      background: '#f9fafb',
                      borderRadius: 6,
                      padding: 8,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{formatMonth(item.month)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. 최근90일 거래내역 */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={ShoppingCart} title="최근90일 거래내역" sectionKey="transactions" isCollapsed={collapsedSections.transactions} onToggle={toggleSection} />
              {!collapsedSections.transactions && (
                recentTransactions.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9ca3af', padding: 8, textAlign: 'center' }}>
                    최근 90일 거래 내역이 없습니다
                  </div>
                ) : (
                  <div style={{ fontSize: 10 }}>
                    {/* 테이블 헤더 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '55px 1fr 45px 75px',
                      gap: 4,
                      padding: '6px 0',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: 600,
                      color: '#6b7280'
                    }}>
                      <span>관리단위</span>
                      <span>품목</span>
                      <span style={{ textAlign: 'right' }}>수량</span>
                      <span style={{ textAlign: 'right' }}>금액</span>
                    </div>
                    {/* 테이블 바디 - 스크롤 영역 */}
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {recentTransactions.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '55px 1fr 45px 75px',
                          gap: 4,
                          padding: '6px 0',
                          borderBottom: idx < recentTransactions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          color: '#374151'
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6b7280' }} title={item.salesMgmtUnit || '-'}>
                            {item.salesMgmtUnit || '-'}
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.itemName || '-'}>
                            {item.itemName || '-'}
                          </span>
                          <span style={{ textAlign: 'right' }}>{item.quantity?.toLocaleString() || '-'}</span>
                          <span style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* 하단 정보 */}
      <div style={{
        padding: 10,
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
        fontSize: 10,
        color: '#6b7280'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>담당: {selectedCustomer.salesRep || '-'}</span>
          <span>부서: {selectedCustomer.department || '-'}</span>
        </div>
      </div>

      {/* 매출통제 해제 품의 등록 모달 */}
      <UnblockRequestModal
        isOpen={showUnblockModal}
        onClose={() => setShowUnblockModal(false)}
        customerSeq={selectedCustomer.customerSeq || 0}
        customerName={selectedCustomer.customerName || ''}
        companyType={selectedCustomer.companyType || ''}
        meetingId={meetingId}
        avgSales3Month={avgSales3Month}
        onSubmit={() => {
          fetchCustomerDetails()
        }}
      />

      {/* 채권회의 활동 이력 등록 모달 */}
      <ActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        customerSeq={selectedCustomer.customerSeq || 0}
        customerName={selectedCustomer.customerName || ''}
        companyType={selectedCustomer.companyType || ''}
        meetingId={meetingId}
        onSubmit={() => {
          fetchActivities()
        }}
      />

      {/* 매출통제 해제 품의 수정 모달 */}
      <UnblockEditModal
        isOpen={showUnblockEditModal}
        onClose={() => {
          setShowUnblockEditModal(false)
          setEditingUnblockRequest(null)
        }}
        unblockRequest={editingUnblockRequest}
        avgSales3Month={avgSales3Month}
        onSubmit={() => {
          fetchCustomerDetails()
        }}
      />

      {/* 삭제 확인 모달 */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 20,
            width: 300,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
              삭제 확인
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              이 활동 이력을 삭제하시겠습니까?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, activityId: null })}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: 'white',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={executeDeleteActivity}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 품의 삭제 확인 모달 */}
      {unblockDeleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 20,
            width: 300,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
              삭제 확인
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              이 해제 품의를 삭제하시겠습니까?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setUnblockDeleteConfirm({ show: false, requestId: null })}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: 'white',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!unblockDeleteConfirm.requestId) return
                  try {
                    const res = await fetch(`/api/v1/credit/unblock-requests/${unblockDeleteConfirm.requestId}`, {
                      method: 'DELETE'
                    })
                    const data = await res.json()
                    if (data.success) {
                      setToast({ message: '삭제되었습니다.', type: 'success' })
                      fetchCustomerDetails()
                    } else {
                      setToast({ message: data.error || '삭제에 실패했습니다.', type: 'error' })
                    }
                  } catch (err) {
                    console.error('삭제 실패:', err)
                    setToast({ message: '삭제에 실패했습니다.', type: 'error' })
                  } finally {
                    setUnblockDeleteConfirm({ show: false, requestId: null })
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연체 의견 수정 모달 */}
      {opinionEditModal.show && opinionEditModal.opinion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            width: 600,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
              연체 의견 수정
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              {formatDate(opinionEditModal.opinion.meetingDate)} · {opinionEditModal.opinion.meetingName || opinionEditModal.opinion.meetingCode || '-'}
            </div>
            <textarea
              value={editingOpinionComment}
              onChange={(e) => setEditingOpinionComment(e.target.value)}
              placeholder="연체 의견을 입력하세요"
              style={{
                width: '100%',
                minHeight: 120,
                padding: 12,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: 16
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setOpinionEditModal({ show: false, opinion: null })}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: 'white',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!opinionEditModal.opinion) return
                  try {
                    const empName = localStorage.getItem('tnt.sales.empName') || localStorage.getItem('tnt.sales.empId') || ''
                    const res = await fetch(`/api/v1/credit/meeting-customers/${opinionEditModal.opinion.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        decisionComment: editingOpinionComment,
                        updatedBy: empName
                      })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setToast({ message: '연체 의견이 수정되었습니다.', type: 'success' })
                      fetchCustomerOpinions()
                      setOpinionEditModal({ show: false, opinion: null })
                    } else {
                      throw new Error(data.error || '수정 실패')
                    }
                  } catch (err) {
                    console.error('연체 의견 수정 실패:', err)
                    setToast({ message: '수정에 실패했습니다.', type: 'error' })
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연체 의견 삭제 확인 모달 */}
      {opinionDeleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 20,
            width: 300,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
              삭제 확인
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              이 연체 의견을 삭제하시겠습니까?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setOpinionDeleteConfirm({ show: false, opinionId: null })}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: 'white',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!opinionDeleteConfirm.opinionId) return
                  try {
                    const res = await fetch(`/api/v1/credit/meeting-customers/${opinionDeleteConfirm.opinionId}`, {
                      method: 'DELETE'
                    })
                    const data = await res.json()
                    if (data.success) {
                      setToast({ message: '연체 의견이 삭제되었습니다.', type: 'success' })
                      fetchCustomerOpinions()
                    } else {
                      throw new Error(data.error || '삭제 실패')
                    }
                  } catch (err) {
                    console.error('연체 의견 삭제 실패:', err)
                    setToast({ message: '삭제에 실패했습니다.', type: 'error' })
                  } finally {
                    setOpinionDeleteConfirm({ show: false, opinionId: null })
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
