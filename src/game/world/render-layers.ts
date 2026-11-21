export function isCloudLayer(name: string): boolean { return /cloud/i.test(name); }
export function isCloudObject(object: { type?: string; class?: string; name?: string; properties?: unknown }): boolean {
    if ([object.class, object.type, object.name].some((value) => value && isCloudLayer(value))) return true;
    const properties = Array.isArray(object.properties)
        ? Object.fromEntries(object.properties.filter((p) => p && typeof p.name === "string").map((p) => [p.name, p.value]))
        : object.properties as Record<string, unknown> | undefined;
    return [properties?.renderLayer, properties?.class, properties?.type]
        .some((value) => typeof value === "string" && isCloudLayer(value));
}
type TileMetadata = { type?: unknown; class?: unknown };
type TilesetDepthData = {
    firstgid: number; total: number; name: string;
    tileData?: object;
    tileProperties?: object;
};
export function isCloudTile(index: number, ranges: readonly TilesetDepthData[]): boolean {
    return ranges.some((range) => {
        if (index < range.firstgid || index >= range.firstgid + range.total) return false;
        if (isCloudLayer(range.name)) return true;
        const local = index - range.firstgid;
        const tile = (range.tileData as Record<number, TileMetadata> | undefined)?.[local];
        const props = (range.tileProperties as Record<number, Record<string, unknown>> | undefined)?.[local];
        return [tile?.type, tile?.class, props?.class, props?.type, props?.renderLayer]
            .some((value) => typeof value === "string" && isCloudLayer(value));
    });
}

/** Phaser's Tiled parser still reads `type`; recent Tiled exports call it `class`. */
export function normalizeTiledClasses(raw: unknown): void {
    if (!raw || typeof raw !== "object") return;
    const value = raw as Record<string, unknown>;
    if (typeof value.class === "string" && !value.type) value.type = value.class;
    for (const key of ["layers", "objects", "tilesets", "tiles"]) {
        if (Array.isArray(value[key])) (value[key] as unknown[]).forEach(normalizeTiledClasses);
    }
}
