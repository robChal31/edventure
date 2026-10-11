import Phaser from "phaser";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { CELL_BRIDGE, CELL_WATER } from "./water-grid";
import type { SurfaceHit, WaterSurface } from "./water-surface";

/**
 * Debug view of the water mask (enable with `?debug` in the URL):
 *  - blue:   open water (fish may swim here)
 *  - cyan:   water too close to land / bridges / objects for fish
 *  - orange: water covered by an object (boat, rocks...)
 *  - red:    bridge cells (never fishable)
 * Every cast landing point is marked: green = water, red = miss.
 */
export class WaterDebugOverlay {
    #graphics: Phaser.GameObjects.Graphics;

    constructor(
        private scene: Phaser.Scene,
        surface: WaterSurface
    ) {
        this.#graphics = scene.add.graphics();
        this.#graphics.setDepth(DEPTH_CONFIG.DEBUG);
        this.#draw(surface);
    }

    #draw(surface: WaterSurface): void {
        const { grid } = surface;
        const g = this.#graphics;

        grid.forEachCell(({ col, row, kind, open, blocked }) => {
            const x = col * grid.cellWidth;
            const y = row * grid.cellHeight;

            if (kind === CELL_BRIDGE) {
                g.lineStyle(1, 0xef4444, 0.8);
                g.strokeRect(x + 1, y + 1, grid.cellWidth - 2, grid.cellHeight - 2);
                return;
            }

            if (kind !== CELL_WATER) return;

            if (blocked) {
                g.fillStyle(0xf97316, 0.35);
            } else if (open) {
                g.fillStyle(0x2563eb, 0.28);
            } else {
                g.fillStyle(0x22d3ee, 0.22);
            }
            g.fillRect(x, y, grid.cellWidth, grid.cellHeight);
        });
    }

    public markProbe(x: number, y: number, hit: SurfaceHit): void {
        const color = hit.kind === "water" ? 0x22c55e : 0xef4444;
        const marker = this.scene.add.graphics();
        marker.setDepth(DEPTH_CONFIG.DEBUG);
        marker.lineStyle(2, color, 1);
        marker.strokeCircle(x, y, 4);
        marker.lineBetween(x - 6, y, x + 6, y);
        marker.lineBetween(x, y - 6, x, y + 6);

        const label = this.scene.add.text(
            x + 6,
            y - 12,
            hit.kind === "obstacle" ? `obstacle:${hit.name}` : hit.kind,
            { fontFamily: "monospace", fontSize: "8px", color: "#ffffff", backgroundColor: "#000000aa" }
        );
        label.setDepth(DEPTH_CONFIG.DEBUG);

        this.scene.time.delayedCall(4000, () => {
            marker.destroy();
            label.destroy();
        });
    }

    public destroy(): void {
        this.#graphics.destroy();
    }
}
