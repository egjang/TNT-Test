import React, { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, FileText, AlertCircle, Upload, LogIn, LogOut, User, Cloud,
  ExternalLink, MessageSquare, Plus, Trash2, Bot, UserCircle, Copy, Check,
  FileUp, X, List, Database, RefreshCw, CheckCircle, FolderOpen, ArrowRight,
  ChevronRight, ChevronDown, Folder, FolderArchive
} from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { graphScopes, graphConfig } from '../../config/msalConfig'

type Citation = {
  title: string
  uri: string
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
}

type UploadedDoc = {
  id: string
  fileName: string
  contentLength: number
  uploadedAt: number
}

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
  lastModifiedDateTime?: string
  parentReference?: { path: string }
}

type OneDriveBatchProgress = {
  total: number
  current: number
  currentFile: string
  completed: string[]
  failed: string[]
}

export function GoogleRAG() {
  // Chat states
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  // Document states
  const [documents, setDocuments] = useState<UploadedDoc[]>([])
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [docUploading, setDocUploading] = useState(false)

  // OneDrive upload states
  const { instance, accounts, inProgress } = useMsal()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docFileInputRef = useRef<HTMLInputElement>(null)
  const storeFileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // FileSearchStore states
  const [stores, setStores] = useState<FileSearchStore[]>([])
  const [currentStore, setCurrentStore] = useState<string>('')
  const [showStorePanel, setShowStorePanel] = useState(false)
  const [storeLoading, setStoreLoading] = useState(false)
  const [storeFileUploading, setStoreFileUploading] = useState(false)
  const [storeDocuments, setStoreDocuments] = useState<StoreDocument[]>([])
  const [showStoreDocuments, setShowStoreDocuments] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')

  // OneDrive folder browser states
  const [showOneDrivePanel, setShowOneDrivePanel] = useState(false)
  const [oneDriveItems, setOneDriveItems] = useState<OneDriveItem[]>([])
  const [oneDrivePath, setOneDrivePath] = useState<{ id: string; name: string }[]>([])
  const [oneDriveLoading, setOneDriveLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState<OneDriveBatchProgress | null>(null)

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Load documents and stores on mount
  useEffect(() => {
    fetchDocuments()
    fetchStores()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/v1/rag/documents')
      const data = await res.json()
      if (data.documents) {
        setDocuments(data.documents)
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e)
    }
  }

  // FileSearchStore functions
  const fetchStores = async () => {
    try {
      const res = await fetch('/api/v1/rag/stores')
      const data = await res.json()
      if (data.stores) {
        setStores(data.stores)
        setCurrentStore(data.currentStore || '')
      }
    } catch (e) {
      console.error('Failed to fetch stores:', e)
    }
  }

  const createStore = async () => {
    if (!newStoreName.trim()) {
      setUploadStatus('❌ 스토어 이름을 입력하세요')
      return
    }
    setStoreLoading(true)
    try {
      const displayName = newStoreName.trim()
      const res = await fetch('/api/v1/rag/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      })
      const data = await res.json()
      if (data.success) {
        setUploadStatus(`✅ FileSearchStore "${displayName}" 생성 완료!`)
        setNewStoreName('')
        fetchStores()
      } else {
        setUploadStatus(`❌ Store 생성 실패: ${data.error}`)
      }
    } catch (e: any) {
      setUploadStatus(`❌ Store 생성 실패: ${e.message}`)
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
        setUploadStatus(`✅ Store 선택됨: ${storeName.split('/').pop()}`)
      }
    } catch (e: any) {
      setUploadStatus(`❌ Store 선택 실패: ${e.message}`)
    }
  }

  const deleteStore = async (storeName: string, displayName: string) => {
    // Confirm deletion
    if (!window.confirm(`"${displayName}" 스토어를 삭제하시겠습니까?\n\n⚠️ 스토어 내 모든 파일이 함께 삭제됩니다.`)) {
      return
    }

    setStoreLoading(true)
    try {
      // Extract just the store ID from the full name (e.g., "fileSearchStores/storeid-xxx" -> "storeid-xxx")
      const storeId = storeName.split('/').pop()
      const res = await fetch(`/api/v1/rag/store/${storeId}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (data.success) {
        setUploadStatus(`✅ "${displayName}" 스토어가 삭제되었습니다.`)
        // If deleted store was current, clear selection
        if (storeName === currentStore) {
          setCurrentStore('')
          setStoreDocuments([])
          setShowStoreDocuments(false)
        }
        fetchStores()
      } else {
        setUploadStatus(`❌ 스토어 삭제 실패: ${data.error || data.message}`)
      }
    } catch (e: any) {
      setUploadStatus(`❌ 스토어 삭제 실패: ${e.message}`)
    } finally {
      setStoreLoading(false)
    }
  }

  const uploadFileToStore = async (file: File) => {
    if (!currentStore) {
      setUploadStatus('❌ 먼저 FileSearchStore를 선택하세요')
      return
    }
    setStoreFileUploading(true)
    setUploadStatus(`📤 "${file.name}" 업로드 중... (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/v1/rag/store/upload', {
        method: 'POST',
        body: formData
      })

      // Check if response is ok first
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `HTTP ${res.status}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        setUploadStatus(`❌ 업로드 실패: ${errorMessage}`)
        return
      }

      const data = await res.json()

      if (data.success) {
        setUploadStatus(`✅ "${file.name}" FileSearchStore에 업로드 완료!`)
        // Refresh documents list if showing
        if (showStoreDocuments) {
          fetchStoreDocuments()
        }
      } else {
        setUploadStatus(`❌ 업로드 실패: ${data.error || data.details || data.message}`)
      }
    } catch (e: any) {
      console.error('Upload error:', e)
      // Provide more helpful error message for common issues
      if (e.message === 'Failed to fetch') {
        setUploadStatus(`❌ 업로드 실패: 서버 연결 오류. 파일 크기가 너무 크거나 서버가 응답하지 않습니다.`)
      } else {
        setUploadStatus(`❌ 업로드 실패: ${e.message}`)
      }
    } finally {
      setStoreFileUploading(false)
    }
  }

  const handleStoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFileToStore(file)
    e.target.value = ''
  }

  // Fetch documents in the current FileSearchStore
  const fetchStoreDocuments = async () => {
    if (!currentStore) {
      setUploadStatus('❌ 먼저 FileSearchStore를 선택하세요')
      return
    }
    try {
      const res = await fetch('/api/v1/rag/store/documents')
      const data = await res.json()
      if (data.documents) {
        setStoreDocuments(data.documents)
        setShowStoreDocuments(true)
      } else if (data.error) {
        setUploadStatus(`❌ ${data.error}`)
      }
    } catch (e: any) {
      setUploadStatus(`❌ 문서 목록 조회 실패: ${e.message}`)
    }
  }

  // Delete a document from FileSearchStore (also removes vector embeddings)
  const deleteStoreDocument = async (documentName: string, displayName: string) => {
    if (!window.confirm(`"${displayName}" 문서를 삭제하시겠습니까?\n\n벡터 임베딩도 함께 삭제됩니다.`)) {
      return
    }

    try {
      // Extract just the document ID from full name (e.g., "fileSearchStores/xxx/documents/docid" -> "docid")
      const docId = documentName.split('/').pop()
      const res = await fetch(`/api/v1/rag/store/document/${docId}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (data.success) {
        setUploadStatus(`✅ "${displayName}" 문서가 삭제되었습니다.`)
        // Refresh document list
        fetchStoreDocuments()
      } else {
        setUploadStatus(`❌ 문서 삭제 실패: ${data.error || data.message}`)
      }
    } catch (e: any) {
      setUploadStatus(`❌ 문서 삭제 실패: ${e.message}`)
    }
  }

  // Create chat session
  const createSession = async () => {
    try {
      const res = await fetch('/api/v1/rag/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (data.sessionId) {
        setSessionId(data.sessionId)
        setMessages([])
        setError(null)
        setUploadStatus(data.message) // Show message about included documents
      }
    } catch (e: any) {
      setError('세션 생성 실패: ' + e.message)
    }
  }

  // Send message with streaming
  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError(null)
    setStreamingContent('')

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    try {
      // Use streaming endpoint
      const url = sessionId
        ? `/api/v1/rag/chat/${sessionId}/stream?message=${encodeURIComponent(userMessage)}`
        : `/api/v1/rag/query/stream?question=${encodeURIComponent(userMessage)}`

      const eventSource = new EventSource(url)
      let fullContent = ''
      let receivedCitations: Citation[] = []

      eventSource.addEventListener('content', (e) => {
        fullContent += e.data
        setStreamingContent(fullContent)
      })

      eventSource.addEventListener('citations', (e) => {
        try {
          receivedCitations = JSON.parse(e.data)
        } catch (err) {
          console.error('Failed to parse citations:', err)
        }
      })

      eventSource.addEventListener('done', () => {
        eventSource.close()
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
          citations: receivedCitations.length > 0 ? receivedCitations : undefined
        }])
        setStreamingContent('')
        setLoading(false)
      })

      eventSource.addEventListener('error', (e: any) => {
        eventSource.close()
        setError(e.data || '스트리밍 오류')
        setLoading(false)
        setStreamingContent('')
      })

      eventSource.onerror = () => {
        eventSource.close()
        if (fullContent) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fullContent,
            timestamp: new Date()
          }])
        }
        setStreamingContent('')
        setLoading(false)
      }
    } catch (e: any) {
      setError(e.message || '메시지 전송 실패')
      setLoading(false)
    }
  }

  // Upload document to RAG backend
  const uploadDocToRAG = async (file: File) => {
    setDocUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/v1/rag/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success) {
        fetchDocuments()
        setUploadStatus(`✅ "${file.name}" RAG에 업로드 완료!`)
      } else {
        setUploadStatus(`❌ 업로드 실패: ${data.error}`)
      }
    } catch (e: any) {
      setUploadStatus(`❌ 업로드 실패: ${e.message}`)
    } finally {
      setDocUploading(false)
    }
  }

  // Delete document
  const deleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/v1/rag/documents/${docId}`, { method: 'DELETE' })
      fetchDocuments()
    } catch (e) {
      console.error('Failed to delete document:', e)
    }
  }

  // Copy message to clipboard
  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  // Microsoft login handler
  const handleMsLogin = async () => {
    try {
      await instance.loginPopup({ scopes: graphScopes.oneDrive })
    } catch (e: any) {
      console.error('MS Login failed:', e)
      setUploadStatus(`로그인 실패: ${e.message}`)
    }
  }

  // Microsoft logout handler
  const handleMsLogout = async () => {
    try {
      await instance.logoutPopup()
      setUploadStatus(null)
    } catch (e: any) {
      console.error('MS Logout failed:', e)
    }
  }

  // Get access token for Graph API
  const getAccessToken = async () => {
    if (accounts.length === 0) return null
    try {
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes.oneDrive,
        account: accounts[0],
      })
      return response.accessToken
    } catch (e) {
      try {
        const response = await instance.acquireTokenPopup({ scopes: graphScopes.oneDrive })
        return response.accessToken
      } catch (e2: any) {
        console.error('Token acquisition failed:', e2)
        return null
      }
    }
  }

  // Fetch OneDrive folder contents
  const fetchOneDriveItems = async (folderId?: string) => {
    setOneDriveLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setUploadStatus('❌ OneDrive 인증이 필요합니다. 다시 로그인해주세요.')
        setOneDriveLoading(false)
        return
      }

      // Build URL for folder contents
      const url = folderId
        ? `${graphConfig.graphDriveEndpoint}/items/${folderId}/children`
        : `${graphConfig.graphDriveEndpoint}/root/children`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setOneDriveItems(data.value || [])
    } catch (e: any) {
      console.error('Failed to fetch OneDrive items:', e)
      setUploadStatus(`❌ OneDrive 폴더 조회 실패: ${e.message}`)
    } finally {
      setOneDriveLoading(false)
    }
  }

  // Navigate to a folder in OneDrive
  const navigateToFolder = async (item: OneDriveItem) => {
    if (!item.folder) return
    setOneDrivePath(prev => [...prev, { id: item.id, name: item.name }])
    await fetchOneDriveItems(item.id)
  }

  // Navigate back in OneDrive folder hierarchy
  const navigateBack = async (index: number) => {
    if (index === -1) {
      // Go to root
      setOneDrivePath([])
      await fetchOneDriveItems()
    } else {
      const newPath = oneDrivePath.slice(0, index + 1)
      setOneDrivePath(newPath)
      await fetchOneDriveItems(newPath[newPath.length - 1].id)
    }
  }

  // Download file from OneDrive and upload to RAG Store
  const downloadAndUploadToStore = async (item: OneDriveItem): Promise<boolean> => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return false

      // Download file content from OneDrive
      // Note: Use default redirect behavior (follow) - browser will automatically follow 302 redirect
      // Using redirect: 'manual' doesn't work due to CORS blocking access to Location header
      const downloadRes = await fetch(
        `${graphConfig.graphDriveEndpoint}/items/${item.id}/content`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )

      if (!downloadRes.ok) {
        console.error(`Failed to download ${item.name}: HTTP ${downloadRes.status}`)
        return false
      }

      // Get file content as blob
      const blob = await downloadRes.blob()
      const file = new File([blob], item.name, { type: item.file?.mimeType || 'application/octet-stream' })

      // Upload to RAG Store
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/v1/rag/store/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error(`Failed to upload ${item.name} to RAG Store: ${errorText}`)
        return false
      }

      return true
    } catch (e) {
      console.error(`Failed to download/upload ${item.name}:`, e)
      return false
    }
  }

  // Move file to Archive folder in OneDrive
  const moveToArchive = async (item: OneDriveItem, parentFolderId: string): Promise<boolean> => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return false

      // First, try to find or create Archive folder
      const archiveFolderName = 'Archive'

      // Check if Archive folder exists in parent
      const childrenRes = await fetch(
        `${graphConfig.graphDriveEndpoint}/items/${parentFolderId}/children`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )

      if (!childrenRes.ok) return false

      const children = await childrenRes.json()
      let archiveFolder = children.value?.find((c: OneDriveItem) => c.name === archiveFolderName && c.folder)

      // Create Archive folder if it doesn't exist
      if (!archiveFolder) {
        const createRes = await fetch(
          `${graphConfig.graphDriveEndpoint}/items/${parentFolderId}/children`,
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
            `${graphConfig.graphDriveEndpoint}/items/${parentFolderId}/children`,
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

      // Move file to Archive folder
      const moveRes = await fetch(
        `${graphConfig.graphDriveEndpoint}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentReference: { id: archiveFolder.id }
          })
        }
      )

      return moveRes.ok
    } catch (e) {
      console.error(`Failed to move ${item.name} to Archive:`, e)
      return false
    }
  }

  // Process all files in current folder - upload to RAG Store and move to Archive
  const processOneDriveFolder = async () => {
    if (!currentStore) {
      setUploadStatus('❌ 먼저 Google RAG Store를 선택하세요')
      return
    }

    const files = oneDriveItems.filter(item => item.file && !item.folder)
    if (files.length === 0) {
      setUploadStatus('❌ 현재 폴더에 파일이 없습니다')
      return
    }

    const parentFolderId = oneDrivePath.length > 0
      ? oneDrivePath[oneDrivePath.length - 1].id
      : 'root'

    setBatchProgress({
      total: files.length,
      current: 0,
      currentFile: '',
      completed: [],
      failed: []
    })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      setBatchProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentFile: file.name
      } : null)

      // Upload to RAG Store
      const uploadSuccess = await downloadAndUploadToStore(file)

      if (uploadSuccess) {
        // Move to Archive folder
        const moveSuccess = await moveToArchive(file, parentFolderId)

        setBatchProgress(prev => prev ? {
          ...prev,
          completed: moveSuccess
            ? [...prev.completed, file.name]
            : prev.completed,
          failed: !moveSuccess
            ? [...prev.failed, `${file.name} (Archive 이동 실패)`]
            : prev.failed
        } : null)
      } else {
        setBatchProgress(prev => prev ? {
          ...prev,
          failed: [...prev.failed, `${file.name} (업로드 실패)`]
        } : null)
      }
    }

    // Refresh folder contents
    await fetchOneDriveItems(parentFolderId === 'root' ? undefined : parentFolderId)

    // Refresh store documents if showing
    if (showStoreDocuments) {
      fetchStoreDocuments()
    }

    const finalProgress = batchProgress
    if (finalProgress) {
      setUploadStatus(`✅ 완료: ${finalProgress.completed.length}개 성공, ${finalProgress.failed.length}개 실패`)
    }
  }

  // Open OneDrive panel - default to "Google RAG" folder
  const openOneDrivePanel = async () => {
    setShowOneDrivePanel(true)
    setOneDriveLoading(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setUploadStatus('❌ OneDrive 인증이 필요합니다. 다시 로그인해주세요.')
        setOneDriveLoading(false)
        return
      }

      // Try to navigate to "Google RAG" folder by path
      const googleRAGUrl = `${graphConfig.graphDriveEndpoint}/root:/Google RAG`
      const folderRes = await fetch(googleRAGUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (folderRes.ok) {
        const folderData = await folderRes.json()
        // Set path to Google RAG folder
        setOneDrivePath([{ id: folderData.id, name: 'Google RAG' }])
        // Fetch contents of Google RAG folder
        await fetchOneDriveItems(folderData.id)
      } else {
        // Google RAG folder doesn't exist, show root
        setOneDrivePath([])
        await fetchOneDriveItems()
        setUploadStatus('💡 "Google RAG" 폴더가 없습니다. Root에서 시작합니다.')
      }
    } catch (e: any) {
      console.error('Failed to open OneDrive panel:', e)
      setOneDrivePath([])
      await fetchOneDriveItems()
    }
  }

  // Upload file to OneDrive
  const uploadToOneDrive = async (file: File) => {
    setUploading(true)
    setUploadStatus('업로드 준비 중...')

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setUploadStatus('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.')
        setUploading(false)
        return
      }

      setUploadStatus(`"${file.name}" OneDrive 업로드 중...`)

      const uploadUrl = `${graphConfig.graphDriveEndpoint}/root:/Google RAG/${encodeURIComponent(file.name)}:/content`

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      setUploadStatus(`✅ "${file.name}" OneDrive 업로드 완료!`)
    } catch (e: any) {
      console.error('Upload failed:', e)
      setUploadStatus(`❌ 업로드 실패: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadToOneDrive(file)
    e.target.value = ''
  }

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadDocToRAG(file)
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageSquare size={24} style={{ color: '#3b82f6' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Google RAG Chat</h1>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>
                Gemini 기반 문서 RAG 채팅
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Session indicator */}
            {sessionId && (
              <span style={{ fontSize: 11, color: '#22c55e', background: '#f0fdf4', padding: '4px 8px', borderRadius: 4 }}>
                세션 활성화
              </span>
            )}

            {/* New Chat button */}
            <button
              onClick={createSession}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              새 대화
            </button>

            {/* Document panel toggle */}
            <button
              onClick={() => setShowDocPanel(!showDocPanel)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', background: showDocPanel ? '#dbeafe' : '#fff', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <List size={14} />
              문서 ({documents.length})
            </button>

            {/* FileSearchStore panel toggle */}
            <button
              onClick={() => setShowStorePanel(!showStorePanel)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', background: showStorePanel ? '#fef3c7' : '#fff', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Database size={14} />
              Store ({stores.length})
            </button>

            {/* Store file upload */}
            {currentStore && (
              <>
                <button
                  onClick={() => storeFileInputRef.current?.click()}
                  disabled={storeFileUploading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', background: '#f59e0b', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <FileUp size={14} />
                  {storeFileUploading ? '업로드 중...' : 'Store 업로드'}
                </button>
                <input ref={storeFileInputRef} type="file" onChange={handleStoreFileSelect} style={{ display: 'none' }} />
              </>
            )}

            {/* RAG Upload */}
            <button
              onClick={() => docFileInputRef.current?.click()}
              disabled={docUploading}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', background: '#10b981', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <FileUp size={14} />
              {docUploading ? '업로드 중...' : 'RAG 문서'}
            </button>
            <input ref={docFileInputRef} type="file" onChange={handleDocFileSelect} style={{ display: 'none' }} />

            {/* OneDrive */}
            {accounts.length > 0 ? (
              <>
                <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <User size={12} />
                  {accounts[0].username?.split('@')[0]}
                </span>
                {/* OneDrive Folder Browser */}
                <button
                  onClick={openOneDrivePanel}
                  disabled={oneDriveLoading || !!batchProgress}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', background: showOneDrivePanel ? '#e0f2fe' : '#0ea5e9', color: showOneDrivePanel ? '#0284c7' : '#fff',
                    border: showOneDrivePanel ? '1px solid #0ea5e9' : 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <FolderOpen size={14} />
                  {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : 'OneDrive 폴더'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', background: '#0078d4', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <Upload size={14} />
                  OneDrive
                </button>
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
                <button onClick={handleMsLogout} style={{ padding: '6px 8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={handleMsLogin}
                disabled={inProgress !== InteractionStatus.None}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', background: '#0078d4', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <LogIn size={14} />
                MS 로그인
              </button>
            )}

            <button
              onClick={() => window.open('https://tntintl1-my.sharepoint.com/', '_blank')}
              style={{ padding: '6px 8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
            >
              <Cloud size={14} />
            </button>
          </div>
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: uploadStatus.includes('✅') ? '#f0fdf4' : uploadStatus.includes('❌') ? '#fef2f2' : '#eff6ff',
            color: uploadStatus.includes('✅') ? '#166534' : uploadStatus.includes('❌') ? '#991b1b' : '#1e40af',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            {uploadStatus}
            <button onClick={() => setUploadStatus(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Document Panel */}
        {showDocPanel && (
          <div style={{ width: 280, borderRight: '1px solid #e5e7eb', background: '#fff', overflow: 'auto', padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>업로드된 문서</div>
            {documents.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 20 }}>
                <FileText size={32} style={{ margin: '0 auto 8px', color: '#d1d5db' }} />
                문서가 없습니다
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ padding: 10, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        <FileText size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                      {(doc.contentLength / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FileSearchStore Panel */}
        {showStorePanel && (
          <div style={{ width: 320, borderRight: '1px solid #e5e7eb', background: '#fffbeb', overflow: 'auto', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Google FileSearchStore</div>
              <button
                onClick={fetchStores}
                style={{ padding: 4, background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
                title="새로고침"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Create Store Input */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="새 스토어 이름 입력"
                style={{
                  flex: 1, padding: '6px 10px', border: '1px solid #d1d5db',
                  borderRadius: 4, fontSize: 12, background: '#fff'
                }}
                onKeyDown={(e) => e.key === 'Enter' && createStore()}
              />
              <button
                onClick={createStore}
                disabled={storeLoading || !newStoreName.trim()}
                style={{
                  padding: '6px 10px', background: storeLoading || !newStoreName.trim() ? '#d1d5db' : '#f59e0b',
                  color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                }}
              >
                <Plus size={12} />
                {storeLoading ? '생성 중...' : '생성'}
              </button>
            </div>

            {/* Current Store indicator */}
            {currentStore && (
              <div style={{
                padding: 8, background: '#fef3c7', borderRadius: 6,
                border: '1px solid #fcd34d', marginBottom: 12, fontSize: 11
              }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 2 }}>현재 선택된 Store:</div>
                <div style={{ color: '#78350f', wordBreak: 'break-all' }}>
                  {currentStore.split('/').pop()}
                </div>
              </div>
            )}

            {stores.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 20 }}>
                <Database size={32} style={{ margin: '0 auto 8px', color: '#d1d5db' }} />
                Store가 없습니다.<br />
                <span style={{ fontSize: 11 }}>Store 생성 버튼을 클릭하세요.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stores.map(store => (
                  <div
                    key={store.name}
                    style={{
                      padding: 10, background: store.name === currentStore ? '#fef3c7' : '#fff',
                      borderRadius: 6, border: store.name === currentStore ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                    onClick={() => selectStore(store.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        <Database size={14} style={{ color: store.name === currentStore ? '#f59e0b' : '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {store.displayName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {store.name === currentStore && (
                          <CheckCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteStore(store.name, store.displayName)
                          }}
                          disabled={storeLoading}
                          style={{
                            padding: 4, background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ef4444', opacity: storeLoading ? 0.5 : 1
                          }}
                          title="스토어 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                      {new Date(store.createTime).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View Documents Button */}
            {currentStore && (
              <button
                onClick={fetchStoreDocuments}
                style={{
                  marginTop: 12, width: '100%', padding: '8px 12px',
                  background: '#3b82f6', color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <FileText size={14} />
                Store 문서 조회
              </button>
            )}

            {/* Store Documents List */}
            {showStoreDocuments && storeDocuments.length > 0 && (
              <div style={{ marginTop: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>문서 목록 ({storeDocuments.length})</span>
                  <button
                    onClick={() => setShowStoreDocuments(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {storeDocuments.map((doc, idx) => (
                    <div key={idx} style={{ padding: 8, background: '#f9fafb', borderRadius: 4, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 500, color: '#374151', wordBreak: 'break-all', flex: 1 }}>
                          {doc.displayName}
                        </div>
                        <button
                          onClick={() => deleteStoreDocument(doc.name, doc.displayName)}
                          style={{
                            padding: 4, background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ef4444', flexShrink: 0, marginLeft: 4
                          }}
                          title="문서 삭제 (벡터 임베딩 포함)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div style={{ color: '#6b7280', marginTop: 2 }}>
                        {doc.mimeType} | {(parseInt(doc.sizeBytes) / 1024).toFixed(1)} KB
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 10,
                          background: doc.state === 'STATE_ACTIVE' ? '#dcfce7' : '#fef3c7',
                          color: doc.state === 'STATE_ACTIVE' ? '#166534' : '#92400e'
                        }}>
                          {doc.state === 'STATE_ACTIVE' ? '활성' : doc.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
              <strong>사용법:</strong><br />
              1. Store 생성 버튼 클릭<br />
              2. Store 선택 (클릭)<br />
              3. 상단 "Store 업로드" 버튼으로 파일 업로드<br />
              4. "Store 문서 조회"로 업로드된 파일 확인
            </div>
          </div>
        )}

        {/* OneDrive Folder Browser Panel */}
        {showOneDrivePanel && (
          <div style={{ width: 360, borderRight: '1px solid #e5e7eb', background: '#f0f9ff', overflow: 'auto', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>OneDrive 폴더</div>
              <button
                onClick={() => setShowOneDrivePanel(false)}
                style={{ padding: 4, background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Breadcrumb Navigation */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12,
              padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e0f2fe',
              fontSize: 11, flexWrap: 'wrap'
            }}>
              <button
                onClick={() => navigateBack(-1)}
                style={{
                  padding: '2px 8px', background: oneDrivePath.length === 0 ? '#0ea5e9' : '#e0f2fe',
                  color: oneDrivePath.length === 0 ? '#fff' : '#0369a1',
                  border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500
                }}
              >
                Root
              </button>
              {oneDrivePath.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <ChevronRight size={12} style={{ color: '#94a3b8' }} />
                  <button
                    onClick={() => navigateBack(idx)}
                    style={{
                      padding: '2px 8px',
                      background: idx === oneDrivePath.length - 1 ? '#0ea5e9' : '#e0f2fe',
                      color: idx === oneDrivePath.length - 1 ? '#fff' : '#0369a1',
                      border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500
                    }}
                  >
                    {p.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Current Store indicator for OneDrive */}
            {!currentStore && (
              <div style={{
                padding: 8, background: '#fef2f2', borderRadius: 6,
                border: '1px solid #fecaca', marginBottom: 12, fontSize: 11, color: '#991b1b'
              }}>
                RAG Store를 먼저 선택해주세요
              </div>
            )}

            {/* Batch Progress */}
            {batchProgress && (
              <div style={{
                padding: 10, background: '#fff', borderRadius: 6,
                border: '1px solid #0ea5e9', marginBottom: 12
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', marginBottom: 6 }}>
                  업로드 진행 중... ({batchProgress.current}/{batchProgress.total})
                </div>
                <div style={{
                  height: 6, background: '#e0f2fe', borderRadius: 3, overflow: 'hidden', marginBottom: 6
                }}>
                  <div style={{
                    width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    height: '100%', background: '#0ea5e9', transition: 'width 0.3s'
                  }} />
                </div>
                {batchProgress.currentFile && (
                  <div style={{ fontSize: 10, color: '#6b7280', wordBreak: 'break-all' }}>
                    현재: {batchProgress.currentFile}
                  </div>
                )}
                {batchProgress.completed.length > 0 && (
                  <div style={{ fontSize: 10, color: '#16a34a', marginTop: 4 }}>
                    완료: {batchProgress.completed.length}개
                  </div>
                )}
                {batchProgress.failed.length > 0 && (
                  <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>
                    실패: {batchProgress.failed.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Upload All Button */}
            {currentStore && oneDriveItems.filter(i => i.file).length > 0 && !batchProgress && (
              <button
                onClick={processOneDriveFolder}
                style={{
                  width: '100%', padding: '10px 12px', marginBottom: 12,
                  background: '#0ea5e9', color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <ArrowRight size={14} />
                모든 파일을 RAG Store로 업로드 ({oneDriveItems.filter(i => i.file).length}개)
              </button>
            )}

            {/* Loading */}
            {oneDriveLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12 }}>로딩 중...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {oneDriveItems.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 20 }}>
                    <Folder size={32} style={{ margin: '0 auto 8px', color: '#d1d5db' }} />
                    이 폴더는 비어 있습니다
                  </div>
                ) : (
                  <>
                    {/* Folders first */}
                    {oneDriveItems.filter(item => item.folder).map(item => (
                      <div
                        key={item.id}
                        onClick={() => navigateToFolder(item)}
                        style={{
                          padding: 10, background: '#fff', borderRadius: 6,
                          border: '1px solid #e0f2fe', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}
                      >
                        <Folder size={18} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>
                            {item.folder?.childCount || 0}개 항목
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      </div>
                    ))}
                    {/* Files */}
                    {oneDriveItems.filter(item => item.file).map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: 10, background: '#fff', borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}
                      >
                        <FileText size={18} style={{ color: '#6b7280', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>
                            {item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Help text */}
            <div style={{ marginTop: 16, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
              <strong>사용법:</strong><br />
              1. 원하는 폴더로 이동<br />
              2. "모든 파일을 RAG Store로 업로드" 클릭<br />
              3. 업로드 완료된 파일은 자동으로 Archive 폴더로 이동됩니다
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {messages.length === 0 && !streamingContent ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Bot size={64} style={{ marginBottom: 16, color: '#d1d5db' }} />
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Google RAG Chat</div>
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 400 }}>
                  문서를 업로드하고 질문하세요.<br />
                  Gemini AI가 문서 내용을 기반으로 답변합니다.
                </div>
                <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['영업 전략은?', '고객 분석 방법', '매출 향상 방안'].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      style={{
                        padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: 20, fontSize: 13, color: '#374151', cursor: 'pointer'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: msg.role === 'user' ? '#3b82f6' : '#10b981', color: '#fff', flexShrink: 0
                    }}>
                      {msg.role === 'user' ? <UserCircle size={18} /> : <Bot size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                        {msg.role === 'user' ? '나' : 'Gemini'}
                      </div>
                      <div style={{
                        padding: 12, borderRadius: 12, fontSize: 14, lineHeight: 1.6,
                        background: msg.role === 'user' ? '#eff6ff' : '#f9fafb',
                        color: '#1f2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                      }}>
                        {msg.content}
                      </div>
                      {msg.role === 'assistant' && (
                        <>
                          {/* Citations/Sources */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div style={{
                              marginTop: 8, padding: 10, background: '#f0f9ff', borderRadius: 8,
                              border: '1px solid #bae6fd'
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={12} />
                                출처 ({msg.citations.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {msg.citations.map((citation, cidx) => (
                                  <div key={cidx} style={{
                                    fontSize: 11, color: '#0c4a6e', padding: '4px 8px',
                                    background: '#e0f2fe', borderRadius: 4,
                                    display: 'flex', alignItems: 'center', gap: 6
                                  }}>
                                    <span style={{ fontWeight: 500 }}>[{cidx + 1}]</span>
                                    <span style={{ wordBreak: 'break-all' }}>{citation.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => copyToClipboard(msg.content, idx)}
                            style={{
                              marginTop: 4, padding: '4px 8px', background: 'none', border: 'none',
                              color: '#9ca3af', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            {copied === idx ? <Check size={12} /> : <Copy size={12} />}
                            {copied === idx ? '복사됨' : '복사'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming content */}
                {streamingContent && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#10b981', color: '#fff', flexShrink: 0
                    }}>
                      <Bot size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Gemini</div>
                      <div style={{
                        padding: 12, borderRadius: 12, fontSize: 14, lineHeight: 1.6,
                        background: '#f9fafb', color: '#1f2937', whiteSpace: 'pre-wrap'
                      }}>
                        {streamingContent}
                        <span style={{ animation: 'blink 1s infinite' }}>|</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: '0 20px', padding: 12, background: '#fef2f2', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} style={{ color: '#ef4444' }} />
              <span style={{ color: '#991b1b', fontSize: 13 }}>{error}</span>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', background: '#fff' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 12,
                  fontSize: 14, resize: 'none', minHeight: 44, maxHeight: 120,
                  background: loading ? '#f9fafb' : '#fff', color: '#1f2937'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 44, height: 44, borderRadius: '50%', border: 'none',
                  background: loading || !input.trim() ? '#d1d5db' : '#3b82f6',
                  color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              {sessionId ? '멀티턴 대화 모드 (이전 대화 맥락 유지)' : '일반 RAG 모드 (새 대화 버튼으로 멀티턴 시작)'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
