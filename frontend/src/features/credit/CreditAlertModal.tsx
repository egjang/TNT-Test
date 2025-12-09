import React from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

interface CreditAlertModalProps {
    isOpen: boolean
    title?: string
    message: string
    type?: 'success' | 'error' | 'info'
    onClose: () => void
}

export function CreditAlertModal({ isOpen, title, message, type = 'info', onClose }: CreditAlertModalProps) {
    if (!isOpen) return null

    const getIcon = () => {
        if (type === 'success') return <CheckCircle2 size={32} color="#10b981" />
        if (type === 'error') return <AlertCircle size={32} color="#ef4444" />
        return <Info size={32} color="#3b82f6" />
    }

    const getTitle = () => {
        if (title) return title
        if (type === 'success') return '완료'
        if (type === 'error') return '오류'
        return '알림'
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }}>
            <div style={{
                background: 'white', borderRadius: 16, width: '100%', maxWidth: 400,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
                animation: 'slideUp 0.2s ease-out'
            }}>
                <div style={{ padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ marginBottom: 16 }}>
                        {getIcon()}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                        {getTitle()}
                    </h3>
                    <p style={{ fontSize: 14, color: '#4b5563', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {message}
                    </p>
                </div>

                <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            minWidth: 100,
                            padding: '10px 20px',
                            background: '#1f2937',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#374151'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#1f2937'}
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    )
}
