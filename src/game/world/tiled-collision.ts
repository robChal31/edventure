export type TiledCollisionObject = {
    id?: number;
    visible?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    gid?: number;
    ellipse?: boolean;
    point?: boolean;
    polygon?: unknown;
    polyline?: unknown;
    text?: unknown;
};

type TiledCollisionLayer = { name: string; visible?: boolean; objects: readonly TiledCollisionObject[] };
export type TiledCollisionRectangle = {
    layer: string;
    objectId: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * Additional solid rectangles from object layers named `collision` on any map.
 * Phaser has already applied Tiled layer/group offsets to these coordinates.
 * Editor visibility does not disable helper geometry; runtime bodies are invisible.
 * Arcade bodies are axis-aligned: other shapes/rotations must not become oversized boxes.
 */
export function readTiledCollisionRectangles(layers: readonly TiledCollisionLayer[], scale = 1): TiledCollisionRectangle[] {
    if (!Number.isFinite(scale) || scale <= 0) return [];
    return layers.filter(layer => layer.name.split("/").at(-1) === "collision").flatMap(layer =>
        layer.objects.flatMap((object, index) => {
            if (object.gid != null || object.ellipse || object.point || object.polygon || object.polyline || object.text || (object.rotation ?? 0) % 360 !== 0) return [];
            const { x, y, width, height } = object;
            if (![x, y, width, height].every(value => typeof value === "number" && Number.isFinite(value)) || width! <= 0 || height! <= 0) return [];
            return [{ layer: layer.name, objectId: object.id ?? index, x: x! * scale, y: y! * scale, width: width! * scale, height: height! * scale }];
        })
    );
}
