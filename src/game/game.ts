import { GameScene } from "./scenes/game-scene";
import { PreloadScene } from "./scenes/preload-scene";
import type { ActivityController, GameOptions } from "./game-options";
import { DEBUG_CONFIG } from "./config/debug-config";
import Phaser from "phaser";

export type GameHandle = {
    game: Phaser.Game;
    controller: ActivityController;
    destroy: () => void;
};

export function createGame(
    parent: HTMLElement,
    options?: GameOptions
): GameHandle {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const gameScene = new GameScene(options);

    const game = new Phaser.Game({
        type: Phaser.WEBGL,
        pixelArt: true,
        roundPixels: true,
        scale: {
            parent: parent,
            width: width,
            height: height,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            mode: Phaser.Scale.RESIZE,
        },
        physics: {
            default: "arcade",
            arcade: {
                gravity: { y: 0, x: 0 },
                debug: false,
            },
        },
        backgroundColor: "#1a1a2e",
        // Asset paths (assets/data/assets.json and its pack entries) are
        // relative; resolve them from the site root so the game also loads
        // on nested routes like /student/play and /teacher/preview/[id].
        loader: {
            baseURL: "/",
        },
        scene: [new PreloadScene(), gameScene],
    });

    if (DEBUG_CONFIG.enabled) {
        // Inspect the running game from DevTools (only with ?debug).
        (window as unknown as { __LEARNING_WORLD__?: unknown }).__LEARNING_WORLD__ = { game };
    }

    return {
        game,
        controller: gameScene.controller,
        destroy: () => game.destroy(true),
    };
}
