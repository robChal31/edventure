"use client";

import { useI18n } from "@/i18n/provider";
import type { InventoryItems } from "@/game/inventory/inventory";
import { ITEM_DEFINITIONS } from "@/game/inventory/inventory";
import Modal from "@/components/ui/modal";

export function ItemIcon() {
    const item = ITEM_DEFINITIONS.wood;
    return <span className="inventory-item-icon" aria-hidden style={{ backgroundImage: `url("${item.icon}")`,
        backgroundSize: `${item.sheet.width * 2}px ${item.sheet.height * 2}px`,
        backgroundPosition: `${-item.frame.x * 2}px ${-item.frame.y * 2}px` }} />;
}

export default function InventoryPanel({ items, open, onOpenChange, visible = true }: {
    items: InventoryItems; open: boolean; onOpenChange: (open: boolean) => void; visible?: boolean;
}) {
    const { t } = useI18n();
    return <>
        <button hidden={!visible} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onOpenChange(true)}
            aria-label={t("Inventory: {count} wood logs", { count: items.wood })} title={t("Inventory")}
            className="inventory-button pixel-panel rounded-xl bg-slate-900/95 px-3 py-2 text-amber-100">
            <span className="flex items-center justify-center gap-2"><ItemIcon /><span aria-live="polite" className="font-pixel text-[10px]">{items.wood}</span></span>
            <span className="text-[10px]">{t("Inventory")}</span>
        </button>
        <Modal open={open} title={t("Your inventory")} onClose={() => onOpenChange(false)}>
            <p className="mb-4 text-sm text-slate-300">{t("Click dropped logs in the world to put them in your bag. Collecting is optional and never changes your quiz score.")}</p>
            <div className="flex items-center gap-4 rounded-xl border-2 border-amber-700/50 bg-amber-950/40 p-4">
                <ItemIcon />
                <div><p className="font-bold text-amber-100">{t("Wood logs")}</p><p className="mt-1 text-xs text-slate-400">{t("Collected from trees and bushes")}</p></div>
                <span className="ml-auto font-pixel text-lg text-amber-300" data-testid="inventory-wood">{items.wood}</span>
            </div>
            <p className="mt-4 text-xs text-slate-400">{t("Your bag follows you between maps. Student items are saved on this browser; previews are temporary.")}</p>
        </Modal>
    </>;
}
