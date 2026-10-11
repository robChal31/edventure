import type { SurfaceHit } from "@/game/world/water/water-surface";

/** Player-facing text for the fishing activity. */

const OBSTACLE_NAMES: Array<[RegExp, string]> = [
    [/^boat/, "the boat"],
    [/^canoe/, "the canoe"],
    [/^water_stone/, "a rock"],
    [/^(coconut|palm)/, "a palm tree"],
    [/house/, "the house"],
    [/tent/, "the tent"],
    [/bench/, "a bench"],
    [/lamp/, "the street lamp"],
    [/(barrel|crate)/, "a crate"],
    [/pole/, "the fishing pole"],
];

export function describeObstacle(name: string): string {
    const match = OBSTACLE_NAMES.find(([pattern]) => pattern.test(name));
    if (match) return match[1];
    const readable = name.replace(/[_-]+/g, " ").replace(/\d+$/, "").trim();
    return readable ? `the ${readable}` : "something";
}

/** Why a cast did not count, with a hint. Empty for water. */
export function missMessage(hit: SurfaceHit): string {
    switch (hit.kind) {
        case "land":
            return "Plop! The bait landed on the sand. Face the water and cast again.";
        case "shore":
            return "Too close to the shore — the bait hit the sand. Aim a bit further out!";
        case "bridge":
            return "Thunk! The bait hit the pier. Aim for open water.";
        case "obstacle":
            return `Bonk! The bait hit ${describeObstacle(hit.name)}. Try another spot.`;
        case "outside":
            return "That's too far! Aim for the water.";
        case "water":
            return "";
    }
}

export const FISHING_TEXT = {
    idle: (questionNumber: number, total: number) =>
        `Question ${questionNumber} of ${total} — face the water and press F (or Space / CAST).`,
    waiting: "Waiting for a bite… press F to reel in.",
    reeledIn: "Reeled in. Cast again whenever you're ready!",
    correct: "Correct! You caught a fish!",
    incorrect: "Not quite — the fish got away!",
    gotAway: "It got away!",
} as const;
