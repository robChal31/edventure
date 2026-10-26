export type Point = { x: number; y: number };
export type CricketField = Point & { width: number; height: number };
export type CricketMotion = Point & {
    vx: number;
    vy: number;
    cooldown: number;
};

type FieldObject = {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
};

export const CRICKET_RADIUS = 8;
export const CRICKET_SPEED = 24;
export const CATCH_RANGE = 28;

/** An explicit Tiled rectangle, not the entire map or a destination at the barn. */
export function readCricketField(objects: readonly FieldObject[], scale = 1): CricketField {
    const area = objects.find((object) => object.name === "cricket_field");
    if (
        !area ||
        !Number.isFinite(area.x) ||
        !Number.isFinite(area.y) ||
        !Number.isFinite(area.width) ||
        !Number.isFinite(area.height) ||
        !Number.isFinite(scale) ||
        scale <= 0 ||
        area.width! * scale <= CRICKET_RADIUS * 2 ||
        area.height! * scale <= CRICKET_RADIUS * 2
    ) {
        throw new Error("Catching Bugs needs a valid cricket_field rectangle inside the fence.");
    }
    return {
        x: area.x! * scale,
        y: area.y! * scale,
        width: area.width! * scale,
        height: area.height! * scale,
    };
}

export const CRICKET_SPACING = 36;
export const RELEASE_SECONDS = 1;

/** True scatter with rejection sampling. A deterministic fallback prevents a bad RNG hanging the game. */
export function spawnCrickets(
    field: CricketField,
    count: number,
    random: () => number = Math.random
): CricketMotion[] {
    if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("Cricket count must be a non-negative integer.");
    const result: CricketMotion[] = [];
    const left = field.x + CRICKET_RADIUS;
    const top = field.y + CRICKET_RADIUS;
    const width = field.width - CRICKET_RADIUS * 2;
    const height = field.height - CRICKET_RADIUS * 2;
    const free = (point: Point) => result.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= CRICKET_SPACING);
    for (let index = 0; index < count; index += 1) {
        let point: Point | undefined;
        for (let attempt = 0; attempt < 100; attempt += 1) {
            const candidate = { x: left + random() * width, y: top + random() * height };
            if (free(candidate)) { point = candidate; break; }
        }
        if (!point) {
            for (let y = top; y <= top + height && !point; y += CRICKET_SPACING) {
                for (let x = left; x <= left + width; x += CRICKET_SPACING) {
                    if (free({ x, y })) { point = { x, y }; break; }
                }
            }
        }
        if (!point) throw new RangeError("Not enough safe space for this cricket batch.");
        result.push({ ...point, vx: 0, vy: 0, cooldown: 0 });
    }
    return result;
}

/** Only a wrong answer starts movement; a practice cricket stops again instead of teleporting/respawning. */
export function releaseCricket(motion: CricketMotion, field: CricketField, player: Point): void {
    const angle = Math.atan2(motion.y - player.y, motion.x - player.x);
    const distance = CRICKET_SPEED * 1.8;
    for (const turn of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const x = Math.max(field.x + CRICKET_RADIUS, Math.min(field.x + field.width - CRICKET_RADIUS, motion.x + Math.cos(angle + turn) * distance));
        const y = Math.max(field.y + CRICKET_RADIUS, Math.min(field.y + field.height - CRICKET_RADIUS, motion.y + Math.sin(angle + turn) * distance));
        if (Math.hypot(x - motion.x, y - motion.y) < 8) continue;
        motion.vx = (x - motion.x) / RELEASE_SECONDS;
        motion.vy = (y - motion.y) / RELEASE_SECONDS;
        motion.cooldown = RELEASE_SECONDS;
        return;
    }
}

/** Idle sprites animate in place. Released sprites move continuously and stop within the authored bounds. */
export function moveCricket(motion: CricketMotion, field: CricketField, delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0 || motion.cooldown <= 0) return;
    const seconds = Math.min(delta / 1000, 0.1, motion.cooldown);
    motion.x = Math.max(field.x + CRICKET_RADIUS, Math.min(field.x + field.width - CRICKET_RADIUS, motion.x + motion.vx * seconds));
    motion.y = Math.max(field.y + CRICKET_RADIUS, Math.min(field.y + field.height - CRICKET_RADIUS, motion.y + motion.vy * seconds));
    motion.cooldown = Math.max(0, motion.cooldown - seconds);
    if (motion.cooldown < 0.000001) {
        motion.cooldown = 0;
        motion.vx = motion.vy = 0;
    }
}

/** A net only targets the nearest available cricket within reach of the player's feet. */
export function nearestCricket<T extends { motion: CricketMotion }>(
    player: Point,
    crickets: readonly T[],
    range = CATCH_RANGE
): T | null {
    let nearest: T | null = null;
    let distanceSquared = range * range;
    for (const cricket of crickets) {
        if (cricket.motion.cooldown > 0) continue;
        const dx = cricket.motion.x - player.x;
        const dy = cricket.motion.y - player.y;
        const distance = dx * dx + dy * dy;
        if (distance <= distanceSquared) {
            nearest = cricket;
            distanceSquared = distance;
        }
    }
    return nearest;
}
