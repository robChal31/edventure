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
