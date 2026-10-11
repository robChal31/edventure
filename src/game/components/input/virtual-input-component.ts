import { KeyboardComponent } from "./keyboard-component";
import type { VirtualDirection } from "@/game/game-options";

/**
 * A keyboard input component that also accepts movement from on-screen
 * touch controls. Real keyboard input still works; the two are OR'd
 * together so desktop and mobile both function.
 */
export class VirtualInputComponent extends KeyboardComponent {
    #virtualUp = false;
    #virtualDown = false;
    #virtualLeft = false;
    #virtualRight = false;

    override get isUpDown(): boolean {
        return super.isUpDown || this.#virtualUp;
    }

    override get isDownDown(): boolean {
        return super.isDownDown || this.#virtualDown;
    }

    override get isLeftDown(): boolean {
        return super.isLeftDown || this.#virtualLeft;
    }

    override get isRightDown(): boolean {
        return super.isRightDown || this.#virtualRight;
    }

    public setVirtualDirection(dir: VirtualDirection, pressed: boolean): void {
        switch (dir) {
            case "up":
                this.#virtualUp = pressed;
                break;
            case "down":
                this.#virtualDown = pressed;
                break;
            case "left":
                this.#virtualLeft = pressed;
                break;
            case "right":
                this.#virtualRight = pressed;
                break;
        }
    }
}
