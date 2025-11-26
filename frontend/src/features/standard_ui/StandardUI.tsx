import React, { useState } from 'react';
import { Button } from '../../ui/atoms/Button';
import { Input } from '../../ui/atoms/Input';
import { Card } from '../../ui/atoms/Card';
import { Badge } from '../../ui/atoms/Badge';
import { Switch } from '../../ui/atoms/Switch';
import { SearchInput } from '../../ui/molecules/SearchInput';
import { Select } from '../../ui/molecules/Select';
import { Tabs } from '../../ui/molecules/Tabs';
import { Modal } from '../../ui/organisms/Modal';
import {
    Layout, Type, MousePointer2, Box, Layers,
    Search, Mail, Bell, Check, AlertTriangle, Info, XCircle, ChevronRight
} from 'lucide-react';

type Section = 'foundation' | 'atoms' | 'molecules' | 'organisms';

export function StandardUI() {
    const [activeSection, setActiveSection] = useState<Section>('foundation');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [switchValue, setSwitchValue] = useState(false);

    const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
        { id: 'foundation', label: 'Foundation', icon: Layout },
        { id: 'atoms', label: 'Atoms', icon: MousePointer2 },
        { id: 'molecules', label: 'Molecules', icon: Box },
        { id: 'organisms', label: 'Organisms', icon: Layers },
    ];

    return (
        <div className="flex h-full bg-[var(--bg)]">
            {/* Sidebar */}
            <div className="w-64 border-r border-[var(--border)] bg-[var(--panel)] flex flex-col">
                <div className="p-6 border-b border-[var(--border)]">
                    <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
                            <Layout size={18} />
                        </div>
                        Standard UI
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                        Premium Design System
                    </p>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${activeSection === item.id
                                    ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-accent)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]'
                                }
              `}
                        >
                            <item.icon size={18} />
                            {item.label}
                            {activeSection === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-8 pb-24 animate-fade-in">

                    {/* Header */}
                    <div className="mb-8 pb-6 border-b border-[var(--border)]">
                        <h2 className="text-3xl font-bold text-[var(--text)] capitalize mb-2">
                            {activeSection}
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            {activeSection === 'foundation' && 'Core design tokens including colors, typography, and effects.'}
                            {activeSection === 'atoms' && 'Basic building blocks of the interface.'}
                            {activeSection === 'molecules' && 'Groups of atoms working together.'}
                            {activeSection === 'organisms' && 'Complex UI components and patterns.'}
                        </p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-12">

                        {activeSection === 'foundation' && (
                            <>
                                <Section title="Color Palette">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        <ColorSwatch name="Accent" variable="--accent" />
                                        <ColorSwatch name="Background" variable="--bg" />
                                        <ColorSwatch name="Panel" variable="--panel" />
                                        <ColorSwatch name="Text" variable="--text" />
                                        <ColorSwatch name="Success" variable="--success" />
                                        <ColorSwatch name="Error" variable="--error" />
                                    </div>
                                </Section>

                                <Section title="Shadows & Glows">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="h-24 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-sm)] flex items-center justify-center text-xs text-[var(--text-secondary)]">Small</div>
                                        <div className="h-24 rounded-xl bg-[var(--panel)] shadow-[var(--shadow)] flex items-center justify-center text-xs text-[var(--text-secondary)]">Default</div>
                                        <div className="h-24 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-md)] flex items-center justify-center text-xs text-[var(--text-secondary)]">Medium</div>
                                        <div className="h-24 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-lg)] flex items-center justify-center text-xs text-[var(--text-secondary)]">Large</div>
                                        <div className="h-24 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-accent)] flex items-center justify-center text-xs text-[var(--accent)] font-medium">Accent Glow</div>
                                        <div className="h-24 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-success)] flex items-center justify-center text-xs text-[var(--success)] font-medium">Success Glow</div>
                                    </div>
                                </Section>

                                <Section title="Glassmorphism">
                                    <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <div className="glass p-6 rounded-xl text-white max-w-xs text-center">
                                            <h3 className="font-bold mb-2">Glass Effect</h3>
                                            <p className="text-sm opacity-90">Backdrop blur and translucency for a modern feel.</p>
                                        </div>
                                    </div>
                                </Section>
                            </>
                        )}

                        {activeSection === 'atoms' && (
                            <>
                                <Section title="Buttons">
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <Button variant="primary">Primary</Button>
                                        <Button variant="secondary">Secondary</Button>
                                        <Button variant="outline">Outline</Button>
                                        <Button variant="ghost">Ghost</Button>
                                        <Button variant="danger">Danger</Button>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <Button isLoading>Loading</Button>
                                        <Button leftIcon={<Mail size={16} />}>With Icon</Button>
                                        <Button
                                            onClick={() => {
                                                setIsLoading(true);
                                                setTimeout(() => setIsLoading(false), 2000);
                                            }}
                                            isLoading={isLoading}
                                        >
                                            Click Me
                                        </Button>
                                    </div>
                                </Section>

                                <Section title="Inputs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="Default Input" placeholder="Type something..." />
                                        <Input label="With Icon" leftIcon={<Search size={16} />} placeholder="Search..." />
                                        <Input label="Error State" error="Something went wrong" placeholder="Invalid input" />
                                        <Input label="Disabled" disabled value="Cannot edit this" />
                                    </div>
                                </Section>

                                <Section title="Switch">
                                    <div className="flex items-center gap-8">
                                        <Switch label="Notifications" />
                                        <Switch label="Dark Mode" defaultChecked />
                                        <Switch
                                            label="Interactive"
                                            checked={switchValue}
                                            onChange={(e) => setSwitchValue(e.target.checked)}
                                        />
                                    </div>
                                </Section>

                                <Section title="Badges">
                                    <div className="flex flex-wrap gap-3">
                                        <Badge variant="default">Default</Badge>
                                        <Badge variant="primary">Primary</Badge>
                                        <Badge variant="success">Success</Badge>
                                        <Badge variant="warning">Warning</Badge>
                                        <Badge variant="error">Error</Badge>
                                    </div>
                                </Section>
                            </>
                        )}

                        {activeSection === 'molecules' && (
                            <>
                                <Section title="Search Input">
                                    <div className="max-w-md">
                                        <SearchInput placeholder="Search users, items, or docs..." />
                                    </div>
                                </Section>

                                <Section title="Select">
                                    <div className="max-w-md">
                                        <Select label="Choose a Role" options={[
                                            { label: 'Admin', value: 'admin' },
                                            { label: 'User', value: 'user' },
                                            { label: 'Guest', value: 'guest' },
                                        ]} />
                                    </div>
                                </Section>

                                <Section title="Tabs">
                                    <Card noPadding className="h-64">
                                        <Tabs tabs={[
                                            { id: 'tab1', label: 'Overview', content: <div className="text-[var(--text-secondary)]">Overview content goes here.</div> },
                                            { id: 'tab2', label: 'Details', content: <div className="text-[var(--text-secondary)]">Detailed information view.</div> },
                                            { id: 'tab3', label: 'Settings', content: <div className="text-[var(--text-secondary)]">Configuration settings.</div> },
                                        ]} />
                                    </Card>
                                </Section>
                            </>
                        )}

                        {activeSection === 'organisms' && (
                            <>
                                <Section title="Cards">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card>
                                            <h3 className="font-semibold mb-2">Standard Card</h3>
                                            <p className="text-[var(--text-secondary)] text-sm">
                                                A basic container for content with padding and shadow.
                                            </p>
                                        </Card>
                                        <Card interactive>
                                            <h3 className="font-semibold mb-2 text-[var(--accent)]">Interactive Card</h3>
                                            <p className="text-[var(--text-secondary)] text-sm">
                                                Hover over me! I lift up and glow to indicate interactivity.
                                            </p>
                                        </Card>
                                    </div>
                                </Section>

                                <Section title="Modal">
                                    <Button onClick={() => setIsModalOpen(true)}>Open Demo Modal</Button>
                                    <Modal
                                        isOpen={isModalOpen}
                                        onClose={() => setIsModalOpen(false)}
                                        title="Modern Modal"
                                        footer={
                                            <>
                                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                                <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
                                            </>
                                        }
                                    >
                                        <div className="space-y-4">
                                            <p className="text-[var(--text-secondary)]">
                                                This modal features a backdrop blur (glassmorphism) and smooth entry animations.
                                            </p>
                                            <Input label="Your Name" placeholder="Enter name" />
                                        </div>
                                    </Modal>
                                </Section>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4 animate-slide-up">
            <h3 className="text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2">
                {title}
            </h3>
            <div>{children}</div>
        </section>
    );
}

function ColorSwatch({ name, variable }: { name: string; variable: string }) {
    return (
        <div className="space-y-2 group cursor-pointer">
            <div
                className="h-16 w-full rounded-lg border border-[var(--border)] shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: `var(${variable})` }}
            />
            <div>
                <p className="font-medium text-sm text-[var(--text)]">{name}</p>
                <code className="text-xs text-[var(--text-tertiary)]">{variable}</code>
            </div>
        </div>
    );
}
