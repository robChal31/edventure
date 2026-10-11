import { InputComponent } from "./input-component";
import Phaser from "phaser";

export class KeyboardComponent extends InputComponent {
    #cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    #attackKey: Phaser.Input.Keyboard.Key;
    #actionKey: Phaser.Input.Keyboard.Key;
    #spaceKey: Phaser.Input.Keyboard.Key;
    #enterKey: Phaser.Input.Keyboard.Key;
    #testWearAxeAnimationKey: Phaser.Input.Keyboard.Key;
    #testAxeActionAnimationKey: Phaser.Input.Keyboard.Key;
    constructor(keyboardPlugin: Phaser.Input.Keyboard.KeyboardPlugin) {
        super();
        this.#cursorKeys = keyboardPlugin.createCursorKeys();
        this.#attackKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.#actionKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.#spaceKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.#enterKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.#testWearAxeAnimationKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.T);
        this.#testAxeActionAnimationKey = keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.H);
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

    /** Action (X) or Space — used as the generic "interact / cast" key. */
    get isInteractKeyJustDown(): boolean {
        return (
            Phaser.Input.Keyboard.JustDown(this.#actionKey) ||
            Phaser.Input.Keyboard.JustDown(this.#spaceKey)
        );
    }

    get isEnterKeyJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#enterKey);
    }

    get isSelectKeyJustDown(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.shift);
    }

}