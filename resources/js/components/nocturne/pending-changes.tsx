import { Button } from './button';
import { Dialog } from './dialog';
import { Icon } from './icon';
import { Tag } from './tag';

export type PendingChange = {
    id: string;
    label: string;
    createdAt: number;
    status: 'pendiente' | 'error';
    error?: string;
    /** A refused edit that can be reopened in the editor to compare and merge. */
    canResolve?: boolean;
};

type PendingChangesProps = {
    open: boolean;
    onClose: () => void;
    items: PendingChange[];
    online: boolean;
    onRetry: (id: string) => void;
    onDiscard: (id: string) => void;
    onResolve?: (id: string) => void;
};

const when = (at: number) => new Date(at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Changes saved on this device that the server has not received yet. */
export function PendingChanges({ open, onClose, items, online, onRetry, onDiscard, onResolve }: PendingChangesProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Cambios por enviar"
            icon="cloud-arrow-up"
            width="min(520px, 100%)"
            actions={
                <Button variant="ghost" onClick={onClose}>
                    Cerrar
                </Button>
            }
        >
            <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-300)' }}>
                Se guardaron en este equipo y se envían en orden en cuanto hay conexión. Si descartas uno, se pierde.
            </span>
            {items.length === 0 && <span style={{ fontSize: 13, color: 'var(--color-neutral-300)' }}>No hay cambios pendientes.</span>}
            {items.map((item) => (
                <div
                    key={item.id}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-neutral-900)',
                        boxShadow: item.status === 'error' ? 'inset 0 0 0 1px var(--color-accent-600)' : 'none',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 13, lineHeight: 1.4 }}>{item.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>Guardado {when(item.createdAt)}</span>
                        </span>
                        <Tag variant={item.status === 'error' ? 'accent' : 'outline'} icon={item.status === 'error' ? 'warning' : 'clock'}>
                            {item.status === 'error' ? 'No se envió' : 'Pendiente'}
                        </Tag>
                    </div>
                    {item.error && (
                        <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-accent-200)', display: 'flex', gap: 'var(--space-2)' }}>
                            <Icon name="info" style={{ marginTop: 3, flex: 'none' }} />
                            {item.error}
                        </span>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        {item.status === 'error' && item.canResolve && onResolve ? (
                            <Button variant="primary" icon="git-merge" onClick={() => onResolve(item.id)} disabled={!online}>
                                Resolver
                            </Button>
                        ) : (
                            item.status === 'error' && (
                                <Button variant="ghost" icon="arrow-clockwise" onClick={() => onRetry(item.id)} disabled={!online}>
                                    Reintentar
                                </Button>
                            )
                        )}
                        <Button variant="ghost" icon="trash" onClick={() => onDiscard(item.id)}>
                            Descartar
                        </Button>
                    </div>
                </div>
            ))}
        </Dialog>
    );
}
