import React, { useEffect, useState } from 'react';
import { Card } from '../../../ui/atoms/Card';
import { Button } from '../../../ui/atoms/Button';
import { Input } from '../../../ui/atoms/Input';
import { Select } from '../../../ui/molecules/Select';
import { InquiryRow } from './StandardInquiryList';

interface StandardInquiryFormProps {
    inquiry?: InquiryRow | null;
    onCancel: () => void;
    onSave: () => void;
}

export function StandardInquiryForm({ inquiry, onCancel, onSave }: StandardInquiryFormProps) {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (inquiry) {
            // Fetch full details if needed, or just use what we have + defaults
            // For now, we'll assume we might need to fetch more details or just populate form
            // Simulating fetch or using props
            setFormData({
                title: inquiry.title || '',
                inquiryStatus: inquiry.inquiryStatus || '신규접수',
                inquiryCategory: inquiry.inquiryCategory || '',
                customerName: inquiry.customerName || '',
                // ... other fields
            });
        } else {
            setFormData({
                title: '',
                inquiryStatus: '신규접수',
                inquiryCategory: '제품문의',
                customerName: '',
            });
        }
    }, [inquiry]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            // In real app: fetch('/api/v1/inquiries', { method: inquiry ? 'PUT' : 'POST', ... })
            onSave();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="mb-6 pb-4 border-b border-[var(--border)] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text)]">
                    {inquiry ? 'Edit Inquiry' : 'New Inquiry'}
                </h2>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={loading}>Save Changes</Button>
                </div>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                <Input
                    label="Title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter inquiry title"
                />

                <div className="grid grid-cols-2 gap-6">
                    <Select
                        label="Category"
                        value={formData.inquiryCategory}
                        onChange={(e) => handleChange('inquiryCategory', e.target.value)}
                        options={[
                            { label: 'Product', value: '제품문의' },
                            { label: 'Stock/Delivery', value: '재고/배송문의' },
                            { label: 'Price', value: '가격문의' },
                            { label: 'Other', value: '기타문의' },
                        ]}
                    />
                    <Select
                        label="Status"
                        value={formData.inquiryStatus}
                        onChange={(e) => handleChange('inquiryStatus', e.target.value)}
                        options={[
                            { label: 'New', value: '신규접수' },
                            { label: 'In Progress', value: '확인 중' },
                            { label: 'Completed', value: '완료' },
                            { label: 'On Hold', value: '보류' },
                        ]}
                    />
                </div>

                <Input
                    label="Customer"
                    value={formData.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                    placeholder="Search customer..."
                />

                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Content</label>
                    <textarea
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] p-3 min-h-[120px] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-all"
                        placeholder="Describe the inquiry..."
                    />
                </div>
            </div>
        </Card>
    );
}
