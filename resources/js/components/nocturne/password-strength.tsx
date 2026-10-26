import { Icon } from './icon';

const labels = ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];

/** Four-bar strength meter plus the two hints from the design (length, letters + numbers). Visual guidance only. */
export function PasswordStrength({ password, highlightMissing = false }: { password: string; highlightMissing?: boolean }) {
    const hasLength = password.length >= 8;
    const hasMix = /[a-zA-Z]/.test(password) && /\d/.test(password);
    const score = !password
        ? 0
        : Math.min(
              4,
              (hasLength ? 1 : 0) +
                  (hasMix ? 1 : 0) +
                  (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) +
                  (/[^a-zA-Z0-9]/.test(password) || password.length >= 12 ? 1 : 0),
          ) || 1;
    const requirements: [string, boolean][] = [
        ['8 caracteres o más', hasLength],
        ['Letras y números', hasMix],
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'calc(var(--space-6) * -0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }}>
                    {[1, 2, 3, 4].map((i) => (
                        <span
                            key={i}
                            style={{
                                height: 4,
                                borderRadius: 2,
                                background:
                                    password && i <= score
                                        ? score <= 1
                                            ? 'var(--color-accent-200)'
                                            : 'var(--color-accent)'
                                        : 'var(--color-neutral-700)',
                            }}
                        />
                    ))}
                </div>
                <span
                    style={{
                        fontSize: 11,
                        minWidth: 64,
                        textAlign: 'right',
                        color: score <= 1 ? 'var(--color-accent-200)' : 'var(--color-neutral-200)',
                    }}
                >
                    {password ? labels[score] : ''}
                </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1) var(--space-4)' }}>
                {requirements.map(([label, ok]) => (
                    <span
                        key={label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontSize: 11,
                            color: ok ? 'var(--color-neutral-200)' : highlightMissing ? 'var(--color-accent-200)' : 'var(--color-neutral-400)',
                        }}
                    >
                        <Icon name={ok ? 'check-circle' : 'circle'} weight={ok ? 'fill' : 'regular'} />
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}
