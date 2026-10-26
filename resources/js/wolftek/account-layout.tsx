import '../../css/nocturne.css';

import { AppSidebar, Card, Icon, LogoutDialog, MobileTabBar, MobileTopBar, PageHeader } from '@/components/nocturne';
import type { SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import { logoutAndForget } from './offline/logout';
import { useConnection } from './offline/use-connection';

const sections = [
    { key: 'dashboard', label: 'Dashboard', icon: 'squares-four', href: '/dashboard' },
    { key: 'ventas', label: 'Ventas', icon: 'receipt', href: '/ventas' },
    { key: 'inventario', label: 'Inventario', icon: 'package', href: '/inventario' },
    { key: 'machotes', label: 'Machotes', icon: 'clipboard-text', href: '/machotes' },
];

const tabs = [
    { label: 'Perfil', icon: 'user', route: 'profile.edit' },
    { label: 'Contraseña', icon: 'lock-key', route: 'password.edit' },
    { label: 'Apariencia', icon: 'palette', route: 'appearance' },
] as const;

type AccountLayoutProps = {
    /** Browser tab title. */
    title: string;
    children: ReactNode;
};

/** "Mi cuenta": the app's sidebar and header around the profile, password and appearance settings. */
export default function AccountLayout({ title, children }: AccountLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    const connection = useConnection();
    const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1400 : window.innerWidth));
    const [confirmLogout, setConfirmLogout] = useState(false);

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    const mobile = width < 700;
    const collapsed = !mobile && width < 1100;
    const go = (href: string) => router.visit(href);

    return (
        <div className="wg">
            <Head title={title} />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: mobile ? 'minmax(0,1fr)' : collapsed ? '72px minmax(0,1fr)' : '220px minmax(0,1fr)',
                    minHeight: '100vh',
                    background: 'radial-gradient(1200px 600px at 20% -10%, var(--color-neutral-800), var(--color-bg) 60%)',
                }}
            >
                {mobile ? (
                    <MobileTopBar onLogout={() => setConfirmLogout(true)} user={auth.user} />
                ) : (
                    <AppSidebar
                        collapsed={collapsed}
                        user={auth.user}
                        userActive
                        onNew={() => go('/ventas/nueva')}
                        onLogout={() => setConfirmLogout(true)}
                        items={sections.map((s) => ({ key: s.key, label: s.label, icon: s.icon, active: false, onClick: () => go(s.href) }))}
                    />
                )}

                <main
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: mobile ? 'var(--space-6)' : 'var(--space-8)',
                        padding: mobile ? 'var(--space-6) var(--space-4) 104px' : collapsed ? 'var(--space-8) var(--space-6)' : 'var(--space-8)',
                        minWidth: 0,
                        maxWidth: 820,
                        width: '100%',
                    }}
                >
                    <PageHeader title="Mi cuenta" subtitle="Tus datos, tu contraseña y cómo se ve la app" compact={mobile} />

                    <nav style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {tabs.map((tab) => {
                            const active = route().current(tab.route);

                            return (
                                <Link
                                    key={tab.route}
                                    href={route(tab.route)}
                                    aria-current={active ? 'page' : undefined}
                                    className="h-bg"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 13,
                                        textDecoration: 'none',
                                        color: active ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
                                        background: active ? 'var(--color-accent-900)' : 'transparent',
                                        boxShadow: active ? 'inset 0 0 0 1px var(--color-accent-700)' : 'none',
                                    }}
                                >
                                    <Icon name={tab.icon} size={16} />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {children}
                </main>
            </div>

            {mobile && (
                <MobileTabBar
                    items={[
                        ...sections.slice(0, 2).map((s) => ({
                            key: s.key,
                            label: s.key === 'dashboard' ? 'Inicio' : s.label,
                            icon: s.icon,
                            active: false,
                            onClick: () => go(s.href),
                        })),
                        { key: 'nueva', label: 'Nueva', icon: 'plus', active: false, primary: true, onClick: () => go('/ventas/nueva') },
                        ...sections.slice(2).map((s) => ({ key: s.key, label: s.label, icon: s.icon, active: false, onClick: () => go(s.href) })),
                    ]}
                />
            )}

            <LogoutDialog
                open={confirmLogout}
                online={connection.online}
                pendingCount={connection.pending.length}
                onCancel={() => setConfirmLogout(false)}
                onConfirm={logoutAndForget}
            />
        </div>
    );
}

/** A titled block inside "Mi cuenta". */
export function AccountSection({
    title,
    description,
    children,
    danger = false,
}: {
    title: string;
    description: string;
    children: ReactNode;
    danger?: boolean;
}) {
    return (
        <Card
            as="section"
            style={{
                gap: 'var(--space-6)',
                padding: 'var(--space-6)',
                boxShadow: danger ? 'inset 0 0 0 1px var(--color-accent-700)' : 'var(--shadow-sm)',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-300)' }}>{description}</span>
            </div>
            {children}
        </Card>
    );
}

/** "Guardado" next to a save button, shown briefly after a successful save. */
export function SavedNote({ show }: { show: boolean }) {
    if (!show) {
        return null;
    }

    return (
        <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12, color: 'var(--color-neutral-300)' }}>
            <Icon name="check-circle" color="var(--color-accent)" />
            Guardado
        </span>
    );
}
