import { CardButton } from './card';
import { Icon } from './icon';

type StatCardProps = {
    label: string;
    value: string | number;
    icon?: string;
    /** Accent ring for figures that need attention. */
    highlighted?: boolean;
    onClick?: () => void;
};

/** KPI tile: uppercase label, big tabular number, optional icon. */
export function StatCard({ label, value, icon, highlighted = false, onClick }: StatCardProps) {
    return (
        <CardButton
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                padding: 'var(--space-6)',
                boxShadow: highlighted ? 'inset 0 0 0 1px var(--color-accent-600)' : 'var(--shadow-sm)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-300)' }}>{label}</span>
                {icon && <Icon name={icon} size={16} color="var(--color-accent)" />}
            </div>
            <span style={{ fontSize: 28, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </CardButton>
    );
}
