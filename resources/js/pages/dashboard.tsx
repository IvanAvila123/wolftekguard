import '../../css/nocturne.css';

import {
    AppSidebar,
    Banner,
    Button,
    ConnectionBanner,
    iconName,
    LogoutDialog,
    MobileTabBar,
    MobileTopBar,
    PendingChanges,
} from '@/components/nocturne';
import type { SharedData } from '@/types';
import type { WolftekProps } from '@/wolftek/data';
import { logoutAndForget } from '@/wolftek/offline/logout';
import Overlays from '@/wolftek/overlays';
import CreadaScreen from '@/wolftek/screens/creada-screen';
import DashboardScreen from '@/wolftek/screens/dashboard-screen';
import InventarioScreen from '@/wolftek/screens/inventario-screen';
import MachotesScreen from '@/wolftek/screens/machotes-screen';
import NuevaScreen from '@/wolftek/screens/nueva-screen';
import VentasScreen from '@/wolftek/screens/ventas-screen';
import { useWolftek, type WolftekView } from '@/wolftek/use-wolftek';
import { sx } from '@/wolftek/utils';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

function DraftBanner({ v }: { v: WolftekView }) {
    return (
        <Banner
            icon="floppy-disk"
            title={v.draftTitle}
            subtitle={v.draftSub}
            actions={
                <>
                    <Button variant="ghost" onClick={v.discardDraft} style={sx('white-space:nowrap;')}>
                        Descartar
                    </Button>
                    <Button variant="primary" icon="arrow-right" onClick={v.resumeDraft} style={sx('white-space:nowrap;')}>
                        Continuar
                    </Button>
                </>
            }
        />
    );
}

export default function Dashboard(props: WolftekProps) {
    const v = useWolftek(props);
    const { auth } = usePage<SharedData>().props;
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [showPending, setShowPending] = useState(false);
    const askLogout = () => setConfirmLogout(true);
    const { connection } = v;
    const waiting = connection.pending.filter((item) => item.status === 'pendiente').length;
    const failed = connection.pending.length - waiting;

    return (
        <div className="wg">
            <Head title="Dashboard" />
            <div
                style={sx(
                    `display:grid;grid-template-columns:${v.gridCols};min-height:100vh;background:radial-gradient(1200px 600px at 20% -10%, var(--color-neutral-800), var(--color-bg) 60%);`,
                )}
            >
                {!v.isMobile && (
                    <AppSidebar
                        collapsed={v.fullDisp === 'none'}
                        onNew={v.goNueva}
                        onLogout={askLogout}
                        onUser={() => router.visit(route('profile.edit'))}
                        user={auth.user}
                        items={v.nav.map((n) => ({
                            key: n.key,
                            label: n.label,
                            icon: iconName(n.icon),
                            active: n.ring !== 'none',
                            badge: n.hasBadge ? n.badge : undefined,
                            onClick: n.go,
                        }))}
                    />
                )}
                {v.isMobile && <MobileTopBar onLogout={askLogout} user={auth.user} onUser={() => router.visit(route('profile.edit'))} />}

                <main style={sx(`display:flex;flex-direction:column;gap:${v.mainGap};padding:${v.mainPad};min-width:0;max-width:1200px;width:100%;`)}>
                    <ConnectionBanner
                        online={connection.online}
                        pendingCount={waiting}
                        failedCount={failed}
                        syncing={connection.syncing}
                        sessionExpired={connection.sessionExpired}
                        onSync={connection.sync}
                        onShowPending={() => setShowPending(true)}
                    />
                    {v.showDraftBanner && <DraftBanner v={v} />}
                    {v.screen === 'dashboard' && <DashboardScreen v={v} />}
                    {v.screen === 'ventas' && <VentasScreen v={v} />}
                    {v.screen === 'nueva' && <NuevaScreen v={v} />}
                    {v.screen === 'creada' && <CreadaScreen v={v} />}
                    {v.screen === 'inventario' && <InventarioScreen v={v} />}
                    {v.screen === 'machotes' && <MachotesScreen v={v} />}
                </main>
            </div>
            {v.isMobile && (
                <MobileTabBar
                    items={v.tabs.map((t) => ({
                        key: t.key,
                        label: t.label,
                        icon: iconName(t.icon),
                        active: t.color === 'var(--color-accent-100)',
                        primary: t.key === 'nueva',
                        badge: t.hasBadge ? t.badge : undefined,
                        onClick: t.go,
                    }))}
                />
            )}
            <Overlays v={v} />
            <LogoutDialog
                open={confirmLogout}
                draftName={v.draftName}
                online={connection.online}
                pendingCount={connection.pending.length}
                onCancel={() => setConfirmLogout(false)}
                onConfirm={logoutAndForget}
            />
            <PendingChanges
                open={showPending}
                onClose={() => setShowPending(false)}
                items={connection.pending.map((item) => ({ ...item, canResolve: !!item.resume }))}
                online={connection.online}
                onRetry={connection.retry}
                onDiscard={connection.discard}
                onResolve={(id) => {
                    setShowPending(false);
                    v.resolvePending(id);
                }}
            />
        </div>
    );
}
