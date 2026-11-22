import type Phaser from "phaser";
import { ASSET_KEYS } from "@/game/common/assets";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { WORLD_CONFIG } from "@/game/config/world-config";
import { SERENADE_NOTES_ANIMATION } from "./serenade-assets";

type NoteSource = { source: Phaser.GameObjects.Sprite; notes: Phaser.GameObjects.Sprite; kind: "player" | "frog" };

/** One reusable original FX sprite per musician; no growing particle/timer queues. */
export class SerenadeNotes {
    #sources = new Map<string, NoteSource>();
    constructor(private scene: Phaser.Scene, private reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {}

    follow(id: string, source: Phaser.GameObjects.Sprite, kind: NoteSource["kind"], phase = 0): void {
        if (this.#sources.has(id)) return;
        const notes = this.scene.add.sprite(source.x, source.y, ASSET_KEYS.FLUTE_NOTES, 0)
            .setName(`serenade-notes-${id}`).setDepth(DEPTH_CONFIG.AIRBORNE)
            .setScale(WORLD_CONFIG.scale * (kind === "player" ? 1 : 0.8))
            .setTint(kind === "player" ? 0xffe6a3 : 0xb7ffd9).setTintMode(1 /* Phaser.TintModes.FILL */)
            .setData({ musician: id, reducedMotion: this.reducedMotion });
        if (!this.reducedMotion) notes.play({ key: SERENADE_NOTES_ANIMATION, repeat: -1, startFrame: phase % 4 });
        this.#sources.set(id, { source, notes, kind });
        this.#position(this.#sources.get(id)!);
    }
    stop(id: string): void {
        this.#sources.get(id)?.notes.destroy();
        this.#sources.delete(id);
    }
    update(): void {
        this.#sources.forEach((entry, id) => {
            if (!entry.source.active) { this.stop(id); return; }
            this.#position(entry);
            if (entry.notes.visible) entry.notes.anims.resume();
            else entry.notes.anims.pause();
        });
    }
    #position({ source, notes, kind }: NoteSource): void {
        notes.setPosition(Math.round(source.x + (kind === "frog" ? 3 : 0) * WORLD_CONFIG.scale), Math.round(source.y - (kind === "player" ? 10 : 16) * WORLD_CONFIG.scale))
            .setVisible(source.visible && this.scene.cameras.main.worldView.contains(source.x, source.y));
    }
    clear(): void { this.#sources.forEach(({ notes }) => notes.destroy()); this.#sources.clear(); }
}
