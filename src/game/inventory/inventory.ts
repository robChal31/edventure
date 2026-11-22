export const ITEM_DEFINITIONS = {
    wood: { label: "Wood logs", icon: "/assets/images/farm asset pack/Icons/RPG icons/Extras/Wood.png", frame: { x: 0, y: 0, width: 16, height: 16 }, sheet: { width: 64, height: 48 } },
} as const;
export type ItemId = keyof typeof ITEM_DEFINITIONS;
export type InventoryItems = Record<ItemId, number>;
export const EMPTY_INVENTORY: Readonly<InventoryItems> = Object.freeze({ wood: 0 });
export const INVENTORY_PICKUP = "inventory:pickup";
export type PickupRequest = { itemId: ItemId; quantity: number; complete: (accepted: boolean) => void };

export function isItemId(value: unknown): value is ItemId {
    return typeof value === "string" && Object.hasOwn(ITEM_DEFINITIONS, value);
}
export function readInventoryItems(raw: unknown): InventoryItems | null {
    if (!raw || typeof raw !== "object") return null;
    const { wood } = raw as Record<string, unknown>;
    return Number.isSafeInteger(wood) && (wood as number) >= 0 ? { wood: wood as number } : null;
}
/** No silent rounding, negative stacks, overflow, or invented item ids. */
export function addItem(items: InventoryItems, itemId: ItemId, quantity = 1): InventoryItems {
    if (!isItemId(itemId) || !Number.isSafeInteger(quantity) || quantity < 1 || !readInventoryItems(items) || !Number.isSafeInteger(items[itemId] + quantity)) {
        throw new RangeError("Invalid inventory pickup.");
    }
    return { ...items, [itemId]: items[itemId] + quantity };
}
