import { Alert, Button, Dialog, Icon, Tag } from '@/components/nocturne';
import { router } from '@inertiajs/react';
import { useRef, useState, type DragEvent } from 'react';
import { xsrfToken } from './offline/outbox';

type Linea = { sku: string; nombre: string; total?: number; antes?: number; despues?: number };

type VistaPrevia = {
    token: string;
    archivo: string;
    modelos: number;
    nuevos: Linea[];
    cambian: Linea[];
    sinStock: Linea[];
    quitados: Linea[];
    sinCambios: number;
};

type ImportDialogProps = {
    open: boolean;
    online: boolean;
    onClose: () => void;
    /** Called after the inventory was replaced, with a message for the toast. */
    onImported: (message: string) => void;
};

const MAX_LINEAS = 6;

function Grupo({ titulo, icono, lineas, detalle }: { titulo: string; icono: string; lineas: Linea[]; detalle: (l: Linea) => string }) {
    if (lineas.length === 0) {
        return null;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-neutral-100)',
                }}
            >
                <Icon name={icono} color="var(--color-accent)" />
                {titulo} · {lineas.length}
            </span>
            {lineas.slice(0, MAX_LINEAS).map((l) => (
                <div
                    key={l.sku}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 'var(--space-4)',
                        fontSize: 12,
                        lineHeight: 1.4,
                        paddingLeft: 'var(--space-6)',
                    }}
                >
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.nombre} <span style={{ color: 'var(--color-neutral-400)' }}>· {l.sku}</span>
                    </span>
                    <span style={{ flex: 'none', fontVariantNumeric: 'tabular-nums', color: 'var(--color-neutral-300)' }}>{detalle(l)}</span>
                </div>
            ))}
            {lineas.length > MAX_LINEAS && (
                <span style={{ fontSize: 11, color: 'var(--color-neutral-400)', paddingLeft: 'var(--space-6)' }}>
                    y {lineas.length - MAX_LINEAS} más
                </span>
            )}
        </div>
    );
}

/**
 * Upload an Excel file, see what it would change (new, changed, out of stock, removed) and only then
 * replace the inventory. The file is checked on the server; nothing is saved until "Reemplazar".
 */
export function ImportDialog({ open, online, onClose, onImported }: ImportDialogProps) {
    const input = useRef<HTMLInputElement>(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [revisando, setRevisando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errores, setErrores] = useState<string[]>([]);
    const [vista, setVista] = useState<VistaPrevia | null>(null);

    const reiniciar = () => {
        setVista(null);
        setErrores([]);
        setRevisando(false);
        setGuardando(false);
    };

    const cerrar = () => {
        reiniciar();
        onClose();
    };

    const revisar = async (archivo: File) => {
        reiniciar();
        setRevisando(true);
        const datos = new FormData();
        datos.append('archivo', archivo);

        try {
            const respuesta = await fetch(route('inventario.importar.preview'), {
                method: 'POST',
                body: datos,
                credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrfToken() },
            });
            const cuerpo = await respuesta.json().catch(() => ({}));

            if (respuesta.ok) {
                setVista(cuerpo as VistaPrevia);
            } else if (respuesta.status === 422) {
                setErrores((cuerpo.errors?.archivo as string[] | undefined) ?? [cuerpo.message || 'No se pudo leer el archivo.']);
            } else if (respuesta.status === 401 || respuesta.status === 419) {
                setErrores(['Tu sesión venció. Recarga la página e inicia sesión otra vez.']);
            } else {
                setErrores(['El servidor no pudo revisar el archivo. Intenta de nuevo.']);
            }
        } catch {
            setErrores(['Sin conexión. Para importar el inventario necesitas conexión con el servidor.']);
        } finally {
            setRevisando(false);
        }
    };

    const elegido = (lista: FileList | null) => {
        const archivo = lista && lista[0];

        if (archivo) {
            revisar(archivo);
        }
    };

    const soltar = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setArrastrando(false);
        elegido(e.dataTransfer.files);
    };

    const reemplazar = () => {
        if (!vista) {
            return;
        }

        setGuardando(true);
        router.post(
            route('inventario.importar'),
            { token: vista.token },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    onImported(`Inventario actualizado con ${vista.modelos} modelos`);
                    cerrar();
                },
                onError: (errors) => setErrores(Object.values(errors)),
                onFinish: () => setGuardando(false),
            },
        );
    };

    const cambios = vista ? vista.nuevos.length + vista.cambian.length + vista.sinStock.length + vista.quitados.length : 0;

    return (
        <Dialog
            open={open}
            onClose={cerrar}
            title={vista ? 'Revisa los cambios' : 'Importar inventario'}
            icon={vista ? 'list-checks' : 'file-xls'}
            width="min(560px, 100%)"
            actions={
                <>
                    {vista && (
                        <Button variant="ghost" icon="arrow-counter-clockwise" onClick={reiniciar} disabled={guardando}>
                            Otro archivo
                        </Button>
                    )}
                    <Button variant="ghost" onClick={cerrar}>
                        Cancelar
                    </Button>
                    {vista && (
                        <Button variant="primary" icon="check" loading={guardando} disabled={!online || cambios === 0} onClick={reemplazar}>
                            Reemplazar inventario
                        </Button>
                    )}
                </>
            }
        >
            {errores.length > 0 && (
                <Alert>
                    {errores.length === 1 ? (
                        errores[0]
                    ) : (
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {errores.map((e) => (
                                <span key={e}>{e}</span>
                            ))}
                        </span>
                    )}
                </Alert>
            )}

            {!vista && (
                <>
                    <div
                        role="button"
                        tabIndex={0}
                        aria-disabled={!online || revisando}
                        onClick={() => online && !revisando && input.current?.click()}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && online && input.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setArrastrando(true);
                        }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={soltar}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-8)',
                            borderRadius: 'var(--radius-md)',
                            border: `1px dashed ${arrastrando ? 'var(--color-accent)' : 'var(--color-neutral-600)'}`,
                            background: arrastrando ? 'var(--color-accent-900)' : 'transparent',
                            textAlign: 'center',
                            fontSize: 13,
                            cursor: online && !revisando ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <Icon
                            name={revisando ? 'circle-notch' : 'file-xls'}
                            className={revisando ? 'spin' : undefined}
                            size={30}
                            color="var(--color-accent)"
                        />
                        <span>
                            {revisando ? 'Revisando el archivo…' : online ? 'Arrastra tu archivo Excel aquí' : 'Necesitas conexión para importar'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-neutral-300)' }}>o haz clic para buscarlo · .xlsx, .xls, .csv</span>
                        <input
                            ref={input}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                elegido(e.target.files);
                                e.target.value = '';
                            }}
                        />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-300)', lineHeight: 1.5 }}>
                        Antes de reemplazar el inventario te mostramos qué modelos cambian, cuáles son nuevos y cuáles se quedan sin stock. Usa la
                        plantilla para el formato de las columnas.
                    </span>
                </>
            )}

            {vista && (
                <>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-300)' }}>
                        {vista.archivo} · {vista.modelos} modelos en el archivo
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <Tag variant="accent" icon="plus">
                            {vista.nuevos.length} nuevos
                        </Tag>
                        <Tag variant="outline" icon="arrows-clockwise">
                            {vista.cambian.length} cambian
                        </Tag>
                        <Tag variant="accent" icon="warning">
                            {vista.sinStock.length} sin stock
                        </Tag>
                        <Tag variant="neutral" icon="trash">
                            {vista.quitados.length} se quitan
                        </Tag>
                        <Tag variant="neutral" icon="equals">
                            {vista.sinCambios} igual
                        </Tag>
                    </div>
                    {cambios === 0 && <Alert variant="info">El archivo es igual al inventario actual; no hay nada que reemplazar.</Alert>}
                    {vista.quitados.length > 0 && (
                        <Alert>
                            Se quitarán {vista.quitados.length} {vista.quitados.length === 1 ? 'modelo que no viene' : 'modelos que no vienen'} en el
                            archivo.
                        </Alert>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: 320, overflowY: 'auto' }}>
                        <Grupo titulo="Nuevos" icono="plus-circle" lineas={vista.nuevos} detalle={(l) => `${l.total} pzas`} />
                        <Grupo titulo="Cambian" icono="arrows-clockwise" lineas={vista.cambian} detalle={(l) => `${l.antes} → ${l.despues} pzas`} />
                        <Grupo titulo="Se quedan sin stock" icono="warning" lineas={vista.sinStock} detalle={(l) => `${l.antes} → 0 pzas`} />
                        <Grupo titulo="Se quitan" icono="trash" lineas={vista.quitados} detalle={(l) => `${l.total} pzas`} />
                    </div>
                </>
            )}
        </Dialog>
    );
}
