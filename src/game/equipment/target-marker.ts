import Phaser from "phaser";
import { ASSET_KEYS } from "@/game/common/assets";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import type { ActionTarget } from "./targeting";
import { TARGET_CORNER_SIZE, targetCornerPositions } from "./target-marker-layout";

// Original 8px corners inside the padded 48px frames of UI/Extras.png.
const CORNERS = {
    candidate: [[187, 11], [205, 11], [187, 29], [205, 29]],
    valid: [[283, 11], [301, 11], [283, 29], [301, 29]],
    invalid: [[187, 59], [205, 59], [187, 77], [205, 77]],
} as const;

/** Reposition four native corners instead of stretching pixel-art strokes to fit a target. */
export class TargetMarker {
    #container: Phaser.GameObjects.Container;
    #corners: Phaser.GameObjects.Image[];
    #target: ActionTarget | null = null;
    #pulseRemaining = 0;

    constructor(scene: Phaser.Scene) {
        const texture = scene.textures.get(ASSET_KEYS.UI_TARGET_MARKERS);
        for (const [state, corners] of Object.entries(CORNERS)) {
            corners.forEach(([x, y], index) => {
                const name = `${state}-${index}`;
                if (!texture.has(name)) texture.add(name, 0, x, y, TARGET_CORNER_SIZE, TARGET_CORNER_SIZE);
            });
        }
        this.#corners = [0, 1, 2, 3].map((index) => scene.add.image(0, 0, ASSET_KEYS.UI_TARGET_MARKERS, `valid-${index}`).setOrigin(0));
        this.#container = scene.add.container(0, 0, this.#corners)
            .setName("target-marker").setDepth(DEPTH_CONFIG.WORLD_UI - 1).setVisible(false);
    }

    show(target: ActionTarget | null): void {
        if (!target && this.#pulseRemaining > 0) return;
        this.#target = target;
        this.#container.setVisible(Boolean(target));
        if (!target) return;
        this.#container.setData({ targetId: target.id, kind: target.kind, status: target.status });
        this.#corners.forEach((corner, index) => corner.setFrame(`${target.status}-${index}`));
        this.#position();
    }

    pulse(): void { this.#pulseRemaining = 240; }

    update(delta: number): void {
        if (this.#pulseRemaining <= 0) return;
        this.#pulseRemaining = Math.max(0, this.#pulseRemaining - delta);
        this.#position();
    }

    hide(): void {
        this.#pulseRemaining = 0;
        this.#target = null;
        this.#container.setVisible(false);
    }

    destroy(): void { this.#container.destroy(); }

    #position(): void {
        if (!this.#target) return;
        const b = this.#target.bounds;
        const pulse = this.#pulseRemaining > 0 ? Math.sin(this.#pulseRemaining / 240 * Math.PI) * 2 : 0;
        targetCornerPositions(b, pulse).forEach(({ x, y }, index) => this.#corners[index].setPosition(x, y));
    }
}
