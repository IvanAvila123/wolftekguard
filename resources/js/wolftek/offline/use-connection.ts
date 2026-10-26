import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearOutbox, enqueue, flushOutbox, removeFromOutbox, retryItem, subscribeOutbox, type OutboxItem, type OutboxMethod } from './outbox';

/** How often to check whether the server is back while offline. */
const PING_EVERY_MS = 15000;

async function serverReachable(): Promise<boolean> {
    try {
        const response = await fetch('/up', { cache: 'no-store', credentials: 'same-origin' });

        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Connection state and the queue of changes waiting to be sent.
 * "Offline" means the server can't be reached — no internet, Wi-Fi down or the server itself down.
 */
export function useConnection() {
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    const [pending, setPending] = useState<OutboxItem[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const onlineRef = useRef(online);
    onlineRef.current = online;

    const sync = useCallback(async () => {
        setSyncing(true);
        const result = await flushOutbox();
        setSyncing(false);

        if (result.stoppedBy === 'offline' || result.stoppedBy === 'server') {
            // Back off: the ping above flips this back once the server answers again.
            setOnline(false);
        }

        setSessionExpired(result.stoppedBy === 'session');

        if (result.sent > 0) {
            // Bring in what the server now has (the sales just sent, their logs…).
            router.reload();
        }

        return result;
    }, []);

    const markOffline = useCallback(() => setOnline(false), []);

    useEffect(() => subscribeOutbox(setPending), []);

    // The page may have come from the service worker's cache: check the server is really there.
    useEffect(() => {
        serverReachable().then(setOnline);
    }, []);

    useEffect(() => {
        const goOnline = () => serverReachable().then((reachable) => setOnline(reachable));
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // While offline, keep checking whether the server is back.
    useEffect(() => {
        if (online) {
            return;
        }

        const timer = setInterval(() => {
            serverReachable().then((reachable) => reachable && setOnline(true));
        }, PING_EVERY_MS);

        return () => clearInterval(timer);
    }, [online]);

    // Send what is waiting as soon as the connection is back (and on load).
    const hasPending = pending.some((item) => item.status === 'pendiente');

    useEffect(() => {
        if (online && hasPending && !syncing && !sessionExpired) {
            sync();
        }
    }, [online, hasPending, syncing, sessionExpired, sync]);

    return {
        online,
        pending,
        syncing,
        sessionExpired,
        markOffline,
        sync,
        queue: (change: { label: string; method: OutboxMethod; url: string; data: Record<string, unknown>; resume?: unknown }) => enqueue(change),
        discard: (id: string) => removeFromOutbox(id),
        retry: (id: string) => retryItem(id).then(() => sync()),
        clearAll: () => clearOutbox(),
    };
}

export type Connection = ReturnType<typeof useConnection>;
