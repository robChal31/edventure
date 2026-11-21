import type { Point, TargetBounds } from "./targeting";

export const TARGET_CORNER_SIZE = 8;

/** Native 26px marker → 30px pulse, or wider bounds for a real object footprint. */
export function targetCornerPositions(bounds: TargetBounds, expansion = 0): Point[] {
    const width = Math.max(26, bounds.width + 6) + expansion * 2;
    const height = Math.max(26, bounds.height + 6) + expansion * 2;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const left = x - width / 2;
    const right = x + width / 2 - TARGET_CORNER_SIZE;
    const top = y - height / 2;
    const bottom = y + height / 2 - TARGET_CORNER_SIZE;
    return [[left, top], [right, top], [left, bottom], [right, bottom]]
        .map(([x, y]) => ({ x: Math.round(x), y: Math.round(y) }));
}
