import { GameScene } from "./scenes/game-scene";
import { PreloadScene } from "./scenes/preload-scene";
import Phaser from "phaser";

export function createGame(parent: HTMLElement) {

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return new Phaser.Game({
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
                debug: true
            }
        },
        backgroundColor: "#1a1a2e",
        scene: [PreloadScene, GameScene],
    });
}