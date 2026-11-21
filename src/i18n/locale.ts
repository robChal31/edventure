export type Locale = "id" | "en";
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_KEY = "learning-world.locale.v1";
let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();
export function isLocale(value: unknown): value is Locale { return value === "id" || value === "en"; }
export function getLocale(): Locale { return current; }
export function subscribeLocale(listener: () => void): () => void {
    listeners.add(listener); return () => { listeners.delete(listener); };
}
export function setLocale(locale: Locale): void {
    if (!isLocale(locale)) return;
    current = locale;
    if (typeof document !== "undefined") document.documentElement.lang = locale;
    try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* Language still works without storage. */ }
    listeners.forEach((listener) => listener());
}
export function initializeLocale(): void {
    try { const stored = localStorage.getItem(LOCALE_KEY); if (isLocale(stored)) setLocale(stored); } catch { /* private browsing */ }
}
