export type FrogPoint = { x: number; y: number };
export type FrogBounds = FrogPoint & { width: number; height: number };

export const FROG_NEIGHBORHOOD = { scatterMinTiles: 2, scatterMaxTiles: 4, gatheringMaxTiles: 2 } as const;
const distance = (a: FrogPoint, b: FrogPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const key = (point: FrogPoint, tileSize: number) => `${Math.floor(point.x / tileSize)},${Math.floor(point.y / tileSize)}`;
const center = (bounds: FrogBounds): FrogPoint => ({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
const inside = (point: FrogPoint, bounds: FrogBounds) => point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;

export function distanceFromHill(point: FrogPoint, hill: FrogBounds): number {
    return Math.hypot(Math.max(hill.x - point.x, 0, point.x - hill.x - hill.width), Math.max(hill.y - point.y, 0, point.y - hill.y - hill.height));
}

/** Derive the altar hill from its authored edge tiles, including diagonal corners. */
export function altarHillBounds(points: readonly FrogPoint[], tileSize: number, anchor: FrogPoint): FrogBounds | null {
    const cells = new Map(points.map((point) => [key(point, tileSize), point]));
    const start = nearest(points, anchor);
    if (!start) return null;
    const visited = new Set([key(start, tileSize)]), connected = [start];
    for (let i = 0; i < connected.length; i += 1) {
        for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
            const id = key({ x: connected[i].x + dx * tileSize, y: connected[i].y + dy * tileSize }, tileSize), point = cells.get(id);
            if (point && !visited.has(id)) { visited.add(id); connected.push(point); }
        }
    }
    const x = Math.min(...connected.map(point => point.x)) - tileSize / 2, y = Math.min(...connected.map(point => point.y)) - tileSize / 2;
    return { x, y, width: Math.max(...connected.map(point => point.x)) + tileSize / 2 - x, height: Math.max(...connected.map(point => point.y)) + tileSize / 2 - y };
}

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
        this.points = [...connected.values()].sort((a, b) => a.y - b.y || a.x - b.x);
    }

    /** A stable, local prefix: long quizzes get denser, not scattered to distant map corners. */
    scatter(count: number, hill: FrogBounds): FrogPoint[] {
        if (!this.points.length || count <= 0) return [];
        const outside = this.points.filter(point => !inside(point, hill));
        const nearby = outside.filter(point => distanceFromHill(point, hill) <= this.tileSize * FROG_NEIGHBORHOOD.scatterMaxTiles);
        const band = nearby.filter(point => distanceFromHill(point, hill) >= this.tileSize * FROG_NEIGHBORHOOD.scatterMinTiles);
        const candidates = band.length ? band : nearby.length ? nearby : [nearest(outside.length ? outside : this.points, center(hill))!];
        const first = nearest(candidates, { x: hill.x - this.tileSize * 3, y: hill.y + hill.height })!;
        const homes = [first];
        const remaining = new Map(candidates.filter(point => point !== first).map(point => [point, distance(point, first)]));
        while (homes.length < Math.min(count, candidates.length)) {
            let selected: FrogPoint | undefined, furthest = -1;
            for (const [point, separation] of remaining) if (separation > furthest) { selected = point; furthest = separation; }
            if (!selected) break;
            homes.push(selected); remaining.delete(selected);
            for (const [point, separation] of remaining) remaining.set(point, Math.min(separation, distance(point, selected)));
        }
        return Array.from({ length: count }, (_, index) => ({ ...homes[index % homes.length] }));
    }

    /** Fixed question-index slots around the hill, not around the player's current position. */
    gathering(count: number, hill: FrogBounds, startArea?: FrogBounds | null): FrogPoint[] {
        if (!this.points.length || count <= 0) return [];
        const entrance = startArea ? { x: startArea.x - this.tileSize, y: startArea.y, width: startArea.width + this.tileSize * 2, height: startArea.height + this.tileSize * 2 } : null;
        const outside = this.points.filter(point => !inside(point, hill) && (!entrance || !inside(point, entrance)));
        const ring = outside.filter(point => distanceFromHill(point, hill) <= this.tileSize * FROG_NEIGHBORHOOD.gatheringMaxTiles);
        const candidates = ring.length ? ring : outside.length ? [nearest(outside, center(hill))!] : [];
        if (!candidates.length) return [];
        const used = new Set<FrogPoint>(), origin = center(hill), slots: FrogPoint[] = [];
        for (let i = 0; i < count; i += 1) {
            const angle = -Math.PI + i * Math.PI * 2 / count, dx = Math.cos(angle), dy = Math.sin(angle);
            const radius = Math.min((hill.width / 2 + this.tileSize) / Math.max(0.0001, Math.abs(dx)), (hill.height / 2 + this.tileSize) / Math.max(0.0001, Math.abs(dy)));
            const target = { x: origin.x + dx * radius, y: origin.y + dy * radius };
            const point = nearest(candidates.filter(candidate => !used.has(candidate)), target) ?? nearest(candidates, target)!;
            used.add(point); slots.push({ ...point });
        }
        return slots;
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
