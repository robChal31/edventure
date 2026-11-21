import type { QuestionImage } from "./types";
export const MAX_QUESTION_IMAGE_BYTES = 250 * 1024;
export const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil(MAX_QUESTION_IMAGE_BYTES * 4 / 3) + 64;
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Stored images are inert raster data, never SVG, HTML, arbitrary URLs or third-party trackers. */
export function sanitizeQuestionImage(raw: unknown): QuestionImage | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const value = raw as Record<string, unknown>;
    if (typeof value.src !== "string" || value.src.length > MAX_IMAGE_DATA_URL_LENGTH ||
        !/^data:image\/(png|jpeg|webp);base64,[a-z\d+/]+={0,2}$/i.test(value.src)) return undefined;
    const [header, data] = value.src.split(",");
    if (data.length % 4 !== 0) return undefined;
    try {
        const bytes = atob(data.slice(0, 32));
        if (header.includes("png") ? !bytes.startsWith("\x89PNG\r\n\x1a\n") :
            header.includes("jpeg") ? !bytes.startsWith("\xff\xd8\xff") :
                !(bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP")) return undefined;
    } catch { return undefined; }
    const width = value.width; const height = value.height;
    if (typeof width !== "number" || typeof height !== "number" || !Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || width > 1600 || height > 1600) return undefined;
    return { src: value.src, alt: typeof value.alt === "string" ? value.alt.slice(0, 500) : "", width, height };
}

/** Resize locally before storing, keeping the prototype's localStorage footprint bounded. */
export async function prepareQuestionImage(file: File): Promise<QuestionImage> {
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) throw new Error("Choose a PNG, JPG or WebP image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("The original image must be smaller than 5 MB.");
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error("This image could not be opened.");
        let size = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.naturalWidth * size));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * size));
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Image editing is not supported in this browser.");
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const src = canvas.toDataURL("image/webp", 0.82 - attempt * 0.08);
            if (src.length <= MAX_IMAGE_DATA_URL_LENGTH) return { src, alt: "", width: canvas.width, height: canvas.height };
            size *= 0.75;
        }
        throw new Error("Please choose a smaller or simpler image.");
    } catch (error) {
        if (error instanceof Error && error.message.includes("image")) throw error;
        throw new Error("This image could not be opened.");
    } finally { URL.revokeObjectURL(objectUrl); }
}
