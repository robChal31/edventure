import Phaser from "phaser";

/**
 * Pixel helpers for textures: the opaque area of a frame and whether a
 * world point hits an opaque pixel of a game object.
 *
 * Note on Phaser frames: `frame.cutX/cutY` is where the frame sits in the
 * source image; `frame.x/y` is only the trim offset (0 when untrimmed).
 */

const ALPHA_THRESHOLD = 10;

// Cache per texture+frame so pixels are only scanned once.
const opaqueBoundsCache = new Map<string, Phaser.Geom.Rectangle | null>();

/**
 * Bounds of the non-transparent pixels of a frame, in frame space
 * (0..realWidth, 0..realHeight). Null when fully transparent.
 */
export function getOpaqueBounds(
    texture: Phaser.Textures.Texture,
    frame: Phaser.Textures.Frame
): Phaser.Geom.Rectangle | null {
    const cacheKey = `${texture.key}:${frame.name}`;

    if (opaqueBoundsCache.has(cacheKey)) {
        return opaqueBoundsCache.get(cacheKey)!;
    }

    const result = scanOpaqueBounds(texture, frame);
    opaqueBoundsCache.set(cacheKey, result);
    return result;
}

function scanOpaqueBounds(
    texture: Phaser.Textures.Texture,
    frame: Phaser.Textures.Frame
): Phaser.Geom.Rectangle | null {
    const source = texture.getSourceImage() as
        | HTMLImageElement
        | HTMLCanvasElement
        | HTMLVideoElement;

    const cutX = frame.cutX;
    const cutY = frame.cutY;
    const cutW = frame.cutWidth;
    const cutH = frame.cutHeight;

    if (cutW <= 0 || cutH <= 0 || typeof document === "undefined") {
        return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = cutW;
    canvas.height = cutH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
        return null;
    }

    ctx.drawImage(source as CanvasImageSource, cutX, cutY, cutW, cutH, 0, 0, cutW, cutH);

    const data = ctx.getImageData(0, 0, cutW, cutH).data;

    let minX = cutW;
    let minY = cutH;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < cutH; y++) {
        for (let x = 0; x < cutW; x++) {
            const alpha = data[(y * cutW + x) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return null;
    }

    // Back to untrimmed frame space.
    return new Phaser.Geom.Rectangle(
        minX + frame.x,
        minY + frame.y,
        maxX - minX + 1,
        maxY - minY + 1
    );
}

type TexturedObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

/**
 * Opaque bounds of a game object's current frame in world space
 * (assumes no rotation — true for every map object).
 */
export function getWorldOpaqueBounds(object: TexturedObject): Phaser.Geom.Rectangle | null {
    const local = getOpaqueBounds(object.texture, object.frame);
    if (!local) return null;

    const scaleX = Math.abs(object.scaleX);
    const scaleY = Math.abs(object.scaleY);
    const left = object.x - object.displayOriginX * scaleX;
    const top = object.y - object.displayOriginY * scaleY;
    const frameW = object.frame.realWidth;
    const frameH = object.frame.realHeight;

    const x = object.flipX ? frameW - local.right : local.x;
    const y = object.flipY ? frameH - local.bottom : local.y;

    return new Phaser.Geom.Rectangle(
        left + x * scaleX,
        top + y * scaleY,
        local.width * scaleX,
        local.height * scaleY
    );
}

/** True when the world point lands on a visible pixel of the object. */
export function isOpaqueAt(object: TexturedObject, worldX: number, worldY: number): boolean {
    if (!object.visible || object.alpha <= 0) return false;

    const scaleX = Math.abs(object.scaleX);
    const scaleY = Math.abs(object.scaleY);
    if (scaleX === 0 || scaleY === 0) return false;

    const left = object.x - object.displayOriginX * scaleX;
    const top = object.y - object.displayOriginY * scaleY;
    let localX = Math.floor((worldX - left) / scaleX);
    let localY = Math.floor((worldY - top) / scaleY);

    const frameW = object.frame.realWidth;
    const frameH = object.frame.realHeight;
    if (localX < 0 || localY < 0 || localX >= frameW || localY >= frameH) {
        return false;
    }

    if (object.flipX) localX = frameW - 1 - localX;
    if (object.flipY) localY = frameH - 1 - localY;

    const alpha = object.scene.textures.getPixelAlpha(
        localX,
        localY,
        object.texture.key,
        object.frame.name
    );

    return (alpha ?? 0) > ALPHA_THRESHOLD;
}
