import React, { useState } from 'react';
import { StandardInquiryList, InquiryRow } from './StandardInquiryList';
import { StandardInquiryForm } from './StandardInquiryForm';
import { Button } from '../../../ui/atoms/Button';
import { Plus } from 'lucide-react';

export function StandardInquiry() {
    const [selectedInquiry, setSelectedInquiry] = useState<InquiryRow | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleSelect = (inquiry: InquiryRow) => {
        setSelectedInquiry(inquiry);
        setIsCreating(false);
    };

    const handleCreate = () => {
        setSelectedInquiry(null);
        setIsCreating(true);
    };

    const handleSave = () => {
        // Refresh list logic would go here
        setIsCreating(false);
        setSelectedInquiry(null);
        window.dispatchEvent(new CustomEvent('tnt.sales.inquiry.reload'));
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg)]">
            <div className="p-6 pb-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">Inquiry Management</h1>
                        <p className="text-[var(--text-secondary)]">Manage customer inquiries and support tickets.</p>
                    </div>
                    <Button leftIcon={<Plus size={18} />} onClick={handleCreate}>
                        New Inquiry
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-6 pt-0 gap-6">
                {/* Left Panel: List */}
                <div className={`${selectedInquiry || isCreating ? 'w-1/3 hidden md:block' : 'w-full'} transition-all duration-300`}>
                    <StandardInquiryList
                        onSelect={handleSelect}
                        selectedId={selectedInquiry?.id}
                    />
                </div>

                {/* Right Panel: Detail/Form */}
                {(selectedInquiry || isCreating) && (
                    <div className="flex-1 animate-slide-up">
                        <StandardInquiryForm
                            inquiry={selectedInquiry}
                            onCancel={() => {
                                setSelectedInquiry(null);
                                setIsCreating(false);
                            }}
                            onSave={handleSave}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
