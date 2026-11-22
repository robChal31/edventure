export type FrogPoint = { x: number; y: number };
export type FrogBounds = FrogPoint & { width: number; height: number };

type RouteCell = { point: FrogPoint; previous: string | null; steps: number };
export const FROG_NEIGHBORHOOD = { scatterMinTiles: 2, scatterMaxTiles: 4, gatheringMaxTiles: 2, gatheringDetourTiles: 2 } as const;
export const FROG_MOTION = { tilesPerSecond: 2.5, minDurationMs: 1100 } as const;
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

    constructor(points: readonly FrogPoint[], readonly tileSize: number, origin: FrogPoint, private blockers: readonly FrogBounds[] = []) {
        const safe = points.filter(point => !blockers.some(bounds => inside(point, bounds)));
        const cells = new Map(safe.map((point) => [key(point, tileSize), point]));
        const start = nearest(safe, origin);
        const connected = new Map<string, FrogPoint>();
        if (start) {
            const queue = [start]; connected.set(key(start, tileSize), start);
            for (let i = 0; i < queue.length; i += 1) {
                for (const next of neighbors(queue[i], tileSize)) {
                    const id = key(next, tileSize), point = cells.get(id);
                    if (point && !connected.has(id) && !this.#crossesBlocker(queue[i], point)) { connected.set(id, point); queue.push(point); }
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

    /** Reserve each frog's nearest reachable hill-side slot, never an arbitrary angle across the hill. */
    gathering(count: number, hill: FrogBounds, startArea?: FrogBounds | null): FrogPoint[] {
        if (!this.points.length || count <= 0) return [];
        const entrance = startArea ? { x: startArea.x - this.tileSize, y: startArea.y, width: startArea.width + this.tileSize * 2, height: startArea.height + this.tileSize * 2 } : null;
        const outside = this.points.filter(point => !inside(point, hill) && (!entrance || !inside(point, entrance)));
        const ring = outside.filter(point => distanceFromHill(point, hill) <= this.tileSize * FROG_NEIGHBORHOOD.gatheringMaxTiles);
        const candidates = ring.length ? ring : outside.length ? [nearest(outside, center(hill))!] : [];
        if (!candidates.length) return [];
        const used = new Map<FrogPoint, number>(), routes = new Map<string, Map<string, RouteCell>>();
        // Reserve all identities up front, including unanswered/wrong questions, so resume keeps gaps stable.
        return this.scatter(count, hill).map(home => {
            const id = key(home, this.tileSize);
            let reachable = routes.get(id);
            if (!reachable) { reachable = this.#walk(home); routes.set(id, reachable); }
            const ranked = candidates.map(point => ({ point, steps: reachable.get(key(point, this.tileSize))?.steps ?? Infinity }))
                .filter(candidate => Number.isFinite(candidate.steps))
                .sort((a, b) => a.steps - b.steps || distance(a.point, home) - distance(b.point, home) || distanceFromHill(a.point, hill) - distanceFromHill(b.point, hill));
            const closest = ranked[0];
            if (!closest) return { ...home }; // No animation/path dependency can block a question.
            const local = ranked.filter(candidate => candidate.steps <= closest.steps + FROG_NEIGHBORHOOD.gatheringDetourTiles);
            // Prefer a free local cell; if crowded, share nearby rather than orbiting to a distant free side.
            const free = local.find(({ point }) => !used.has(point));
            const selected = free ?? local.reduce((best, candidate) => (used.get(candidate.point) ?? 0) < (used.get(best.point) ?? 0) ? candidate : best);
            used.set(selected.point, (used.get(selected.point) ?? 0) + 1);
            return { ...selected.point };
        });
    }

    /** Shortest four-way route over the connected ground, including thin authored blockers between cells. */
    route(from: FrogPoint, to: FrogPoint): FrogPoint[] {
        const end = nearest(this.points, to);
        if (!end) return [];
        const target = key(end, this.tileSize), visited = this.#walk(from, target);
        if (!visited.has(target)) return [];
        const path: FrogPoint[] = [];
        for (let id: string | null = target; id !== null; id = visited.get(id)!.previous) path.push(visited.get(id)!.point);
        return path.reverse();
    }

    /** Remove unnecessary zigzags only when the entire segment is safe; never cut a cliff/prop corner. */
    travelRoute(from: FrogPoint, to: FrogPoint): FrogPoint[] {
        const path = this.route(from, to);
        if (path.length < 3) return path;
        const smooth = [path[0]];
        for (let i = 0; i < path.length - 1;) {
            let next = path.length - 1;
            while (next > i + 1 && !this.#clearSegment(path[i], path[next])) next -= 1;
            smooth.push(path[next]); i = next;
        }
        return smooth;
    }

    #walk(from: FrogPoint, target?: string): Map<string, RouteCell> {
        const start = nearest(this.points, from), visited = new Map<string, RouteCell>();
        if (!start) return visited;
        visited.set(key(start, this.tileSize), { point: start, previous: null, steps: 0 });
        const queue = [start];
        for (let i = 0; i < queue.length && (!target || !visited.has(target)); i += 1) {
            const previous = key(queue[i], this.tileSize), steps = visited.get(previous)!.steps + 1;
            for (const next of neighbors(queue[i], this.tileSize)) {
                const id = key(next, this.tileSize), point = this.#cells.get(id);
                if (point && !visited.has(id) && !this.#crossesBlocker(queue[i], point)) {
                    visited.set(id, { point, previous, steps }); queue.push(point);
                }
            }
        }
        return visited;
    }
    #crossesBlocker(from: FrogPoint, to: FrogPoint): boolean { return this.blockers.some(bounds => segmentTouchesBounds(from, to, bounds)); }
    #clearSegment(from: FrogPoint, to: FrogPoint): boolean {
        if (this.#crossesBlocker(from, to)) return false;
        const size = this.tileSize;
        // Supercover check: even a diagonal touching a blocked cell's corner is rejected.
        for (let y = Math.floor(Math.min(from.y, to.y) / size); y <= Math.floor(Math.max(from.y, to.y) / size); y += 1) {
            for (let x = Math.floor(Math.min(from.x, to.x) / size); x <= Math.floor(Math.max(from.x, to.x) / size); x += 1) {
                if (!this.#cells.has(`${x},${y}`) && segmentTouchesBounds(from, to, { x: x * size, y: y * size, width: size, height: size })) return false;
            }
        }
        return true;
    }
}

function nearest(points: readonly FrogPoint[], origin: FrogPoint): FrogPoint | undefined {
    return points.reduce<FrogPoint | undefined>((best, point) => !best || distance(point, origin) < distance(best, origin) ? point : best, undefined);
}
function neighbors(point: FrogPoint, size: number): FrogPoint[] {
    return [{ x: point.x - size, y: point.y }, { x: point.x + size, y: point.y }, { x: point.x, y: point.y - size }, { x: point.x, y: point.y + size }];
}
function segmentTouchesBounds(from: FrogPoint, to: FrogPoint, bounds: FrogBounds): boolean {
    let enter = 0, exit = 1;
    for (const axis of ["x", "y"] as const) {
        const delta = to[axis] - from[axis], min = bounds[axis], max = min + (axis === "x" ? bounds.width : bounds.height);
        if (delta === 0) { if (from[axis] < min || from[axis] > max) return false; }
        else {
            const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
            enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
            if (enter > exit) return false;
        }
    }
    return true;
}

/** No upper time cap that would accelerate a longer route. Sine easing supplies a gentle start/stop. */
export function frogTravelDuration(path: readonly FrogPoint[], tileSize = 16): number {
    return Math.max(FROG_MOTION.minDurationMs, routeLength(path) / (tileSize * FROG_MOTION.tilesPerSecond) * 1000);
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
