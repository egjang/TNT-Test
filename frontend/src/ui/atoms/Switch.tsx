import React from 'react';

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className = '', label, ...props }, ref) => {
        return (
            <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
                <div className="relative">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        ref={ref}
                        {...props}
                    />
                    <div className="w-11 h-6 bg-[var(--panel-2)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)] border border-[var(--border)]"></div>
                </div>
                {label && (
                    <span className="text-sm font-medium text-[var(--text)] select-none">
                        {label}
                    </span>
                )}
            </label>
        );
    }
);

Switch.displayName = 'Switch';
