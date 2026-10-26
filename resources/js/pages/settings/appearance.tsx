import { Icon } from '@/components/nocturne';
import AccountLayout, { AccountSection } from '@/wolftek/account-layout';

const swatches = [
    ['Fondo', 'var(--color-bg)'],
    ['Superficie', 'var(--color-surface)'],
    ['Texto', 'var(--color-text)'],
    ['Acento', 'var(--color-accent)'],
] as const;

export default function Appearance() {
    return (
        <AccountLayout title="Apariencia">
            <AccountSection title="Tema" description="WolftekGuard usa el tema oscuro Nocturne del diseño. Por ahora no hay un tema claro.">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 13 }}>
                    <Icon name="moon" size={18} color="var(--color-accent)" />
                    Oscuro · Nocturne
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--space-3)' }}>
                    {swatches.map(([label, color]) => (
                        <div
                            key={label}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-2)',
                                fontSize: 12,
                                color: 'var(--color-neutral-300)',
                            }}
                        >
                            <span style={{ height: 44, borderRadius: 'var(--radius-md)', background: color, boxShadow: 'var(--shadow-sm)' }} />
                            {label}
                        </div>
                    ))}
                </div>
            </AccountSection>
        </AccountLayout>
    );
}
