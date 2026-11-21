import { ActionLatch } from "./action-latch";

/** Movement plus one primary action. Equipment is resolved outside the input layer. */
export class InputComponent {
    #up = false;
    #down = false;
    #left = false;
    #right = false;
    #enabled = true;
    #primary = new ActionLatch();

    get isEnabled(): boolean { return this.#enabled; }
    get isUpDown(): boolean { return this.#enabled && this.#up; }
    set isUpDown(value: boolean) { this.#up = value; }
    get isDownDown(): boolean { return this.#enabled && this.#down; }
    set isDownDown(value: boolean) { this.#down = value; }
    get isLeftDown(): boolean { return this.#enabled && this.#left; }
    set isLeftDown(value: boolean) { this.#left = value; }
    get isRightDown(): boolean { return this.#enabled && this.#right; }
    set isRightDown(value: boolean) { this.#right = value; }
    get isPrimaryActionJustDown(): boolean { return this.#primary.consume(); }

    pressPrimaryAction(repeat = false): void { this.#primary.press(repeat); }

    setEnabled(enabled: boolean): void {
        this.#enabled = enabled;
        this.#primary.setEnabled(enabled);
        this.reset();
    }

    reset(): void {
        this.#up = this.#down = this.#left = this.#right = false;
        this.#primary.reset();
    }
}
