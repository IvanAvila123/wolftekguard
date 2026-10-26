/*
 * WolftekGuard service worker — keeps the app opening without a connection.
 *
 * - Built assets (/build/*) are precached from Vite's manifest and served cache-first.
 * - App pages (/dashboard, /ventas…, /inventario, /machotes) go to the network first. The last
 *   HTML page and the last Inertia page data are kept, so a reload without a connection can rebuild
 *   any app URL from them.
 * - Nothing else is cached: logins, saves (POST/PUT/…) and files always go to the server.
 */

const VERSION = 'v1';
const ASSET_CACHE = `wg-assets-${VERSION}`;
const PAGE_CACHE = `wg-pages-${VERSION}`;
const SHELL_KEY = '/__wg/shell';
const PAGE_KEY = '/__wg/page';
const APP_PATH = /^\/(dashboard|ventas|inventario|machotes)(\/|$)/;

self.addEventListener('install', (event) => {
    event.waitUntil(precacheBuild().finally(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('wg-') && key !== ASSET_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    // Sent on logout so the next person on this device doesn't see the previous user's sales.
    if (event.data && event.data.type === 'wg-clear') {
        event.waitUntil(caches.delete(PAGE_CACHE));
    }
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (url.pathname.startsWith('/build/')) {
        event.respondWith(cacheFirst(request));
    } else if (APP_PATH.test(url.pathname) && request.mode === 'navigate') {
        event.respondWith(appPage(request, url));
    } else if (APP_PATH.test(url.pathname) && request.headers.get('X-Inertia')) {
        event.respondWith(inertiaData(request, url));
    }
});

/** Cache every JS, CSS and font file the current build lists, so the app shell works offline. */
async function precacheBuild() {
    try {
        const response = await fetch('/build/manifest.json', { cache: 'no-store' });

        if (!response.ok) {
            return;
        }

        const manifest = await response.json();
        const files = new Set();

        for (const chunk of Object.values(manifest)) {
            [chunk.file, ...(chunk.css || []), ...(chunk.assets || [])]
                .filter((file) => file && /\.(js|css|woff2)$/.test(file))
                .forEach((file) => files.add('/build/' + file));
        }

        const cache = await caches.open(ASSET_CACHE);
        const missing = [];

        for (const file of files) {
            if (!(await cache.match(file))) {
                missing.push(file);
            }
        }

        await Promise.all(missing.map((file) => cache.add(file).catch(() => {})));
    } catch {
        // Offline while installing: assets are cached as they are used instead.
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        const cache = await caches.open(ASSET_CACHE);
        cache.put(request, response.clone());
    }

    return response;
}

async function appPage(request, url) {
    try {
        const response = await fetch(request);

        if (response.redirected && new URL(response.url).pathname === '/login') {
            // Signed out (or the session expired): forget the previous user's data.
            await caches.delete(PAGE_CACHE);
        } else if (response.ok && (response.headers.get('Content-Type') || '').includes('text/html')) {
            await rememberShell(response.clone());
            // Pick up files from a new build while online.
            precacheBuild();
        }

        return response;
    } catch {
        const offline = await offlinePage(url);

        return offline || Response.error();
    }
}

async function inertiaData(request, url) {
    try {
        const response = await fetch(request);

        // A partial reload (e.g. another month's sales) only carries some props: keep the full page.
        if (response.ok && response.headers.get('X-Inertia') && !request.headers.get('X-Inertia-Partial-Data')) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(PAGE_KEY, response.clone());
        }

        return response;
    } catch {
        const cache = await caches.open(PAGE_CACHE);
        const cached = await cache.match(PAGE_KEY);

        if (!cached) {
            return Response.error();
        }

        const page = await cached.json();

        return new Response(JSON.stringify({ ...page, url: url.pathname + url.search }), {
            headers: { 'Content-Type': 'application/json', 'X-Inertia': 'true', Vary: 'X-Inertia' },
        });
    }
}

/** Keep the HTML page and the Inertia page data embedded in it (data-page). */
async function rememberShell(response) {
    const html = await response.text();
    const match = html.match(/data-page="([^"]*)"/);
    const cache = await caches.open(PAGE_CACHE);

    await cache.put(SHELL_KEY, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));

    if (match) {
        await cache.put(PAGE_KEY, new Response(unescapeHtml(match[1]), { headers: { 'Content-Type': 'application/json', 'X-Inertia': 'true' } }));
    }
}

/** Rebuild an app page for `url` from the last HTML shell and the most recent page data. */
async function offlinePage(url) {
    const cache = await caches.open(PAGE_CACHE);
    const [shell, data] = await Promise.all([cache.match(SHELL_KEY), cache.match(PAGE_KEY)]);

    if (!shell || !data) {
        return null;
    }

    const page = { ...(await data.json()), url: url.pathname + url.search };
    const html = (await shell.text()).replace(/data-page="[^"]*"/, `data-page="${escapeHtml(JSON.stringify(page))}"`);

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function unescapeHtml(text) {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}
