import Phaser from "phaser";
import { DEPTH_CONFIG } from "../config/depth-config";
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

    constructor(
        private scene: Phaser.Scene,
        private definition: WorldMapDefinition
    ) {
        this.#map = this.scene.make.tilemap({
            key: this.definition.key,
        });

        this.#initLayers();
        this.#initWorldBounds();
    }

    #initLayers(): void {
        const tilesets = this.definition.tilesets
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

        if (tilesets.length !== this.definition.tilesets.length) {
            console.error(`Failed to load one or more map tilesets: ${tilesets}`);
            return;
        }

        const waterNames = new Set(getWaterLayerNames(this.definition.layers));
        const overWaterNames = new Set(getOverWaterLayerNames(this.definition.layers));

        this.#map.layers.forEach((layerData) => {
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

            if (waterNames.has(layerData.name)) {
                // Every water layer blocks walking (shallow AND deep water).
                layer.setCollisionByExclusion([-1]);
                this.#waterLayers.push(layer);
            }

            if (overWaterNames.has(layerData.name)) {
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

    public getLayer(name: string): WorldTileLayer | undefined {
        return this.#layers.get(name);
    }
}
