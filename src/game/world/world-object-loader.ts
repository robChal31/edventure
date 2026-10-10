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

        this.definition.objectLayers?.forEach(
            (layerName) => {
                const objectLayer = map.getObjectLayer(layerName);
                objectLayer?.objects.forEach((object) => {
                    if (object.x == null || object.y == null) {
                        return;
                    }

                    const worldObject =
                        this.factory.create(
                            layerName,
                            object.x,
                            object.y
                        );

                    if (worldObject) {
                        objects.push(worldObject);
                    }
                });
            }
        );

        return objects;
    }
}