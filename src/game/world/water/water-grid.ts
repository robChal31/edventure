/**
 * Phaser-free model of where the water is on a tile map.
 *
 * A cell is:
 *  - WATER   when any layer defined as water has a tile there and no
 *            over-water layer (bridge / pier) covers it,
 *  - BRIDGE  when an over-water layer covers it (whatever is underneath),
 *  - LAND    otherwise.
 *
 * Shore tiles have sand painted into the water tile, so a WATER cell also
 * has a thin "shore band" along edges that touch LAND.
 *
 * Fish may only be where the water is "open": a WATER cell, not covered by
 * an obstacle (boat, rock, ...), whose 8 neighbours are WATER too. Their
 * whole footprint must stay inside open cells, so a fish sprite can never
 * overlap sand, a bridge or an object — even while moving.
 */

export type Point = { x: number; y: number };

export type SurfaceKind = "water" | "shore" | "land" | "bridge" | "outside";

/** Half extents of a fish sprite (world px). */
export type Footprint = { halfWidth: number; halfHeight: number };

export const CELL_LAND = 0;
export const CELL_WATER = 1;
export const CELL_BRIDGE = 2;

export type CellKind = typeof CELL_LAND | typeof CELL_WATER | typeof CELL_BRIDGE;

export type WaterGridSource = {
    cols: number;
    rows: number;
    /** World size of a cell (already scaled). */
    cellWidth: number;
    cellHeight: number;
    hasWater(col: number, row: number): boolean;
    hasOverWater(col: number, row: number): boolean;
};

export type CellInfo = {
    col: number;
    row: number;
    kind: CellKind;
    open: boolean;
    blocked: boolean;
};

const NEIGHBOURS_8: ReadonlyArray<readonly [number, number]> = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
];

export class WaterGrid {
    readonly cols: number;
    readonly rows: number;
    readonly cellWidth: number;
    readonly cellHeight: number;

    readonly #kinds: Uint8Array;
    readonly #blocked: Uint8Array;
    #open: Uint8Array | null = null;
    #openCells: number[] | null = null;

    constructor(
        cols: number,
        rows: number,
        cellWidth: number,
        cellHeight: number,
        kinds: Uint8Array
    ) {
        this.cols = cols;
        this.rows = rows;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.#kinds = kinds;
        this.#blocked = new Uint8Array(cols * rows);
    }

    static fromSource(source: WaterGridSource): WaterGrid {
        const { cols, rows } = source;
        const kinds = new Uint8Array(cols * rows);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let kind: CellKind = CELL_LAND;
                if (source.hasOverWater(col, row)) {
                    kind = CELL_BRIDGE;
                } else if (source.hasWater(col, row)) {
                    kind = CELL_WATER;
                }
                kinds[row * cols + col] = kind;
            }
        }

        return new WaterGrid(cols, rows, source.cellWidth, source.cellHeight, kinds);
    }

    // ─────────────────────────────────────────
    // Cells
    // ─────────────────────────────────────────

    public inBounds(col: number, row: number): boolean {
        return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
    }

    public kindAt(col: number, row: number): CellKind | null {
        if (!this.inBounds(col, row)) return null;
        return this.#kinds[row * this.cols + col] as CellKind;
    }

    public isWaterCell(col: number, row: number): boolean {
        return this.kindAt(col, row) === CELL_WATER;
    }

    public isBlockedCell(col: number, row: number): boolean {
        return this.inBounds(col, row) && this.#blocked[row * this.cols + col] === 1;
    }

    public isOpenCell(col: number, row: number): boolean {
        if (!this.inBounds(col, row)) return false;
        return this.#getOpen()[row * this.cols + col] === 1;
    }

    public get openCellCount(): number {
        return this.#getOpenCells().length;
    }

    public get hasOpenWater(): boolean {
        return this.openCellCount > 0;
    }

    public colAt(x: number): number {
        return Math.floor(x / this.cellWidth);
    }

    public rowAt(y: number): number {
        return Math.floor(y / this.cellHeight);
    }

    /** Marks every cell touched by a world rectangle as covered by an obstacle. */
    public blockRect(x: number, y: number, width: number, height: number): void {
        if (width <= 0 || height <= 0) return;

        const startCol = Math.max(0, this.colAt(x));
        const endCol = Math.min(this.cols - 1, this.colAt(x + width - 0.001));
        const startRow = Math.max(0, this.rowAt(y));
        const endRow = Math.min(this.rows - 1, this.rowAt(y + height - 0.001));

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                this.#blocked[row * this.cols + col] = 1;
            }
        }

        this.#open = null;
        this.#openCells = null;
    }

    /** True when a world rectangle touches at least one WATER cell. */
    public rectTouchesWater(x: number, y: number, width: number, height: number): boolean {
        const startCol = Math.max(0, this.colAt(x));
        const endCol = Math.min(this.cols - 1, this.colAt(x + width - 0.001));
        const startRow = Math.max(0, this.rowAt(y));
        const endRow = Math.min(this.rows - 1, this.rowAt(y + height - 0.001));

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (this.isWaterCell(col, row)) return true;
            }
        }
        return false;
    }

    public forEachCell(callback: (cell: CellInfo) => void): void {
        const open = this.#getOpen();
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                callback({
                    col,
                    row,
                    kind: this.#kinds[index] as CellKind,
                    open: open[index] === 1,
                    blocked: this.#blocked[index] === 1,
                });
            }
        }
    }

    // ─────────────────────────────────────────
    // Surface probe (where did the bait land?)
    // ─────────────────────────────────────────

    /**
     * What is at a world point. `shoreBand` is the fraction of a cell
     * (0–0.5) next to LAND that still counts as painted sand.
     */
    public surfaceAt(x: number, y: number, shoreBand = 0.375): SurfaceKind {
        const col = this.colAt(x);
        const row = this.rowAt(y);
        const kind = this.kindAt(col, row);

        if (kind === null) return "outside";
        if (kind === CELL_BRIDGE) return "bridge";
        if (kind === CELL_LAND) return "land";

        const fx = x / this.cellWidth - col;
        const fy = y / this.cellHeight - row;
        const left = fx < shoreBand;
        const right = fx > 1 - shoreBand;
        const top = fy < shoreBand;
        const bottom = fy > 1 - shoreBand;

        const isLand = (c: number, r: number) => this.kindAt(c, r) === CELL_LAND;

        if (
            (left && isLand(col - 1, row)) ||
            (right && isLand(col + 1, row)) ||
            (top && isLand(col, row - 1)) ||
            (bottom && isLand(col, row + 1)) ||
            (left && top && isLand(col - 1, row - 1)) ||
            (right && top && isLand(col + 1, row - 1)) ||
            (left && bottom && isLand(col - 1, row + 1)) ||
            (right && bottom && isLand(col + 1, row + 1))
        ) {
            return "shore";
        }

        return "water";
    }

    // ─────────────────────────────────────────
    // Fish placement
    // ─────────────────────────────────────────

    /** The whole footprint centred on (x, y) lies inside open water. */
    public isFishSafe(x: number, y: number, footprint: Footprint): boolean {
        const { halfWidth, halfHeight } = footprint;

        // Sample spacing below one cell guarantees no cell slips between samples.
        const stepsX = Math.max(1, Math.ceil((halfWidth * 2) / (this.cellWidth * 0.9)));
        const stepsY = Math.max(1, Math.ceil((halfHeight * 2) / (this.cellHeight * 0.9)));

        for (let iy = 0; iy <= stepsY; iy++) {
            const sy = y - halfHeight + (halfHeight * 2 * iy) / stepsY;
            for (let ix = 0; ix <= stepsX; ix++) {
                const sx = x - halfWidth + (halfWidth * 2 * ix) / stepsX;
                if (!this.isOpenCell(this.colAt(sx), this.rowAt(sy))) {
                    return false;
                }
            }
        }

        return true;
    }

    /** A fish can swim in a straight line from `from` to `to`. */
    public isSwimPathClear(from: Point, to: Point, footprint: Footprint): boolean {
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const step = Math.min(this.cellWidth, this.cellHeight) / 3;
        const steps = Math.max(1, Math.ceil(distance / step));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            if (!this.isFishSafe(x, y, footprint)) {
                return false;
            }
        }

        return true;
    }

    /** Random fish-safe point anywhere in open water. */
    public randomFishPoint(
        footprint: Footprint,
        random: () => number = Math.random,
        attempts = 40
    ): Point | null {
        const cells = this.#getOpenCells();
        if (cells.length === 0) return null;

        for (let i = 0; i < attempts; i++) {
            const index = cells[Math.floor(random() * cells.length)];
            const col = index % this.cols;
            const row = Math.floor(index / this.cols);
            const point = {
                x: (col + 0.15 + random() * 0.7) * this.cellWidth,
                y: (row + 0.15 + random() * 0.7) * this.cellHeight,
            };
            if (this.isFishSafe(point.x, point.y, footprint)) {
                return point;
            }
        }

        return null;
    }

    /**
     * Random fish-safe point between `minDistance` and `maxDistance` from
     * `origin` that can be reached from (or reach) `origin` in a straight,
     * all-water line.
     */
    public randomReachablePoint(
        origin: Point,
        footprint: Footprint,
        minDistance: number,
        maxDistance: number,
        random: () => number = Math.random,
        attempts = 48
    ): Point | null {
        for (let i = 0; i < attempts; i++) {
            const angle = random() * Math.PI * 2;
            const distance = minDistance + random() * (maxDistance - minDistance);
            const point = {
                x: origin.x + Math.cos(angle) * distance,
                y: origin.y + Math.sin(angle) * distance,
            };

            if (
                this.isFishSafe(point.x, point.y, footprint) &&
                this.isSwimPathClear(point, origin, footprint)
            ) {
                return point;
            }
        }

        return null;
    }

    /** The fish-safe point nearest to `target` within `maxDistance`. */
    public nearestFishPoint(
        target: Point,
        footprint: Footprint,
        maxDistance: number
    ): Point | null {
        if (this.isFishSafe(target.x, target.y, footprint)) {
            return { ...target };
        }

        const ringStep = 3;
        for (let radius = ringStep; radius <= maxDistance; radius += ringStep) {
            const samples = Math.max(8, Math.round((Math.PI * 2 * radius) / ringStep));
            for (let i = 0; i < samples; i++) {
                const angle = (i / samples) * Math.PI * 2;
                const point = {
                    x: target.x + Math.cos(angle) * radius,
                    y: target.y + Math.sin(angle) * radius,
                };
                if (this.isFishSafe(point.x, point.y, footprint)) {
                    return point;
                }
            }
        }

        return null;
    }

    // ─────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────

    #getOpen(): Uint8Array {
        if (this.#open) return this.#open;

        const open = new Uint8Array(this.cols * this.rows);

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                if (this.#kinds[index] !== CELL_WATER || this.#blocked[index] === 1) {
                    continue;
                }

                const surrounded = NEIGHBOURS_8.every(([dx, dy]) =>
                    this.isWaterCell(col + dx, row + dy)
                );

                if (surrounded) open[index] = 1;
            }
        }

        this.#open = open;
        return open;
    }

    #getOpenCells(): number[] {
        if (this.#openCells) return this.#openCells;

        const open = this.#getOpen();
        const cells: number[] = [];
        open.forEach((value, index) => {
            if (value === 1) cells.push(index);
        });

        this.#openCells = cells;
        return cells;
    }
}
