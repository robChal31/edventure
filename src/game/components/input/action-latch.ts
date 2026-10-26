/** One intent per press, shared by keyboard aliases. Disabled/old presses never queue. */
export class ActionLatch {
    #pending = false;
    #enabled = true;

    press(repeat = false): void {
        if (this.#enabled && !repeat) this.#pending = true;
    }

    consume(): boolean {
        const pressed = this.#enabled && this.#pending;
        this.#pending = false;
        return pressed;
    }

    reset(): void {
        this.#pending = false;
    }

    setEnabled(enabled: boolean): void {
        this.#enabled = enabled;
        this.reset();
    }
}
