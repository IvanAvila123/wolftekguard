import type { Page } from '@inertiajs/core';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { compareSides, mergeSides, type Pick as ConflictPick } from './conflict';
import {
    DEFAULT_REDES,
    DOCS,
    EXAMPLE_DNS,
    MONTHS,
    PLAZOS,
    PRIORIDADES,
    STATUSES,
    STATUS_LIST,
    TIPOS,
    stockTotal,
    type ClienteConocido,
    type DnAbierto,
    type Machote,
    type ServerSale,
    type WolftekProps,
} from './data';
import { xsrfToken, type OutboxMethod } from './offline/outbox';
import { useConnection } from './offline/use-connection';
import { parseRoute, pathOf, urlFor, type AppRoute, type Screen } from './routes';
import {
    MACHOTE_VARIABLES,
    atLabel,
    botFromServer,
    botRows,
    buildMatch,
    csvFor,
    docsFromServer,
    downloadFile,
    emptyForm,
    fillVars,
    fuzzyScore,
    machoteToText,
    newBot,
    nice,
    niceEquipo,
    normalize,
    priorityBars,
    requiredDocCount,
    saleVars,
    stripDocUrls,
    timeLabel,
    type Bot,
    type DocFile,
    type Docs,
    type InventoryItem,
    type Sale,
    type SaleForm,
} from './utils';

export type { Screen };

/** A sale as it was when editing started; `version` travels with the draft so a resumed edit is still checked. */
type SavedSale = { form: SaleForm; bots: Bot[]; version?: number };
type Draft = { form: SaleForm; bots: Bot[]; step: number; editId: number | null; editOrig: SavedSale | null; at: number };

type State = {
    screen: Screen;
    q: string;
    stFilter: string;
    prio: string;
    selId: number | null;
    toast: string | null;
    toastKind: 'ok' | 'error';
    step: number;
    form: SaleForm;
    bots: Bot[];
    mDialog: boolean;
    importDialog: boolean;
    /** A save refused because the sale changed meanwhile: reloading it, then comparing. */
    conflict: { id: number; loading: boolean; picks: Record<string, ConflictPick> } | null;
    /** "¿Archivar esta venta?" confirmation for the open sale. */
    archiveAsk: boolean;
    archivedOpen: boolean;
    archivedLoading: boolean;
    machSel: number;
    reviewMach: number;
    machotes: Machote[];
    machEditing: boolean;
    /** "¿Borrar este machote?" confirmation. */
    machDeleteAsk: boolean;
    invQ: string;
    invOem: string;
    invLow: boolean;
    invSort: string;
    vw: number;
    pickerFor: number | null;
    stockModal: boolean;
    draft: Draft | null;
    clientDismiss: string[];
    editId: number | null;
    editOrig: SavedSale | null;
    noteDraft: string;
    saving: boolean;
    created: (SavedSale & { shortN: number }) | null;
    /** Sale shown on the "Venta creada" screen (from the URL after saving). */
    createdId: number | null;
};

type Patch = Partial<State> | ((st: State) => Partial<State>);

const DRAFT_KEY = 'wolftekguard-borrador-v1';
/** Where the prototype kept sales before they moved to the server; cleared on load. */
const LEGACY_DATA_KEY = 'wolftekguard-datos-v1';

function readStorage<T>(key: string): T | null {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null') as T | null;
    } catch {
        return null;
    }
}

function initialState(machotes: Machote[]): State {
    const base: State = {
        screen: 'dashboard',
        q: '',
        stFilter: 'Todos',
        prio: 'Todas',
        selId: null,
        toast: null,
        toastKind: 'ok',
        step: 0,
        form: emptyForm(),
        bots: [newBot()],
        mDialog: false,
        importDialog: false,
        conflict: null,
        archiveAsk: false,
        archivedOpen: false,
        archivedLoading: false,
        machSel: 0,
        reviewMach: 0,
        machotes: machotes.map((m) => ({ ...m })),
        machEditing: false,
        machDeleteAsk: false,
        invQ: '',
        invOem: 'Todos',
        invLow: false,
        invSort: 'az',
        vw: typeof window !== 'undefined' ? window.innerWidth : 1400,
        pickerFor: null,
        stockModal: false,
        draft: null,
        clientDismiss: [],
        editId: null,
        editOrig: null,
        noteDraft: '',
        saving: false,
        created: null,
        createdId: null,
    };

    if (typeof window === 'undefined') {
        return base;
    }

    const stored = readStorage<Draft>(DRAFT_KEY);
    const draft = stored && stored.form ? stored : null;

    return { ...base, draft, ...stateForInitialRoute(parseRoute(window.location.pathname), draft) };
}

/**
 * Screen state for the URL the app was opened (or reloaded) on.
 * Editing a sale needs its server data, so that route is resolved by the URL sync effect right after mount.
 */
function stateForInitialRoute(route: AppRoute, draft: Draft | null): Partial<State> {
    switch (route.screen) {
        case 'venta':
            return { screen: 'ventas', selId: route.id };
        case 'creada':
            return { screen: 'creada', createdId: route.id };
        case 'editar':
            return { screen: 'nueva' };
        case 'nueva':
            return draft && !draft.editId
                ? {
                      screen: 'nueva',
                      step: draft.step || 0,
                      form: { ...emptyForm(), ...draft.form },
                      bots: draft.bots.map((b) => ({ ...newBot(), ...b })),
                  }
                : { screen: 'nueva' };
        default:
            return { screen: route.screen };
    }
}

function isBlank(form: SaleForm, bots: Bot[]): boolean {
    const empty = emptyForm();

    return (
        (Object.keys(empty) as (keyof SaleForm)[]).every((k) => JSON.stringify(empty[k]) === JSON.stringify(form[k])) &&
        bots.length === 1 &&
        !bots[0].dns.length &&
        !bots[0].sku &&
        !bots[0].plan &&
        !bots[0].dnDraft
    );
}

/** Stands in while there are no machotes yet (a fresh install), so no screen reads a missing one. */
const MACHOTE_VACIO: Machote = { name: 'Sin machotes', cat: 'General', uses: 0, preset: { status: 'Captura', prioridad: 'Media' }, text: '' };

/** This month as YYYY-MM. */
function currentPeriodo(): string {
    const now = new Date();

    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

/** YYYY-MM moved by the given number of months. */
function shiftPeriodo(periodo: string, delta: number): string {
    const [year, month] = periodo.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);

    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

const nowLabel = () => 'Hoy · ' + timeLabel(new Date());

/** The first validation message from a failed Inertia request. */
const firstError = (errors: Record<string, string>) => Object.values(errors)[0] || 'No se pudo guardar';

/**
 * All state and derived view data for the WolftekGuard sales app.
 * A direct port of the design prototype's `renderVals()`; screens only render what this returns.
 * Sales, inventory and machotes come from the server (`dashboard` page props); only drafts stay in localStorage.
 */
export function useWolftek({
    periodo,
    ventas,
    dnsAbiertos,
    clientes,
    inventario,
    // Default for a page cached offline before inventory columns existed.
    inventarioColumnas = { almacenes: [], extras: [] },
    machotes,
    ultimaImportacion,
    archivadas,
}: WolftekProps) {
    const [s, setRaw] = useState<State>(() => initialState(machotes));
    const lastDraft = useRef('');
    const draftTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    /** Files picked in the wizard, keyed by their blob: preview URL, until the sale is saved. */
    const pendingFiles = useRef(new Map<string, File>());

    const set = useCallback((patch: Patch) => setRaw((st) => ({ ...st, ...(typeof patch === 'function' ? patch(st) : patch) })), []);

    useEffect(() => {
        const onResize = () => set({ vw: window.innerWidth });
        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [set]);

    useEffect(() => {
        try {
            localStorage.removeItem(LEGACY_DATA_KEY);
        } catch {
            // Storage can be unavailable (private mode).
        }
    }, []);

    /** Keep the machote list in sync with the server, without losing text typed into the one being edited. */
    useEffect(() => {
        set((st) => ({
            machotes: machotes.map((m, i) =>
                st.machEditing && i === st.machSel && st.machotes[i] && st.machotes[i].id === m.id
                    ? { ...m, name: st.machotes[i].name, cat: st.machotes[i].cat, text: st.machotes[i].text }
                    : { ...m },
            ),
        }));
    }, [machotes, set]);

    useEffect(() => {
        try {
            if (s.screen !== 'nueva' || isBlank(s.form, s.bots)) {
                return;
            }

            const body = {
                form: { ...s.form, docs: stripDocUrls(s.form.docs) },
                bots: s.bots.map((b) => ({ ...b, pq: '' })),
                step: s.step,
                editId: s.editId,
                editOrig: s.editOrig,
            };
            const serialized = JSON.stringify(body);

            if (serialized === lastDraft.current) {
                return;
            }

            lastDraft.current = serialized;
            const full: Draft = { ...body, at: Date.now() };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(full));
            clearTimeout(draftTimer.current);
            draftTimer.current = setTimeout(() => set({ draft: full }), 400);
        } catch {
            // Storage can be unavailable (private mode); the app keeps working in memory.
        }
    }, [s, set]);

    const scrollTop = () => {
        try {
            window.scrollTo(0, 0);
        } catch {
            // Ignore environments without scrolling.
        }
    };

    const toast = (msg: string, kind: 'ok' | 'error' = 'ok') => {
        clearTimeout(toastTimer.current);
        set({ toast: msg, toastKind: kind });
        toastTimer.current = setTimeout(() => set({ toast: null }), 2400);
    };

    const connection = useConnection();

    type SubmitOptions = {
        method: OutboxMethod;
        url: string;
        data: Record<string, unknown>;
        /** Shown in the list of changes waiting to be sent. */
        label: string;
        files?: boolean;
        onSuccess?: (page: Page) => void;
        onError?: (errors: Record<string, string>) => void;
        onFinish?: () => void;
        /** Runs instead of onSuccess when there is no connection and the change was kept on this device. */
        onQueued: () => void;
        /** Kept with a queued edit so it can be reopened in the editor if the server refuses it as stale. */
        resume?: Omit<Draft, 'at'>;
    };

    /**
     * Save through Inertia when the server can be reached; otherwise keep the change in the outbox
     * (IndexedDB) so it is sent automatically when the connection comes back.
     */
    const submit = (o: SubmitOptions) => {
        const keep = () =>
            connection.queue({ label: o.label, method: o.method, url: o.url, data: o.data, resume: o.resume }).then(
                () => {
                    o.onQueued();
                    o.onFinish?.();
                },
                () => {
                    toast('No se pudo guardar el cambio en este equipo', 'error');
                    o.onFinish?.();
                },
            );

        if (!connection.online) {
            keep();

            return;
        }

        let networkDown = false;
        const stopListening = router.on('exception', (event) => {
            // A network failure has no HTTP response; server errors still surface normally.
            if (!(event.detail.exception as { response?: unknown }).response) {
                networkDown = true;
                event.preventDefault();
            }
        });

        router.visit(o.url, {
            method: o.method,
            data: o.data as Record<string, never>,
            forceFormData: o.files,
            preserveScroll: true,
            // Keep this component mounted: Inertia would otherwise remount it and the onSuccess/onError
            // toast would go to the old instance. Screen and data follow the URL and props on their own.
            preserveState: true,
            onSuccess: o.onSuccess,
            onError: o.onError,
            onFinish: () => {
                stopListening();

                if (networkDown) {
                    connection.markOffline();
                    keep();
                } else {
                    o.onFinish?.();
                }
            },
        });
    };

    /**
     * Counts one use of a machote: shown right away, then sent without reloading the page
     * (the server answers 204). Without a connection the use waits in the outbox.
     */
    const contarUso = (m: Machote) => {
        if (!m.id) {
            return;
        }

        const id = m.id;
        set((st) => ({ machotes: st.machotes.map((x) => (x.id === id ? { ...x, uses: x.uses + 1 } : x)) }));

        const url = route('machotes.usos', id);
        const keep = () => connection.queue({ label: 'Uso del machote "' + m.name + '"', method: 'post', url, data: {} }).catch(() => {});

        if (!connection.online) {
            keep();

            return;
        }

        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrfToken() },
        }).catch(() => {
            connection.markOffline();
            keep();
        });
    };

    const queuedToast = (what: string) => toast(`Sin conexión: guardamos ${what} en este equipo y se enviará al volver la conexión`);

    const copy = (text: string, msg?: string) => {
        try {
            navigator.clipboard.writeText(text).catch(() => {});
        } catch {
            // Clipboard may be blocked; the toast still confirms the intent.
        }

        toast(msg || 'Copiado al portapapeles');
    };

    const go = (screen: Screen, extra?: Partial<State>) => {
        set({ screen, selId: null, ...(extra || {}) });
        scrollTop();
    };

    const clearDraft = () => {
        clearTimeout(draftTimer.current);
        lastDraft.current = '';

        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch {
            // Nothing to clear.
        }

        set({ draft: null });
    };

    const startNew = () => {
        const d = readStorage<Draft>(DRAFT_KEY);

        if (d && d.form) {
            lastDraft.current = JSON.stringify({ form: d.form, bots: d.bots, step: d.step, editId: d.editId, editOrig: d.editOrig });
            go('nueva', {
                step: d.step || 0,
                editId: d.editId || null,
                editOrig: d.editOrig || null,
                form: { ...emptyForm(), ...d.form },
                bots: d.bots.map((b) => ({ ...newBot(), ...b })),
                draft: d,
            });
            toast(d.editId ? 'Continuando la edición sin guardar' : 'Continuando tu borrador');
        } else {
            go('nueva', { step: 0, editId: null, editOrig: null, form: emptyForm(), bots: [newBot()] });
        }
    };

    const updBot = (i: number, patch: Partial<Bot> | ((b: Bot) => Partial<Bot>)) =>
        set((st) => ({ bots: st.bots.map((b, j) => (j === i ? { ...b, ...(typeof patch === 'function' ? patch(b) : patch) } : b)) }));

    const addDns = (i: number, entries: string[]) => {
        const valid = entries.map((d) => d.replace(/\D/g, '')).filter((d) => d.length === 10);
        const bad = entries.length - valid.length;
        updBot(i, (b) => ({
            dns: [...b.dns, ...valid],
            dnDraft: '',
            dnMsg: bad ? bad + (bad === 1 ? ' entrada no tiene' : ' entradas no tienen') + ' 10 dígitos y no se agregó' : '',
        }));
    };

    const f = s.form;
    const W = s.vw;
    const mob = W < 700;
    const tab = !mob && W < 1100;
    const small = W < 1100;
    const [periodoYear, periodoMonth] = periodo.split('-').map(Number);
    const monthLabel = MONTHS[periodoMonth - 1] + ' ' + periodoYear;

    const serverById = useMemo(() => new Map<number, ServerSale>(ventas.map((v) => [v.id, v])), [ventas]);
    /** Opens a sale's detail; one from another month is fetched by visiting its link. */
    const abrirVenta = (id: number) => (serverById.has(id) ? set({ selId: id }) : router.visit(route('ventas.show', id)));
    const docsById = useMemo(() => new Map<number, Docs>(ventas.map((v) => [v.id, docsFromServer(v.documentos)])), [ventas]);
    const docsOf = (id: number): Docs => docsById.get(id) || {};

    /** A sale's captured form and BOTs as the server has them. */
    const savedSaleOf = (id: number): SavedSale => {
        const server = serverById.get(id);

        return {
            form: { ...emptyForm(), ...(server ? server.form : {}), docs: {} },
            bots: (server ? server.bots : []).map(botFromServer),
        };
    };

    /** A sale as the edit form loads it, with its version; null when it is not among the loaded sales. */
    const editSnapshot = (id: number): (SavedSale & { version: number }) | null => {
        const sale = serverById.get(id);

        if (!sale) {
            return null;
        }

        const data = savedSaleOf(id);
        const form: SaleForm = {
            ...emptyForm(),
            ...data.form,
            nombre: data.form.nombre || sale.tipo + ' - ' + sale.cliente,
            status: sale.status,
            prioridad: sale.prioridad,
            acuerdo: sale.acuerdo || data.form.acuerdo,
            meses: data.form.meses || [],
            docs: { ...docsOf(id) },
        };
        const editBots = data.bots.map((b) => ({ ...newBot(), ...b, pq: '' }));

        return { form, bots: editBots, version: sale.version };
    };

    /** Open the wizard on an existing sale. */
    const startEdit = (id: number) => {
        const snapshot = editSnapshot(id);

        if (!snapshot) {
            return go('ventas');
        }

        go('nueva', { step: 0, editId: id, editOrig: snapshot, form: snapshot.form, bots: snapshot.bots });
    };
    const sales: Sale[] = ventas.map(({ id, cliente, tipo, cuenta, idcte, lineas, acuerdo, fecha, periodo, prioridad, status }) => ({
        id,
        cliente,
        tipo,
        cuenta,
        idcte,
        lineas,
        acuerdo,
        fecha,
        periodo,
        prioridad,
        status,
    }));
    /** Dashboard figures and the sales list cover the month the server sent; a linked sale from another month only opens its detail. */
    const monthSales = sales.filter((x) => x.periodo === periodo);

    /** Changes a sale's status from anywhere (detail panel, lists), sending the status it had so a stale change is refused. */
    const cambiarEstatus = (id: number, status: string) => {
        const sale = sales.find((x) => x.id === id);

        if (!sale || sale.status === status) {
            return;
        }

        submit({
            method: 'patch',
            url: route('ventas.status', id),
            data: { status, status_anterior: sale.status },
            label: 'Estatus → ' + status + ' · ' + nice(sale.cliente),
            onSuccess: () => toast('Estatus cambiado a ' + status),
            onError: (errors) => toast(firstError(errors), 'error'),
            onQueued: () => queuedToast('el cambio de estatus'),
        });
    };

    const deco = (x: Sale) => {
        const docCount = requiredDocCount(docsOf(x.id));
        const complete = docCount === DOCS.length;

        return {
            ...x,
            docLabel: complete ? 'Completo' : docCount + ' de ' + DOCS.length,
            docShort: docCount + '/' + DOCS.length,
            docIcon: complete ? 'ph ph-folder-simple-check' : 'ph ph-folder-simple-dashed',
            docColor: complete ? 'var(--color-neutral-300)' : 'var(--color-accent-200)',
            name: nice(x.cliente),
            tipoNice: nice(x.tipo),
            tagClass: STATUSES[x.status][0],
            icon: STATUSES[x.status][1],
            next: STATUSES[x.status][3],
            hasNext: !!STATUSES[x.status][3],
            prioBars: priorityBars(x.prioridad),
            open: () => set({ selId: x.id }),
            setStatus: (status: string) => cambiarEstatus(x.id, status),
        };
    };

    const grp = (x: Sale) => STATUSES[x.status][2];
    const gCount = (g: string) => monthSales.filter((x) => grp(x) === g).length;
    const matchesFilter = (x: Sale, fl: string) =>
        fl === 'docs' ? requiredDocCount(docsOf(x.id)) < DOCS.length : fl === 'Todos' || x.status === fl || 'g:' + grp(x) === fl;
    const toVentas = (fl: string) => () => go('ventas', { stFilter: fl, q: '', prio: 'Todas' });
    const attnCount = gCount('atencion');

    const curNav = s.screen === 'nueva' || s.screen === 'creada' ? 'ventas' : s.screen;
    const nav = (
        [
            ['dashboard', 'Dashboard', 'ph ph-squares-four'],
            ['ventas', 'Ventas', 'ph ph-receipt'],
            ['inventario', 'Inventario', 'ph ph-package'],
            ['machotes', 'Machotes', 'ph ph-clipboard-text'],
        ] as [Screen, string, string][]
    ).map(([k, label, icon]) => {
        const on = k === curNav;

        return {
            key: k,
            label,
            icon,
            hasBadge: k === 'ventas' && attnCount > 0,
            badge: attnCount,
            color: on ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
            bg: on ? 'var(--color-accent-900)' : 'transparent',
            ring: on ? 'inset 0 0 0 1px var(--color-accent-700)' : 'none',
            go: () => go(k),
        };
    });

    const totalLines = monthSales.reduce((a, x) => a + x.lineas, 0);
    const kpis = (
        [
            ['Total ventas', monthSales.length, 'ph ph-receipt', 'Todos'],
            ['En proceso', gCount('proceso'), 'ph ph-clock', 'g:proceso'],
            ['Requieren atención', attnCount, 'ph ph-warning', 'g:atencion'],
            ['Terminadas', gCount('terminado'), 'ph ph-trophy', 'g:terminado'],
            ['Canceladas / Rechazadas', gCount('cerrada'), 'ph ph-x-circle', 'g:cerrada'],
            ['Total líneas', totalLines, 'ph ph-phone', 'Todos'],
        ] as [string, number, string, string][]
    ).map(([label, value, icon, fl]) => ({
        label,
        value: String(value),
        icon,
        ring: fl === 'g:atencion' && value > 0 ? 'inset 0 0 0 1px var(--color-accent-600)' : 'var(--shadow-sm)',
        pick: toVentas(fl),
    }));
    const maxSt = Math.max(1, ...STATUS_LIST.map((st) => monthSales.filter((x) => x.status === st).length));
    const funnel = STATUS_LIST.map((st) => {
        const n = monthSales.filter((x) => x.status === st).length;

        return {
            label: st,
            icon: STATUSES[st][1],
            n,
            w: (n / maxSt) * 100 + '%',
            color:
                STATUSES[st][2] === 'atencion'
                    ? 'var(--color-accent)'
                    : STATUSES[st][2] === 'terminado'
                      ? 'var(--color-accent-600)'
                      : 'var(--color-neutral-500)',
            pick: toVentas(st),
        };
    });

    const ql = s.q.trim().toLowerCase();
    const rows = monthSales
        .filter(
            (x) =>
                matchesFilter(x, s.stFilter) &&
                (s.prio === 'Todas' || x.prioridad === s.prio) &&
                (!ql || (x.cliente + ' ' + x.tipo + ' ' + x.cuenta + ' ' + x.idcte).toLowerCase().includes(ql)),
        )
        .map(deco);
    const chipStyle = (on: boolean) => ({
        bg: on ? 'var(--color-accent-900)' : 'var(--color-neutral-800)',
        color: on ? 'var(--color-accent-100)' : 'var(--color-neutral-200)',
        ring: on ? 'inset 0 0 0 1px var(--color-accent-600)' : 'none',
    });
    const chips = (
        [
            ['Todos', 'Todas', monthSales.length],
            ['g:atencion', 'Requieren atención', attnCount],
            ['docs', 'Expediente incompleto', monthSales.filter((x) => requiredDocCount(docsOf(x.id)) < DOCS.length).length],
            ...STATUS_LIST.map((st) => [st, st, monthSales.filter((x) => x.status === st).length]),
        ] as [string, string, number][]
    ).map(([fl, label, n]) => ({ key: fl, label, n, ...chipStyle(s.stFilter === fl), pick: () => set({ stFilter: fl }) }));

    const selRaw = sales.find((x) => x.id === s.selId);
    const copyDetail = (k: string, v: string) => ({ k, v, copy: true, doCopy: () => copy(v, k + ' copiado') });
    const sel = selRaw
        ? (() => {
              const d = deco(selRaw);

              return {
                  ...d,
                  details: [
                      { k: 'Cliente', v: d.name, copy: false, doCopy: () => {} },
                      copyDetail('Cuenta AT&T', d.cuenta),
                      copyDetail('ID CTE', d.idcte),
                      copyDetail('Acuerdo', d.acuerdo),
                      { k: 'Líneas', v: String(d.lineas), copy: false, doCopy: () => {} },
                      { k: 'Prioridad', v: d.prioridad, copy: false, doCopy: () => {} },
                      { k: 'Fecha', v: d.fecha, copy: false, doCopy: () => {} },
                  ],
                  log: [
                      ...(serverById.get(d.id)?.log || []).map((e) => ({ t: e.t, at: atLabel(e.at) })),
                      { t: 'Estatus actual: ' + d.status, at: d.fecha + ' · 16:20' },
                      { t: 'Enviada a validación', at: d.fecha + ' · 11:05' },
                      { t: 'Venta capturada', at: d.fecha + ' · 09:12' },
                  ],
              };
          })()
        : null;

    const req = (k: keyof SaleForm) => !!String(f[k] || '').trim();
    const digits = (v: string, n: number, msg: string) => (v && v.replace(/\D/g, '').length !== n ? msg : null);
    type FieldOptions = { req?: boolean; full?: boolean; ph?: string; mode?: string; hint?: string; check?: (v: string) => string | null };
    const field = (k: keyof SaleForm, label: string, o: FieldOptions = {}) => {
        const v = String(f[k] || '');
        const err = o.check ? o.check(v) : null;

        return {
            k,
            label,
            v,
            ph: o.ph || '',
            mode: (o.mode || 'text') as 'text' | 'numeric' | 'tel',
            req: o.req ? ' *' : '',
            col: o.full ? '1 / -1' : 'auto',
            hasMsg: !!(err || o.hint),
            msg: err || o.hint || '',
            msgColor: err ? 'var(--color-accent-200)' : 'var(--color-neutral-400)',
            ring: err ? 'inset 0 0 0 1px var(--color-accent)' : '',
        };
    };
    const clienteFields = [
        field('nombre', 'Nombre de la venta', {
            req: true,
            full: true,
            ph: 'Ej. RENOVACION Q2 - FLEXIBLE WAREHOUSING',
            hint: 'Así la vas a encontrar en tu lista de ventas.',
        }),
        field('razon', 'Razón social / Nombre del cliente', {
            req: true,
            full: true,
            ph: 'FLEXIBLE WAREHOUSING SOLUTIONS S DE RL DE CV',
            hint: 'Escribe el nombre, la cuenta o el ID CTE y buscamos si ya es cliente.',
        }),
        field('cuenta', 'Cuenta AT&T', { req: true, ph: '506991022', mode: 'numeric', check: (v) => digits(v, 9, 'La cuenta tiene 9 dígitos') }),
        field('idcte', 'ID Cliente AT&T', { req: true, ph: '105275831', mode: 'numeric', check: (v) => digits(v, 9, 'El ID CTE tiene 9 dígitos') }),
        field('rfc', 'RFC', {
            ph: 'RFC del cliente',
            check: (v) => (v && !(v.trim().length === 12 || v.trim().length === 13) ? 'El RFC tiene 12 (moral) o 13 (física) caracteres' : null),
        }),
        field('rl', 'Representante legal', { ph: 'CARLOS EDUARDO SALAZAR JOANNIS' }),
        field('acuerdo', 'Acuerdo de la venta', { full: true, ph: '4000569694A 6 LINEAS', hint: 'Si son varios acuerdos, sepáralos con coma.' }),
        field('fp', 'FP', { full: true, ph: '240729MKT0305 // 240719MKT0105 GB ADICIONALES' }),
    ];
    const entregaFields = [
        field('domicilio', 'Domicilio', { full: true, ph: 'BLV INDEPENDENCIA, 8851, LOTE BRAVO, JUAREZ, CHIHUAHUA, 32575' }),
        field('encargada', 'Persona encargada', { ph: 'JUANA ROQUE / ESTEBAN VAZQUEZ' }),
        field('telefono', 'Teléfono de contacto', { ph: '6561708553', mode: 'tel', check: (v) => digits(v, 10, 'Debe tener 10 dígitos') }),
        field('horario', 'Horario de entrega', { ph: 'DE 9:00 A 18:00 HRS' }),
    ];
    const setField = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        set((st) => ({ form: { ...st.form, [name]: value } }));
    };

    const segOn = (on: boolean) => ({
        bg: on ? 'var(--color-accent-900)' : 'transparent',
        color: on ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
    });
    const invBySku = useMemo(
        () =>
            Object.fromEntries(
                inventario.map((r): [string, InventoryItem] => [
                    r.sku,
                    { oem: r.oem, sku: r.sku, name: r.nombre, stock: stockTotal(r), model: r.modelo, color: r.color },
                ]),
            ),
        [inventario],
    );
    const invList = Object.values(invBySku);
    const need: Record<string, { n: number; bots: number[] }> = {};
    s.bots.forEach((b, i) => {
        if (b.sku && invBySku[b.sku]) {
            need[b.sku] = need[b.sku] || { n: 0, bots: [] };
            need[b.sku].n += Math.max(1, b.dns.length);
            need[b.sku].bots.push(i + 1);
        }
    });
    const altsFor = (sku: string, n: number) => {
        const it = invBySku[sku];

        return invList
            .filter((o) => o.model === it.model && o.sku !== sku && o.stock > 0)
            .sort((a, b) => Number(b.stock >= n) - Number(a.stock >= n) || b.stock - a.stock);
    };
    const shortList = Object.keys(need).filter((k) => invBySku[k].stock < need[k].n);
    const swapSku = (from: string, to: string) => {
        const target = invBySku[to];
        set((st) => ({ bots: st.bots.map((b) => (b.sku === from ? { ...b, sku: target.sku, equipo: target.name } : b)) }));
        toast('Cambiado a ' + niceEquipo(target.name));
    };
    const pickInto = (i: number, it: InventoryItem) =>
        set((st) => ({ pickerFor: null, bots: st.bots.map((b, j) => (j === i ? { ...b, equipo: it.name, sku: it.sku, pq: '' } : b)) }));

    /** Required-doc and "otros" files picked in the wizard that still need uploading. */
    const pendingUploads = (docs: Docs) =>
        Object.entries(docs || {}).flatMap(([tipo, value]) =>
            (Array.isArray(value) ? value : value ? [value] : [])
                .map((d) => (!d.id && d.url ? pendingFiles.current.get(d.url) : undefined))
                .filter((file): file is File => !!file)
                .map((archivo) => ({ tipo, archivo })),
        );
    const docIds = (docs: Docs) =>
        Object.values(docs || {})
            .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
            .map((d) => d.id)
            .filter((id): id is number => !!id);

    const doSave = (shortN: number) => {
        if (s.saving) {
            return;
        }

        const { docs, ...fields } = f;
        const payload = {
            ...fields,
            bots: s.bots.map((b) => ({
                costo: b.costo,
                equipo: b.equipo,
                sku: b.sku,
                plan: b.plan,
                plazo: b.plazo,
                proteccion: b.proteccion,
                dmr: b.dmr,
                redes: b.redes,
                dns: b.dns,
            })),
            documentos: pendingUploads(docs),
        };
        const shortMsg = (lead: string) => lead + ' · ' + shortN + (shortN === 1 ? ' equipo' : ' equipos') + ' sin inventario suficiente';
        const onError = (errors: Record<string, string>) => toast(firstError(errors), 'error');
        const onFinish = () => set({ saving: false });
        set({ saving: true });

        if (s.editId) {
            const id = s.editId;
            const kept = new Set(docIds(docs));
            const removed = docIds(s.editOrig ? s.editOrig.form.docs : {}).filter((docId) => !kept.has(docId));

            const afterUpdate = () => {
                pendingFiles.current.clear();
                set({ stockModal: false, editId: null, editOrig: null });
                clearDraft();
                go('ventas', { selId: id });
            };

            submit({
                method: 'post',
                url: route('ventas.update', id),
                // The version the edit started from: the server refuses it if the sale changed since.
                data: { _method: 'put', ...payload, documentos_quitar: removed, ...(s.editOrig?.version ? { version: s.editOrig.version } : {}) },
                label: 'Cambios en ' + (f.nombre || f.razon || 'venta ' + id),
                files: true,
                resume: {
                    form: { ...f, docs: stripDocUrls(f.docs) },
                    bots: s.bots.map((b) => ({ ...b, pq: '' })),
                    step: 3,
                    editId: id,
                    editOrig: s.editOrig,
                },
                onError: (errors) => {
                    if (errors.version) {
                        // The sale changed since the edit started: load how it is now and compare.
                        set({ conflict: { id, loading: true, picks: {} } });
                    } else {
                        onError(errors);
                    }
                },
                onFinish,
                onSuccess: () => {
                    afterUpdate();
                    toast(shortN ? shortMsg('Cambios guardados') : 'Cambios guardados', shortN ? 'error' : 'ok');
                },
                onQueued: () => {
                    afterUpdate();
                    queuedToast('la edición');
                },
            });

            return;
        }

        const created = { form: s.form, bots: s.bots, shortN };
        const afterCreate = (createdId: number | null) => {
            pendingFiles.current.clear();
            set({ stockModal: false, created, createdId, screen: 'creada', selId: null });
            clearDraft();
            scrollTop();
        };

        submit({
            method: 'post',
            url: route('ventas.store'),
            // Lets the server recognise a resend of the same sale and not create it twice.
            data: { ...payload, client_uuid: crypto.randomUUID() },
            label: 'Nueva venta · ' + (f.nombre || f.razon || 'sin nombre'),
            files: true,
            onError,
            onFinish,
            onSuccess: (page) => {
                // The server redirects to /ventas/{id}/creada; keep that id next to the in-memory copy.
                const landed = parseRoute(page.url);
                afterCreate(landed.screen === 'creada' ? landed.id : null);
                toast(shortN ? shortMsg('Venta guardada') : 'Venta creada y MATCH generado', shortN ? 'error' : 'ok');
            },
            onQueued: () => {
                afterCreate(null);
                queuedToast('la venta');
            },
        });
    };

    /** DN already used by another open sale (so it can't be sold twice). */
    const dnOwners: Record<string, DnAbierto[]> = {};
    dnsAbiertos.forEach((linea) => {
        if (linea.id !== s.editId) {
            (dnOwners[linea.dn] = dnOwners[linea.dn] || []).push(linea);
        }
    });
    const where: Record<string, number[]> = {};
    s.bots.forEach((b, bi) =>
        b.dns.forEach((d) => {
            (where[d] = where[d] || []).push(bi + 1);
        }),
    );
    const dupVals = Object.keys(where).filter((d) => where[d].length > 1);
    /** An open sale can't be saved with a DN another open sale has (the server rejects it too); a closed one can. */
    const formAbierta = !['terminado', 'cerrada'].includes(STATUSES[f.status]?.[2]);
    const dnsOcupados = formAbierta ? Object.keys(where).filter((d) => dnOwners[d]) : [];
    const fmtDn = (d: string) => d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    const whereLabel = (d: string) => {
        const unique = [...new Set(where[d])];

        return unique.length === 1 ? 'repetido ' + where[d].length + ' veces en BOT ' + unique[0] : 'en BOT ' + unique.join(' y BOT ');
    };

    const bots = s.bots.map((b, i) => {
        const it = invBySku[b.sku];
        const nd = need[b.sku] ? need[b.sku].n : 0;
        const isShort = !!it && it.stock < nd;
        const alt = isShort ? altsFor(b.sku, nd)[0] : null;
        const open = s.pickerFor === i;
        const items = open
            ? invList
                  .map((o) => ({ o, sc: fuzzyScore(o, b.pq) }))
                  .filter((x) => x.sc > 0)
                  .sort((a, c) => c.sc - a.sc || Number(c.o.stock > 0) - Number(a.o.stock > 0) || a.o.name.localeCompare(c.o.name))
                  .map((x) => x.o)
            : [];
        const con = segOn(b.costo);
        const sin = segOn(!b.costo);
        const otherDns = [...new Set(b.dns.filter((d) => dnOwners[d] && where[d].length === 1))];
        const otherSales = [...new Map(otherDns.flatMap((d) => dnOwners[d]).map((o) => [o.id, o])).values()];
        const dupInBot = [...new Set(b.dns.filter((d) => where[d].length > 1))];

        return {
            n: i + 1,
            count: b.dns.length,
            canRemove: s.bots.length > 1,
            remove: () => set((st) => ({ bots: st.bots.filter((_, j) => j !== i) })),
            costo: b.costo,
            conBg: con.bg,
            conColor: con.color,
            sinBg: sin.bg,
            sinColor: sin.color,
            setCon: () => updBot(i, { costo: true }),
            setSin: () => updBot(i, { costo: false }),
            dns: b.dns.map((d, k) => {
                const isDup = where[d].length > 1;
                const owners = !isDup ? dnOwners[d] : undefined;

                return {
                    key: d + k,
                    n: fmtDn(d),
                    hasIcon: isDup || !!owners,
                    icon: isDup ? 'ph ph-warning' : 'ph ph-link',
                    cls: isDup ? 'tag tag-accent' : owners ? 'tag tag-outline' : 'tag tag-neutral',
                    title: isDup
                        ? 'Duplicado: ' + whereLabel(d)
                        : owners
                          ? 'También en: ' + owners.map((o) => nice(o.cliente) + ' (' + o.status + ')').join(', ')
                          : '',
                    remove: () => updBot(i, (bb) => ({ dns: bb.dns.filter((_, kk) => kk !== k) })),
                };
            }),
            dnDraft: b.dnDraft,
            dnMsg: b.dnMsg,
            hasOther: otherDns.length > 0,
            otherMsg:
                (otherDns.length === 1 ? '1 DN ya está' : otherDns.length + ' DN ya están') +
                ' en otra venta abierta: ' +
                otherDns.map(fmtDn).join(', ') +
                (formAbierta ? '. Quítalos o cierra esa venta para poder guardar.' : '. Revisa antes de guardar.'),
            others: otherSales.map((o) => ({ key: o.id, label: nice(o.cliente) + ' · ' + o.status, open: () => abrirVenta(o.id) })),
            hasDup: dupInBot.length > 0,
            dupMsg:
                dupInBot.length +
                (dupInBot.length === 1 ? ' DN duplicado: ' : ' DN duplicados: ') +
                dupInBot.map((d) => fmtDn(d) + ' (' + whereLabel(d) + ')').join(', '),
            onDn: (e: ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;

                if (/[\s,;]/.test(v.trim()) || /[\n\r]/.test(v)) {
                    addDns(i, v.split(/[\s,;]+/).filter(Boolean));
                } else {
                    updBot(i, { dnDraft: v, dnMsg: '' });
                }
            },
            onDnKey: (e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const entries = b.dnDraft.split(/[\s,;]+/).filter(Boolean);

                    if (entries.length) {
                        addDns(i, entries);
                    }
                } else if (e.key === 'Backspace' && !b.dnDraft && b.dns.length) {
                    updBot(i, (bb) => ({ dns: bb.dns.slice(0, -1) }));
                }
            },
            eqLabel: b.equipo ? niceEquipo(b.equipo) : 'Elige un equipo del inventario',
            eqColor: b.equipo ? 'var(--color-text)' : 'var(--color-neutral-400)',
            pickerOpen: open,
            openPicker: () => set({ pickerFor: open ? null : i }),
            closePicker: () => set({ pickerFor: null }),
            pq: b.pq,
            onPq: (e: ChangeEvent<HTMLInputElement>) => updBot(i, { pq: e.target.value }),
            onPqKey: (e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Escape') {
                    set({ pickerFor: null });
                } else if (e.key === 'Enter' && items[0]) {
                    e.preventDefault();
                    pickInto(i, items[0]);
                }
            },
            items: items.map((o) => ({
                key: o.sku,
                name: niceEquipo(o.name),
                oem: o.oem,
                sku: o.sku,
                nameColor: o.stock ? 'var(--color-text)' : 'var(--color-neutral-300)',
                bg: o.sku === b.sku ? 'var(--color-accent-900)' : 'transparent',
                tagClass: o.stock === 0 ? 'tag tag-accent' : 'tag tag-neutral',
                stockLabel: o.stock === 0 ? 'Sin stock' : o.stock + ' pzas',
                pick: () => pickInto(i, o),
            })),
            noItems: open && items.length === 0,
            resultsLabel:
                items.length + (items.length === 1 ? ' equipo' : ' equipos') + ' · ' + items.filter((o) => o.stock > 0).length + ' con piezas',
            sku: b.sku,
            onSku: (e: ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value.toUpperCase().trim();
                const match = invBySku[v] || invBySku['N.' + v];
                updBot(i, match ? { sku: match.sku, equipo: match.name } : { sku: v });
            },
            hasSkuMsg: !!b.sku && !it,
            skuRing: b.sku && !it ? 'inset 0 0 0 1px var(--color-accent)' : '',
            hasStock: !!it,
            stockIcon: !it ? '' : isShort ? 'ph ph-warning' : 'ph ph-check-circle',
            stockColor: isShort ? 'var(--color-accent-200)' : 'var(--color-neutral-300)',
            stockLabel: !it
                ? ''
                : it.stock === 0
                  ? 'Sin piezas en inventario'
                  : isShort
                    ? 'Solo hay ' + it.stock + ' de ' + nd
                    : it.stock + ' piezas disponibles',
            hasAlt: !!alt,
            altLabel: alt ? 'Usar ' + nice(alt.color) + ' (' + alt.stock + ' pzas)' : '',
            useAlt: () => alt && swapSku(b.sku, alt.sku),
            plan: b.plan,
            onPlan: (e: ChangeEvent<HTMLInputElement>) => updBot(i, { plan: e.target.value }),
            plazo: b.plazo,
            onPlazo: (e: ChangeEvent<HTMLSelectElement>) => updBot(i, { plazo: e.target.value }),
            dmr: b.dmr,
            onDmr: (e: ChangeEvent<HTMLInputElement>) => updBot(i, { dmr: e.target.value }),
            proteccion: b.proteccion,
            toggleProt: () => updBot(i, { proteccion: !b.proteccion }),
            protLabel: b.proteccion ? 'Incluida' : 'No incluida',
            protJustify: b.proteccion ? 'flex-end' : 'flex-start',
            protTrack: b.proteccion ? 'var(--color-accent-800)' : 'var(--color-neutral-800)',
            protKnob: b.proteccion ? 'var(--color-accent-200)' : 'var(--color-neutral-400)',
            redes: b.redes,
            onRedes: (e: ChangeEvent<HTMLInputElement>) => updBot(i, { redes: e.target.value }),
            defRedes: () => updBot(i, { redes: DEFAULT_REDES }),
        };
    });

    const lineTotal = s.bots.reduce((a, b) => a + b.dns.length, 0);
    const meses = Array.from({ length: 24 }, (_, k) => {
        const n = k + 1;
        const on = f.meses.includes(n);

        return {
            n,
            on,
            bg: on ? 'var(--color-accent-900)' : 'var(--color-neutral-900)',
            color: on ? 'var(--color-accent-100)' : 'var(--color-neutral-200)',
            ring: on ? 'inset 0 0 0 1px var(--color-accent)' : 'inset 0 0 0 1px var(--color-neutral-700)',
            toggle: () =>
                set((st) => ({
                    form: { ...st.form, meses: on ? st.form.meses.filter((x) => x !== n) : [...st.form.meses, n].sort((a, b) => a - b) },
                })),
        };
    });
    const mesesLabel = f.meses.length ? 'Seleccionados: ' + f.meses.join(', ') : 'Ninguno seleccionado';
    const prioSeg = PRIORIDADES.map((p) => ({
        label: p,
        on: f.prioridad === p,
        ...segOn(f.prioridad === p),
        pick: () => set((st) => ({ form: { ...st.form, prioridad: p } })),
    }));

    const checks: [string, boolean, number][] = [
        ['Nombre de la venta', req('nombre'), 0],
        ['Razón social', req('razon'), 0],
        ['Cuenta AT&T', req('cuenta') && !digits(f.cuenta, 9, '1'), 0],
        ['ID Cliente AT&T', req('idcte') && !digits(f.idcte, 9, '1'), 0],
        ['Al menos un DN', lineTotal > 0, 1],
        ['Equipo en cada BOT', s.bots.every((b) => b.sku), 1],
        ['Sin DN duplicados', dupVals.length === 0, 1],
        ['DN libres (no están en otra venta abierta)', dnsOcupados.length === 0, 1],
    ];
    const doneCount = checks.filter((c) => c[1]).length;
    const canSave = doneCount === checks.length;
    const checklist = checks.map(([label, ok, st]) => ({
        label,
        icon: ok ? 'ph-fill ph-check-circle' : 'ph ph-circle',
        iconColor: ok ? 'var(--color-accent)' : 'var(--color-neutral-500)',
        color: ok ? 'var(--color-neutral-300)' : 'var(--color-text)',
        go: () => set({ step: st }),
    }));
    const stepOk = [checks.slice(0, 4).every((c) => c[1]), checks.slice(4).every((c) => c[1]), true, canSave];
    const steps = ['Cliente', 'Líneas', 'Condiciones', 'Revisión'].map((label, i) => {
        const on = i === s.step;
        const done = i < s.step && stepOk[i];

        return {
            label,
            labelDisp: mob && !on ? 'none' : '',
            mark: done ? '✓' : String(i + 1),
            bg: on ? 'var(--color-neutral-800)' : 'transparent',
            color: on ? 'var(--color-text)' : 'var(--color-neutral-300)',
            dotRing: on || done ? 'var(--color-accent)' : 'var(--color-neutral-600)',
            dotBg: done ? 'var(--color-accent-900)' : 'transparent',
            dotColor: on || done ? 'var(--color-accent-200)' : 'var(--color-neutral-300)',
            go: () => set({ step: i }),
        };
    });
    const dash = (v: string) => (v && String(v).trim() ? v : '—');
    const reviewRow = (k: string, v: string) => ({ k, v: dash(v), color: dash(v) === '—' ? 'var(--color-neutral-500)' : 'var(--color-text)' });
    const review = [
        {
            title: 'Cliente',
            edit: () => set({ step: 0 }),
            rows: [
                reviewRow('Venta', f.nombre),
                reviewRow('Razón social', f.razon),
                reviewRow('Cuenta AT&T', f.cuenta),
                reviewRow('ID CTE', f.idcte),
                reviewRow('RFC', f.rfc),
                reviewRow('Acuerdo', f.acuerdo),
                reviewRow('Tipo', f.tipo),
            ],
        },
        {
            title: 'Líneas',
            edit: () => set({ step: 1 }),
            rows: s.bots.map((b, i) =>
                reviewRow(
                    'BOT ' + (i + 1) + (b.costo ? ' · con costo' : ' · sin costo'),
                    b.dns.length + ' DN · ' + (b.equipo || 'sin equipo') + ' · ' + b.plazo,
                ),
            ),
        },
        {
            title: 'Condiciones',
            edit: () => set({ step: 2 }),
            rows: [
                reviewRow('Meses gratis', f.meses.join(', ')),
                reviewRow('Estatus', f.status),
                reviewRow('Prioridad', f.prioridad),
                reviewRow('Fecha de cierre', f.cierre),
                reviewRow('Notas', f.notas),
            ],
        },
    ];
    const formVals = saleVars(f, s.bots);
    const reviewMachote = s.machotes[s.reviewMach] || s.machotes[0] || MACHOTE_VACIO;
    const applyMach = (m: Machote, goNew: boolean) => {
        set((st) => ({
            mDialog: false,
            form: { ...(goNew ? emptyForm() : st.form), ...m.preset, notas: goNew ? '' : st.form.notas },
            reviewMach: st.machotes.indexOf(m),
            ...(goNew ? { screen: 'nueva' as Screen, step: 0, bots: [newBot()] } : {}),
        }));
        toast('Se aplicó "' + m.name + '"');
    };

    const invAll = inventario.map((r) => ({
        oem: r.oem,
        sku: r.sku,
        modelo: r.nombre,
        stock: r.stock ?? {},
        extras: r.extras ?? {},
        total: stockTotal(r),
    }));
    const iq = s.invQ.trim().toUpperCase();
    const invFiltered = invAll
        .filter((r) => (s.invOem === 'Todos' || r.oem === s.invOem) && (!s.invLow || r.total < 30) && (!iq || (r.modelo + ' ' + r.sku).includes(iq)))
        .sort((a, b) => (s.invSort === 'mas' ? b.total - a.total : s.invSort === 'menos' ? a.total - b.total : a.modelo.localeCompare(b.modelo)));
    const zeroColor = (v: number) => (v === 0 ? 'var(--color-neutral-500)' : 'var(--color-text)');
    const oems = [...new Set(invAll.map((r) => r.oem))];

    const machSelected = s.machotes[s.machSel] || s.machotes[0] || MACHOTE_VACIO;
    /** Creates the machote on the server when it has no id yet, otherwise updates it. */
    const saveMach = (m: Machote, onSuccess: () => void) => {
        const data = { name: m.name, cat: m.cat, preset_status: m.preset.status, preset_prioridad: m.preset.prioridad, text: m.text };
        submit({
            method: m.id ? 'put' : 'post',
            url: m.id ? route('machotes.update', m.id) : route('machotes.store'),
            data,
            label: 'Machote · ' + m.name,
            onSuccess,
            onError: (errors) => toast(firstError(errors), 'error'),
            onQueued: () => {
                onSuccess();
                queuedToast('el machote');
            },
        });
    };
    const machList = s.machotes.map((m, i) => ({
        key: i,
        name: m.name,
        cat: m.cat,
        uses: m.uses,
        vars: (m.text.match(/\{[^}]+\}/g) || []).length,
        preview: m.text.split('\n').find((l) => l.trim()) || '',
        ring: i === s.machSel && s.screen === 'machotes' ? 'inset 0 0 0 1px var(--color-accent)' : 'var(--shadow-sm)',
        pick: () => set({ machSel: i, machEditing: false }),
        apply: () => applyMach(m, false),
    }));

    /** On "Venta creada" after a reload there is no in-memory copy, so read the saved sale back from the server data. */
    const src =
        s.screen === 'creada' && s.created
            ? s.created
            : s.screen === 'creada' && s.createdId !== null
              ? savedSaleOf(s.createdId)
              : { form: f, bots: s.bots };
    const matchText = buildMatch(src.form, src.bots);
    const pref = (src.form.cuenta || 'VENTA').replace(/\W/g, '');
    const csvList = (list: { label: string; rows: string[][]; file: string }[], disabledOpacity: string) =>
        list.map((c) => ({
            ...c,
            n: c.rows.length,
            sub: c.rows.length + ' líneas',
            disabled: c.rows.length === 0,
            opacity: c.rows.length === 0 ? disabledOpacity : '1',
            dl: () => {
                downloadFile(c.file, csvFor(c.rows), 'text/csv;charset=utf-8');
                toast(c.file + ' descargado');
            },
        }));
    const conRows = src.bots.flatMap((b) => (b.costo ? botRows(b) : []));
    const sinRows = src.bots.flatMap((b) => (!b.costo ? botRows(b) : []));
    const csvFiles = csvList(
        [
            ...src.bots.map((b, i) => ({
                label: 'BOT ' + (i + 1) + ' · ' + (b.costo ? 'Con costo' : 'Sin costo'),
                rows: botRows(b),
                file: pref + '_BOT' + (i + 1) + '.csv',
            })),
            { label: 'Todas con costo', rows: conRows, file: pref + '_CON_COSTO.csv' },
            { label: 'Todas sin costo', rows: sinRows, file: pref + '_SIN_COSTO.csv' },
        ],
        '0.55',
    );
    const downloadAll = (list: typeof csvFiles) => {
        const enabled = list.filter((c) => !c.disabled);
        enabled.forEach((c, k) => setTimeout(() => downloadFile(c.file, csvFor(c.rows), 'text/csv;charset=utf-8'), k * 350));
        toast(enabled.length + ' archivos CSV descargados');
    };
    const dupExtra = Object.values(where).reduce((a, w) => a + w.length - 1, 0);

    let selMatchText = '';
    let selPref = 'VENTA';
    let selCsvFiles: typeof csvFiles = [];
    let selEdit = () => {};
    let selFormNotas = '';

    if (selRaw) {
        const data = savedSaleOf(selRaw.id);
        selMatchText = buildMatch(data.form, data.bots);
        selPref = selRaw.cuenta;
        selFormNotas = data.form.notas || '';
        selEdit = () => startEdit(selRaw.id);
        const con = data.bots.flatMap((b) => (b.costo ? botRows(b) : []));
        const sin = data.bots.flatMap((b) => (!b.costo ? botRows(b) : []));
        selCsvFiles = csvList(
            [
                ...data.bots.map((b, i) => ({ label: 'BOT ' + (i + 1), rows: botRows(b), file: selPref + '_BOT' + (i + 1) + '.csv' })),
                { label: 'Con costo', rows: con, file: selPref + '_CON_COSTO.csv' },
                { label: 'Sin costo', rows: sin, file: selPref + '_SIN_COSTO.csv' },
            ],
            '0.45',
        );
    }

    const shortages = shortList.map((k) => {
        const it = invBySku[k];
        const n = need[k].n;
        const alts = altsFor(k, n);

        return {
            key: k,
            name: niceEquipo(it.name),
            sku: k,
            bots: 'BOT ' + need[k].bots.join(', '),
            need: it.stock === 0 ? 'Sin stock' : 'Hay ' + it.stock + ' de ' + n,
            needSub: n + (n === 1 ? ' pieza' : ' piezas'),
            hasAlts: alts.length > 0,
            alts: alts.map((a) => {
                const enough = a.stock >= n;

                return {
                    key: a.sku,
                    label: nice(a.color) + ' · ' + a.stock + ' pzas' + (enough ? '' : ' (no alcanza)'),
                    bg: enough ? 'var(--color-accent-900)' : 'var(--color-neutral-800)',
                    color: enough ? 'var(--color-accent-100)' : 'var(--color-neutral-200)',
                    ring: enough ? 'inset 0 0 0 1px var(--color-accent-600)' : 'inset 0 0 0 1px var(--color-neutral-700)',
                    pick: () => swapSku(k, a.sku),
                };
            }),
        };
    });

    const selNotes = selRaw
        ? [
              ...(serverById.get(selRaw.id)?.notes || []).map((e) => ({ t: e.t, at: atLabel(e.at) })),
              ...(selFormNotas ? [{ t: selFormNotas, at: 'Nota de captura' }] : []),
          ]
        : [];
    const editing = s.screen === 'nueva' && !!s.editId;

    type SetDoc = (k: string, label: string, v: DocFile | DocFile[] | null, removing?: boolean) => void;
    const previewUnavailable = () => toast('La vista previa estará disponible cuando el archivo esté en el servidor');
    const fileObj = (file: File): DocFile => {
        let url = '';

        try {
            url = URL.createObjectURL(file);
        } catch {
            // Preview URL is optional.
        }

        if (url) {
            pendingFiles.current.set(url, file);
        }

        return { name: file.name, size: file.size, at: nowLabel(), url };
    };
    const docRows = (docs: Docs, setDoc: SetDoc) =>
        DOCS.map(([k, label, icon]) => {
            const d = docs[k] as DocFile | undefined;

            return {
                key: k,
                label,
                has: !!d,
                icon: d ? 'ph-fill ph-check-circle' : icon,
                iconColor: d ? 'var(--color-accent)' : 'var(--color-neutral-400)',
                sub: d ? d.name + (d.size ? ' · ' + Math.max(1, Math.round(d.size / 1024)) + ' KB' : '') + (d.at ? ' · ' + d.at : '') : 'Falta',
                subColor: d ? 'var(--color-neutral-300)' : 'var(--color-accent-200)',
                ring: d ? 'none' : 'inset 0 0 0 1px var(--color-neutral-700)',
                upLabel: d ? 'Cambiar' : 'Subir',
                onFile: (e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files && e.target.files[0];

                    if (!file) {
                        return;
                    }

                    setDoc(k, label, fileObj(file));
                    e.target.value = '';
                },
                view: () => (d && d.url ? window.open(d.url, '_blank') : previewUnavailable()),
                remove: () => setDoc(k, label, null),
            };
        });
    const fmtSub = (d: DocFile) => (d.size ? Math.max(1, Math.round(d.size / 1024)) + ' KB · ' : '') + (d.at || '');
    const otrosOf = (docs: Docs, setDoc: SetDoc) => {
        const list = docs.otros || [];

        return {
            empty: list.length === 0,
            add: (e: ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(e.target.files || []);

                if (!files.length) {
                    return;
                }

                setDoc('otros', files.length === 1 ? files[0].name : files.length + ' archivos adicionales', [...list, ...files.map(fileObj)]);
                e.target.value = '';
            },
            items: list.map((d, i) => ({
                key: d.name + i,
                name: d.name,
                sub: fmtSub(d),
                view: () => (d.url ? window.open(d.url, '_blank') : previewUnavailable()),
                remove: () => {
                    const next = list.filter((_, j) => j !== i);
                    setDoc('otros', d.name, next.length ? next : null, true);
                },
            })),
        };
    };
    const selSet: SetDoc = (k, label, v, removing) => {
        if (!selRaw) {
            return;
        }

        const id = selRaw.id;
        const before = docsOf(id)[k];
        const beforeList = Array.isArray(before) ? before : before ? [before] : [];
        const afterList = Array.isArray(v) ? v : v ? [v] : [];
        const keptIds = new Set(afterList.map((d) => d.id).filter(Boolean));
        const removedIds = beforeList.map((d) => d.id).filter((docId): docId is number => !!docId && !keptIds.has(docId));
        const archivos = afterList
            .filter((d) => !d.id && d.url)
            .map((d) => pendingFiles.current.get(d.url as string))
            .filter((file): file is File => !!file);
        const out = removing || !v;
        const onError = (errors: Record<string, string>) => toast(firstError(errors), 'error');
        const saleName = selRaw ? nice(selRaw.cliente) : 'venta ' + id;

        if (archivos.length) {
            submit({
                method: 'post',
                url: route('ventas.documentos.store', id),
                data: { tipo: k, archivos },
                label: label + ' · ' + saleName,
                files: true,
                onError,
                onSuccess: () => toast(label + ' subido'),
                onQueued: () => queuedToast(label),
            });

            return;
        }

        // The drawer removes one file per click, so at most one id is gone.
        if (removedIds.length) {
            submit({
                method: 'delete',
                url: route('ventas.documentos.destroy', [id, removedIds[0]]),
                data: {},
                label: 'Quitar ' + label + ' · ' + saleName,
                onError,
                onSuccess: () => toast(label + (out ? ' quitado' : ' subido')),
                onQueued: () => queuedToast('quitar ' + label),
            });
        }
    };
    const formSet: SetDoc = (k, _label, v) => {
        set((st) => {
            const current: Docs = { ...(st.form.docs || {}) };

            if (v) {
                current[k] = v;
            } else {
                delete current[k];
            }

            return { form: { ...st.form, docs: current } };
        });
    };
    const docSummary = (docs: Docs) => {
        const n = requiredDocCount(docs);
        const missing = DOCS.filter(([k]) => !docs[k]).map((d) => d[1]);

        return {
            count: n + ' de ' + DOCS.length,
            tag: n === DOCS.length ? 'tag tag-neutral' : 'tag tag-accent',
            missing: missing.length > 0,
            msg: 'Falta: ' + missing.join(', ') + '.',
        };
    };
    const selDocsObj = selRaw ? docsOf(selRaw.id) : {};
    const selDocSummary = docSummary(selDocsObj);
    const formDocSummary = docSummary(f.docs || {});

    /** Known clients by account, from every month (the server groups them). */
    type DirectoryEntry = ClienteConocido;
    const directory: Record<string, DirectoryEntry> = Object.fromEntries(clientes.map((c) => [c.cuenta, c]));

    let clientSuggestions: DirectoryEntry[] = [];

    if (s.screen === 'nueva' && !s.editId && s.step === 0) {
        const dc = (f.cuenta || '').replace(/\D/g, '');
        const di = (f.idcte || '').replace(/\D/g, '');
        const all = Object.values(directory);
        const q = normalize(f.razon || '');

        if (dc.length === 9 && directory[dc]) {
            clientSuggestions = [directory[dc]];
        } else if (di.length === 9) {
            clientSuggestions = all.filter((e) => e.idcte === di);
        } else if (q.length >= 4) {
            clientSuggestions = all
                .filter(
                    (e) =>
                        normalize(e.razon).includes(q) ||
                        q
                            .split(' ')
                            .filter((w) => w.length > 2)
                            .every((w) => normalize(e.razon).includes(w)),
                )
                .slice(0, 3);
        }

        clientSuggestions = clientSuggestions.filter(
            (e) =>
                !s.clientDismiss.includes(e.cuenta) &&
                !(f.razon === e.razon && f.cuenta === e.cuenta && (f.rfc || '') === (e.rfc || '') && (f.domicilio || '') === (e.domicilio || '')),
        );
    }

    const tabs = (
        [
            ['dashboard', 'Inicio', 'ph ph-squares-four'],
            ['ventas', 'Ventas', 'ph ph-receipt'],
            ['nueva', 'Nueva', 'ph ph-plus'],
            ['inventario', 'Inventario', 'ph ph-package'],
            ['machotes', 'Machotes', 'ph ph-clipboard-text'],
        ] as [Screen, string, string][]
    ).map(([k, label, icon]) => {
        const isNew = k === 'nueva';
        const on = isNew ? s.screen === 'nueva' : k === curNav && s.screen !== 'nueva';

        return {
            key: k,
            label,
            icon,
            hasBadge: k === 'ventas' && attnCount > 0,
            badge: attnCount,
            color: on ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
            sz: isNew ? '40px' : '28px',
            bg: isNew ? 'var(--color-accent-900)' : 'transparent',
            ring: isNew ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
            go: () => (isNew ? startNew() : go(k)),
        };
    });

    const layout = {
        gridCols: mob ? 'minmax(0,1fr)' : tab ? '72px minmax(0,1fr)' : '220px minmax(0,1fr)',
        asideDisp: mob ? 'none' : 'flex',
        asidePad: tab ? 'var(--space-8) var(--space-3)' : 'var(--space-8) var(--space-6)',
        asideAlign: tab ? 'center' : 'stretch',
        fullDisp: tab ? 'none' : '',
        navJustify: tab ? 'center' : 'flex-start',
        newBtnClass: tab ? 'btn btn-primary btn-icon' : 'btn btn-primary btn-block',
        isMobile: mob,
        mainPad: mob ? 'var(--space-6) var(--space-4) 104px' : tab ? 'var(--space-8) var(--space-6)' : 'var(--space-8)',
        mainGap: mob ? 'var(--space-6)' : 'var(--space-8)',
        h1Size: mob ? '24px' : '28px',
        funnelCols: mob ? '132px minmax(0,1fr) 24px' : '150px minmax(0,1fr) 28px',
        recentCols: mob ? 'minmax(0,1fr) auto' : 'minmax(0,1fr) auto auto',
        recentDateDisp: mob ? 'none' : '',
        selFlex: mob ? '1 1 100%' : '0 0 auto',
        chipWrap: mob ? 'nowrap' : 'wrap',
        chipOv: mob ? 'auto' : 'visible',
        tableDisp: small ? 'none' : 'block',
        cardsDisp: small ? 'grid' : 'none',
        noRowsCards: small && rows.length === 0,
        nvCols: small ? 'minmax(0,1fr)' : 'minmax(0,1fr) 270px',
        nvAsidePos: small ? 'static' : 'sticky',
        nvPad: mob ? 'var(--space-6)' : 'var(--space-8)',
        mesesCols: mob ? 'repeat(6,minmax(0,1fr))' : 'repeat(12,minmax(0,1fr))',
        machSpan: small ? '1 / -1' : 'span 2',
        toastLeft: mob ? 'var(--space-4)' : 'auto',
        toastRight: mob ? 'var(--space-4)' : 'var(--space-8)',
        toastBottom: mob ? '84px' : 'var(--space-8)',
        eqCols: mob ? 'minmax(0,1fr)' : 'minmax(0,1fr) 190px',
        tabs,
    };

    /* ── Links: the address bar follows the screen, and the screen follows the address bar ── */

    /** Move the screen to an address that changed from outside (reload, back/forward, a redirect after saving). */
    const applyRoute = (target: AppRoute) => {
        switch (target.screen) {
            case 'venta':
                return set({ selId: target.id });
            case 'editar': {
                const d = readStorage<Draft>(DRAFT_KEY);

                return d && d.form && d.editId === target.id ? startNew() : startEdit(target.id);
            }
            case 'creada':
                return set((st) => ({
                    screen: 'creada',
                    selId: null,
                    createdId: target.id,
                    created: st.createdId === null || st.createdId === target.id ? st.created : null,
                }));
            case 'nueva':
                return s.screen === 'nueva' && s.editId === null ? set({ selId: null }) : startNew();
            default:
                return set({ screen: target.screen, selId: null });
        }
    };

    const conflictLoading = !!s.conflict?.loading;

    /** After a conflict, ask the server for the sale as it is now (only the props that changed). */
    useEffect(() => {
        if (!conflictLoading) {
            return;
        }

        router.reload({
            only: ['ventas', 'dnsAbiertos'],
            onFinish: () => set((st) => (st.conflict ? { conflict: { ...st.conflict, loading: false } } : {})),
        });
    }, [conflictLoading, set]);

    const conflictTheirs = s.conflict && !s.conflict.loading ? editSnapshot(s.conflict.id) : null;
    const conflictChanges = conflictTheirs ? compareSides(s.editOrig, { form: f, bots: s.bots }, conflictTheirs) : [];
    const conflictView = {
        conflictOpen: !!s.conflict,
        conflictLoading,
        /** Merged on their own: shown so the user knows what will change. */
        conflictAuto: conflictChanges
            .filter((c) => c.who !== 'both')
            .map((c) => ({
                key: c.key,
                label: c.label,
                value: c.who === 'mine' ? c.mine : c.theirs,
                from: c.who === 'mine' ? 'Se queda tu cambio' : 'Cambió en el otro equipo',
            })),
        /** Changed on both sides: the user picks one. */
        conflictChoices: conflictChanges
            .filter((c) => c.who === 'both')
            .map((c) => {
                const picked = s.conflict?.picks[c.key] ?? 'mine';
                const pick = (p: ConflictPick) =>
                    set((st) => (st.conflict ? { conflict: { ...st.conflict, picks: { ...st.conflict.picks, [c.key]: p } } } : {}));

                return {
                    key: c.key,
                    label: c.label,
                    mine: c.mine,
                    theirs: c.theirs,
                    picked,
                    pickMine: () => pick('mine'),
                    pickTheirs: () => pick('theirs'),
                };
            }),
        conflictSame: !!conflictTheirs && conflictChanges.length === 0,
        closeConflict: () => set({ conflict: null }),
        /**
         * Reopens an edit the server refused (the sale changed meanwhile, a DN taken…) in the editor, as a draft
         * with the version it started from. Saving it again shows the comparison if the sale did change.
         */
        resolvePending: (itemId: string) => {
            const resume = connection.pending.find((item) => item.id === itemId)?.resume as Omit<Draft, 'at'> | undefined;

            if (!resume || !resume.editId) {
                return;
            }

            const current = readStorage<Draft>(DRAFT_KEY);

            if (current && current.form && current.editId !== resume.editId) {
                return toast('Primero guarda o descarta el borrador que tienes abierto', 'error');
            }

            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...resume, at: Date.now() }));
            } catch {
                return toast('No se pudo abrir el cambio en este equipo', 'error');
            }

            connection.discard(itemId);
            router.visit(route('ventas.edit', resume.editId), {
                preserveState: true,
                onSuccess: () => toast('Revisa y guarda: si la venta cambió, te mostramos qué cambió'),
            });
        },
        /** Puts the merged sale in the form and rebases the edit on the current version; the user reviews and saves. */
        applyConflict: () => {
            if (!s.conflict || !conflictTheirs) {
                return;
            }

            const merged = mergeSides({ form: f, bots: s.bots }, conflictTheirs, conflictChanges, s.conflict.picks);
            set({
                form: { ...merged.form, docs: f.docs },
                bots: merged.bots,
                // Docs stay compared with the original copy, so only the files this edit removed get removed.
                editOrig: {
                    form: { ...conflictTheirs.form, docs: s.editOrig ? s.editOrig.form.docs : conflictTheirs.form.docs },
                    bots: conflictTheirs.bots,
                    version: conflictTheirs.version,
                },
                conflict: null,
                step: 3,
            });
            scrollTop();
            toast('Combinamos los cambios. Revisa y guarda.');
        },
    };

    /** Loads another month's sales from the server; the address keeps it as ?mes=YYYY-MM. */
    const verMes = (mes: string) => {
        if (!connection.online) {
            toast('Sin conexión: solo puedes ver el mes que ya está guardado en este equipo', 'error');

            return;
        }

        router.get(window.location.pathname, mes === currentPeriodo() ? {} : { mes }, {
            preserveState: true,
            preserveScroll: true,
            only: ['periodo', 'ventas'],
        });
    };

    const pagePath = pathOf(usePage().url);
    /** Keeps the month in the address when the screen changes, so a reload shows the same month. */
    const monthQuery = periodo === currentPeriodo() ? '' : '?mes=' + periodo;
    const stateUrl = urlFor({ screen: s.screen, selId: s.selId, editId: s.screen === 'nueva' ? s.editId : null, createdId: s.createdId });
    const latest = useRef({ stateUrl, applyRoute });
    latest.current = { stateUrl, applyRoute };
    /** Set while the state is catching up with an address that changed from outside, so it is not pushed back. */
    const followingUrl = useRef(false);

    useEffect(() => {
        if (latest.current.stateUrl !== pagePath) {
            followingUrl.current = true;
            latest.current.applyRoute(parseRoute(pagePath));
        }
    }, [pagePath]);

    useEffect(() => {
        if (followingUrl.current) {
            followingUrl.current = false;

            return;
        }

        if (stateUrl !== pagePath) {
            // Client-side visit: changes the URL and history entry without a request to the server.
            router.push({ url: stateUrl + monthQuery, preserveState: true, preserveScroll: true });
        }
    }, [stateUrl, pagePath, monthQuery]);

    return {
        ...layout,
        screen: s.screen,
        connection,
        nav,
        monthLabel,
        atLatest: periodo >= currentPeriodo(),
        prevMonth: () => verMes(shiftPeriodo(periodo, -1)),
        nextMonth: () => periodo < currentPeriodo() && verMes(shiftPeriodo(periodo, 1)),
        goVentas: () => go('ventas'),
        goNueva: startNew,

        /* dashboard */
        kpis,
        funnel,
        attention: monthSales.filter((x) => grp(x) === 'atencion').map(deco),
        seeAttention: toVentas('g:atencion'),
        recent: monthSales.slice(0, 5).map(deco),

        /* ventas */
        ventasCount: monthSales.length,
        q: s.q,
        onSearch: (e: ChangeEvent<HTMLInputElement>) => set({ q: e.target.value }),
        prio: s.prio,
        onPrio: (e: ChangeEvent<HTMLSelectElement>) => set({ prio: e.target.value }),
        prioOptions: [{ v: 'Todas', label: 'Todas las prioridades' }, ...['Urgente', 'Alta', 'Media', 'Baja'].map((p) => ({ v: p, label: p }))],
        chips,
        rows,
        clearFilters: () => set({ q: '', stFilter: 'Todos', prio: 'Todas' }),

        /* draft banner */
        showDraftBanner: !!s.draft && s.screen !== 'nueva',
        draftName: s.draft ? s.draft.form.nombre || s.draft.form.razon || 'venta sin nombre' : null,
        draftTitle: s.draft
            ? (s.draft.editId ? 'Tienes cambios sin guardar en ' : 'Tienes una venta sin terminar: ') +
              (s.draft.form.nombre || s.draft.form.razon || 'venta sin nombre')
            : '',
        draftSub: s.draft
            ? 'Guardada a las ' +
              timeLabel(s.draft.at) +
              ' · paso ' +
              ((s.draft.step || 0) + 1) +
              ' de 4 · ' +
              s.draft.bots.reduce((a, b) => a + b.dns.length, 0) +
              ' DN capturados'
            : '',
        resumeDraft: startNew,
        discardDraft: () => {
            clearDraft();
            toast('Borrador descartado');
        },

        /* nueva venta */
        nvTitle: editing ? 'Editar venta' : 'Nueva venta',
        nvSub: s.draft
            ? 'Borrador guardado a las ' + timeLabel(s.draft.at) + (editing ? ' · cambios sin aplicar' : '')
            : editing
              ? 'Tus cambios se guardan solos mientras escribes'
              : 'Se guarda solo mientras escribes',
        nvSubIcon: s.draft ? 'ph ph-cloud-check' : 'ph ph-cloud',
        hasDraftHere: s.screen === 'nueva' && !!s.draft,
        startOver: () => {
            clearDraft();
            set({ step: 0, editId: null, editOrig: null, form: emptyForm(), bots: [newBot()] });
            toast('Borrador descartado');
        },
        loadExample: () => {
            set({
                step: 0,
                form: {
                    ...emptyForm(),
                    nombre: 'JUAN NOE PADILLA VEGA - RENOVACION ANTICIPADA',
                    razon: 'JUAN NOE PADILLA VEGA',
                    cuenta: '507766765',
                    fp: '261012SM0974056 // 240719MKT0105 GB ADICIONALES',
                    rl: 'JUAN NOE PADILLA VEGA',
                    rfc: 'PAVJ711110EU6',
                    idcte: '105258030',
                    acuerdo: '11',
                    domicilio: 'INDEPENDENCIA , 15, INT B, CENTRO, SAN JUAN DE LOS LAGOS, SAN JUAN DE LOS LAGOS, JALISCO, 47000, MEX',
                    encargada: 'ELSA LORENA PADILLA / ABIGAIL PADILLA PADILLA',
                    telefono: '3957256197',
                    tipo: 'RENOVACIÓN ANTICIPADA T2',
                },
                bots: [
                    {
                        ...newBot(),
                        dns: EXAMPLE_DNS.slice(0, 6),
                        equipo: 'HONOR X5D MIDNIGTH BLACK ATT',
                        sku: 'N.HOX5DMN',
                        stock: 74,
                        plan: 'ATTv2 ArmaloNEG 299 C',
                        redes: 'Facebook ,Gmail; Google maps ,WhatsApp (Texto)',
                    },
                    {
                        ...newBot(),
                        costo: false,
                        dns: EXAMPLE_DNS.slice(6, 9),
                        equipo: 'APPLE IPHONE 17 256GB LAVANDA ATT',
                        sku: 'N.IP17256GL',
                        stock: 0,
                        plan: 'ATTv2 ArmaloNEG 399 C',
                        plazo: '24 meses',
                        redes: DEFAULT_REDES,
                    },
                    {
                        ...newBot(),
                        dns: EXAMPLE_DNS.slice(9),
                        equipo: 'APPLE IPHONE 17 PRO 256GB AZUL PROFUNDO ATT',
                        sku: 'N.IP17PR256GA',
                        stock: 154,
                        plan: 'ATTv2 ArmaloNEG 599 C',
                        plazo: '36 meses',
                        proteccion: true,
                        dmr: '10%',
                        redes: DEFAULT_REDES,
                    },
                ],
            });
            toast('Ejemplo cargado');
        },
        steps,
        step: s.step,
        form: f,
        setField,
        clienteFields,
        entregaFields,
        // An older sale keeps its type (e.g. PORTABILIDAD) as an option, so editing it doesn't change it.
        tipoOptions: f.tipo && !TIPOS.includes(f.tipo) ? [...TIPOS, f.tipo] : TIPOS,
        statusList: STATUS_LIST,
        plazos: PLAZOS,
        hasClientSugg: clientSuggestions.length > 0,
        clientSuggTitle: clientSuggestions.length === 1 ? 'Este cliente ya tiene ventas registradas' : 'Encontramos clientes parecidos',
        clientSugg: clientSuggestions.map((e) => ({
            key: e.cuenta,
            name: nice(e.razon),
            sub:
                'Cuenta ' +
                e.cuenta +
                ' · ID CTE ' +
                e.idcte +
                ' · ' +
                e.count +
                (e.count === 1 ? ' venta' : ' ventas') +
                ', la última el ' +
                e.last +
                ' (' +
                nice(e.lastTipo) +
                ')',
            dismiss: () => set((st) => ({ clientDismiss: [...st.clientDismiss, e.cuenta] })),
            apply: () => {
                const patch: Partial<SaleForm> = {};
                (['razon', 'cuenta', 'idcte', 'rfc', 'rl', 'domicilio', 'encargada', 'telefono', 'horario'] as const).forEach((k) => {
                    if (e[k]) {
                        patch[k] = e[k];
                    }
                });
                set((st) => ({ form: { ...st.form, ...patch } }));
                toast('Datos de ' + nice(e.razon) + ' llenados. Revisa que sigan vigentes.');
            },
        })),
        bots,
        addBot: () => {
            if (dupVals.length) {
                return toast(
                    'No se puede crear el BOT: hay ' + dupVals.length + (dupVals.length === 1 ? ' DN duplicado' : ' DN duplicados'),
                    'error',
                );
            }

            set((st) => ({ bots: [...st.bots, newBot()] }));
        },
        hasDups: dupVals.length > 0,
        dupBanner:
            dupVals.length === 1
                ? 'Hay 1 DN duplicado. Quítalo para poder crear otro BOT o continuar.'
                : 'Hay ' + dupVals.length + ' DN duplicados. Quítalos para poder crear otro BOT o continuar.',
        fixDups: () => {
            const seen = new Set<string>();
            set((st) => ({ bots: st.bots.map((b) => ({ ...b, dns: b.dns.filter((d) => (seen.has(d) ? false : (seen.add(d), true))) })) }));
            toast('Se quitaron ' + dupExtra + ' DN repetidos');
        },
        meses,
        mesesLabel,
        prioSeg,
        review,
        formDocs: docRows(f.docs || {}, formSet),
        formOtros: otrosOf(f.docs || {}, formSet),
        formDocCount: formDocSummary.count,
        formDocTag: formDocSummary.tag,
        formDocMissing: formDocSummary.missing,
        formDocMissingMsg: formDocSummary.msg + ' Puedes guardar la venta y subirlos después.',
        machOptions: s.machotes.map((m, i) => ({ i: String(i), name: m.name })),
        reviewMach: String(s.reviewMach),
        onReviewMach: (e: ChangeEvent<HTMLSelectElement>) => set({ reviewMach: +e.target.value }),
        reviewLines: fillVars(reviewMachote.text, formVals),
        copyReview: () => {
            copy(machoteToText(reviewMachote.text, formVals), 'Mensaje copiado');
            contarUso(reviewMachote);
        },
        checklist,
        doneCount,
        checkTotal: checks.length,
        progressW: (doneCount / checks.length) * 100 + '%',
        lineTotal,
        botCount: s.bots.length,
        isFirstStep: s.step === 0,
        nextLabel: s.step === 3 ? (s.editId ? 'Guardar cambios' : 'Guardar venta') : 'Siguiente',
        nextIcon: s.step === 3 ? 'ph ph-check' : 'ph ph-arrow-right',
        prevStep: () => set({ step: Math.max(0, s.step - 1) }),
        nextStep: () => {
            if (s.step === 1 && dupVals.length) {
                return toast('Hay ' + dupVals.length + ' DN duplicados. Corrígelos para continuar', 'error');
            }

            if (s.step === 1 && dnsOcupados.length) {
                return toast(
                    (dnsOcupados.length === 1 ? 'Un DN ya está' : dnsOcupados.length + ' DN ya están') +
                        ' en otra venta abierta. Quítalos para continuar',
                    'error',
                );
            }

            if (s.step < 3) {
                set({ step: s.step + 1 });
                scrollTop();

                return;
            }

            if (!canSave) {
                return toast('Faltan ' + (checks.length - doneCount) + ' campos obligatorios', 'error');
            }

            if (shortList.length) {
                return set({ stockModal: true });
            }

            doSave(0);
        },

        /* MATCH / CSV */
        matchText,
        copyMatch: () => copy(matchText, 'MATCH copiado'),
        downloadTxt: () => {
            downloadFile('MATCH_' + pref + '.txt', matchText, 'text/plain;charset=utf-8');
            toast('MATCH_' + pref + '.txt descargado');
        },
        csvFiles,
        downloadAllCsv: () => downloadAll(csvFiles),
        createdName: src.form.nombre || src.form.razon,
        createdLines: src.bots.reduce((a, b) => a + b.dns.length, 0),
        createdBots: src.bots.length,
        createdHasShort: !!(s.screen === 'creada' && s.created && s.created.shortN),
        createdShortMsg:
            s.created && s.created.shortN
                ? 'Se guardó con ' +
                  s.created.shortN +
                  (s.created.shortN === 1 ? ' equipo' : ' equipos') +
                  ' sin inventario suficiente. Confirma con almacén antes de enviar.'
                : '',

        /* stock modal */
        stockModal: s.stockModal,
        shortages,
        closeStock: () => set({ stockModal: false }),
        stockTitle: shortList.length
            ? shortList.length === 1
                ? '1 equipo sin inventario suficiente'
                : shortList.length + ' equipos sin inventario suficiente'
            : 'Todos los equipos tienen inventario',
        stockTitleIcon: shortList.length ? 'ph ph-package' : 'ph ph-check-circle',
        stockIntro: shortList.length
            ? 'Puedes cambiar al mismo modelo en otro color, o guardar la venta así. La venta se guarda aunque no haya inventario.'
            : 'Ya puedes guardar la venta.',
        saveAnywayLabel: shortList.length ? 'Guardar de todos modos' : 'Guardar venta',
        saveAnyway: () => doSave(shortList.length),

        /* sale drawer */
        sel,
        closeSel: () => set({ selId: null, noteDraft: '' }),
        archiveAsk: s.archiveAsk,
        archiveMsg:
            'La venta deja de aparecer en las listas y en los totales, y sus DN quedan libres para otra venta.' +
            (selRaw?.status === 'Terminado' ? ' Sus equipos regresan al inventario.' : '') +
            ' Podrás restaurarla desde Ventas › Archivadas.',
        askArchive: () => set({ archiveAsk: true }),
        cancelArchive: () => set({ archiveAsk: false }),
        confirmArchive: () => {
            const id = s.selId;

            if (id === null) {
                return;
            }

            set({ archiveAsk: false });
            submit({
                method: 'delete',
                url: route('ventas.destroy', id),
                data: {},
                label: 'Archivar · ' + (selRaw ? nice(selRaw.cliente) : 'venta ' + id),
                onSuccess: () => toast('Venta archivada'),
                onError: (errors) => toast(firstError(errors), 'error'),
                onQueued: () => toast('Sin conexión: la venta se archivará al volver la conexión'),
            });
        },
        onSelStatus: (e: ChangeEvent<HTMLSelectElement>) => {
            if (s.selId !== null) {
                cambiarEstatus(s.selId, e.target.value);
            }
        },
        selMatchText,
        copySelMatch: () => copy(selMatchText, 'MATCH copiado'),
        dlSelMatch: () => {
            downloadFile('MATCH_' + selPref + '.txt', selMatchText, 'text/plain;charset=utf-8');
            toast('MATCH_' + selPref + '.txt descargado');
        },
        selCsvFiles,
        dlSelAllCsv: () => downloadAll(selCsvFiles),
        selDocs: docRows(selDocsObj, selSet),
        selOtros: otrosOf(selDocsObj, selSet),
        selDocCount: selDocSummary.count,
        selDocTag: selDocSummary.tag,
        selDocMissing: selDocSummary.missing,
        selDocMissingMsg: selDocSummary.msg,
        selNotes,
        noteDraft: s.noteDraft,
        onNoteDraft: (e: ChangeEvent<HTMLTextAreaElement>) => set({ noteDraft: e.target.value }),
        addNote: () => {
            const text = s.noteDraft.trim();

            if (!text || !selRaw) {
                return;
            }

            submit({
                method: 'post',
                url: route('ventas.notas.store', selRaw.id),
                data: { texto: text },
                label: 'Nota · ' + nice(selRaw.cliente),
                onSuccess: () => {
                    set({ noteDraft: '' });
                    toast('Nota agregada');
                },
                onError: (errors) => toast(firstError(errors), 'error'),
                onQueued: () => {
                    set({ noteDraft: '' });
                    queuedToast('la nota');
                },
            });
        },
        editSale: selEdit,
        dupSale: () => {
            if (!selRaw) {
                return;
            }

            go('nueva', {
                step: 0,
                editId: null,
                bots: [newBot()],
                form: {
                    ...emptyForm(),
                    nombre: selRaw.tipo + ' - ' + selRaw.cliente,
                    razon: selRaw.cliente,
                    cuenta: selRaw.cuenta,
                    idcte: selRaw.idcte,
                    tipo: selRaw.tipo.split(' ')[0] === 'RENOVACION' ? 'RENOVACION' : 'LINEA NUEVA',
                },
            });
            toast('Venta duplicada como borrador');
        },
        copySaleMach: () => {
            if (!selRaw) {
                return;
            }

            const m = (selRaw.status === 'Líneas Atrapadas' ? s.machotes[0] : s.machotes[1]) || s.machotes[0];

            if (!m) {
                return toast('Primero crea un machote en la pantalla Machotes', 'error');
            }

            const saved = savedSaleOf(selRaw.id);
            copy(machoteToText(m.text, saleVars({ ...saved.form, status: selRaw.status }, saved.bots)), 'Mensaje "' + m.name + '" copiado');
            contarUso(m);
        },

        /* machote dialog */
        mDialog: s.mDialog,
        openMachDialog: () => set({ mDialog: true }),
        closeMachDialog: () => set({ mDialog: false }),

        /* inventario */
        invKpis: (
            [
                ['Modelos', invAll.length, () => set({ invLow: false, invOem: 'Todos' }), false],
                ['Piezas totales', invAll.reduce((a, r) => a + r.total, 0).toLocaleString('es-MX'), null, false],
                ['Sin stock', invAll.filter((r) => r.total === 0).length, () => set({ invLow: true }), true],
                ['OEMs', oems.length, null, false],
            ] as [string, number | string, (() => void) | null, boolean][]
        ).map(([label, value, pick, hot]) => ({
            label,
            value: String(value),
            pick: pick || (() => {}),
            ring: hot ? 'inset 0 0 0 1px var(--color-accent-600)' : 'var(--shadow-sm)',
        })),
        invQ: s.invQ,
        onInvQ: (e: ChangeEvent<HTMLInputElement>) => set({ invQ: e.target.value }),
        invSort: s.invSort,
        onInvSort: (e: ChangeEvent<HTMLSelectElement>) => set({ invSort: e.target.value }),
        oemChips: ['Todos', ...oems].map((o) => ({
            key: o,
            label: o === 'Todos' ? 'Todos los OEM' : o,
            ...chipStyle(s.invOem === o),
            pick: () => set({ invOem: o }),
        })),
        lowChip: chipStyle(s.invLow),
        toggleLow: () => set({ invLow: !s.invLow }),
        invAlmacenes: inventarioColumnas.almacenes,
        invExtras: inventarioColumnas.extras,
        invRows: invFiltered.map((r) => ({
            ...r,
            modelo: nice(r.modelo)
                .replace(/Iphone/g, 'iPhone')
                .replace(/(\d+)gb/gi, '$1 GB')
                .replace(/Usb-c/g, 'USB-C'),
            nameColor: r.total === 0 ? 'var(--color-neutral-400)' : 'var(--color-text)',
            // Warehouses and details in the Excel's order; a warehouse the item lacks shows 0.
            stocks: inventarioColumnas.almacenes.map((almacen) => ({
                label: almacen,
                qty: r.stock[almacen] ?? 0,
                color: zeroColor(r.stock[almacen] ?? 0),
            })),
            details: inventarioColumnas.extras.map((extra) => ({ label: extra, value: r.extras[extra] ?? '' })),
            tagClass: r.total === 0 ? 'tag tag-accent' : r.total < 30 ? 'tag tag-outline' : 'tag tag-neutral',
            totalLabel: r.total === 0 ? 'Sin stock' : r.total < 30 ? r.total + ' · bajo' : String(r.total),
        })),
        archivedOpen: s.archivedOpen,
        archivedLoading: s.archivedLoading,
        archived: (archivadas || []).map((a) => ({
            key: a.id,
            name: nice(a.cliente),
            meta: nice(a.tipo) + ' · ' + a.fecha + ' · ' + a.lineas + (a.lineas === 1 ? ' línea' : ' líneas') + ' · ' + a.status,
            at: 'Archivada ' + atLabel(a.archivadaAt),
            restore: () =>
                router.post(
                    route('ventas.restore', a.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            set({ archivedOpen: false });
                            toast('Venta restaurada');
                        },
                        onError: (errors) => toast(firstError(errors), 'error'),
                    },
                ),
        })),
        /** Asks the server for the archived sales only now (a partial reload of the optional prop). */
        openArchived: () => {
            if (!connection.online) {
                return toast('Necesitas conexión para ver las ventas archivadas', 'error');
            }

            set({ archivedOpen: true, archivedLoading: true });
            router.reload({ only: ['archivadas'], onFinish: () => set({ archivedLoading: false }) });
        },
        closeArchived: () => set({ archivedOpen: false }),
        ...conflictView,
        importDialog: s.importDialog,
        openImport: () => set({ importDialog: true }),
        closeImport: () => set({ importDialog: false }),
        importDone: (message: string) => toast(message),
        ultimaImportacion: ultimaImportacion
            ? 'Última importación: ' +
              new Date(ultimaImportacion.at).toLocaleString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
              }) +
              (ultimaImportacion.usuario ? ' · ' + ultimaImportacion.usuario : '')
            : 'Todavía no se ha importado un Excel',

        /* machotes */
        machList,
        machSelName: machSelected.name,
        machSelCat: machSelected.cat + ' · usado ' + machSelected.uses + ' veces',
        machEditing: s.machEditing,
        machText: machSelected.text,
        machLines: fillVars(machSelected.text, null, true),
        toggleMachEdit: () => {
            if (!s.machEditing) {
                return set({ machEditing: true });
            }

            saveMach(machSelected, () => {
                set({ machEditing: false });
                toast('Machote guardado');
            });
        },
        onMachText: (e: ChangeEvent<HTMLTextAreaElement>) => {
            const v = e.target.value;
            set((st) => ({ machotes: st.machotes.map((m, i) => (i === st.machSel ? { ...m, text: v } : m)) }));
        },
        machName: machSelected.name,
        machCat: machSelected.cat,
        onMachName: (e: ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            set((st) => ({ machotes: st.machotes.map((m, i) => (i === st.machSel ? { ...m, name: v } : m)) }));
        },
        onMachCat: (e: ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            set((st) => ({ machotes: st.machotes.map((m, i) => (i === st.machSel ? { ...m, cat: v } : m)) }));
        },
        /** Every variable a machote can use; clicking one copies it, ready to paste into the text. */
        machVars: MACHOTE_VARIABLES.map(([name, desc]) => ({
            key: name,
            label: '{' + name + '}',
            desc,
            copy: () => copy('{' + name + '}', '{' + name + '} copiado: pégalo en el texto'),
        })),
        canDeleteMach: !!machSelected.id,
        machDeleteAsk: s.machDeleteAsk,
        askDeleteMach: () => set({ machDeleteAsk: true }),
        cancelDeleteMach: () => set({ machDeleteAsk: false }),
        confirmDeleteMach: () => {
            const id = machSelected.id;

            if (!id) {
                return set({ machDeleteAsk: false });
            }

            const name = machSelected.name;
            set({ machDeleteAsk: false });
            submit({
                method: 'delete',
                url: route('machotes.destroy', id),
                data: {},
                label: 'Borrar machote · ' + name,
                onSuccess: () => {
                    set({ machSel: 0, machEditing: false });
                    toast('Machote "' + name + '" borrado');
                },
                onError: (errors) => toast(firstError(errors), 'error'),
                onQueued: () => toast('Sin conexión: el machote se borrará al volver la conexión'),
            });
        },
        dupMach: () => {
            const index = s.machotes.length;
            saveMach({ ...machSelected, id: undefined, name: machSelected.name + ' (copia)' }, () => {
                set({ machSel: index, machEditing: false });
                toast('Machote duplicado');
            });
        },
        newMach: () => {
            const index = s.machotes.length;
            saveMach(
                {
                    name: 'Nuevo machote',
                    cat: 'General',
                    uses: 0,
                    preset: { status: 'Captura', prioridad: 'Media' },
                    text: 'Buen día\n\nCLIENTE: {CLIENTE}\nCUENTA: {CUENTA}',
                },
                () => set({ machSel: index, machEditing: true }),
            );
        },
        copyMach: () => copy(machSelected.text, 'Machote copiado'),
        useMach: () => applyMach(machSelected, true),

        /* toast */
        toast: s.toast,
        toastIcon: s.toastKind === 'error' ? 'ph ph-warning-circle' : 'ph ph-check-circle',
    };
}

export type WolftekView = ReturnType<typeof useWolftek>;
