import { InputComponent } from "./input-component";
import Phaser from "phaser";

export class KeyboardComponent extends InputComponent {
    #cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    #attackKey: Phaser.Input.Keyboard.Key;
    #actionKey: Phaser.Input.Keyboard.Key;
    #spaceKey: Phaser.Input.Keyboard.Key;
    #enterKey: Phaser.Input.Keyboard.Key;
    #fishingKey: Phaser.Input.Keyboard.Key;
    #testWearAxeAnimationKey: Phaser.Input.Keyboard.Key;
    #testAxeActionAnimationKey: Phaser.Input.Keyboard.Key;
    #fishingPressed = false;
    constructor(keyboardPlugin: Phaser.Input.Keyboard.KeyboardPlugin) {
        super();
        this.#cursorKeys = keyboardPlugin.createCursorKeys();
        this.#attackKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.#actionKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.#spaceKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.#enterKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.#fishingKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.#testWearAxeAnimationKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.T);
        this.#testAxeActionAnimationKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.H);

        // Latch fishing presses as they are processed: a quick tap whose
        // keydown and keyup land in the same frame (slow devices) would
        // otherwise be lost, because Key.onUp clears JustDown. The plugin
        // drops these listeners itself when the scene shuts down.
        const latchFishing = () => {
            this.#fishingPressed = true;
        };
        keyboardPlugin.on("keydown-F", latchFishing);
        keyboardPlugin.on("keydown-SPACE", latchFishing);
    }
    
    get isTestWearAxeAnimationDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#testWearAxeAnimationKey);
    }

    get isTestAxeActionAnimationDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#testAxeActionAnimationKey);
    }

    get isDownDown(): boolean {
        return this.#cursorKeys.down.isDown;
    }

    get isDownJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.down);
    }

    get isUpDown(): boolean {
        return this.#cursorKeys.up.isDown;
    }

    get isUpJustDown(): boolean{
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.up);
    }

    get isLeftDown(): boolean {
        return this.#cursorKeys.left.isDown;
    }

    get isRightDown(): boolean {
        return this.#cursorKeys.right.isDown;
    }

    get isAttackKeyJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#attackKey);
    }

    get isActionKeyJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#actionKey);
    }

    /** F (or Space) — cast the fishing line / reel it in. Read once per frame. */
    get isFishingKeyJustDown(): boolean {
        // Consume Phaser's own flags too so they never go stale.
        const fishing = Phaser.Input.Keyboard.JustDown(this.#fishingKey);
        const space = Phaser.Input.Keyboard.JustDown(this.#spaceKey);
        const pressed = this.#fishingPressed || fishing || space;
        this.#fishingPressed = false;
        return pressed;
    }

    get isEnterKeyJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#enterKey);
    }

    get isSelectKeyJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.shift);
    }

}