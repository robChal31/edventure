"use client";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LOCALE, getLocale, initializeLocale, isLocale, LOCALE_KEY, setLocale, subscribeLocale } from "./locale";
import { translate, type MessageValues } from "./translate";
import FormSelect from "@/components/ui/form-select";
import LanguageFlag from "@/components/ui/language-flag";

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
export function LanguageSwitcher({ compact = false, onOpenChange }: { compact?: boolean; onOpenChange?: (open: boolean) => void }) {
    const { locale, setLocale, t } = useI18n();
    return <div className={`language-switcher ${compact ? "is-compact" : ""}`}>
        <FormSelect aria-label={t("Language")} value={locale} onValueChange={(value) => setLocale(value === "en" ? "en" : "id")}
            searchable={false} onOpenChange={onOpenChange} options={[
                { value: "id", label: "ID", accessibleLabel: "Bahasa Indonesia", icon: <LanguageFlag locale="id" /> },
                { value: "en", label: "EN", accessibleLabel: "English", icon: <LanguageFlag locale="en" /> },
            ]} />
    </div>;
}
