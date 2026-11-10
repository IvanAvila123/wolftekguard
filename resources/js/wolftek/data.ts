/**
 * Static catalogs for WolftekGuard, ported from the "WolftekGuard v2" Claude Design prototype.
 * Sales, inventory and machotes come from the server as `dashboard` page props (see the types below).
 */

export type StatusGroup = 'proceso' | 'atencion' | 'cerrada' | 'terminado';

/** [tag class, icon, group, next-step hint] */
export const STATUSES: Record<string, [string, string, StatusGroup, string]> = {
    'En Proceso': ['tag tag-outline', 'ph ph-spinner-gap', 'proceso', ''],
    Captura: ['tag tag-outline', 'ph ph-file-text', 'proceso', ''],
    Reingreso: ['tag tag-accent', 'ph ph-arrow-counter-clockwise', 'atencion', 'Corrige lo que pidieron y vuelve a enviarla.'],
    'Líneas Atrapadas': ['tag tag-accent', 'ph ph-warning', 'atencion', 'Envía el machote "LINEAS ATRAPADAS" a IT para liberar los DN.'],
    'No Avanzó a Crédito': ['tag tag-accent', 'ph ph-credit-card', 'atencion', 'Contacta al cliente para ofrecer otra opción de pago.'],
    Rechazada: ['tag tag-neutral', 'ph ph-prohibit', 'cerrada', ''],
    Cancelada: ['tag tag-neutral', 'ph ph-x-circle', 'cerrada', ''],
    Terminado: ['tag tag-accent-2', 'ph ph-check-circle', 'terminado', ''],
};

export const STATUS_LIST = Object.keys(STATUSES);

/** Search synonyms and typo fixes for the equipment picker; an empty string drops the token. */
export const SYNONYMS: Record<string, string> = {
    black: 'negro',
    midnight: 'negro',
    midnigth: 'negro',
    blue: 'azul',
    white: 'blanco',
    gray: 'gris',
    grey: 'gris',
    silver: 'plata',
    green: 'verde',
    orange: 'naranja',
    purple: 'lavanda',
    morado: 'lavanda',
    lila: 'lavanda',
    ip: 'iphone',
    ipone: 'iphone',
    iphon: 'iphone',
    aifon: 'iphone',
    ifone: 'iphone',
    sansung: 'samsung',
    samsumg: 'samsung',
    galaxi: 'galaxy',
    moto: 'motorola',
    att: '',
    gb: '',
    de: '',
    con: '',
};

export type Machote = {
    id?: number;
    name: string;
    cat: string;
    uses: number;
    preset: { status: string; prioridad: string };
    text: string;
};

/** Required expediente documents: [key, label, icon] */
export const DOCS: [string, string, string][] = [
    ['ine', 'INE', 'ph ph-identification-card'],
    ['sae', 'Formato SAE', 'ph ph-file-text'],
    ['curp', 'CURP', 'ph ph-identification-badge'],
    ['modelo', 'Modelo financiero', 'ph ph-calculator'],
    ['oc', 'OC', 'ph ph-shopping-cart'],
    ['op', 'OP', 'ph ph-clipboard-text'],
];

export const DEFAULT_REDES = 'Google_maps; Facebook; WhatsApp (Texto); Gmail; Instagram';

/** Sale types offered in the form. Older sales keep whatever type they were saved with. */
export const TIPOS = [
    'RENOVACIÓN',
    'RENOVACIÓN ANTICIPADA T1',
    'RENOVACIÓN ANTICIPADA T2',
    'RENOVACIÓN ANTICIPADA T3',
    'RENOVACIÓN ANTICIPADA',
    'ADICIÓN',
    'VENTA NUEVA',
];

export const PLAZOS = ['12 meses', '18 meses', '24 meses', '36 meses'];

export const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const EXAMPLE_DNS = [
    '4774961217',
    '4773792717',
    '4774953406',
    '4773799237',
    '3951236719',
    '3951236720',
    '3951230033',
    '4791043744',
    '4791043754',
    '4791043768',
    '4791043739',
];

/** One equipment SKU with its pieces per warehouse and its extra details, keyed by the Excel column. */
export type InventoryRow = {
    oem: string;
    sku: string;
    nombre: string;
    modelo: string;
    color: string;
    stock: Record<string, number>;
    extras: Record<string, string>;
};

/** The inventory's dynamic columns, in the order of the last imported Excel. */
export type InventoryColumns = { almacenes: string[]; extras: string[] };

/** Pieces of an item across every warehouse. */
export const stockTotal = (row: InventoryRow) => Object.values(row.stock ?? {}).reduce((total, cantidad) => total + cantidad, 0);

export type ServerBot = {
    costo: boolean;
    equipo: string;
    sku: string;
    plan: string;
    plazo: string;
    proteccion: boolean;
    dmr: string;
    redes: string;
    dns: string[];
};

export type ServerDoc = { id: number; tipo: string; name: string; size: number | null; at: string | null; archivado: boolean; url: string | null };

export type ServerEntry = { t: string; at: string | null };

/** A sale as the server sends it: the list row, the captured form, its BOTs, expediente, history and notes. */
export type ServerSale = {
    id: number;
    cliente: string;
    tipo: string;
    cuenta: string;
    idcte: string;
    lineas: number;
    acuerdo: string;
    fecha: string;
    /** YYYY-MM of the sale date, for the month filter. */
    periodo: string;
    prioridad: string;
    status: string;
    /** Goes up with every save; an edit sends the one it started from so the server can spot a conflict. */
    version: number;
    form: {
        nombre: string;
        razon: string;
        cuenta: string;
        idcte: string;
        rfc: string;
        rl: string;
        acuerdo: string;
        fp: string;
        domicilio: string;
        encargada: string;
        telefono: string;
        horario: string;
        tipo: string;
        status: string;
        prioridad: string;
        cierre: string;
        notas: string;
        meses: number[];
    };
    bots: ServerBot[];
    documentos: ServerDoc[];
    log: ServerEntry[];
    notes: ServerEntry[];
};

/** When the inventory was last replaced from Excel. */
export type UltimaImportacion = { at: string; usuario: string | null; archivo: string };

/** A DN sold in a sale that is still open, from any month. */
export type DnAbierto = { dn: string; id: number; cliente: string; status: string };

/** A client from past sales, with the latest details captured for its account. */
export type ClienteConocido = {
    cuenta: string;
    idcte: string;
    razon: string;
    count: number;
    last: string;
    lastTipo: string;
    rfc: string;
    rl: string;
    domicilio: string;
    encargada: string;
    telefono: string;
    horario: string;
};

/** An archived sale, as the "Archivadas" dialog lists it. */
export type VentaArchivada = { id: number; cliente: string; tipo: string; status: string; fecha: string; lineas: number; archivadaAt: string };

export type WolftekProps = {
    /** Month shown (YYYY-MM); `ventas` only has that month's sales plus a linked one. */
    periodo: string;
    ventas: ServerSale[];
    dnsAbiertos: DnAbierto[];
    clientes: ClienteConocido[];
    inventario: InventoryRow[];
    inventarioColumnas: InventoryColumns;
    machotes: Machote[];
    ultimaImportacion: UltimaImportacion | null;
    /** Only sent when the "Archivadas" dialog asks for it (optional prop). */
    archivadas?: VentaArchivada[];
};
