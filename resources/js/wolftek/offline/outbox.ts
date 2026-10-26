/**
 * Outbox for changes made without a connection.
 *
 * Each save that cannot reach the server is stored in IndexedDB (files included, as Blobs) and sent
 * later, in the order it was made. Sending uses plain `fetch` with `Accept: application/json`, so the
 * server answers with status codes (422 validation, 401/419 session) instead of navigating the app.
 */

export type OutboxMethod = 'post' | 'put' | 'patch' | 'delete';

/** One FormData entry: [name, value, file name for Blobs]. */
type Entry = [string, string | Blob, string?];

export type OutboxItem = {
    id: string;
    /** What the change is, for the "pendientes" list (e.g. "Nueva venta · JUAN NOE PADILLA VEGA"). */
    label: string;
    method: OutboxMethod;
    url: string;
    entries: Entry[];
    createdAt: number;
    status: 'pendiente' | 'error';
    error?: string;
    /** For an edit: the form as it was queued, so one the server refuses as stale can be reopened in the editor. */
    resume?: unknown;
};

export type FlushResult = { sent: number; stoppedBy: null | 'offline' | 'session' | 'server' };

const DB_NAME = 'wolftekguard';
const STORE = 'outbox';

type Listener = (items: OutboxItem[]) => void;
const listeners = new Set<Listener>();
let flushing: Promise<FlushResult> | null = null;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();

    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        tx.oncomplete = () => {
            db.close();
            resolve(request.result);
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

export async function listOutbox(): Promise<OutboxItem[]> {
    try {
        const items = await withStore<OutboxItem[]>('readonly', (store) => store.getAll() as IDBRequest<OutboxItem[]>);

        return items.sort((a, b) => a.createdAt - b.createdAt);
    } catch {
        return [];
    }
}

async function notify(): Promise<void> {
    const items = await listOutbox();
    listeners.forEach((listener) => listener(items));
}

export function subscribeOutbox(listener: Listener): () => void {
    listeners.add(listener);
    listOutbox().then(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Same field naming Inertia uses for multipart requests (`bots[0][dns][1]`, booleans as 1/0, null as ''). */
export function toEntries(data: unknown, prefix = '', entries: Entry[] = []): Entry[] {
    if (Array.isArray(data)) {
        data.forEach((value, index) => toEntries(value, `${prefix}[${index}]`, entries));
    } else if (data instanceof File) {
        entries.push([prefix, data, data.name]);
    } else if (data instanceof Blob) {
        entries.push([prefix, data, 'blob']);
    } else if (data instanceof Date) {
        entries.push([prefix, data.toISOString()]);
    } else if (typeof data === 'boolean') {
        entries.push([prefix, data ? '1' : '0']);
    } else if (typeof data === 'string' || typeof data === 'number') {
        entries.push([prefix, String(data)]);
    } else if (data === null || data === undefined) {
        entries.push([prefix, '']);
    } else if (typeof data === 'object') {
        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => toEntries(value, prefix ? `${prefix}[${key}]` : key, entries));
    }

    return entries;
}

export async function enqueue(change: {
    label: string;
    method: OutboxMethod;
    url: string;
    data: Record<string, unknown>;
    resume?: unknown;
}): Promise<void> {
    const item: OutboxItem = {
        id: crypto.randomUUID(),
        label: change.label,
        method: change.method,
        url: change.url,
        entries: toEntries(change.data),
        createdAt: Date.now(),
        status: 'pendiente',
        resume: change.resume,
    };

    await withStore('readwrite', (store) => store.put(item));
    await notify();
}

export async function removeFromOutbox(id: string): Promise<void> {
    await withStore('readwrite', (store) => store.delete(id));
    await notify();
}

export async function clearOutbox(): Promise<void> {
    await withStore('readwrite', (store) => store.clear());
    await notify();
}

/** Laravel's CSRF token from its XSRF-TOKEN cookie, for requests made with fetch. */
export function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function send(item: OutboxItem): Promise<'sent' | 'offline' | 'session' | 'server' | { error: string }> {
    const form = new FormData();
    item.entries.forEach(([name, value, fileName]) => (value instanceof Blob ? form.append(name, value, fileName) : form.append(name, value)));

    if (item.method !== 'post') {
        form.append('_method', item.method.toUpperCase());
    }

    let response: Response;

    try {
        response = await fetch(item.url, {
            method: 'POST',
            body: form,
            credentials: 'same-origin',
            redirect: 'manual',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrfToken() },
        });
    } catch {
        return 'offline';
    }

    // Controllers answer a successful save with a redirect.
    if (response.type === 'opaqueredirect' || response.ok) {
        return 'sent';
    }

    if (response.status === 401 || response.status === 419) {
        return 'session';
    }

    if (response.status === 422) {
        const body = (await response.json().catch(() => ({}))) as { message?: string; errors?: Record<string, string[]> };
        const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;

        return { error: first || body.message || 'El servidor rechazó el cambio.' };
    }

    if (response.status === 404) {
        return { error: 'La venta ya no existe en el servidor.' };
    }

    // Server trouble: keep the change in line and try again later.
    return 'server';
}

/**
 * Send pending changes in order. Stops at the first one that cannot go through for connection or
 * session reasons (keeping the order); a change the server rejects is marked and skipped.
 */
export function flushOutbox(): Promise<FlushResult> {
    if (flushing) {
        return flushing;
    }

    flushing = (async () => {
        let sent = 0;

        for (const item of await listOutbox()) {
            if (item.status === 'error') {
                continue;
            }

            const result = await send(item);

            if (result === 'sent') {
                await withStore('readwrite', (store) => store.delete(item.id));
                sent++;
            } else if (result === 'offline' || result === 'session' || result === 'server') {
                await notify();

                return { sent, stoppedBy: result };
            } else {
                await withStore('readwrite', (store) => store.put({ ...item, status: 'error', error: result.error }));
            }
        }

        await notify();

        return { sent, stoppedBy: null };
    })().finally(() => {
        flushing = null;
    });

    return flushing;
}

/** Put a change that failed back in line (after the user fixed the cause, e.g. signed in again). */
export async function retryItem(id: string): Promise<void> {
    const item = (await listOutbox()).find((candidate) => candidate.id === id);

    if (item) {
        await withStore('readwrite', (store) => store.put({ ...item, status: 'pendiente', error: undefined }));
        await notify();
    }
}
