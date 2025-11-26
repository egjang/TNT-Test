import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    containerClassName?: string;
    options?: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', label, error, containerClassName = '', options, children, id, ...props }, ref) => {
        const selectId = id || props.name;

        return (
            <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
                {label && (
                    <label htmlFor={selectId} className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
              w-full appearance-none rounded-lg border bg-[var(--input-bg)] text-[var(--text)]
              transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
              disabled:opacity-50 disabled:bg-[var(--panel-2)]
              ${error ? 'border-[var(--error)] focus:ring-[var(--error)]' : 'border-[var(--border)]'}
              pl-3 pr-10 py-2 text-sm
              ${className}
            `}
                        {...props}
                    >
                        {options
                            ? options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))
                            : children}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
                        <ChevronDown size={16} />
                    </div>
                </div>
                {error && (
                    <p className="text-xs text-[var(--error)] mt-0.5">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
