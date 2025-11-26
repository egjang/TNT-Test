import React, { useEffect, useState } from 'react';
import { Card } from '../../../ui/atoms/Card';
import { Badge } from '../../../ui/atoms/Badge';
import { Button } from '../../../ui/atoms/Button';
import { Search } from 'lucide-react';
import { Input } from '../../../ui/atoms/Input';

export type InquiryRow = {
    id: number;
    title?: string;
    customerName?: string | null;
    inquiryStatus?: string;
    assigneeName?: string | null;
    openedAt?: string;
    inquiryCategory?: string;
    severity?: string;
};

interface StandardInquiryListProps {
    onSelect: (inquiry: InquiryRow) => void;
    selectedId?: number | null;
}

export function StandardInquiryList({ onSelect, selectedId }: StandardInquiryListProps) {
    const [items, setItems] = useState<InquiryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        load();
        const handleReload = () => load();
        window.addEventListener('tnt.sales.inquiry.reload' as any, handleReload);
        return () => window.removeEventListener('tnt.sales.inquiry.reload' as any, handleReload);
    }, []);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/inquiries');
            if (r.ok) {
                const data = await r.json();
                if (Array.isArray(data)) {
                    const list = data.map((x: any) => ({
                        id: Number(x.id),
                        title: x.title,
                        customerName: x.customerName || x.customer_name,
                        inquiryStatus: x.inquiryStatus || x.inquiry_status || x.status,
                        assigneeName: x.assigneeName || x.assignee_name,
                        openedAt: x.openedAt || x.opened_at,
                        inquiryCategory: x.inquiryCategory || x.inquiry_category,
                        severity: x.severity,
                    }));
                    // Sort by date desc
                    list.sort((a, b) => {
                        const da = a.openedAt ? new Date(a.openedAt).getTime() : 0;
                        const db = b.openedAt ? new Date(b.openedAt).getTime() : 0;
                        return db - da;
                    });
                    setItems(list);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const filteredItems = items.filter(item =>
        (item.title || '').toLowerCase().includes(filter.toLowerCase()) ||
        (item.customerName || '').toLowerCase().includes(filter.toLowerCase())
    );

    const getStatusColor = (status?: string) => {
        switch (status) {
            case '신규접수': return 'primary';
            case '확인 중': return 'warning';
            case '완료': return 'success';
            case '보류': return 'error';
            default: return 'default';
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Input
                    leftIcon={<Search size={16} />}
                    placeholder="Search inquiries..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    containerClassName="flex-1"
                />
                <Button variant="outline" onClick={() => load()} isLoading={loading}>
                    Refresh
                </Button>
            </div>

            <Card noPadding className="flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--panel-2)] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Title</th>
                                <th className="px-6 py-3 font-medium">Customer</th>
                                <th className="px-6 py-3 font-medium">Assignee</th>
                                <th className="px-6 py-3 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filteredItems.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    className={`
                    cursor-pointer transition-colors hover:bg-[var(--hover-bg)]
                    ${selectedId === item.id ? 'bg-[var(--accent)] bg-opacity-10' : ''}
                  `}
                                >
                                    <td className="px-6 py-3">
                                        <Badge variant={getStatusColor(item.inquiryStatus)}>{item.inquiryStatus || 'Unknown'}</Badge>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-[var(--text)]">
                                        {item.title}
                                    </td>
                                    <td className="px-6 py-3 text-[var(--text-secondary)]">
                                        {item.customerName || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-[var(--text-secondary)]">
                                        {item.assigneeName || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                                        {item.openedAt ? new Date(item.openedAt).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                                        No inquiries found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
