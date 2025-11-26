import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

        const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

        const variants = {
            primary: 'bg-[var(--accent)] text-[var(--on-accent)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-hover)] hover:shadow-lg hover:-translate-y-0.5 focus:ring-[var(--accent)]',
            secondary: 'bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] hover:bg-[var(--btn-bg-hover)] hover:border-[var(--btn-border-hover)] focus:ring-[var(--btn-border)]',
            outline: 'bg-transparent border border-[var(--btn-border)] text-[var(--text)] hover:bg-[var(--hover-bg)] focus:ring-[var(--btn-border)]',
            ghost: 'bg-transparent text-[var(--text)] hover:bg-[var(--hover-bg)] focus:ring-[var(--muted)]',
            danger: 'bg-[var(--error)] text-white shadow-[var(--shadow-error)] hover:brightness-90 hover:shadow-lg focus:ring-[var(--error)]',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs gap-1.5',
            md: 'h-10 px-4 text-sm gap-2',
            lg: 'h-12 px-6 text-base gap-2.5',
        };

        const classes = [
            baseStyles,
            variants[variant],
            sizes[size],
            className
        ].filter(Boolean).join(' ');

        return (
            <button
                ref={ref}
                className={classes}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {!isLoading && leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
