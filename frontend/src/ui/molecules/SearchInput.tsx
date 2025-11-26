import React, { forwardRef } from 'react';
import { Input, InputProps } from '../atoms/Input';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
    onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ className = '', onClear, value, onChange, ...props }, ref) => {
        return (
            <Input
                ref={ref}
                className={className}
                leftIcon={<Search size={16} />}
                rightIcon={
                    value && onClear ? (
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-[var(--muted)] hover:text-[var(--text)] focus:outline-none"
                        >
                            <X size={14} />
                        </button>
                    ) : undefined
                }
                value={value}
                onChange={onChange}
                {...props}
            />
        );
    }
);

SearchInput.displayName = 'SearchInput';
