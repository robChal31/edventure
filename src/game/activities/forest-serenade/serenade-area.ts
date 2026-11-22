export type PerformanceArea = { x: number; y: number; width: number; height: number };
type TiledArea = { name?: string; type?: string; visible?: boolean; x?: number; y?: number; width?: number; height?: number };

/** No invented location: the play area must be explicitly authored in Tiled. */
export function readPerformanceArea(objects: readonly TiledArea[], scale = 1): PerformanceArea | null {
    const object = objects.find((entry) => entry.visible !== false && (entry.name === "performance_area" || entry.type === "performance_area") &&
        [entry.x, entry.y, entry.width, entry.height].every((n) => typeof n === "number" && Number.isFinite(n)) && entry.width! > 0 && entry.height! > 0);
    return object ? { x: object.x! * scale, y: object.y! * scale, width: object.width! * scale, height: object.height! * scale } : null;
}
export function inPerformanceArea(point: { x: number; y: number }, area: PerformanceArea): boolean {
    return point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height;
}

/** A bounded decorative landing, independent of question count and completion. */
export function frogLanding(index: number, altar: { x: number; y: number }, bounds: { width: number; height: number }): { x: number; y: number } {
    const angle = index * 2.399963229728653;
    const radius = 26 + Math.floor((index % 30) / 8) * 9;
    return { x: Math.max(8, Math.min(bounds.width - 8, altar.x + Math.cos(angle) * radius)),
        y: Math.max(8, Math.min(bounds.height - 8, altar.y + 12 + Math.sin(angle) * radius * 0.5)) };
}
