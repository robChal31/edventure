import Phaser from "phaser";
import { WorldMapDefinition } from "./world-map-definition";
import { WorldObjectFactory } from "./world-object-factory";
import { WorldObject } from "./world-object";

export class WorldObjectLoader {
    constructor(
        private definition: WorldMapDefinition,
        private factory: WorldObjectFactory
    ) {}

    public loadObjects(
        map: Phaser.Tilemaps.Tilemap
    ): WorldObject[] {
        const objects: WorldObject[] = [];

        const animationLayers = new Set(
            this.definition.animations?.map(
                (animation) => animation.layer
            ) ?? []
        );

        this.definition.objectLayers?.forEach((layerName) => {
            if (animationLayers.has(layerName)) {
                return;
            }

            const objectLayer = map.getObjectLayer(layerName);

            objectLayer?.objects.forEach((object) => {
                if (object.x == null || object.y == null) {
                    return;
                }

                const worldObject = this.factory.create(
                    layerName,
                    object.x,
                    object.y,
                    object.gid,
                    map
                );

                if (worldObject) {
                    objects.push(worldObject);
                }
            });
        });

        return objects;
    }
}