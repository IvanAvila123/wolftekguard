/**
 * Maps the app's screens to URLs and back, so each screen has its own link
 * (matching the GET routes in routes/web.php) without asking the server on every click.
 */

export type Screen = 'dashboard' | 'ventas' | 'nueva' | 'creada' | 'inventario' | 'machotes';

export type AppRoute =
    | { screen: 'dashboard' | 'ventas' | 'inventario' | 'machotes' | 'nueva'; id: null }
    /** A sale's detail panel, open over the sales list. */
    | { screen: 'venta'; id: number }
    | { screen: 'editar' | 'creada'; id: number };

/** Where the screen state should live in the address bar. */
export type RouteState = {
    screen: Screen;
    selId: number | null;
    editId: number | null;
    createdId: number | null;
};

const SALE_PATH = /^\/ventas\/(\d+)(?:\/(editar|creada))?\/?$/;

export function parseRoute(url: string): AppRoute {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    const sale = path.match(SALE_PATH);

    if (sale) {
        const id = Number(sale[1]);

        return sale[2] === 'editar' ? { screen: 'editar', id } : sale[2] === 'creada' ? { screen: 'creada', id } : { screen: 'venta', id };
    }

    switch (path) {
        case '/ventas':
            return { screen: 'ventas', id: null };
        case '/ventas/nueva':
            return { screen: 'nueva', id: null };
        case '/inventario':
            return { screen: 'inventario', id: null };
        case '/machotes':
            return { screen: 'machotes', id: null };
        default:
            return { screen: 'dashboard', id: null };
    }
}

export function urlFor({ screen, selId, editId, createdId }: RouteState): string {
    if (selId !== null) {
        return `/ventas/${selId}`;
    }

    switch (screen) {
        case 'nueva':
            return editId !== null ? `/ventas/${editId}/editar` : '/ventas/nueva';
        case 'creada':
            return createdId !== null ? `/ventas/${createdId}/creada` : '/ventas';
        case 'ventas':
            return '/ventas';
        case 'inventario':
            return '/inventario';
        case 'machotes':
            return '/machotes';
        default:
            return '/dashboard';
    }
}

/** Path part of an Inertia page URL (which may carry a query string). */
export function pathOf(url: string): string {
    return url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}
