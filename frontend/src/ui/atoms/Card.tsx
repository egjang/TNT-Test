import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
    interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', noPadding = false, interactive = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`
          bg-[var(--panel)] rounded-xl border border-[var(--border)] shadow-[var(--shadow)]
          transition-all duration-300
          ${interactive ? 'hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] cursor-pointer' : ''}
          ${noPadding ? '' : 'p-6'}
          ${className}
        `}
                {...props}
            >
                {children}
            </div>
        );
    }
);
