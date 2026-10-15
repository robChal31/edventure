import Phaser from "phaser";
import type { WaterSurface } from "@/game/world/water/water-surface";
import { FISH_PALETTES } from "../assets/fishing-textures";
import { FISHING_CONFIG } from "../fishing-config";
import { Fish, fishFootprint } from "./fish";

/**
 * A handful of faint fish shadows that wander the open water so the sea
 * feels alive. Every spawn point and every swim path is checked against
 * the WaterSurface, so they never cross sand, piers or the boat.
 */
export class AmbientFishSchool {
    #fish: Fish[] = [];
    #timers: Phaser.Time.TimerEvent[] = [];
    #destroyed = false;
    #footprint = fishFootprint();

    constructor(
        private scene: Phaser.Scene,
        private surface: WaterSurface,
        count: number = FISHING_CONFIG.ambient.count
    ) {
        for (let i = 0; i < count; i++) {
            const start = surface.randomFishPoint(this.#footprint);
            if (!start) break;

            const fish = new Fish(scene, start.x, start.y, i % FISH_PALETTES.length);
            fish.setAlpha(FISHING_CONFIG.ambient.alpha);
            fish.setFlipX(Math.random() < 0.5);
            fish.playSwim();

            this.#fish.push(fish);
            this.#rest(fish, Phaser.Math.Between(0, 1200));
        }
    }

    #wander(fish: Fish): void {
        if (this.#destroyed || !fish.active) return;

        const { wanderDistance, swimSpeed } = FISHING_CONFIG.ambient;
        const target = this.surface.randomReachablePoint(
            { x: fish.x, y: fish.y },
            this.#footprint,
            wanderDistance.min,
            wanderDistance.max
        );

        if (!target) {
            this.#rest(fish);
            return;
        }

        fish.swimTo(target, swimSpeed, () => this.#rest(fish));
    }

    #rest(fish: Fish, delay?: number): void {
        if (this.#destroyed) return;

        const { restMs } = FISHING_CONFIG.ambient;
        const timer = this.scene.time.delayedCall(
            delay ?? Phaser.Math.Between(restMs.min, restMs.max),
            () => {
                this.#timers = this.#timers.filter((t) => t !== timer);
                this.#wander(fish);
            }
        );
        this.#timers.push(timer);
    }

    public destroy(): void {
        this.#destroyed = true;
        this.#timers.forEach((timer) => timer.remove(false));
        this.#timers = [];
        this.#fish.forEach((fish) => fish.destroy());
        this.#fish = [];
    }
}
