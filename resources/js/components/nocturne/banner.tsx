import type { ReactNode } from 'react';
import { Card } from './card';
import { Icon } from './icon';

type BannerProps = {
    /** Phosphor icon name. */
    icon: string;
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
};

/** Accent-outlined card with an icon, two lines of text and actions on the right (e.g. the unsaved-draft notice). */
export function Banner({ icon, title, subtitle, actions }: BannerProps) {
    return (
        <Card
            role="status"
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-4)',
                flexWrap: 'wrap',
                padding: 'var(--space-4) var(--space-6)',
                boxShadow: 'inset 0 0 0 1px var(--color-accent-700), var(--shadow-sm)',
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                <Icon name={icon} size={20} color="var(--color-accent)" style={{ flex: 'none' }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
                    {subtitle && <span style={{ fontSize: 12, color: 'var(--color-neutral-300)' }}>{subtitle}</span>}
                </span>
            </span>
            {actions && <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>{actions}</div>}
        </Card>
    );
}
