/**
 * ID + timestamp helpers. `crypto.randomUUID` only exists in secure
 * contexts (https / localhost), so fall back to a random string elsewhere
 * (e.g. a classroom laptop opening the dev server over a LAN IP).
 */
export function createId(prefix: string): string {
    const random =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
            : Math.random().toString(36).slice(2, 14);

    return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function nowIso(): string {
    return new Date().toISOString();
}
