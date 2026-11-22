export type FrogPoint = { x: number; y: number };

const distance = (a: FrogPoint, b: FrogPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const key = (point: FrogPoint, tileSize: number) => `${Math.floor(point.x / tileSize)},${Math.floor(point.y / tileSize)}`;

/** Only connected, walkable cells from the real map; no spawns inside cliffs or solid props. */
export class FrogGround {
    readonly points: readonly FrogPoint[];
    #cells: Map<string, FrogPoint>;

    constructor(points: readonly FrogPoint[], readonly tileSize: number, origin: FrogPoint) {
        const cells = new Map(points.map((point) => [key(point, tileSize), point]));
        const start = nearest(points, origin);
        const connected = new Map<string, FrogPoint>();
        if (start) {
            const queue = [start]; connected.set(key(start, tileSize), start);
            for (let i = 0; i < queue.length; i += 1) {
                for (const next of neighbors(queue[i], tileSize)) {
                    const id = key(next, tileSize), point = cells.get(id);
                    if (point && !connected.has(id)) { connected.set(id, point); queue.push(point); }
                }
            }
        }
        this.#cells = connected;
        this.points = [...connected.values()];
    }

    /** A stable, well-spaced prefix: one home per question, not one new spawn per success. */
    scatter(count: number, origin: FrogPoint): FrogPoint[] {
        if (!this.points.length) return [];
        const away = this.points.filter((point) => distance(point, origin) >= this.tileSize * 3);
        const candidates = away.length ? away : this.points;
        const first = nearest(candidates, { x: origin.x - this.tileSize * 4, y: origin.y + this.tileSize * 2 })!;
        const homes = [first];
        const remaining = new Map(candidates.filter((point) => point !== first).map((point) => [point, distance(point, first)]));
        while (homes.length < Math.min(count, candidates.length)) {
            let selected: FrogPoint | undefined, furthest = -1;
            for (const [point, separation] of remaining) if (separation > furthest) { selected = point; furthest = separation; }
            if (!selected) break;
            homes.push(selected); remaining.delete(selected);
            for (const [point, separation] of remaining) remaining.set(point, Math.min(separation, distance(point, selected)));
        }
        // A finite map can be dense for very long quizzes, but never silently caps the frog count.
        return Array.from({ length: count }, (_, index) => ({ ...homes[index % homes.length] }));
    }

    /** Prefer a free spot just outside the 32px start area, leaving the player/stairs clear. */
    landing(origin: FrogPoint, occupied: readonly FrogPoint[]): FrogPoint | null {
        const candidates = [...this.points].sort((a, b) => distance(a, origin) - distance(b, origin));
        const outside = candidates.filter((point) => Math.abs(point.x - origin.x) > this.tileSize || Math.abs(point.y - origin.y) > this.tileSize);
        return (outside.find((point) => occupied.every((other) => distance(point, other) >= this.tileSize * 0.8)) ?? outside[occupied.length % outside.length] ?? candidates[0]) || null;
    }

    /** A four-way route uses the same connected cells as the scatter; no tweening through props. */
    route(from: FrogPoint, to: FrogPoint): FrogPoint[] {
        const start = nearest(this.points, from), end = nearest(this.points, to);
        if (!start || !end) return [];
        const target = key(end, this.tileSize), first = key(start, this.tileSize);
        const previous = new Map<string, string | null>([[first, null]]), queue = [start];
        for (let i = 0; i < queue.length && !previous.has(target); i += 1) {
            for (const next of neighbors(queue[i], this.tileSize)) {
                const id = key(next, this.tileSize), point = this.#cells.get(id);
                if (point && !previous.has(id)) { previous.set(id, key(queue[i], this.tileSize)); queue.push(point); }
            }
        }
        if (!previous.has(target)) return [];
        const path: FrogPoint[] = [];
        for (let id: string | null = target; id !== null; id = previous.get(id) ?? null) path.push(this.#cells.get(id)!);
        return path.reverse();
    }
}

function nearest(points: readonly FrogPoint[], origin: FrogPoint): FrogPoint | undefined {
    return points.reduce<FrogPoint | undefined>((best, point) => !best || distance(point, origin) < distance(best, origin) ? point : best, undefined);
}
function neighbors(point: FrogPoint, size: number): FrogPoint[] {
    return [{ x: point.x - size, y: point.y }, { x: point.x + size, y: point.y }, { x: point.x, y: point.y - size }, { x: point.x, y: point.y + size }];
}

export function frogTravelDuration(path: readonly FrogPoint[]): number {
    return Math.max(650, Math.min(2200, routeLength(path) / 180 * 1000));
}
function routeLength(path: readonly FrogPoint[]): number {
    return path.slice(1).reduce((total, point, index) => total + distance(path[index], point), 0);
}
export function frogRoutePosition(path: readonly FrogPoint[], progress: number): FrogPoint & { dx: number; dy: number; traveled: number } {
    let left = routeLength(path) * Math.max(0, Math.min(1, progress));
    const traveled = left;
    for (let i = 1; i < path.length; i += 1) {
        const start = path[i - 1], end = path[i], length = distance(start, end);
        if (left <= length && length > 0) return { x: start.x + (end.x - start.x) * left / length, y: start.y + (end.y - start.y) * left / length,
            dx: end.x - start.x, dy: end.y - start.y, traveled };
        left -= length;
    }
    return { ...(path.at(-1) ?? { x: 0, y: 0 }), dx: 0, dy: 0, traveled };
}
