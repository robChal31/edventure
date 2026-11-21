"use client";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LOCALE, getLocale, initializeLocale, isLocale, LOCALE_KEY, setLocale, subscribeLocale } from "./locale";
import { translate, type MessageValues } from "./translate";

/** Locale selection is client-local; existing LMS/bookmarked routes never change. */
export function LocaleProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        initializeLocale();
        const sync = (event: StorageEvent) => {
            if (event.key === LOCALE_KEY && isLocale(event.newValue)) setLocale(event.newValue);
        };
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, []);
    return children;
}
export function useI18n() {
    const locale = useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE);
    const t = useCallback((message: string, values?: MessageValues) => translate(locale, message, values), [locale]);
    return { locale, setLocale, t };
}
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
    const { locale, setLocale, t } = useI18n();
    return <label className={`language-switcher inline-flex items-center gap-2 rounded-full border border-current/15 bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-sm ${compact ? "" : "min-w-36"}`}>
        <span aria-hidden>🌐</span><span className="sr-only">{t("Language")}</span>
        <select aria-label={t("Language")} value={locale} onChange={(event) => setLocale(event.target.value === "en" ? "en" : "id")}
            className="min-w-0 cursor-pointer bg-transparent py-0.5 text-[#334155] outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <option value="id">Bahasa Indonesia</option><option value="en">English</option>
        </select>
    </label>;
}
