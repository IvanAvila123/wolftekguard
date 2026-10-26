import { router } from '@inertiajs/react';
import { clearOutbox } from './outbox';

/** Sign out and forget this user's offline data (queued changes and cached pages) on this device. */
export async function logoutAndForget(): Promise<void> {
    await clearOutbox().catch(() => {});
    navigator.serviceWorker?.controller?.postMessage({ type: 'wg-clear' });
    router.post(route('logout'));
}
