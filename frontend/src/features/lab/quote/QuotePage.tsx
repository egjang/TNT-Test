import React, { useState, useEffect } from 'react'
import { QuoteList } from './QuoteList'
import { QuoteForm } from './QuoteForm'
import { QuoteDetail } from './QuoteDetail'
import { FileText, List, Edit3, Eye, ChevronRight } from 'lucide-react'

/**
 * 견적 관리 페이지
 * Standard Navigation 1 패턴: State Machine 기반 화면 전환
 * - list: 목록 조회
 * - view: 상세 조회 (Split Panel)
 * - create: 신규 등록
 * - edit: 수정
 */
type ViewState = 'list' | 'view' | 'create' | 'edit'

export function QuotePage() {
    const [viewState, setViewState] = useState<ViewState>('list')
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

    // 키보드 단축키 (Standard Navigation 3)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewState === 'create' || viewState === 'edit') {
                    setViewState(selectedQuoteId ? 'view' : 'list')
                } else if (viewState === 'view') {
                    setViewState('list')
                    setSelectedQuoteId(null)
                }
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault()
                handleCreate()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [viewState, selectedQuoteId])

    const handleCreate = () => {
        setSelectedQuoteId(null)
        setViewState('create')
    }

    const handleView = (quoteId: string) => {
        setSelectedQuoteId(quoteId)
        setViewState('view')
    }

    const handleEdit = (quoteId: string) => {
        setSelectedQuoteId(quoteId)
        setViewState('edit')
    }

    const handleBackToList = () => {
        setViewState('list')
        setSelectedQuoteId(null)
    }

    const handleBackToView = () => {
        setViewState('view')
    }

    const handleSaveSuccess = () => {
        if (selectedQuoteId) {
            setViewState('view')
        } else {
            setViewState('list')
        }
    }

    // State Navigation Bar (Standard Navigation 1)
    const StateNavigation = () => {
        const states = [
            { key: 'list', label: '목록', icon: List },
            ...(selectedQuoteId ? [{ key: 'view', label: '상세', icon: Eye }] : []),
            ...(viewState === 'create' ? [{ key: 'create', label: '신규', icon: Edit3 }] : []),
            ...(viewState === 'edit' ? [{ key: 'edit', label: '수정', icon: Edit3 }] : []),
        ]

        return (
            <div className="card" style={{
                padding: '8px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--bg-secondary)'
            }}>
                {states.map((state, i) => {
                    const Icon = state.icon
                    const isActive = viewState === state.key
                    const canNavigate = state.key === 'list' ||
                        (state.key === 'view' && selectedQuoteId)

                    return (
                        <React.Fragment key={state.key}>
                            {i > 0 && <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />}
                            <button
                                className={isActive ? 'btn btn-primary' : 'btn btn-ghost'}
                                style={{
                                    padding: '6px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 13
                                }}
                                onClick={() => {
                                    if (state.key === 'list') handleBackToList()
                                    else if (state.key === 'view' && selectedQuoteId) setViewState('view')
                                }}
                                disabled={!canNavigate && !isActive}
                            >
                                <Icon size={14} />
                                {state.label}
                            </button>
                        </React.Fragment>
                    )
                })}

                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
                    <span><kbd style={{ padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, fontSize: 10 }}>Esc</kbd> 뒤로</span>
                    <span><kbd style={{ padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, fontSize: 10 }}>Ctrl+N</kbd> 신규</span>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            padding: 24,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--panel)'
        }}>
            {/* 헤더 - Standard UI 2 List View */}
            <div style={{ marginBottom: 16 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={24} style={{ color: 'var(--primary)' }} />
                    견적 관리
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                    TNT/DYS 견적서 작성 및 승인 관리
                </p>
            </div>

            <StateNavigation />

            {/* 컨텐츠 영역 */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {viewState === 'list' && (
                    <QuoteList
                        onCreate={handleCreate}
                        onView={handleView}
                    />
                )}
                {viewState === 'view' && selectedQuoteId && (
                    <QuoteDetail
                        quoteId={selectedQuoteId}
                        onBack={handleBackToList}
                        onEdit={() => handleEdit(selectedQuoteId)}
                    />
                )}
                {viewState === 'create' && (
                    <QuoteForm
                        onCancel={handleBackToList}
                        onSuccess={handleSaveSuccess}
                    />
                )}
                {viewState === 'edit' && selectedQuoteId && (
                    <QuoteForm
                        quoteId={selectedQuoteId}
                        onCancel={handleBackToView}
                        onSuccess={handleSaveSuccess}
                    />
                )}
            </div>
        </div>
    )
}
