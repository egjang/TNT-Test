import React, { useState } from 'react';

export interface Tab {
    id: string;
    label: string;
    content?: React.ReactNode;
}

export interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className = '' }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const handleTabClick = (id: string) => {
        setActiveTab(id);
        onChange?.(id);
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            <div className="flex items-center border-b border-[var(--border)] bg-[var(--panel)] sticky top-0 z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`
              relative px-6 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]'
                            }
            `}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] animate-scale-in" />
                        )}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
                {tabs.find((t) => t.id === activeTab)?.content}
            </div>
        </div>
    );
}
