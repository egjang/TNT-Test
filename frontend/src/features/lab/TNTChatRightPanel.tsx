import React, { useState, useRef, useEffect } from 'react'
import {
  Database, Upload, FileText, ChevronRight, ChevronDown, Folder, Plus, Trash2,
  CheckCircle, RefreshCw, Cloud, LogIn, LogOut, User, X, Loader2, Settings
} from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { graphScopes, graphConfig } from '../../config/msalConfig'

type FileSearchStore = {
  name: string
  displayName: string
  createTime: string
}

type StoreDocument = {
  name: string
  displayName: string
  state: string
  sizeBytes: string
  mimeType: string
  createTime: string
}

type OneDriveItem = {
  id: string
  name: string
  folder?: { childCount: number }
  file?: { mimeType: string }
  size?: number
}

export function TNTChatRightPanel() {
  // Store states
  const [stores, setStores] = useState<FileSearchStore[]>([])
  const [currentStore, setCurrentStore] = useState<string>('')
  const [storeLoading, setStoreLoading] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')

  // Document states
  const [storeDocuments, setStoreDocuments] = useState<StoreDocument[]>([])
  const [docLoading, setDocLoading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // OneDrive states
  const { instance, accounts, inProgress } = useMsal()
  const [showOneDrive, setShowOneDrive] = useState(false)
  const [oneDriveItems, setOneDriveItems] = useState<OneDriveItem[]>([])
  const [oneDrivePath, setOneDrivePath] = useState<{ id: string; name: string }[]>([])
  const [oneDriveLoading, setOneDriveLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; file: string } | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<OneDriveItem[]>([])
  const [savingToStore, setSavingToStore] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'store' | 'docs' | 'upload'>('store')

  // Status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Alert Modal state (표준 UI 패턴)
  const [alertModal, setAlertModal] = useState<{
    show: boolean
    type: 'success' | 'error' | 'warning'
    title: string
    message: string
  } | null>(null)

  // Confirm Modal state (표준 UI 패턴)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    subMessage?: string
    onConfirm: () => void
  } | null>(null)

  // Load stores on mount
  useEffect(() => {
    fetchStores()
  }, [])

  // Auto fetch documents when store changes
  useEffect(() => {
    if (currentStore) {
      fetchStoreDocuments(currentStore)
      // Dispatch event to notify TNTChat about store change
      const store = stores.find(s => s.name === currentStore)
      window.dispatchEvent(new CustomEvent('tnt.chat.store.changed', {
        detail: { storeName: currentStore, displayName: store?.displayName || '', documents: storeDocuments }
      }))
    }
  }, [currentStore])

  // Dispatch store info when documents change
  useEffect(() => {
    if (currentStore) {
      const store = stores.find(s => s.name === currentStore)
      window.dispatchEvent(new CustomEvent('tnt.chat.store.changed', {
        detail: { storeName: currentStore, displayName: store?.displayName || '', documents: storeDocuments }
      }))
    }
  }, [storeDocuments])

  // ===== Store Functions =====
  const fetchStores = async () => {
    setStoreLoading(true)
    try {
      const res = await fetch('/api/v1/rag/stores')
      const data = await res.json()
      if (data.stores) {
        setStores(data.stores)
        if (data.currentStore) {
          setCurrentStore(data.currentStore)
        }
      }
    } catch (e) {
      console.error('Failed to fetch stores:', e)
    } finally {
      setStoreLoading(false)
    }
  }

  const selectStore = async (storeName: string) => {
    try {
      const res = await fetch('/api/v1/rag/store/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName })
      })
      const data = await res.json()
      if (data.success) {
        setCurrentStore(storeName)
      }
    } catch (e: any) {
      setStatusMessage(`❌ 스토어 선택 실패: ${e.message}`)
    }
  }

  const createStore = async () => {
    if (!newStoreName.trim()) return
    setStoreLoading(true)
    try {
      const res = await fetch('/api/v1/rag/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newStoreName.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setStatusMessage(`✅ 스토어 생성 완료!`)
        setNewStoreName('')
        fetchStores()
      } else {
        setStatusMessage(`❌ ${data.error}`)
      }
    } catch (e: any) {
      setStatusMessage(`❌ ${e.message}`)
    } finally {
      setStoreLoading(false)
    }
  }

  // 스토어 삭제 요청 (Confirm Modal 표시)
  const requestDeleteStore = (storeName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const store = stores.find(s => s.name === storeName)
    const displayName = store?.displayName || storeName.split('/').pop() || ''
    setConfirmModal({
      show: true,
      title: '스토어 삭제',
      message: `"${displayName}" 스토어를 삭제하시겠습니까?`,
      subMessage: '스토어 내 모든 문서도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      onConfirm: () => executeDeleteStore(storeName)
    })
  }

  // 실제 스토어 삭제 실행
  const executeDeleteStore = async (storeName: string) => {
    setConfirmModal(null)
    try {
      const storeId = storeName.split('/').pop()
      const res = await fetch(`/api/v1/rag/store/${storeId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setAlertModal({
          show: true,
          type: 'success',
          title: '삭제 완료',
          message: '스토어가 성공적으로 삭제되었습니다.'
        })
        if (storeName === currentStore) {
          setCurrentStore('')
          setStoreDocuments([])
        }
        fetchStores()
      } else {
        setAlertModal({
          show: true,
          type: 'error',
          title: '삭제 실패',
          message: data.error || '스토어 삭제에 실패했습니다.'
        })
      }
    } catch (e: any) {
      setAlertModal({
        show: true,
        type: 'error',
        title: '삭제 실패',
        message: e.message || '스토어 삭제 중 오류가 발생했습니다.'
      })
    }
  }

  // ===== Document Functions =====
  const fetchStoreDocuments = async (store?: string) => {
    const targetStore = store || currentStore
    if (!targetStore) return
    setDocLoading(true)
    try {
      const res = await fetch('/api/v1/rag/store/documents')
      const data = await res.json()
      if (data.documents) {
        setStoreDocuments(data.documents)
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e)
    } finally {
      setDocLoading(false)
    }
  }

  // 문서 삭제 요청 (Confirm Modal 표시)
  const requestDeleteDocument = (docName: string) => {
    setConfirmModal({
      show: true,
      title: '문서 삭제',
      message: '문서를 삭제하시겠습니까?',
      subMessage: '이 작업은 되돌릴 수 없습니다.',
      onConfirm: () => executeDeleteDocument(docName)
    })
  }

  // 실제 삭제 실행
  const executeDeleteDocument = async (docName: string) => {
    setConfirmModal(null)
    try {
      const docId = docName.split('/').pop()
      const res = await fetch(`/api/v1/rag/store/document/${docId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        // 표준 UI Alert Modal로 삭제 완료 표시
        setAlertModal({
          show: true,
          type: 'success',
          title: '삭제 완료',
          message: '문서가 성공적으로 삭제되었습니다.'
        })
        fetchStoreDocuments()
      } else {
        setAlertModal({
          show: true,
          type: 'error',
          title: '삭제 실패',
          message: data.error || '문서 삭제에 실패했습니다.'
        })
      }
    } catch (e: any) {
      setAlertModal({
        show: true,
        type: 'error',
        title: '삭제 실패',
        message: e.message || '문서 삭제 중 오류가 발생했습니다.'
      })
    }
  }

  // ===== OneDrive Functions =====
  const getAccessToken = async () => {
    if (accounts.length === 0) return null
    try {
      const response = await instance.acquireTokenSilent({ scopes: graphScopes.oneDrive, account: accounts[0] })
      return response.accessToken
    } catch {
      try {
        const response = await instance.acquireTokenPopup({ scopes: graphScopes.oneDrive })
        return response.accessToken
      } catch { return null }
    }
  }

  const handleMsLogin = async () => {
    try {
      await instance.loginPopup({ scopes: graphScopes.oneDrive })
    } catch (e: any) {
      setStatusMessage(`❌ 로그인 실패`)
    }
  }

  const handleMsLogout = async () => {
    try {
      await instance.logoutPopup()
    } catch (e: any) {
      console.error('Logout failed:', e)
    }
  }

  const uploadFileToOneDrive = async (file: File) => {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setStatusMessage('❌ MS 로그인이 필요합니다')
      return
    }
    setFileUploading(true)
    setStatusMessage(`📤 OneDrive 업로드 중...`)
    try {
      const uploadUrl = `${graphConfig.graphDriveEndpoint}/root:/Google RAG/${file.name}:/content`
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      })
      if (res.ok) {
        setStatusMessage(`✅ OneDrive 업로드 완료!`)
        await openOneDrive()
      } else {
        setStatusMessage(`❌ 업로드 실패`)
      }
    } catch (e: any) {
      setStatusMessage(`❌ ${e.message}`)
    } finally {
      setFileUploading(false)
    }
  }

  const openOneDrive = async () => {
    setShowOneDrive(true)
    setOneDriveLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setStatusMessage('❌ OneDrive 인증 필요')
        setOneDriveLoading(false)
        return
      }
      const googleRAGUrl = `${graphConfig.graphDriveEndpoint}/root:/Google RAG`
      const folderRes = await fetch(googleRAGUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } })
      if (folderRes.ok) {
        const folderData = await folderRes.json()
        setOneDrivePath([{ id: folderData.id, name: 'Google RAG' }])
        await fetchOneDriveItems(folderData.id)
      } else {
        setOneDrivePath([])
        await fetchOneDriveItems()
      }
    } catch (e) {
      setOneDrivePath([])
      await fetchOneDriveItems()
    }
  }

  // Auto open OneDrive when upload tab is selected
  useEffect(() => {
    if (activeTab === 'upload' && currentStore && accounts.length > 0 && !showOneDrive) {
      openOneDrive()
    }
  }, [activeTab, currentStore, accounts.length])

  const fetchOneDriveItems = async (folderId?: string) => {
    setOneDriveLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return
      const url = folderId
        ? `${graphConfig.graphDriveEndpoint}/items/${folderId}/children`
        : `${graphConfig.graphDriveEndpoint}/root/children`
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } })
      if (res.ok) {
        const data = await res.json()
        setOneDriveItems(data.value || [])
      }
    } catch (e) {
      console.error('OneDrive fetch failed:', e)
    } finally {
      setOneDriveLoading(false)
    }
  }

  const navigateToFolder = async (item: OneDriveItem) => {
    if (!item.folder) return
    setOneDrivePath(prev => [...prev, { id: item.id, name: item.name }])
    await fetchOneDriveItems(item.id)
  }

  const navigateBack = async (index: number) => {
    if (index === -1) {
      setOneDrivePath([])
      await fetchOneDriveItems()
    } else {
      const newPath = oneDrivePath.slice(0, index + 1)
      setOneDrivePath(newPath)
      await fetchOneDriveItems(newPath[newPath.length - 1].id)
    }
  }

  // Toggle file selection for store upload
  const toggleFileSelection = (item: OneDriveItem) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.id === item.id)
      if (exists) {
        return prev.filter(f => f.id !== item.id)
      }
      return [...prev, item]
    })
  }

  // Remove file from selection
  const removeFromSelection = (item: OneDriveItem) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== item.id))
  }

  // Move file to Archive folder in OneDrive
  // parentFolderId can be null for root folder
  const moveToArchive = async (item: OneDriveItem, parentFolderId: string | null): Promise<boolean> => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return false

      const archiveFolderName = 'Archive'

      // Build the correct URL for parent folder (root or specific folder)
      const parentPath = parentFolderId
        ? `${graphConfig.graphDriveEndpoint}/items/${parentFolderId}/children`
        : `${graphConfig.graphDriveEndpoint}/root/children`

      // Check if Archive folder exists in parent
      const childrenRes = await fetch(
        parentPath,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      if (!childrenRes.ok) return false

      const children = await childrenRes.json()
      let archiveFolder = children.value?.find((c: OneDriveItem) => c.name === archiveFolderName && c.folder)

      // Create Archive folder if it doesn't exist
      if (!archiveFolder) {
        const createRes = await fetch(
          parentPath,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: archiveFolderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'fail'
            })
          }
        )

        if (!createRes.ok) {
          // Maybe folder was created by another request, try to get it again
          const retryRes = await fetch(
            parentPath,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          )
          if (retryRes.ok) {
            const retryChildren = await retryRes.json()
            archiveFolder = retryChildren.value?.find((c: OneDriveItem) => c.name === archiveFolderName && c.folder)
          }
          if (!archiveFolder) return false
        } else {
          archiveFolder = await createRes.json()
        }
      }

      // Move file to Archive folder (rename if duplicate exists)
      const moveRes = await fetch(
        `${graphConfig.graphDriveEndpoint}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentReference: { id: archiveFolder.id },
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        }
      )

      if (!moveRes.ok) {
        const errorData = await moveRes.json().catch(() => ({}))
        console.error(`Failed to move ${item.name} to Archive:`, moveRes.status, errorData)
      }

      return moveRes.ok
    } catch (e) {
      console.error(`Failed to move ${item.name} to Archive:`, e)
      return false
    }
  }

  // Save selected files to store
  const saveSelectedFilesToStore = async () => {
    if (!currentStore || selectedFiles.length === 0) return
    setSavingToStore(true)
    setUploadProgress({ current: 0, total: selectedFiles.length, file: '' })

    // Get current parent folder ID for archive
    const parentFolderId = oneDrivePath.length > 0 ? oneDrivePath[oneDrivePath.length - 1].id : null

    let successCount = 0
    let archiveCount = 0
    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i]
      setUploadProgress({ current: i, total: selectedFiles.length, file: item.name })
      try {
        const accessToken = await getAccessToken()
        if (!accessToken) continue
        const downloadRes = await fetch(`${graphConfig.graphDriveEndpoint}/items/${item.id}/content`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        if (!downloadRes.ok) continue
        const blob = await downloadRes.blob()
        const file = new File([blob], item.name, { type: item.file?.mimeType || 'application/octet-stream' })
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/v1/rag/store/upload', { method: 'POST', body: formData })
        if (uploadRes.ok) {
          successCount++
          // Move to Archive after successful upload (works for both root and subfolders)
          const moved = await moveToArchive(item, parentFolderId)
          if (moved) archiveCount++
        }
      } catch (e) {
        console.error(`Failed to upload ${item.name}:`, e)
      }
    }

    setUploadProgress(null)
    setSavingToStore(false)
    setSelectedFiles([])

    // Refresh OneDrive file list (works for both root and subfolders)
    await fetchOneDriveItems(parentFolderId || undefined)

    setStatusMessage(`✅ ${successCount}개 저장, ${archiveCount}개 Archive로 이동됨`)
    fetchStoreDocuments()
    if (successCount > 0) setActiveTab('docs')
  }

  // OneDrive 파일 삭제 요청 (Confirm Modal 표시)
  const requestDeleteOneDriveFile = (item: OneDriveItem) => {
    setConfirmModal({
      show: true,
      title: 'OneDrive 파일 삭제',
      message: `"${item.name}" 파일을 삭제하시겠습니까?`,
      subMessage: 'OneDrive에서 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      onConfirm: () => executeDeleteOneDriveFile(item)
    })
  }

  // 실제 OneDrive 파일 삭제 실행
  const executeDeleteOneDriveFile = async (item: OneDriveItem) => {
    setConfirmModal(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setAlertModal({
          show: true,
          type: 'error',
          title: '삭제 실패',
          message: 'MS 로그인이 필요합니다.'
        })
        return
      }

      const deleteUrl = `${graphConfig.graphDriveEndpoint}/items/${item.id}`
      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (res.ok || res.status === 204) {
        setAlertModal({
          show: true,
          type: 'success',
          title: '삭제 완료',
          message: `"${item.name}" 파일이 OneDrive에서 삭제되었습니다.`
        })
        // 선택 목록에서도 제거
        setSelectedFiles(prev => prev.filter(f => f.id !== item.id))
        // 파일 목록 새로고침
        const lastFolder = oneDrivePath.length > 0 ? oneDrivePath[oneDrivePath.length - 1].id : undefined
        await fetchOneDriveItems(lastFolder)
      } else {
        const errorData = await res.json().catch(() => ({}))
        setAlertModal({
          show: true,
          type: 'error',
          title: '삭제 실패',
          message: errorData.error?.message || 'OneDrive 파일 삭제에 실패했습니다.'
        })
      }
    } catch (e: any) {
      setAlertModal({
        show: true,
        type: 'error',
        title: '삭제 실패',
        message: e.message || 'OneDrive 파일 삭제 중 오류가 발생했습니다.'
      })
    }
  }

  const uploadFromOneDrive = async (item: OneDriveItem) => {
    if (!currentStore) {
      setStatusMessage('❌ 먼저 스토어를 선택하세요')
      return
    }
    setUploadProgress({ current: 0, total: 1, file: item.name })
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return
      const downloadRes = await fetch(`${graphConfig.graphDriveEndpoint}/items/${item.id}/content`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!downloadRes.ok) {
        setStatusMessage(`❌ 다운로드 실패`)
        return
      }
      const blob = await downloadRes.blob()
      const file = new File([blob], item.name, { type: item.file?.mimeType || 'application/octet-stream' })
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/v1/rag/store/upload', { method: 'POST', body: formData })
      if (uploadRes.ok) {
        setStatusMessage(`✅ 스토어에 저장됨!`)
        fetchStoreDocuments()
        setActiveTab('docs')
      } else {
        setStatusMessage(`❌ 업로드 실패`)
      }
    } catch (e: any) {
      setStatusMessage(`❌ ${e.message}`)
    } finally {
      setUploadProgress(null)
    }
  }

  const getStoreDisplayName = (storeName?: string) => {
    const name = storeName || currentStore
    if (!name) return ''
    const store = stores.find(s => s.name === name)
    return store?.displayName || name.split('/').pop() || ''
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
    }}>
      {/* Header - TNTChat과 동일한 다크 스타일 */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59,130,246,0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
          position: 'relative'
        }}>
          <Settings size={22} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>RAG Manager</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Store & Document Control</p>
        </div>
        {/* MS Account */}
        {accounts.length > 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 12, fontWeight: 500,
            position: 'relative'
          }}>
            <User size={14} style={{ opacity: 0.8 }} />
            <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {accounts[0].username?.split('@')[0]}
            </span>
            <button onClick={handleMsLogout} style={{
              padding: 4, background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: 5, color: '#fff',
              cursor: 'pointer', marginLeft: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button onClick={handleMsLogin} disabled={inProgress !== InteractionStatus.None}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12, fontWeight: 500,
              color: '#fff', cursor: 'pointer',
              position: 'relative'
            }}>
            <LogIn size={14} /> MS 로그인
          </button>
        )}
      </div>

      {/* Status Message - Modern Toast Style */}
      {statusMessage && (
        <div style={{
          margin: '12px 12px 0',
          padding: '10px 14px',
          fontSize: 12, fontWeight: 500,
          background: statusMessage.includes('✅') ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                    : statusMessage.includes('❌') ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          color: statusMessage.includes('✅') ? '#047857' : statusMessage.includes('❌') ? '#b91c1c' : '#1d4ed8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: statusMessage.includes('✅') ? '1px solid rgba(16,185,129,0.2)'
                : statusMessage.includes('❌') ? '1px solid rgba(239,68,68,0.2)'
                : '1px solid rgba(59,130,246,0.2)'
        }}>
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} style={{
            background: 'rgba(0,0,0,0.08)', border: 'none',
            borderRadius: 5, cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Tabs - Modern Pill Style */}
      <div style={{
        display: 'flex', gap: 6,
        padding: '12px 12px 0',
        background: 'transparent'
      }}>
        {[
          { key: 'store', label: '스토어', icon: Database },
          { key: 'docs', label: '문서', icon: FileText },
          { key: 'upload', label: '업로드', icon: Upload }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1, padding: '10px 8px',
              border: 'none',
              borderRadius: 10,
              background: activeTab === tab.key
                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                : '#fff',
              color: activeTab === tab.key ? '#fff' : '#64748b',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: activeTab === tab.key
                ? '0 4px 12px rgba(59,130,246,0.3)'
                : '0 2px 6px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {/* Store Tab */}
        {activeTab === 'store' && (
          <div>
            {/* Create new store - Modern Input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', gap: 8,
                padding: 6,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="새 스토어 이름"
                  style={{
                    flex: 1, padding: '10px 14px',
                    border: 'none', borderRadius: 8,
                    fontSize: 12, background: '#f8fafc',
                    outline: 'none'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && createStore()}
                />
                <button
                  onClick={createStore}
                  disabled={!newStoreName.trim() || storeLoading}
                  style={{
                    padding: '10px 14px',
                    background: !newStoreName.trim() || storeLoading
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    boxShadow: !newStoreName.trim() || storeLoading
                      ? 'none'
                      : '0 2px 8px rgba(59,130,246,0.3)'
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Current store info - Modern Card */}
            {currentStore && (
              <div style={{
                marginBottom: 16,
                padding: 16,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background Pattern */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'radial-gradient(circle at 100% 0%, rgba(59,130,246,0.2) 0%, transparent 50%)',
                  pointerEvents: 'none'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
                  }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2, letterSpacing: '0.05em' }}>ACTIVE STORE</div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{getStoreDisplayName()}</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 10,
                  fontSize: 12, fontWeight: 500,
                  position: 'relative'
                }}>
                  <FileText size={14} style={{ opacity: 0.8 }} />
                  <span>{storeDocuments.length}개 문서 연결됨</span>
                </div>
              </div>
            )}

            <div style={{
              fontSize: 12, fontWeight: 600, color: '#475569',
              marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span>전체 스토어 ({stores.length})</span>
              <button onClick={fetchStores} style={{
                padding: 6, background: '#f1f5f9', border: 'none',
                borderRadius: 6, cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <RefreshCw size={12} />
              </button>
            </div>

            {storeLoading ? (
              <div style={{ padding: 30, textAlign: 'center' }}>
                <Loader2 size={24} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stores.map(store => (
                  <div
                    key={store.name}
                    onClick={() => selectStore(store.name)}
                    style={{
                      padding: 12, borderRadius: 10, cursor: 'pointer',
                      background: store.name === currentStore
                        ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                        : '#fff',
                      border: store.name === currentStore ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      boxShadow: store.name === currentStore
                        ? '0 4px 12px rgba(59,130,246,0.15)'
                        : '0 2px 6px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: store.name === currentStore
                          ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                          : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {store.name === currentStore ? (
                          <CheckCircle size={14} style={{ color: '#fff' }} />
                        ) : (
                          <Database size={14} style={{ color: '#94a3b8' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: store.name === currentStore ? 600 : 500,
                        color: store.name === currentStore ? '#1e40af' : '#475569'
                      }}>
                        {store.displayName}
                      </span>
                    </div>
                    <button
                      onClick={(e) => requestDeleteStore(store.name, e)}
                      style={{
                        padding: 6, background: '#fef2f2', border: 'none',
                        borderRadius: 6, cursor: 'pointer', color: '#ef4444',
                        opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div>
            {/* 선택된 스토어 표시 - 스토어 탭과 동일한 스타일 */}
            {currentStore && (
              <div style={{
                marginBottom: 16,
                padding: 16,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background Pattern */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'radial-gradient(circle at 100% 0%, rgba(59,130,246,0.2) 0%, transparent 50%)',
                  pointerEvents: 'none'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
                  }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2, letterSpacing: '0.05em' }}>ACTIVE STORE</div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{getStoreDisplayName()}</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 10,
                  fontSize: 12, fontWeight: 500,
                  position: 'relative'
                }}>
                  <FileText size={14} style={{ opacity: 0.8 }} />
                  <span>{storeDocuments.length}개 문서 연결됨</span>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                스토어 문서 ({storeDocuments.length})
              </div>
              <button onClick={() => fetchStoreDocuments()} style={{
                padding: 6, background: '#f1f5f9', border: 'none',
                borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <RefreshCw size={12} style={{ color: '#64748b' }} />
              </button>
            </div>

            {!currentStore ? (
              <div style={{
                padding: 40, textAlign: 'center',
                background: '#fff', borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16,
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Database size={28} style={{ color: '#94a3b8' }} />
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>먼저 스토어를 선택하세요</div>
              </div>
            ) : docLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Loader2 size={28} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : storeDocuments.length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center',
                background: '#fff', borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16,
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <FileText size={28} style={{ color: '#0ea5e9' }} />
                </div>
                <div style={{ fontSize: 14, color: '#475569', fontWeight: 600, marginBottom: 4 }}>문서가 없습니다</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>업로드 탭에서 문서를 추가하세요</div>
                <button
                  onClick={() => setActiveTab('upload')}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                  }}
                >
                  문서 업로드
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {storeDocuments.map((doc, idx) => (
                  <div key={doc.name} style={{
                    padding: 12, background: '#fff', borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: '#1e293b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {doc.displayName}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {(parseInt(doc.sizeBytes) / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 8px', fontSize: 9, borderRadius: 5, fontWeight: 600,
                      background: doc.state === 'STATE_ACTIVE'
                        ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                        : '#fef3c7',
                      color: doc.state === 'STATE_ACTIVE' ? '#15803d' : '#92400e'
                    }}>
                      {doc.state === 'STATE_ACTIVE' ? 'Active' : doc.state}
                    </span>
                    <button onClick={() => requestDeleteDocument(doc.name)} style={{
                      padding: 6, background: '#fef2f2', border: 'none',
                      borderRadius: 6, cursor: 'pointer', color: '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab - Simplified UI with Timeline */}
        {activeTab === 'upload' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {!currentStore ? (
              <div style={{
                padding: 24, textAlign: 'center',
                background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1'
              }}>
                <Database size={32} style={{ color: '#94a3b8', marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: '#64748b' }}>먼저 스토어를 선택하세요</div>
              </div>
            ) : (
              <>
                {/* 선택된 스토어 표시 */}
                <div style={{
                  padding: '10px 12px', marginBottom: 16,
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: 8, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <Database size={16} style={{ opacity: 0.8 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{getStoreDisplayName()}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{storeDocuments.length}개 문서</span>
                </div>

                {/* Timeline Container */}
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  {/* Vertical Line */}
                  <div style={{
                    position: 'absolute', left: 7, top: 12, bottom: 12,
                    width: 2, background: 'linear-gradient(180deg, #3b82f6 0%, #0ea5e9 50%, #10b981 100%)',
                    borderRadius: 1
                  }} />

                  {/* Step 1: 로컬 파일 업로드 */}
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{
                      position: 'absolute', left: -24, top: 8,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#3b82f6', border: '2px solid #dbeafe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#fff'
                    }}>
                      1
                    </div>
                    <div
                      onClick={accounts.length > 0 ? () => fileInputRef.current?.click() : handleMsLogin}
                      style={{
                        padding: '10px 12px', background: '#fff', borderRadius: 8,
                        border: '1px solid #e2e8f0', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10
                      }}
                    >
                      <Upload size={16} style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        {fileUploading ? '업로드 중...' : accounts.length > 0 ? '로컬 파일 → OneDrive' : 'MS 로그인 필요'}
                      </span>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" onChange={(e) => { if (e.target.files?.[0]) uploadFileToOneDrive(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />

                  {/* Arrow 1→2 */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, marginLeft: -12 }}>
                    <ChevronDown size={16} style={{ color: '#94a3b8' }} />
                  </div>

                  {/* Step 2: OneDrive 파일 선택 */}
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{
                      position: 'absolute', left: -24, top: 8,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#0ea5e9', border: '2px solid #e0f2fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#fff'
                    }}>
                      2
                    </div>
                    <div style={{
                      background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                      {/* OneDrive 타이틀 */}
                      <div style={{
                        padding: '10px 12px',
                        background: 'linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)',
                        display: 'flex', alignItems: 'center', gap: 8
                      }}>
                        <Cloud size={16} style={{ color: '#fff' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>OneDrive</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 'auto' }}>파일 선택</span>
                      </div>
                      <div style={{
                        padding: '8px 12px', background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        {showOneDrive ? (
                          <>
                            <button onClick={() => navigateBack(-1)} style={{
                              padding: '2px 8px', background: oneDrivePath.length === 0 ? '#0ea5e9' : '#fff',
                              color: oneDrivePath.length === 0 ? '#fff' : '#64748b',
                              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11
                            }}>Root</button>
                            {oneDrivePath.map((p, idx) => (
                              <React.Fragment key={p.id}>
                                <ChevronRight size={10} style={{ color: '#94a3b8' }} />
                                <button onClick={() => navigateBack(idx)} style={{
                                  padding: '2px 8px', background: idx === oneDrivePath.length - 1 ? '#0ea5e9' : '#fff',
                                  color: idx === oneDrivePath.length - 1 ? '#fff' : '#64748b',
                                  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11
                                }}>{p.name}</button>
                              </React.Fragment>
                            ))}
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                              <button onClick={() => {
                                const lastFolder = oneDrivePath.length > 0 ? oneDrivePath[oneDrivePath.length - 1].id : undefined
                                fetchOneDriveItems(lastFolder)
                              }} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <RefreshCw size={12} style={{ color: '#64748b' }} />
                              </button>
                              <button onClick={() => setShowOneDrive(false)} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={12} style={{ color: '#64748b' }} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button onClick={accounts.length > 0 ? openOneDrive : handleMsLogin} style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: '#0ea5e9', fontWeight: 500
                          }}>
                            {accounts.length > 0 ? 'OneDrive 열기' : 'MS 로그인'}
                          </button>
                        )}
                      </div>
                      {uploadProgress && (
                        <div style={{ padding: '6px 12px', background: '#fef3c7', fontSize: 11, color: '#92400e' }}>
                          {uploadProgress.file} ({uploadProgress.current + 1}/{uploadProgress.total})
                        </div>
                      )}
                      {showOneDrive && (
                        <div style={{ maxHeight: 180, overflow: 'auto' }}>
                          {oneDriveLoading ? (
                            <div style={{ padding: 16, textAlign: 'center' }}>
                              <Loader2 size={18} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                            </div>
                          ) : oneDriveItems.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>빈 폴더</div>
                          ) : (
                            <>
                              {oneDriveItems.filter(i => i.folder).map(item => (
                                <div key={item.id} onClick={() => navigateToFolder(item)} style={{
                                  padding: '8px 12px', borderBottom: '1px solid #f1f5f9',
                                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
                                }}>
                                  <Folder size={14} style={{ color: '#0ea5e9' }} />
                                  <span style={{ flex: 1, fontSize: 12, color: '#374151' }}>{item.name}</span>
                                  <ChevronRight size={12} style={{ color: '#94a3b8' }} />
                                </div>
                              ))}
                              {oneDriveItems.filter(i => i.file).map(item => {
                                const isSelected = selectedFiles.some(f => f.id === item.id)
                                return (
                                  <div key={item.id} style={{
                                    padding: '8px 12px', borderBottom: '1px solid #f1f5f9',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: isSelected ? '#eff6ff' : 'transparent'
                                  }}>
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleFileSelection(item)}
                                      style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#3b82f6' }} />
                                    <FileText size={14} style={{ color: isSelected ? '#3b82f6' : '#94a3b8' }} />
                                    <span style={{ flex: 1, fontSize: 12, color: isSelected ? '#1d4ed8' : '#374151',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); requestDeleteOneDriveFile(item) }}
                                      style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                      <Trash2 size={12} style={{ color: '#ef4444' }} />
                                    </button>
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow 2→3 */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, marginLeft: -12 }}>
                    <ChevronDown size={16} style={{ color: '#94a3b8' }} />
                  </div>

                  {/* Step 3: 스토어 저장 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: -24, top: 8,
                      width: 18, height: 18, borderRadius: '50%',
                      background: selectedFiles.length > 0 ? '#10b981' : '#d1d5db',
                      border: `2px solid ${selectedFiles.length > 0 ? '#dcfce7' : '#f3f4f6'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#fff'
                    }}>
                      3
                    </div>
                    {selectedFiles.length === 0 ? (
                      <div style={{
                        padding: '12px', background: '#f9fafb', borderRadius: 8,
                        border: '1px dashed #d1d5db', textAlign: 'center',
                        fontSize: 12, color: '#9ca3af'
                      }}>
                        OneDrive에서 파일을 선택하세요
                      </div>
                    ) : (
                      <div style={{
                        background: '#fff', borderRadius: 8, border: '1px solid #10b981', overflow: 'hidden'
                      }}>
                        <div style={{ padding: '8px 12px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46' }}>
                            선택됨 ({selectedFiles.length})
                          </span>
                        </div>
                        <div style={{ maxHeight: 80, overflow: 'auto' }}>
                          {selectedFiles.map((item, idx) => (
                            <div key={item.id} style={{
                              padding: '6px 12px', borderBottom: '1px solid #f1f5f9',
                              display: 'flex', alignItems: 'center', gap: 8, fontSize: 11
                            }}>
                              <span style={{ color: '#10b981', fontWeight: 600 }}>{idx + 1}</span>
                              <span style={{ flex: 1, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                              <button onClick={() => removeFromSelection(item)} disabled={savingToStore}
                                style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={12} style={{ color: '#ef4444' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: 10 }}>
                          <button onClick={saveSelectedFilesToStore} disabled={savingToStore}
                            style={{
                              width: '100%', padding: '10px',
                              background: savingToStore ? '#9ca3af' : '#10b981',
                              color: '#fff', border: 'none', borderRadius: 8,
                              fontSize: 13, fontWeight: 600, cursor: savingToStore ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                            {savingToStore ? (
                              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 저장 중...</>
                            ) : (
                              <><CheckCircle size={14} /> 스토어에 저장</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 표준 UI Confirm Modal - StandardUICD2 참조 */}
      {confirmModal?.show && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 12,
            width: '100%', maxWidth: 400,
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: '#1f2937' }}>
                {confirmModal.title}
              </h3>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                {confirmModal.message}
              </p>
              {confirmModal.subMessage && (
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8, marginBottom: 0 }}>
                  {confirmModal.subMessage}
                </p>
              )}
            </div>
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'flex-end', gap: 8
            }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151'
                }}
              >
                취소
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 표준 UI Alert Modal - StandardUICD2 참조 */}
      {alertModal?.show && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 12,
            width: '100%', maxWidth: 360,
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: 28, textAlign: 'center' }}>
              {/* Icon based on type */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: alertModal.type === 'success' ? '#10b981' :
                            alertModal.type === 'error' ? '#ef4444' : '#f59e0b',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 26
              }}>
                {alertModal.type === 'success' ? '✓' :
                 alertModal.type === 'error' ? '✕' : '!'}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>
                {alertModal.title}
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                {alertModal.message}
              </p>
            </div>
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'center'
            }}>
              <button
                onClick={() => setAlertModal(null)}
                style={{
                  padding: '10px 32px',
                  background: alertModal.type === 'success' ? '#10b981' :
                              alertModal.type === 'error' ? '#ef4444' : '#f59e0b',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
      `}</style>
    </div>
  )
}
