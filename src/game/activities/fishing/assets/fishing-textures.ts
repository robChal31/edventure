import Phaser from "phaser";

/**
 * Procedurally generates the pixel-art textures the fishing activity
 * needs (fish, splash, bubble, dust, sparkle, bite indicator). The rod,
 * line and float come from the player's fishing animation sheet.
 */

export const FISHING_TEXTURE_KEYS = {
    FISH: (variant: number, frame: number) =>
        `lw_fish_${variant}_${frame}`,
    FISH_SWIM: (variant: number) => `lw_fish_swim_${variant}`,
    SPLASH: "lw_splash",
    BUBBLE: "lw_bubble",
    DUST: "lw_dust",
    SPARKLE: "lw_sparkle",
    EXCLAIM: "lw_exclaim",
} as const;

export type FishPalette = {
    body: string;
    belly: string;
    dark: string;
    fin: string;
};

export const FISH_PALETTES: FishPalette[] = [
    { body: "#f97316", belly: "#fed7aa", dark: "#c2410c", fin: "#ea580c" },
    { body: "#14b8a6", belly: "#ccfbf1", dark: "#0f766e", fin: "#0d9488" },
    { body: "#f43f5e", belly: "#ffe4e6", dark: "#be123c", fin: "#e11d48" },
    { body: "#eab308", belly: "#fef9c3", dark: "#a16207", fin: "#ca8a04" },
];

const FISH_W = 16;
const FISH_H = 10;

function paintFish(
    ctx: CanvasRenderingContext2D,
    palette: FishPalette,
    tailPhase: number
): void {
    ctx.clearRect(0, 0, FISH_W, FISH_H);

    const cx = 6; // body center x (head is left)
    const cy = 4;
    const rx = 6;
    const ry = 3;

    // Body (ellipse, integer pixels).
    for (let x = 0; x < FISH_W; x++) {
        const t = (x - cx) / rx;
        if (t <= -1 || t >= 1) continue;
        const half = Math.max(1, Math.round(ry * Math.sqrt(1 - t * t)));
        for (let y = cy - half; y <= cy + half; y++) {
            if (y < 0 || y >= FISH_H) continue;
            let color = palette.body;
            if (y <= cy - half + (half > 1 ? 0 : 0) && y < cy - 1) {
                color = palette.dark;
            } else if (y > cy + 1) {
                color = palette.belly;
            }
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    // Tail (triangle on the right), animated by tailPhase (0/1).
    const tailSwing = tailPhase === 0 ? 0 : 1;
    for (let i = 0; i < 4; i++) {
        const x = 11 + i;
        const spread = i + 1;
        for (let y = cy - spread + tailSwing; y <= cy + spread - 1 + tailSwing; y++) {
            if (y < 0 || y >= FISH_H || x >= FISH_W) continue;
            ctx.fillStyle = palette.fin;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    // Dorsal fin.
    ctx.fillStyle = palette.fin;
    ctx.fillRect(5, 0, 3, 1);

    // Eye + glint (head at left).
    ctx.fillStyle = "#111827";
    ctx.fillRect(2, 3, 1, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(2, 3, 1, 1);
}

function paintSplash(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 4, 4);
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(1, 1, 2, 2);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(0, 1, 1, 2);
    ctx.fillRect(3, 1, 1, 2);
}

function paintBubble(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 5, 5);
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(1, 0, 3, 1);
    ctx.fillRect(1, 4, 3, 1);
    ctx.fillRect(0, 1, 1, 3);
    ctx.fillRect(4, 1, 1, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(1, 1, 1, 1);
}

function paintDust(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 3, 3);
    ctx.fillStyle = "#f5deb3";
    ctx.fillRect(0, 1, 3, 1);
    ctx.fillRect(1, 0, 1, 3);
}

function paintSparkle(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 5, 5);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(2, 0, 1, 5);
    ctx.fillRect(0, 2, 5, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(2, 2, 1, 1);
}

function paintExclaim(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 6, 10);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(2, 0, 2, 6);
    ctx.fillRect(2, 8, 2, 2);
    ctx.fillStyle = "#a16207";
    ctx.fillRect(1, 0, 1, 6);
    ctx.fillRect(1, 8, 1, 2);
}

export function createFishingTextures(scene: Phaser.Scene): void {
    const make = (
        key: string,
        w: number,
        h: number,
        painter: (ctx: CanvasRenderingContext2D) => void
    ): void => {
        if (scene.textures.exists(key)) {
            return;
        }
        const canvasTexture = scene.textures.createCanvas(key, w, h);
        if (!canvasTexture) {
            return;
        }
        const ctx = canvasTexture.context;
        painter(ctx);
        canvasTexture.refresh();
    };

    FISH_PALETTES.forEach((palette, variant) => {
        make(
            FISHING_TEXTURE_KEYS.FISH(variant, 0),
            FISH_W,
            FISH_H,
            (ctx) => paintFish(ctx, palette, 0)
        );
        make(
            FISHING_TEXTURE_KEYS.FISH(variant, 1),
            FISH_W,
            FISH_H,
            (ctx) => paintFish(ctx, palette, 1)
        );
    });

    make(FISHING_TEXTURE_KEYS.SPLASH, 4, 4, paintSplash);
    make(FISHING_TEXTURE_KEYS.BUBBLE, 5, 5, paintBubble);
    make(FISHING_TEXTURE_KEYS.DUST, 3, 3, paintDust);
    make(FISHING_TEXTURE_KEYS.SPARKLE, 5, 5, paintSparkle);
    make(FISHING_TEXTURE_KEYS.EXCLAIM, 6, 10, paintExclaim);

    // Swim animations (two-frame tail wiggle).
    FISH_PALETTES.forEach((_, variant) => {
        const key = FISHING_TEXTURE_KEYS.FISH_SWIM(variant);
        if (!scene.anims.exists(key)) {
            scene.anims.create({
                key,
                frames: [
                    { key: FISHING_TEXTURE_KEYS.FISH(variant, 0) },
                    { key: FISHING_TEXTURE_KEYS.FISH(variant, 1) },
                ],
                frameRate: 8,
                repeat: -1,
            });
        }
    });
}
