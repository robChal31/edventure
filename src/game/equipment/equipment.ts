import type { ActivityId } from "@/quiz/types";

export type EquipmentId = "none" | "axe" | "rod" | "net" | "shovel" | "log";
export type TargetingKind = "object" | "point" | "tile";
export type EquipmentIcon = { url: string; width: number; height: number; x?: number; y?: number };
export type EquipmentDefinition = {
    id: EquipmentId; label: string; actionLabel: string; targeting: TargetingKind;
    available: boolean; hint: string; activityId?: ActivityId; icon: EquipmentIcon | null;
};
const RPG = "/assets/images/farm asset pack/Icons/RPG icons";
export const INVENTORY_SLOTS = "/assets/images/farm asset pack/UI/Inventory/Slots.png";

/** The empty slot means empty hands; all tool artwork comes from the original pack. */
export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
    none: { id: "none", label: "Empty hands", actionLabel: "ACTION", targeting: "object", available: true,
        hint: "Explore without a tool. Choose equipment to use an action.", icon: null },
    axe: { id: "axe", label: "Axe", actionLabel: "CHOP", targeting: "object", available: true,
        hint: "Face a tree trunk and press F / Space.",
        icon: { url: `${RPG}/Weapons and Armor/1. Wood/Axe.png`, width: 32, height: 16 } },
    rod: { id: "rod", label: "Fishing rod", actionLabel: "CAST", targeting: "point", available: true,
        activityId: "fishing", hint: "For fishing at the beach. The marker shows where the bait will land.",
        icon: { url: `${RPG}/Weapons and Armor/1. Wood/Fishing Rod.png`, width: 32, height: 16 } },
    net: { id: "net", label: "Net", actionLabel: "CATCH", targeting: "object", available: true,
        activityId: "catching_bugs", hint: "For crickets at the farm. Approach a cricket marked ?.",
        icon: { url: `${RPG}/Extras/Bug net.png`, width: 16, height: 16 } },
    shovel: { id: "shovel", label: "Shovel", actionLabel: "DIG", targeting: "tile", available: false,
        hint: "Not available yet — digging has not been implemented.",
        icon: { url: `${RPG}/Weapons and Armor/1. Wood/Shovel.png`, width: 32, height: 16 } },
    log: { id: "log", label: "Wood", actionLabel: "BUILD", targeting: "tile", available: false,
        hint: "Not available yet — building is a future activity.",
        icon: { url: `${RPG}/Extras/Wood.png`, width: 64, height: 48 } },
};
export type EquipmentState = { equipped: EquipmentId; locked: boolean; actionEnabled: boolean };
export type EquipmentContext = {
    phase: string; overlayOpen: boolean; pickerOpen?: boolean; travelling: boolean;
    playerBusy: boolean; playerLocked: boolean;
};
export function defaultEquipment(activityId?: ActivityId | null): EquipmentId {
    return activityId === "fishing" ? "rod" : activityId === "catching_bugs" ? "net" : "none";
}
export function isEquipmentId(value: unknown): value is EquipmentId {
    return typeof value === "string" && Object.hasOwn(EQUIPMENT, value);
}
export function equipmentState(equipped: EquipmentId, context: EquipmentContext): EquipmentState {
    const blocked = context.overlayOpen || context.travelling || context.playerLocked;
    return {
        equipped,
        locked: blocked || context.playerBusy || context.phase !== "idle",
        actionEnabled: equipped !== "none" && !blocked && !context.pickerOpen && EQUIPMENT[equipped].available && (
            (!context.playerBusy && context.phase === "idle") || (equipped === "rod" && context.phase === "waiting")
        ),
    };
}
export function equipmentRoute(equipped: EquipmentId, activityId: ActivityId | null): "axe" | "activity" | "unavailable" | "none" {
    if (equipped === "none") return "none";
    const tool = EQUIPMENT[equipped];
    if (!tool.available) return "unavailable";
    if (equipped === "axe") return "axe";
    return tool.activityId === activityId ? "activity" : "unavailable";
}
