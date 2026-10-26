import '../../../css/nocturne.css';

import { Head } from '@inertiajs/react';
import type { FormEventHandler, ReactNode } from 'react';
import { Icon } from './icon';

const highlights = [
    ['file-text', 'MATCH y CSV por BOT al guardar'],
    ['package', 'Equipos conectados al inventario'],
    ['floppy-disk', 'Borradores que no se pierden'],
] as const;

function Brand() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontWeight: 500, fontSize: 16 }}>
            <Icon name="shield-check" size={24} color="var(--color-accent)" />
            WolftekGuard
        </div>
    );
}

type AuthLayoutProps = {
    /** Browser tab title. */
    pageTitle: string;
    title: string;
    subtitle: string;
    onSubmit: FormEventHandler<HTMLFormElement>;
    children: ReactNode;
};

/**
 * Split auth screen from the WolftekGuard design: product pitch on the left (≥ 900px),
 * the form on the right. Below 900px only the form shows, with the brand above it.
 */
export function AuthLayout({ pageTitle, title, subtitle, onSubmit, children }: AuthLayoutProps) {
    return (
        <div className="wg">
            <Head title={pageTitle} />
            <div className="wg-auth">
                <section
                    className="wg-auth-side"
                    style={{
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 'var(--space-8)',
                        padding: 48,
                        borderRight: '1px solid var(--color-neutral-800)',
                    }}
                >
                    <Brand />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 420 }}>
                        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, lineHeight: 1.2, textWrap: 'pretty' }}>
                            Captura, valida y da seguimiento a tus ventas en un solo lugar.
                        </h1>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-4)',
                                fontSize: 13,
                                color: 'var(--color-neutral-200)',
                            }}
                        >
                            {highlights.map(([icon, text]) => (
                                <span key={icon} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <Icon name={icon} size={17} color="var(--color-accent)" />
                                    {text}
                                </span>
                            ))}
                        </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>Gestión de ventas · uso interno</span>
                </section>

                <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8) var(--space-6)' }}>
                    <form
                        onSubmit={onSubmit}
                        noValidate
                        style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
                    >
                        <div className="wg-auth-brand-mobile" style={{ display: 'flex' }}>
                            <Brand />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>{title}</h2>
                            <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-neutral-300)' }}>{subtitle}</span>
                        </div>
                        {children}
                    </form>
                </section>
            </div>
        </div>
    );
}
