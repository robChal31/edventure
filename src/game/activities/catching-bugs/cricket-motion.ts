export type Point = { x: number; y: number };
export type CricketField = Point & { width: number; height: number };
export type CricketMotion = Point & {
    vx: number;
    vy: number;
    turnIn: number;
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

function changeHeading(motion: CricketMotion, random: () => number): void {
    const angle = random() * Math.PI * 2;
    motion.vx = Math.cos(angle) * CRICKET_SPEED;
    motion.vy = Math.sin(angle) * CRICKET_SPEED;
    motion.turnIn = 0.7 + random();
}

/** Spread one batch over the field instead of stacking sprites at one spawn. */
export function spawnCrickets(
    field: CricketField,
    count: number,
    random: () => number = Math.random
): CricketMotion[] {
    if (!Number.isSafeInteger(count) || count < 0) {
        throw new RangeError("Cricket count must be a non-negative integer.");
    }
    if (count === 0) return [];

    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const width = field.width - CRICKET_RADIUS * 2;
    const height = field.height - CRICKET_RADIUS * 2;

    return Array.from({ length: count }, (_, index) => {
        const motion: CricketMotion = {
            x: field.x + CRICKET_RADIUS + ((index % columns) + 0.25 + random() * 0.5) * width / columns,
            y: field.y + CRICKET_RADIUS + (Math.floor(index / columns) + 0.25 + random() * 0.5) * height / rows,
            vx: 0,
            vy: 0,
            turnIn: 0,
            cooldown: 0,
        };
        changeHeading(motion, random);
        return motion;
    });
}

/** Keep the full sprite inside the field, including after a long/background frame. */
export function moveCricket(
    motion: CricketMotion,
    field: CricketField,
    delta: number,
    random: () => number = Math.random
): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const seconds = Math.min(delta, 100) / 1000;
    motion.cooldown = Math.max(0, motion.cooldown - seconds);
    motion.turnIn -= seconds;
    if (motion.turnIn <= 0) changeHeading(motion, random);

    const speed = motion.cooldown > 0 ? 2 : 1;
    motion.x += motion.vx * seconds * speed;
    motion.y += motion.vy * seconds * speed;

    const left = field.x + CRICKET_RADIUS;
    const right = field.x + field.width - CRICKET_RADIUS;
    const top = field.y + CRICKET_RADIUS;
    const bottom = field.y + field.height - CRICKET_RADIUS;

    if (motion.x <= left || motion.x >= right) {
        motion.vx = motion.x <= left ? Math.abs(motion.vx) : -Math.abs(motion.vx);
        motion.x = Math.max(left, Math.min(right, motion.x));
    }
    if (motion.y <= top || motion.y >= bottom) {
        motion.vy = motion.y <= top ? Math.abs(motion.vy) : -Math.abs(motion.vy);
        motion.y = Math.max(top, Math.min(bottom, motion.y));
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
