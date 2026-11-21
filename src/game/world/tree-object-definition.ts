type TiledTreeObject = { type?: string; class?: string; properties?: unknown };
export const TREE_SPECIES = ["mahogany", "maple", "birch", "pine"] as const;

/** Layer-based legacy maps and explicit Tiled tree classes use the same definition/factory. */
export function resolveTreeObjectType(layer: string, object: TiledTreeObject): string | null {
    const properties = new Map<string, unknown>();
    if (Array.isArray(object.properties)) {
        object.properties.forEach((property: { name?: string; value?: unknown }) => { if (typeof property?.name === "string") properties.set(property.name, property.value); });
    } else if (object.properties && typeof object.properties === "object") {
        Object.entries(object.properties).forEach(([key, value]) => properties.set(key, value));
    }
    const explicit = properties.get("treeVariant");
    if (typeof explicit === "string" && /^(?:(?:chopped_|no_leaf_|dark_green_|orange_)?(?:mahogany|maple|birch|pine))(?:_tree)?(?:_(?:small|medium|large))?$/.test(explicit)) return explicit;
    const declared = object.class || object.type;
    if (declared === "tree" || declared === "wood") {
        const species = properties.get("species");
        if (!TREE_SPECIES.includes(species as typeof TREE_SPECIES[number])) return null;
        if (declared === "wood" || properties.get("stage") === "stump") return `chopped_${species}_tree`;
        const variant = properties.get("variant") ?? "large";
        return ["small", "medium", "large"].includes(String(variant)) ? `${species}_tree_${variant}` : null;
    }
    for (const value of [declared, layer]) {
        if (value && /^(?:(?:chopped_|no_leaf_|dark_green_|orange_)?(?:mahogany|maple|birch|pine))(?:_tree)?(?:_(?:small|medium|large))?$/.test(value)) return value;
    }
    return null;
}
