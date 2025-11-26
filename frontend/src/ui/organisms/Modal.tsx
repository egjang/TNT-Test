import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Card } from '../atoms/Card';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOutsideClick?: boolean;
}

export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOutsideClick = true,
}: ModalProps) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (closeOnOutsideClick && e.target === overlayRef.current) {
            onClose();
        }
    };

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-[90vw]',
    };

    return createPortal(
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleOverlayClick}
        >
            <Card
                noPadding
                className={`
          w-full flex flex-col max-h-[90vh] shadow-xl animate-in zoom-in-95 duration-200
          ${sizeClasses[size]}
        `}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-[var(--muted)] hover:text-[var(--text)] transition-colors rounded-full p-1 hover:bg-[var(--panel-2)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {children}
                </div>

                {footer && (
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)] bg-[var(--panel-2)] rounded-b-xl">
                        {footer}
                    </div>
                )}
            </Card>
        </div>,
        document.body
    );
};
