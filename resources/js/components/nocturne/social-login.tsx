import { Button } from './button';

const providers = [
    ['google', 'Google', 'google-logo'],
    ['microsoft', 'Microsoft', 'windows-logo'],
    ['facebook', 'Facebook', 'facebook-logo'],
] as const;

type SocialLoginProps = {
    label?: string;
    /** Providers configured on the server; the others render disabled. */
    enabled?: readonly string[];
};

/**
 * "o continúa con" divider and the three provider buttons from the design.
 * Signing in leaves the app for the provider's page, so it is a full page visit, not an Inertia one.
 */
export function SocialLogin({ label = 'o continúa con', enabled = [] }: SocialLoginProps) {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 12, color: 'var(--color-neutral-400)' }}>
                <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--color-neutral-700))' }} />
                {label}
                <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--color-neutral-700), transparent)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
                {providers.map(([key, name, icon]) => {
                    const active = enabled.includes(key);

                    return (
                        <Button
                            key={key}
                            icon={icon}
                            disabled={!active}
                            onClick={() => window.location.assign(route('login.social', key))}
                            aria-label={active ? `Continuar con ${name}` : `${name} · No disponible`}
                            title={active ? `Continuar con ${name}` : 'No disponible'}
                            style={{ minHeight: 44, whiteSpace: 'nowrap', gap: 'var(--space-2)' }}
                        >
                            <span className="wg-social-label">{name}</span>
                        </Button>
                    );
                })}
            </div>
        </>
    );
}
