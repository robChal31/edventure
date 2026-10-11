import Phaser from "phaser";
import { WORLD_CONFIG } from "../config/world-config";
import { WorldMapDefinition } from "./world-map-definition";

export class MapAnimationLoader {
    constructor(
        private scene: Phaser.Scene,
        private definition: WorldMapDefinition
    ) {}

    public load(
        map: Phaser.Tilemaps.Tilemap
    ): Phaser.GameObjects.Sprite[] {
        const sprites: Phaser.GameObjects.Sprite[] = [];

        this.definition.animations?.forEach(
            (animationDefinition) => {
                const layer = map.getObjectLayer(
                    animationDefinition.layer
                );

                if (!layer) {
                    console.warn(
                        `Map animation layer not found: ${animationDefinition.layer}`
                    );

                    return;
                }

                layer.objects.forEach((object) => {
                    if (
                        object.x == null ||
                        object.y == null ||
                        object.width == null ||
                        object.height == null
                    ) {
                        return;
                    }

                    const sprite =
                        this.scene.add.sprite(
                            object.x * WORLD_CONFIG.scale,
                            object.y * WORLD_CONFIG.scale,
                            animationDefinition.animationKey
                        );

                    sprite.setScale(
                        WORLD_CONFIG.scale
                    );

                    sprite.setOrigin(0, 1);
                    sprite.setDepth(
                        (object.y + object.height) * WORLD_CONFIG.scale
                    );
                    sprite.play({
                        key: animationDefinition.animationKey,
                        repeat: -1,
                    });

                    sprites.push(sprite);
                });
            }
        );

        return sprites;
    }
}