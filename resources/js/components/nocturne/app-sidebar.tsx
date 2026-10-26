import { Button } from './button';
import { Icon } from './icon';
import { Tag } from './tag';
import { UserBadge } from './user-badge';

export type NavItem = {
    key: string;
    label: string;
    /** Phosphor icon name. */
    icon: string;
    active: boolean;
    badge?: number;
    onClick: () => void;
};

type AppSidebarProps = {
    items: NavItem[];
    /** Signed-in user shown above "Cerrar sesión". */
    user?: { name: string; email: string };
    /** Tablet width: icons only. */
    collapsed?: boolean;
    onNew: () => void;
    onLogout: () => void;
    /** Opens the user's account settings when the avatar is clicked. */
    onUser?: () => void;
    /** Highlights the avatar (on the account pages). */
    userActive?: boolean;
};

const navButton = (collapsed: boolean) =>
    ({
        border: 0,
        font: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'left',
    }) as const;

/** Desktop/tablet navigation column: brand, "Nueva venta", sections, logout. */
export function AppSidebar({ items, user, collapsed = false, onNew, onLogout, onUser, userActive = false }: AppSidebarProps) {
    return (
        <aside
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: collapsed ? 'center' : 'stretch',
                gap: 'var(--space-8)',
                padding: collapsed ? 'var(--space-8) var(--space-3)' : 'var(--space-8) var(--space-6)',
                borderRight: '1px solid var(--color-neutral-800)',
                position: 'sticky',
                top: 0,
                height: '100vh',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontWeight: 500, fontSize: 16 }}>
                    <Icon name="shield-check" size={22} color="var(--color-accent)" />
                    {!collapsed && <span>WolftekGuard</span>}
                </div>
                {!collapsed && <span style={{ fontSize: 12, color: 'var(--color-neutral-300)', paddingLeft: 30 }}>Gestión de ventas</span>}
            </div>

            <Button
                variant="primary"
                icon="plus"
                iconOnly={collapsed}
                block={!collapsed}
                onClick={onNew}
                aria-label="Nueva venta"
                title="Nueva venta"
            >
                {!collapsed && 'Nueva venta'}
            </Button>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 13 }}>
                {items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={item.onClick}
                        title={item.label}
                        aria-current={item.active ? 'page' : undefined}
                        className="h-bg h-text"
                        style={{
                            ...navButton(collapsed),
                            color: item.active ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
                            background: item.active ? 'var(--color-accent-900)' : 'transparent',
                            boxShadow: item.active ? 'inset 0 0 0 1px var(--color-accent-700)' : 'none',
                        }}
                    >
                        <Icon name={item.icon} size={16} />
                        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                        {!collapsed && !!item.badge && (
                            <Tag variant="accent" style={{ fontSize: 11 }}>
                                {item.badge}
                            </Tag>
                        )}
                    </button>
                ))}
            </nav>

            {user && (
                <button
                    type="button"
                    onClick={onUser}
                    disabled={!onUser}
                    title="Mi cuenta"
                    aria-current={userActive ? 'page' : undefined}
                    className="h-bg"
                    style={{
                        marginTop: 'auto',
                        marginBottom: 'calc(var(--space-8) * -0.6)',
                        border: 0,
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                        cursor: onUser ? 'pointer' : 'default',
                        padding: 'var(--space-2) 0',
                        borderRadius: 'var(--radius-md)',
                        background: userActive ? 'var(--color-accent-900)' : 'transparent',
                        boxShadow: userActive ? 'inset 0 0 0 1px var(--color-accent-700)' : 'none',
                    }}
                >
                    <UserBadge name={user.name} email={user.email} compact={collapsed} />
                </button>
            )}

            <button
                type="button"
                onClick={onLogout}
                className="h-bg h-text"
                style={{
                    ...navButton(collapsed),
                    background: 'transparent',
                    marginTop: user ? 0 : 'auto',
                    fontSize: 13,
                    color: 'var(--color-neutral-300)',
                }}
            >
                <Icon name="sign-out" size={16} />
                {!collapsed && <span>Cerrar sesión</span>}
            </button>
        </aside>
    );
}
