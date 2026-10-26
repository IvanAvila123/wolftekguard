import { Button } from './button';
import { Dialog } from './dialog';

type LogoutDialogProps = {
    open: boolean;
    /** Name of an unfinished sale kept on this device, if any. */
    draftName?: string | null;
    online: boolean;
    /** Changes saved offline and not sent yet; signing out deletes them. */
    pendingCount: number;
    onCancel: () => void;
    onConfirm: () => void;
};

/** "¿Seguro que quieres salir?" with the offline caveats (no connection, unsent changes, kept draft). */
export function LogoutDialog({ open, draftName = null, online, pendingCount, onCancel, onConfirm }: LogoutDialogProps) {
    const message = !online
        ? 'Necesitas conexión para cerrar sesión. Mientras tanto puedes seguir trabajando.'
        : pendingCount
          ? `Tienes ${pendingCount} ${pendingCount === 1 ? 'cambio' : 'cambios'} sin enviar. Si cierras sesión se borrarán de este equipo.`
          : draftName
            ? `Tu borrador "${draftName}" se queda guardado en este equipo y lo podrás continuar al volver a entrar.`
            : '¿Seguro que quieres salir?';

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            title="Cerrar sesión"
            icon="sign-out"
            actions={
                <>
                    <Button variant="ghost" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button variant="primary" icon="sign-out" onClick={onConfirm} disabled={!online}>
                        {pendingCount ? 'Cerrar sesión y borrar' : 'Cerrar sesión'}
                    </Button>
                </>
            }
        >
            <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-neutral-200)' }}>{message}</span>
        </Dialog>
    );
}
