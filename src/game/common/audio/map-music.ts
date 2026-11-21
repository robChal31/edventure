import Phaser from "phaser";

export type MapSoundtrack = {
    /** A unique Phaser audio cache key. */
    key: string;
    /** Local paths, e.g. /assets/music/village.ogg + an mp3 fallback. */
    urls: string[];
    volume?: number;
};
export type MusicState = { available: boolean; enabled: boolean; playing: boolean };
const MUSIC_PREFERENCE = "learning-world.music-enabled.v1";
function preferred(): boolean {
    try { return localStorage.getItem(MUSIC_PREFERENCE) !== "off"; } catch { return true; }
}

/** Optional map music only; existing fishing/chopping SFX are deliberately unchanged. */
export class MapMusic {
    #sound?: Phaser.Sound.BaseSound;
    #enabled = preferred();
    #track: MapSoundtrack | null;
    #onUnlock = () => this.#play();
    constructor(private scene: Phaser.Scene, track: MapSoundtrack | null | undefined, private emit: (state: MusicState) => void) {
        this.#track = track && scene.cache.audio.exists(track.key) ? track : null;
        scene.sound.on(Phaser.Sound.Events.UNLOCKED, this.#onUnlock);
        this.#play();
    }
    setEnabled(enabled: boolean): void {
        this.#enabled = enabled;
        try { localStorage.setItem(MUSIC_PREFERENCE, enabled ? "on" : "off"); } catch { /* Session preference still works. */ }
        if (!enabled) this.#sound?.pause();
        this.#play();
    }
    #play(): void {
        if (this.#track && this.#enabled && !this.scene.sound.locked) {
            if (!this.#sound) this.#sound = this.scene.sound.add(this.#track.key, { loop: true, volume: Phaser.Math.Clamp(this.#track.volume ?? 0.25, 0, 1) });
            if (this.#sound.isPaused) this.#sound.resume();
            else if (!this.#sound.isPlaying) this.#sound.play();
        }
        this.emit({ available: Boolean(this.#track), enabled: this.#enabled, playing: this.#sound?.isPlaying ?? false });
    }
    destroy(): void {
        this.scene.sound.off(Phaser.Sound.Events.UNLOCKED, this.#onUnlock);
        this.#sound?.stop(); this.#sound?.destroy(); this.#sound = undefined;
    }
}
