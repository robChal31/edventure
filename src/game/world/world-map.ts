import Phaser from "phaser";
import { DEPTH_CONFIG } from "../config/depth-config";
import { isCloudLayer, isCloudTile, normalizeTiledClasses } from "./render-layers";
import { WORLD_CONFIG } from "../config/world-config";
import {
    getOverWaterLayerNames,
    getWaterLayerNames,
    WorldMapDefinition,
} from "./world-map-definition";

export type WorldTileLayer =
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer;

export class WorldMap {
    #map: Phaser.Tilemaps.Tilemap;
    #layers = new Map<string, WorldTileLayer>();
    #waterLayers: WorldTileLayer[] = [];
    #overWaterLayers: WorldTileLayer[] = [];
    #hasClouds = false;

    constructor(
        private scene: Phaser.Scene,
        private definition: WorldMapDefinition
    ) {
        normalizeTiledClasses(this.scene.cache.tilemap.get(this.definition.key)?.data);
        this.#map = this.scene.make.tilemap({
            key: this.definition.key,
        });

        this.#initLayers();
        this.#initWorldBounds();
    }

    #initLayers(): void {
        const definitions = [...this.definition.tilesets];
        this.#map.tilesets.filter((tileset) => isCloudLayer(tileset.name)).forEach((tileset) => {
            const key = tileset.name.toUpperCase();
            if (!definitions.some((entry) => entry.name === tileset.name) && this.scene.textures.exists(key)) definitions.push({ name: tileset.name, assetKey: key });
        });
        const tilesets = definitions
            .map((tilesetDefinition) => {
                return this.#map.addTilesetImage(
                    tilesetDefinition.name,
                    tilesetDefinition.assetKey
                );
            })
            .filter(
                (tileset): tileset is Phaser.Tilemaps.Tileset =>
                    tileset !== null
            );

        if (tilesets.length !== definitions.length) {
            console.error(`Failed to load one or more map tilesets: ${tilesets}`);
            return;
        }

        const waterNames = new Set(getWaterLayerNames(this.definition.layers));
        const overWaterNames = new Set(getOverWaterLayerNames(this.definition.layers));

        [...this.#map.layers].forEach((layerData) => {
            const layer = this.#map.createLayer(
                layerData.name,
                tilesets,
                0,
                0
            );

            if (!layer) {
                console.error(
                    "Failed to create layer:",
                    layerData.name
                );

                return;
            }

            layer.setScale(WORLD_CONFIG.scale);
            this.#layers.set(layerData.name, layer);

            if (isCloudLayer(layerData.name)) {
                layer.setDepth(DEPTH_CONFIG.CLOUDS);
                this.#hasClouds = true;
            } else {
                // Tiled permits CLOUDS tiles in a mixed ground/decor layer. Split them out,
                // rather than raising the whole ground layer above the player.
                const cloudTiles: Phaser.Tilemaps.Tile[] = [];
                layer.forEachTile((tile: Phaser.Tilemaps.Tile) => { if (isCloudTile(tile.index, this.#map.tilesets)) cloudTiles.push(tile); });
                if (cloudTiles.length) {
                    this.#hasClouds = true;
                    const top = this.#map.createBlankLayer(`${layerData.name}-clouds`, tilesets, 0, 0);
                    if (top) {
                        top.setScale(WORLD_CONFIG.scale).setDepth(DEPTH_CONFIG.CLOUDS).setAlpha(layer.alpha).setVisible(layer.visible);
                        cloudTiles.forEach((tile) => {
                            const copy = top.putTileAt(tile.index, tile.x, tile.y);
                            if (copy) { copy.flipX = tile.flipX; copy.flipY = tile.flipY; copy.rotation = tile.rotation; copy.alpha = tile.alpha; }
                            layer.removeTileAt(tile.x, tile.y);
                        });
                    }
                }
            }

            if (waterNames.has(layerData.name) && !isCloudLayer(layerData.name)) {
                // Every water layer blocks walking (shallow AND deep water).
                layer.setCollisionByExclusion([-1]);
                this.#waterLayers.push(layer);
            }

            if (overWaterNames.has(layerData.name) && !isCloudLayer(layerData.name)) {
                // Bridges render above the fish band, so a swimming fish can
                // never be drawn on top of the planks.
                layer.setDepth(DEPTH_CONFIG.OVER_WATER);
                this.#overWaterLayers.push(layer);
            }
        });

        waterNames.forEach((name) => {
            if (!this.#layers.has(name)) {
                console.warn(`Water layer "${name}" not found in map ${this.definition.key}`);
            }
        });
    }

    #initWorldBounds(): void {
        this.scene.physics.world.setBounds(
            0,
            0,
            this.widthInPixels,
            this.heightInPixels
        );
    }

    public get map(): Phaser.Tilemaps.Tilemap {
        return this.#map;
    }

    public get definitionKey(): string {
        return this.definition.key;
    }

    /** Scaled world size. */
    public get widthInPixels(): number {
        return this.#map.widthInPixels * WORLD_CONFIG.scale;
    }

    public get heightInPixels(): number {
        return this.#map.heightInPixels * WORLD_CONFIG.scale;
    }

    /** Scaled tile size. */
    public get tileWidth(): number {
        return this.#map.tileWidth * WORLD_CONFIG.scale;
    }

    public get tileHeight(): number {
        return this.#map.tileHeight * WORLD_CONFIG.scale;
    }

    /** Every layer defined as water (water / shallow_water / deep_water). */
    public get waterLayers(): readonly WorldTileLayer[] {
        return this.#waterLayers;
    }

    /** Walkable layers drawn over water (bridges / piers). */
    public get overWaterLayers(): readonly WorldTileLayer[] {
        return this.#overWaterLayers;
    }

    public get hasAuthoredClouds(): boolean { return this.#hasClouds; }

    public get collisionLayerNames(): readonly string[] {
        const names = this.definition.layers.collision;
        return typeof names === "string" ? [names] : names ?? [];
    }

    public hasShadowAt(x: number, y: number): boolean {
        for (const [name, layer] of this.#layers) {
            if (/shadow/i.test(name) && (layer.getTileAtWorldXY(x, y)?.index ?? -1) >= 0) return true;
        }
        return false;
    }

    public getLayer(name: string): WorldTileLayer | undefined {
        return this.#layers.get(name);
    }
}
