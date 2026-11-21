import Phaser from "phaser";
import { WorldMapDefinition } from "./world-map-definition";
import { WorldObjectFactory } from "./world-object-factory";
import { WorldObject } from "./world-object";
import { resolveTreeObjectType } from "./tree-object-definition";
import { isCloudLayer, isCloudObject, isCloudTile } from "./render-layers";

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

        const layerNames = new Set([
            ...(this.definition.objectLayers ?? []),
            ...map.objects.filter((layer) => isCloudLayer(layer.name) || layer.objects.some((object) => resolveTreeObjectType(layer.name, object) || isCloudObject(object) || (object.gid != null && isCloudTile(object.gid & 0x1fffffff, map.tilesets)))).map((layer) => layer.name),
        ]);
        layerNames.forEach((layerName) => {
            if (animationLayers.has(layerName)) {
                return;
            }

            const objectLayer = map.getObjectLayer(layerName);

            if (objectLayer?.visible === false) return;
            objectLayer?.objects.forEach((object) => {
                if (object.visible === false) return;
                if (object.x == null || object.y == null) {
                    return;
                }

                const worldObject = this.factory.create(
                    isCloudObject(object) ? "CLOUDS" : resolveTreeObjectType(layerName, object) ?? layerName,
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