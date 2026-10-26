import type Phaser from "phaser";
import type { Player } from "../game-objects/player/player";
import type { Interactable } from "../common/types/interaction";
import { ASSET_KEYS } from "../common/assets";
import { WORLD_CONFIG } from "../config/world-config";
import { InteractionTargetSelector } from "../common/system/interaction/interaction-target-selector";
import type { PreparedAction } from "../equipment/targeting";

/** A prepared axe action uses the SAME object/footprint that its marker displays. */
export class InteractionSystem {
    #selector: InteractionTargetSelector;

    constructor(private scene: Phaser.Scene, private player: Player, objects: readonly Interactable[]) {
        this.#selector = new InteractionTargetSelector(objects);
    }

    prepareAxeAction(): PreparedAction {
        const selected = this.#selector.findTarget(this.player, this.player.facing, WORLD_CONFIG.tileSize * WORLD_CONFIG.scale);
        const candidate = selected ?? this.#selector.findTarget(this.player, this.player.facing, WORLD_CONFIG.tileSize * WORLD_CONFIG.scale * 2);
        return {
            target: candidate ? { kind: "object", status: selected ? "valid" : "candidate", bounds: candidate.bounds } : null,
            execute: () => this.player.swingAxe(() => {
                if (!selected || selected.object.canInteract?.("axe") === false) {
                    this.scene.sound.play(ASSET_KEYS.AXE_SWING);
                    return;
                }
                selected.object.interact({ player: this.player, action: { type: "axe", onMiss: () => {} } });
            }),
        };
    }
}
