import { addItem, readInventoryItems, type InventoryItems, type ItemId } from "@/game/inventory/inventory";
import { createLocalCollection } from "../storage/local-collection";

export type StudentInventory = { id: string; items: InventoryItems };
export function sanitizeInventory(raw: unknown): StudentInventory | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    const items = readInventoryItems(value.items);
    return typeof value.id === "string" && value.id.trim() && items ? { id: value.id, items } : null;
}
export const inventoryStore = createLocalCollection<StudentInventory>({
    key: "learning-world.lms.inventory.v1", sanitize: sanitizeInventory, requirePersistence: true,
});
/** A failed disk write throws before the world item is consumed. Names/codes are never owner keys. */
export function collectItem(studentId: string, itemId: ItemId, quantity = 1): InventoryItems {
    if (!studentId.trim()) throw new Error("Inventory needs a student owner.");
    const items = addItem(inventoryStore.get(studentId)?.items ?? { wood: 0 }, itemId, quantity);
    inventoryStore.upsert({ id: studentId, items });
    return items;
}
