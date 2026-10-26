import type { ActivityId } from "@/quiz/types";

export type EquipmentId = "axe" | "rod" | "net" | "shovel" | "log";
export type TargetingKind = "object" | "point" | "tile";
export type EquipmentIcon = { url: string; width: number; height: number; x?: number; y?: number };
export type EquipmentDefinition = {
    id: EquipmentId;
    label: string;
    actionLabel: string;
    targeting: TargetingKind;
    available: boolean;
    hint: string;
    activityId?: ActivityId;
    icon: EquipmentIcon;
};

const RPG = "/assets/images/farm asset pack/Icons/RPG icons";
export const INVENTORY_SLOTS = "/assets/images/farm asset pack/UI/Inventory/Slots.png";

/** Artwork is read from the original sheets, not placeholder/generated icons. */
export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
    axe: {
        id: "axe", label: "Kapak", actionLabel: "TEBAS", targeting: "object", available: true,
        hint: "Hadap ke pangkal pohon dan tekan F / Spasi.",
        icon: { url: `${RPG}/Weapons and Armor/1. Wood/Axe.png`, width: 32, height: 16 },
    },
    rod: {
        id: "rod", label: "Pancing", actionLabel: "🎣 CAST", targeting: "point", available: true,
        activityId: "fishing", hint: "Untuk kuis fishing di pantai. Penanda menunjukkan titik jatuh umpan.",
        icon: { url: `${RPG}/Weapons and Armor/1. Wood/Fishing Rod.png`, width: 32, height: 16 },
    },
    net: {
        id: "net", label: "Jaring", actionLabel: "TANGKAP", targeting: "object", available: true,
        activityId: "catching_bugs", hint: "Untuk cricket di farm. Dekati cricket bertanda ?.",
        icon: { url: `${RPG}/Extras/Bug net.png`, width: 16, height: 16 },
    },
    shovel: {
        id: "shovel", label: "Sekop", actionLabel: "GALI", targeting: "tile", available: false,
        hint: "Belum tersedia — perubahan tanah belum diimplementasikan.",
        icon: { url: `${RPG}/Weapons and Armor/1. Wood/Shovel.png`, width: 32, height: 16 },
    },
    log: {
        id: "log", label: "Kayu", actionLabel: "PASANG", targeting: "tile", available: false,
        hint: "Belum tersedia — membangun pagar hanya contoh pengembangan berikutnya.",
        icon: { url: `${RPG}/Extras/Wood.png`, width: 64, height: 48 },
    },
};

export type EquipmentState = { equipped: EquipmentId; locked: boolean; actionEnabled: boolean };
export type EquipmentContext = {
    phase: string;
    overlayOpen: boolean;
    /** The mini picker pauses actions but must still allow changing equipment. */
    pickerOpen?: boolean;
    travelling: boolean;
    playerBusy: boolean;
    playerLocked: boolean;
};

export function defaultEquipment(activityId?: ActivityId | null): EquipmentId {
    return activityId === "fishing" ? "rod" : activityId === "catching_bugs" ? "net" : "axe";
}

export function isEquipmentId(value: unknown): value is EquipmentId {
    return typeof value === "string" && Object.hasOwn(EQUIPMENT, value);
}

export function equipmentState(equipped: EquipmentId, context: EquipmentContext): EquipmentState {
    const blocked = context.overlayOpen || context.travelling || context.playerLocked;
    return {
        equipped,
        locked: blocked || context.playerBusy || context.phase !== "idle",
        // Reeling in is the same primary action, but equipment stays locked while waiting.
        actionEnabled: !blocked && !context.pickerOpen && EQUIPMENT[equipped].available && (
            (!context.playerBusy && context.phase === "idle") ||
            (equipped === "rod" && context.phase === "waiting")
        ),
    };
}

export function equipmentRoute(equipped: EquipmentId, activityId: ActivityId | null): "axe" | "activity" | "unavailable" {
    const tool = EQUIPMENT[equipped];
    if (!tool.available) return "unavailable";
    if (equipped === "axe") return "axe";
    return tool.activityId === activityId ? "activity" : "unavailable";
}
