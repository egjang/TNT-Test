import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { CustomerSearch } from './CustomerSearch'

type Props = {
    onClose: () => void
    onSelect: (customer: { customerSeq: number; customerName: string }) => void
}

export function CustomerSearchModal({ onClose, onSelect }: Props) {
    // No longer need global event listener since we pass onSelect directly
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '90%', maxWidth: 1000,
                height: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #eee',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>거래처 검색</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
                    <CustomerSearch
                        compact
                        maxHeight="calc(80vh - 140px)"
                        autoSelectFirst={false}
                        onSelect={(c) => onSelect({ customerSeq: Number(c.customerSeq), customerName: c.customerName })}
                    />
                </div>
            </div>
        </div>
    )
}
