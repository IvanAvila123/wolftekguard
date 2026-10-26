import '../../css/nocturne.css';

import { Button, Icon } from '@/components/nocturne';
import { Head } from '@inertiajs/react';

/** Title, explanation and icon per HTTP status. */
const MENSAJES: Record<number, [string, string, string]> = {
    403: ['No tienes permiso', 'Tu usuario no puede ver esta página. Si crees que es un error, pídele acceso a tu administrador.', 'lock-simple'],
    404: ['No encontramos esta página', 'La venta o el enlace ya no existe, se archivó o la dirección está mal escrita.', 'magnifying-glass'],
    429: ['Vas muy rápido', 'Hiciste demasiadas peticiones en poco tiempo. Espera un minuto y vuelve a intentar.', 'hourglass-medium'],
    500: ['Algo salió mal', 'Tuvimos un problema en el servidor y ya quedó registrado. Intenta de nuevo en un momento.', 'warning'],
    503: ['Estamos en mantenimiento', 'Estamos actualizando WolftekGuard. Vuelve en unos minutos.', 'wrench'],
};

/** Friendly page for errors in production (app.debug off); see bootstrap/app.php. */
export default function ErrorPage({ status }: { status: number }) {
    const [titulo, texto, icono] = MENSAJES[status] ?? MENSAJES[500];

    return (
        <div className="wg">
            <Head title={titulo} />
            <main
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    padding: 'var(--space-8) 16px',
                    background: 'radial-gradient(1200px 600px at 20% -10%, var(--color-neutral-800), var(--color-bg) 60%)',
                }}
            >
                <div
                    className="card"
                    style={{ width: 'min(440px, 100%)', padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontWeight: 500, fontSize: 16 }}>
                        <Icon name="shield-check" size={24} color="var(--color-accent)" />
                        WolftekGuard
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <span
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 13, color: 'var(--color-neutral-300)' }}
                        >
                            <Icon name={icono} size={18} color="var(--color-accent)" />
                            Error {status}
                        </span>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>{titulo}</h1>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-200)' }}>{texto}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <Button variant="primary" icon="house" onClick={() => window.location.assign('/dashboard')}>
                            Ir al inicio
                        </Button>
                        <Button variant="ghost" icon="arrow-left" onClick={() => window.history.back()}>
                            Regresar
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
