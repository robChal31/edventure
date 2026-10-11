"use client";

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
    return (
        <Modal
            open={open}
            title={title}
            onClose={onCancel}
            footer={
                <>
                    <PixelButton tone="slate" onClick={onCancel}>
                        Cancel
                    </PixelButton>
                    <PixelButton tone={danger ? "rose" : "emerald"} onClick={onConfirm} autoFocus>
                        {confirmLabel}
                    </PixelButton>
                </>
            }
        >
            <div className="text-sm leading-relaxed text-slate-200">{message}</div>
        </Modal>
    );
}
