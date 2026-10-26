import { Button } from './button';
import { Icon } from './icon';
import { UserBadge } from './user-badge';

export type TabItem = {
    key: string;
    label: string;
    /** Phosphor icon name. */
    icon: string;
    active: boolean;
    /** The round, raised "Nueva" action in the middle. */
    primary?: boolean;
    badge?: number;
    onClick: () => void;
};

/** Sticky phone header: brand, user initials and logout. */
export function MobileTopBar({ onLogout, user, onUser }: { onLogout: () => void; user?: { name: string; email: string }; onUser?: () => void }) {
    return (
        <div
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-4)',
                padding: 'var(--space-2) var(--space-2) var(--space-2) var(--space-4)',
                background: 'var(--color-bg)',
                boxShadow: '0 1px 0 var(--color-neutral-800)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontWeight: 500, fontSize: 15 }}>
                <Icon name="shield-check" size={20} color="var(--color-accent)" />
                <span>WolftekGuard</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {user && (
                    <button
                        type="button"
                        onClick={onUser}
                        disabled={!onUser}
                        aria-label="Mi cuenta"
                        style={{ border: 0, background: 'transparent', padding: 4, cursor: onUser ? 'pointer' : 'default', color: 'inherit' }}
                    >
                        <UserBadge name={user.name} email={user.email} compact />
                    </button>
                )}
                <Button
                    variant="ghost"
                    iconOnly
                    icon="sign-out"
                    onClick={onLogout}
                    aria-label="Cerrar sesión"
                    style={{ minWidth: 44, minHeight: 44 }}
                />
            </div>
        </div>
    );
}

/** Fixed phone tab bar at the bottom of the screen. */
export function MobileTabBar({ items }: { items: TabItem[] }) {
    return (
        <nav
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 15,
                display: 'flex',
                padding: '0 var(--space-2) env(safe-area-inset-bottom)',
                background: 'var(--color-surface)',
                boxShadow: '0 -1px 0 var(--color-neutral-800)',
            }}
        >
            {items.map((tab) => {
                const size = tab.primary ? 40 : 28;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={tab.onClick}
                        aria-label={tab.label}
                        aria-current={tab.active ? 'page' : undefined}
                        style={{
                            flex: 1,
                            minHeight: 60,
                            border: 0,
                            background: 'transparent',
                            font: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            fontSize: 10,
                            color: tab.active ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
                            position: 'relative',
                        }}
                    >
                        <span
                            style={{
                                width: size,
                                height: size,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 20,
                                background: tab.primary ? 'var(--color-accent-900)' : 'transparent',
                                boxShadow: tab.primary ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
                            }}
                        >
                            <Icon name={tab.icon} />
                        </span>
                        <span>{tab.label}</span>
                        {!!tab.badge && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 6,
                                    left: 'calc(50% + 6px)',
                                    minWidth: 16,
                                    height: 16,
                                    padding: '0 4px',
                                    borderRadius: 999,
                                    background: 'var(--color-accent-800)',
                                    color: 'var(--color-accent-100)',
                                    fontSize: 10,
                                    display: 'grid',
                                    placeItems: 'center',
                                }}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
