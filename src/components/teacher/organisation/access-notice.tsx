"use client";

import { useI18n } from "@/i18n/provider";
import { EmptyState } from "@/components/ui/panels";

export function NoAccess({ children }: { children: React.ReactNode }) {
    const { t } = useI18n();
    return (
        <EmptyState icon="🔒" title={t("NOT FOR YOUR ROLE")}>
            {children}
        </EmptyState>
    );
}
