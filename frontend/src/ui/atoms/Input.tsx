import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, leftIcon, rightIcon, containerClassName = '', id, ...props }, ref) => {
        const inputId = id || props.name;

        return (
            <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {leftIcon && (
                        <div className="absolute left-3 text-[var(--muted)] pointer-events-none flex items-center justify-center">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={`
              w-full rounded-lg border bg-[var(--input-bg)] text-[var(--text)] placeholder-[var(--muted)]
              transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
              disabled:opacity-50 disabled:bg-[var(--panel-2)]
              ${error ? 'border-[var(--error)] focus:ring-[var(--error)]' : 'border-[var(--border)]'}
              ${leftIcon ? 'pl-10' : 'pl-3'}
              ${rightIcon ? 'pr-10' : 'pr-3'}
              py-2 text-sm
              ${className}
            `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 text-[var(--muted)] pointer-events-none flex items-center justify-center">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="text-xs text-[var(--error)] mt-0.5">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
