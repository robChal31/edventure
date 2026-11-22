/** Frequent small, staggered gusts; never a per-frame tween for the whole map. */
export const BREEZE_CONFIG = {
    firstMin: 700, firstMax: 1500,
    intervalMin: 1600, intervalMax: 3000,
    radius: 115, maxTargets: 20, stagger: 50,
} as const;
