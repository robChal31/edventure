"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { EQUIPMENT, INVENTORY_SLOTS, type EquipmentId, type EquipmentState } from "@/game/equipment/equipment";

function EquipmentIcon({ id }: { id: EquipmentId }) {
    const icon = EQUIPMENT[id].icon;
    return <span aria-hidden className="equipment-icon" style={{
        backgroundImage: `url("${icon.url}")`,
        backgroundSize: `${icon.width * 2}px ${icon.height * 2}px`,
        backgroundPosition: `${-(icon.x ?? 0) * 2}px ${-(icon.y ?? 0) * 2}px`,
    }} />;
}

/** A single original wooden slot, with a compact picker ABOVE it rather than a full hotbar. */
export default function EquipmentPicker({ state, onEquip, onOpenChange }: {
    state: EquipmentState;
    onEquip: (id: EquipmentId) => void;
    onOpenChange: (open: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const id = useId();
    const root = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const active = EQUIPMENT[state.equipped];

    useLayoutEffect(() => {
        onOpenChange(open);
        return () => onOpenChange(false);
    }, [open, onOpenChange]);

    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
        };
        document.addEventListener("pointerdown", dismiss);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);

    return (
        <div ref={root} className="equipment-dock" onKeyDown={(event) => { if (open && event.key !== "Escape") event.stopPropagation(); }}>
            {open && !state.locked && (
                <div id={id} role="group" aria-label="Pilih peralatan" className="equipment-picker pixel-panel rounded-xl bg-slate-950/95 p-3 text-slate-100">
                    <p className="mb-1 font-pixel text-[9px] text-amber-200">PERALATAN</p>
                    <p className="mb-3 text-xs text-slate-400">F / Spasi memakai alat yang dipilih.</p>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(EQUIPMENT).map((tool) => (
                            <button key={tool.id} type="button" disabled={!tool.available} aria-pressed={state.equipped === tool.id}
                                title={tool.hint}
                                onClick={() => { onEquip(tool.id); setOpen(false); button.current?.focus(); }}
                                className={`flex min-h-19 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-xs focus-visible:outline-2 focus-visible:outline-sky-300 ${state.equipped === tool.id ? "border-amber-300 bg-amber-900/40" : "border-slate-700 bg-slate-800/70"} disabled:opacity-45`}>
                                <EquipmentIcon id={tool.id} />
                                <span>{tool.label}</span>
                                {!tool.available && <span className="text-[9px] text-amber-200">Belum tersedia</span>}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">Sekop & kayu belum punya aksi. Alat lain mengikuti konteks map.</p>
                </div>
            )}
            <button ref={button} type="button" disabled={state.locked} aria-label={`Equipment aktif: ${active.label}. Buka pilihan alat`}
                aria-expanded={open && !state.locked} aria-controls={open && !state.locked ? id : undefined}
                title={state.locked ? "Tunggu aksi selesai untuk mengganti alat" : `${active.label} — klik untuk ganti alat`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setOpen((value) => !value)}
                className="equipment-slot focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-60"
                style={{ backgroundImage: `url("${INVENTORY_SLOTS}")` }}>
                <EquipmentIcon id={state.equipped} />
            </button>
            <span className="mt-1 rounded bg-slate-950/85 px-2 py-1 text-[10px] text-amber-100">{active.label} ▴</span>
        </div>
    );
}
