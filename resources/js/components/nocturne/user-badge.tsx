type UserBadgeProps = {
    name: string;
    email: string;
    /** Initials only (collapsed sidebar, phone header). */
    compact?: boolean;
};

export function initialsOf(name: string): string {
    return (
        name
            .split(' ')
            .filter(Boolean)
            .map((word) => word[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?'
    );
}

/** Round initials avatar, optionally followed by the user's name and email. */
export function UserBadge({ name, email, compact = false }: UserBadgeProps) {
    return (
        <div
            title={email}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: compact ? 0 : '0 var(--space-2)',
                justifyContent: compact ? 'center' : 'flex-start',
                minWidth: 0,
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 30,
                    height: 30,
                    flex: 'none',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 500,
                    background: 'var(--color-accent-900)',
                    color: 'var(--color-accent-100)',
                    boxShadow: 'inset 0 0 0 1px var(--color-accent-700)',
                }}
            >
                {initialsOf(name)}
            </span>
            {compact ? (
                <span className="sr-only">{name}</span>
            ) : (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span
                        style={{
                            display: 'block',
                            fontSize: 11,
                            color: 'var(--color-neutral-400)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {email}
                    </span>
                </span>
            )}
        </div>
    );
}
