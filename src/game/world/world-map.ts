import Phaser from "phaser";
import { WORLD_CONFIG } from "../config/world-config";
import { WorldMapDefinition } from "./world-map-definition";

export class WorldMap {
    #map: Phaser.Tilemaps.Tilemap;
    #waterLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

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

            if (layerData.name === this.definition.layers.water) {
                this.#waterLayer = layer;
            }
        });

        if (this.#waterLayer) {
            this.#waterLayer.setCollisionByExclusion([-1]);
        }
    }

    #initWorldBounds(): void {
        this.scene.physics.world.setBounds(
            0,
            0,
            this.#map.widthInPixels * WORLD_CONFIG.scale,
            this.#map.heightInPixels * WORLD_CONFIG.scale
        );
    }

    public get map(): Phaser.Tilemaps.Tilemap {
        return this.#map;
    }

    public get waterLayer():
        Phaser.Tilemaps.TilemapLayer |
        Phaser.Tilemaps.TilemapGPULayer {
        return this.#waterLayer;
    }
}