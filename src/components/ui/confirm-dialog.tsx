"use client";

import { useI18n } from "@/i18n/provider";
import type { ReactNode } from "react";
import Modal from "./modal";
import PixelButton from "./pixel-button";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useI18n();
    return (
        <Modal
            open={open}
            title={title}
            onClose={onCancel}
            footer={
                <>
                    <PixelButton tone="slate" onClick={onCancel}>{t("Cancel")}</PixelButton>
                    <PixelButton tone={danger ? "rose" : "emerald"} onClick={onConfirm} autoFocus>
                        {t(confirmLabel)}
                    </PixelButton>
                </>
            }
        >
            <div className="text-sm leading-relaxed text-slate-200">{message}</div>
        </Modal>
    );
}
