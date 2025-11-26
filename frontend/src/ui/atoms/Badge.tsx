import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
    size?: 'sm' | 'md';
}

export const Badge = ({ className = '', variant = 'default', size = 'md', children, ...props }: BadgeProps) => {
    const variants = {
        default: 'bg-[var(--panel-2)] text-[var(--text-secondary)] border border-[var(--border)]',
        primary: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        error: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        outline: 'bg-transparent border border-[var(--border)] text-[var(--text-secondary)]',
    };

    const sizes = {
        sm: 'text-[10px] px-1.5 py-0.5 rounded',
        md: 'text-xs px-2.5 py-0.5 rounded-full',
    };

    return (
        <span
            className={`
        inline-flex items-center font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
};
