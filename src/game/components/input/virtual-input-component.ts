import { KeyboardComponent } from "./keyboard-component";
import type { VirtualDirection } from "@/game/game-options";

/** Touch movement and keyboard use the same enabled/reset lifecycle. */
export class VirtualInputComponent extends KeyboardComponent {
    #directions = new Set<VirtualDirection>();

    override get isUpDown(): boolean { return this.isEnabled && (super.isUpDown || this.#directions.has("up")); }
    override get isDownDown(): boolean { return this.isEnabled && (super.isDownDown || this.#directions.has("down")); }
    override get isLeftDown(): boolean { return this.isEnabled && (super.isLeftDown || this.#directions.has("left")); }
    override get isRightDown(): boolean { return this.isEnabled && (super.isRightDown || this.#directions.has("right")); }

    setVirtualDirection(direction: VirtualDirection, pressed: boolean): void {
        if (pressed && this.isEnabled) this.#directions.add(direction);
        else this.#directions.delete(direction);
    }

    override reset(): void {
        super.reset();
        this.#directions?.clear();
    }
}
