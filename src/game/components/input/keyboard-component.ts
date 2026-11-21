import { InputComponent } from "./input-component";
import Phaser from "phaser";

/** F and Space are aliases of ONE intent: use whatever equipment is active. */
export class KeyboardComponent extends InputComponent {
    #cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    #actionKeys: Phaser.Input.Keyboard.Key[];
    #onAction = (event?: KeyboardEvent) => this.pressPrimaryAction(event?.repeat ?? false);

    constructor(private keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
        super();
        this.#cursorKeys = keyboard.createCursorKeys();
        this.#actionKeys = [
            keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
            keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        ];
        // A down+up in the same slow frame must still produce one action.
        keyboard.on("keydown-F", this.#onAction);
        keyboard.on("keydown-SPACE", this.#onAction);
    }

    override get isDownDown(): boolean { return this.isEnabled && this.#cursorKeys.down.isDown; }
    override get isUpDown(): boolean { return this.isEnabled && this.#cursorKeys.up.isDown; }
    override get isLeftDown(): boolean { return this.isEnabled && this.#cursorKeys.left.isDown; }
    override get isRightDown(): boolean { return this.isEnabled && this.#cursorKeys.right.isDown; }

    override reset(): void {
        super.reset();
        if (this.#cursorKeys) Object.values(this.#cursorKeys).forEach((key) => key.reset());
        this.#actionKeys?.forEach((key) => key.reset());
    }

    destroy(): void {
        this.reset();
        this.keyboard.off("keydown-F", this.#onAction);
        this.keyboard.off("keydown-SPACE", this.#onAction);
    }
}
