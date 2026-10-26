import type { CSSProperties } from 'react';
import { DOCS, SYNONYMS, type ServerBot, type ServerDoc } from './data';

/** An expediente file; `id` is set once it is stored on the server. */
export type DocFile = { id?: number; name: string; size?: number; at?: string; url?: string };

/** Expediente: one file per required doc key, plus optional "otros" attachments. */
export type Docs = Record<string, DocFile | DocFile[] | undefined> & { otros?: DocFile[] };

export type Bot = {
    costo: boolean;
    dns: string[];
    dnDraft: string;
    dnMsg: string;
    equipo: string;
    sku: string;
    stock: number | null;
    plan: string;
    plazo: string;
    proteccion: boolean;
    dmr: string;
    redes: string;
    pq: string;
};

export type SaleForm = {
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
    docs: Docs;
};

export type Sale = {
    id: number;
    cliente: string;
    tipo: string;
    cuenta: string;
    idcte: string;
    lineas: number;
    acuerdo: string;
    fecha: string;
    periodo: string;
    prioridad: string;
    status: string;
};

export type InventoryItem = { oem: string; sku: string; name: string; stock: number; model: string; color: string };

export type TextPart = { t: string; bg: string; color: string; pad: string };

const styleCache = new Map<string, CSSProperties>();

/**
 * Turns a CSS declaration string (as written in the design file) into a React style object.
 * Keeps the port line-for-line comparable with the design while staying a plain inline style.
 */
export function sx(css: string): CSSProperties {
    const cached = styleCache.get(css);

    if (cached) {
        return cached;
    }

    const style: Record<string, string> = {};

    for (const declaration of css.split(';')) {
        const colon = declaration.indexOf(':');

        if (colon < 0) {
            continue;
        }

        const property = declaration.slice(0, colon).trim();
        const value = declaration.slice(colon + 1).trim();

        if (!property || !value) {
            continue;
        }

        const key = property.startsWith('--') ? property : property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
        style[key] = value;
    }

    styleCache.set(css, style as CSSProperties);

    return style as CSSProperties;
}

export function newBot(): Bot {
    return {
        costo: true,
        dns: [],
        dnDraft: '',
        dnMsg: '',
        equipo: '',
        sku: '',
        stock: null,
        plan: '',
        plazo: '24 meses',
        proteccion: false,
        dmr: '',
        redes: '',
        pq: '',
    };
}

export function emptyForm(): SaleForm {
    return {
        nombre: '',
        razon: '',
        cuenta: '',
        idcte: '',
        rfc: '',
        rl: '',
        acuerdo: '',
        fp: '',
        domicilio: '',
        encargada: '',
        telefono: '',
        horario: 'DE 9:00 A 18:00 HRS',
        tipo: 'RENOVACION',
        status: 'Captura',
        prioridad: 'Media',
        cierre: '',
        notas: '',
        meses: [],
        docs: {},
    };
}

export function normalize(text: string): string {
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/([a-z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-z])/g, '$1 $2')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function tokens(text: string): string[] {
    return normalize(text)
        .split(' ')
        .filter(Boolean)
        .map((token) => (SYNONYMS[token] !== undefined ? SYNONYMS[token] : token))
        .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
    if (Math.abs(a.length - b.length) > 2) {
        return 9;
    }

    const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);

    for (let j = 1; j <= b.length; j++) {
        d[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }

    return d[a.length][b.length];
}

const tokenCache = new WeakMap<InventoryItem, { tokens: string[]; joined: string }>();

/** Typo-tolerant score of an inventory item against a free-text query; 0 means no match. */
export function fuzzyScore(item: InventoryItem, query: string): number {
    const queryTokens = tokens(query);

    if (!queryTokens.length) {
        return 1;
    }

    let cached = tokenCache.get(item);

    if (!cached) {
        const itemTokens = tokens(item.name + ' ' + item.sku + ' ' + item.oem);
        cached = { tokens: itemTokens, joined: itemTokens.join('') };
        tokenCache.set(item, cached);
    }

    let score = 0;
    let misses = 0;

    queryTokens.forEach((token) => {
        let tokenScore = 0;

        if (cached.tokens.includes(token)) {
            tokenScore = 3;
        } else if (cached.tokens.some((x) => x.startsWith(token))) {
            tokenScore = 2;
        } else if (
            (token.length >= 3 && cached.joined.includes(token)) ||
            (token.length >= 4 && cached.tokens.some((x) => levenshtein(x, token) <= (token.length >= 7 ? 2 : 1)))
        ) {
            tokenScore = 1;
        }

        if (tokenScore) {
            score += tokenScore;
        } else {
            misses++;
        }
    });

    if (misses > (queryTokens.length >= 3 ? 1 : 0)) {
        return 0;
    }

    if (cached.joined.includes(queryTokens.join(''))) {
        score += 2;
    }

    return score;
}

/** Title-cases an uppercase AT&T name, keeping legal suffixes (SA, CV…) uppercase. */
export function nice(text: string): string {
    const upper = ['sa', 'cv', 'sc', 'ac', 'rl', 'att', 'q2', 's'];
    const lower = ['de', 'del', 'la', 'las', 'los', 'en', 'y', 'a', 'con'];

    return text
        .toLowerCase()
        .split(' ')
        .map((word, i) =>
            upper.includes(word) ? word.toUpperCase() : i > 0 && lower.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ');
}

export function niceEquipo(text: string): string {
    return nice(text)
        .replace(/Iphone/g, 'iPhone')
        .replace(/(\d+)gb/gi, '$1 GB')
        .replace(/Usb-c/g, 'USB-C')
        .replace(/ ATT$/, '');
}

export function requiredDocCount(docs: Docs | undefined): number {
    return DOCS.filter(([key]) => docs && docs[key]).length;
}

/** Drops in-memory blob: preview URLs (they die with the tab) so a draft can be stored. */
export function stripDocUrls(docs: Docs): Docs {
    const strip = (file: DocFile): DocFile => (file.url && file.url.startsWith('blob:') ? { ...file, url: undefined } : file);

    return Object.fromEntries(
        Object.entries(docs || {}).map(([key, value]) => [key, Array.isArray(value) ? value.map(strip) : value ? strip(value) : value]),
    ) as Docs;
}

/** "Hoy · 14:05" for today, otherwise "15 oct · 14:05". */
export function atLabel(at: string | number | Date | null | undefined): string {
    if (!at) {
        return '';
    }

    const date = new Date(at);
    const isToday = date.toDateString() === new Date().toDateString();
    const day = isToday ? 'Hoy' : date.getDate() + ' ' + date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');

    return day + ' · ' + timeLabel(date);
}

/** Builds the expediente map the screens use from the server's document list. */
export function docsFromServer(documentos: ServerDoc[]): Docs {
    const docs: Docs = {};

    documentos.forEach((d) => {
        const file: DocFile = {
            id: d.id,
            name: d.name,
            size: d.size ?? undefined,
            at: d.archivado ? 'Archivado' : atLabel(d.at),
            url: d.url ?? undefined,
        };

        if (d.tipo === 'otros') {
            docs.otros = [...(docs.otros || []), file];
        } else {
            docs[d.tipo] = file;
        }
    });

    return docs;
}

export function botFromServer(bot: ServerBot): Bot {
    return { ...newBot(), ...bot, dns: [...bot.dns] };
}

/** The AT&T "MATCH" text block the sales team pastes into the carrier portal. */
export function buildMatch(form: SaleForm, bots: Bot[]): string {
    const total = bots.reduce((sum, bot) => sum + bot.dns.length, 0);
    const lines = [
        '',
        'CLIENTE: ' + form.razon,
        '',
        String(total),
        '',
        'CUENTA: ' + form.cuenta,
        '',
        'FP: ' + form.fp,
        '',
        'RL: ' + form.rl,
        '',
        'RFC : ' + form.rfc,
        '',
        'ID CTE : ' + form.idcte,
        '',
        'DOM.',
        '',
        form.domicilio,
        '',
        'P/ ENCARGADA: ' + form.encargada,
        '',
        'TEL . ' + form.telefono,
        '',
        'HORARIO DE ENTREGA ' + form.horario,
        '',
        form.tipo,
        '',
    ];

    bots.forEach((bot, i) => {
        lines.push('BOT ' + (i + 1) + ': ' + (bot.costo ? 'CON COSTO' : 'SIN COSTO'), '');
        bot.dns.forEach((dn) => lines.push(dn + '  ' + bot.equipo + ' (SKU ' + bot.sku + ')    ' + bot.plan));
        lines.push('', 'Plazo:  ' + bot.plazo, 'Redes:  ' + bot.redes, '-----------------------', '');
    });

    return lines.join('\n');
}

export function botRows(bot: Bot, i: number): string[][] {
    return bot.dns.map((dn) => [
        'BOT ' + (i + 1),
        dn,
        bot.equipo,
        bot.sku,
        bot.plan,
        bot.plazo,
        bot.costo ? 'CON COSTO' : 'SIN COSTO',
        bot.proteccion ? 'SI' : 'NO',
        bot.dmr,
        bot.redes,
    ]);
}

export function csvFor(rows: string[][]): string {
    const escape = (value: string) => (/[",\n]/.test(String(value)) ? '"' + String(value).replace(/"/g, '""') + '"' : String(value));
    const header = ['BOT', 'DN', 'EQUIPO', 'SKU', 'PLAN', 'PLAZO', 'TIPO', 'PROTECCION', 'DMR', 'REDES'];

    return '﻿' + [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

export function downloadFile(name: string, content: string, mime: string): void {
    try {
        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
        // Downloads are best-effort; the toast still tells the user what happened.
    }
}

export function priorityBars(prioridad: string): { h: string; bg: string }[] {
    const level = ({ Baja: 1, Media: 2, Alta: 3, Urgente: 4 } as Record<string, number>)[prioridad] || 0;

    return [1, 2, 3, 4].map((i) => ({
        h: 3 + i * 3 + 'px',
        bg: i <= level ? (level === 4 ? 'var(--color-accent-300)' : 'var(--color-neutral-200)') : 'var(--color-neutral-700)',
    }));
}

/** Splits a machote into highlighted lines: {VARS} are filled from `values`, or shown as chips. */
export function fillVars(text: string, values: Record<string, string> | null, highlightOnly = false): { parts: TextPart[] }[] {
    return text.split('\n').map((line) => ({
        parts: (line === '' ? [' '] : line.split(/(\{[^}]+\})/).filter(Boolean)).map((part) => {
            const isVar = /^\{[^}]+\}$/.test(part);

            if (!isVar) {
                return { t: part, bg: 'transparent', color: 'var(--color-neutral-100)', pad: '0' };
            }

            const value = values && values[part.slice(1, -1)];

            if (value && !highlightOnly) {
                return { t: value, bg: 'transparent', color: 'var(--color-accent-200)', pad: '0' };
            }

            return { t: part, bg: 'var(--color-accent-900)', color: 'var(--color-accent-200)', pad: '1px 4px' };
        }),
    }));
}

export function saleVars(sale: Sale): Record<string, string> {
    return {
        CLIENTE: sale.cliente,
        'RAZON SOCIAL': sale.cliente,
        CUENTA: sale.cuenta,
        'ID CTE': sale.idcte,
        ACUERDO: sale.acuerdo,
        'NUMERO DE LINEAS': String(sale.lineas),
    };
}

export function machoteToText(text: string, values: Record<string, string>): string {
    return text.replace(/\{([^}]+)\}/g, (match, key: string) => values[key] || match);
}

export function timeLabel(at: number | Date): string {
    return new Date(at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
