import { GameScene } from "./scenes/game-scene";
import { PreloadScene } from "./scenes/preload-scene";
import type { ActivityController, GameOptions } from "./game-options";
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
        scene: [new PreloadScene(), gameScene],
    });

    return {
        game,
        controller: gameScene.controller,
        destroy: () => game.destroy(true),
    };
}
