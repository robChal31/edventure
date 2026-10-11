import Phaser from "phaser";
import {
    getWorldOpaqueBounds,
    isOpaqueAt,
} from "@/game/common/texture/opaque-bounds";
import type { WorldMap, WorldTileLayer } from "../world-map";
import {
    WaterGrid,
    type Footprint,
    type Point,
    type SurfaceKind,
} from "./water-grid";

export type SurfaceObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

/** What a world point is, as far as fishing is concerned. */
export type SurfaceHit =
    | { kind: SurfaceKind }
    /** An object drawn there (boat, rock, house...). `name` = Tiled layer. */
    | { kind: "obstacle"; name: string };

export const WATER_SURFACE_CONFIG = {
    /** Part of a shore tile (fraction of a cell) that is painted sand. */
    shoreBand: 0.375,
    /** Extra margin (px) kept between fish and objects in the water. */
    obstaclePadding: 2,
} as const;

function layerHasTile(layer: WorldTileLayer, col: number, row: number): boolean {
    const tile = layer.layer.data[row]?.[col];
    return Boolean(tile) && tile.index !== -1;
}

/**
 * Where the water is on the current map, built from the layers the map
 * definition lists as water (`water`, `shallow_water`, `deep_water`) and
 * over-water (`bridge`). Used by activities to check where a cast lands
 * and where fish are allowed to be.
 */
export class WaterSurface {
    readonly grid: WaterGrid;
    #probeObjects: SurfaceObject[] = [];

    constructor(worldMap: WorldMap, objects: readonly SurfaceObject[]) {
        const waterLayers = worldMap.waterLayers;
        const overWaterLayers = worldMap.overWaterLayers;

        this.grid = WaterGrid.fromSource({
            cols: worldMap.map.width,
            rows: worldMap.map.height,
            cellWidth: worldMap.tileWidth,
            cellHeight: worldMap.tileHeight,
            hasWater: (col, row) =>
                waterLayers.some((layer) => layerHasTile(layer, col, row)),
            hasOverWater: (col, row) =>
                overWaterLayers.some((layer) => layerHasTile(layer, col, row)),
        });

        objects.forEach((object) => this.#registerObject(object));
    }

    /** True when the map has any water a fish could swim in. */
    public get hasOpenWater(): boolean {
        return this.grid.hasOpenWater;
    }

    /** What is at a world point: water, sand, a bridge, an object... */
    public probe(x: number, y: number): SurfaceHit {
        const kind = this.grid.surfaceAt(x, y, WATER_SURFACE_CONFIG.shoreBand);

        if (kind === "outside") {
            return { kind };
        }

        // Objects are checked pixel-precisely: the bait can splash right
        // next to the boat but not on it.
        for (const object of this.#probeObjects) {
            if (object.active && isOpaqueAt(object, x, y)) {
                return { kind: "obstacle", name: object.name || "object" };
            }
        }

        return { kind };
    }

    public isFishSafe(point: Point, footprint: Footprint): boolean {
        return this.grid.isFishSafe(point.x, point.y, footprint);
    }

    public isSwimPathClear(from: Point, to: Point, footprint: Footprint): boolean {
        return this.grid.isSwimPathClear(from, to, footprint);
    }

    public randomFishPoint(footprint: Footprint): Point | null {
        return this.grid.randomFishPoint(footprint);
    }

    public randomReachablePoint(
        origin: Point,
        footprint: Footprint,
        minDistance: number,
        maxDistance: number
    ): Point | null {
        return this.grid.randomReachablePoint(origin, footprint, minDistance, maxDistance);
    }

    public nearestFishPoint(target: Point, footprint: Footprint, maxDistance: number): Point | null {
        return this.grid.nearestFishPoint(target, footprint, maxDistance);
    }

    #registerObject(object: SurfaceObject): void {
        this.#probeObjects.push(object);

        // Animated sprites (boat bobbing, ripples) change frames, so block
        // their whole frame; static images block their opaque area only.
        const bounds =
            object instanceof Phaser.GameObjects.Sprite && object.anims?.isPlaying
                ? object.getBounds()
                : getWorldOpaqueBounds(object);

        if (!bounds) return;

        if (!this.grid.rectTouchesWater(bounds.x, bounds.y, bounds.width, bounds.height)) {
            return;
        }

        const pad = WATER_SURFACE_CONFIG.obstaclePadding;
        this.grid.blockRect(
            bounds.x - pad,
            bounds.y - pad,
            bounds.width + pad * 2,
            bounds.height + pad * 2
        );
    }
}
