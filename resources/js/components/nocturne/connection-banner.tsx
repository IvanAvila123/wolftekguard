import { Button } from './button';
import { Icon } from './icon';

type ConnectionBannerProps = {
    online: boolean;
    pendingCount: number;
    failedCount: number;
    syncing: boolean;
    sessionExpired: boolean;
    onSync: () => void;
    onShowPending: () => void;
};

const changes = (n: number) => n + (n === 1 ? ' cambio' : ' cambios');
const saved = (n: number) => changes(n) + (n === 1 ? ' guardado' : ' guardados');

/** Thin strip at the top: no connection, changes waiting to be sent, or a session that must be renewed. */
export function ConnectionBanner({ online, pendingCount, failedCount, syncing, sessionExpired, onSync, onShowPending }: ConnectionBannerProps) {
    const total = pendingCount + failedCount;

    if (online && total === 0) {
        return null;
    }

    let icon = 'cloud-arrow-up';
    let text: string;

    if (sessionExpired) {
        icon = 'lock-key';
        text = `Tu sesión venció. Inicia sesión para enviar ${saved(pendingCount)} en este equipo.`;
    } else if (!online) {
        icon = 'wifi-slash';
        text = total
            ? `Sin conexión · ${saved(total)} en este equipo. Se envían solos al volver la conexión.`
            : 'Sin conexión · Puedes seguir trabajando; lo que guardes se enviará solo al volver la conexión.';
    } else if (syncing) {
        text = `Enviando ${changes(pendingCount)}…`;
    } else if (failedCount) {
        icon = 'warning-circle';
        text = `${changes(failedCount)} no se pudieron enviar. Revísalos.`;
    } else {
        text = `${changes(pendingCount)} por enviar.`;
    }

    return (
        <div
            role="status"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-4)',
                flexWrap: 'wrap',
                padding: 'var(--space-3) var(--space-6)',
                borderRadius: 'var(--radius-md)',
                background: online && !failedCount && !sessionExpired ? 'var(--color-neutral-900)' : 'var(--color-accent-900)',
                boxShadow: 'inset 0 0 0 1px ' + (online && !failedCount && !sessionExpired ? 'var(--color-neutral-700)' : 'var(--color-accent-700)'),
                color: 'var(--color-neutral-100)',
                fontSize: 13,
                lineHeight: 1.5,
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                <Icon
                    name={syncing ? 'circle-notch' : icon}
                    className={syncing ? 'spin' : undefined}
                    size={18}
                    color="var(--color-accent)"
                    style={{ flex: 'none' }}
                />
                {text}
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {total > 0 && (
                    <Button variant="ghost" onClick={onShowPending} style={{ whiteSpace: 'nowrap' }}>
                        Ver pendientes
                    </Button>
                )}
                {sessionExpired ? (
                    <a href="/login" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        <Icon name="sign-in" /> Iniciar sesión
                    </a>
                ) : (
                    online &&
                    pendingCount > 0 && (
                        <Button variant="primary" icon="paper-plane-tilt" loading={syncing} onClick={onSync} style={{ whiteSpace: 'nowrap' }}>
                            Enviar ahora
                        </Button>
                    )
                )}
            </div>
        </div>
    );
}
