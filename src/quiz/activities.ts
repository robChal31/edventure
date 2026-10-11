import type { ActivityId } from "./types";

export type ActivityDefinition = {
    id: ActivityId;
    label: string;
    icon: string;
    /** Where in the world the activity happens (display only). */
    location: string;
    tagline: string;
    available: boolean;
};

/**
 * The registry of playable activities. Fishing is the first activity;
 * future activities register here without touching quiz/session logic.
 * (Which map hosts an activity is decided by the game, see
 * `src/game/activities/activity-registry.ts`.)
 */
export const ACTIVITIES: ActivityDefinition[] = [
    {
        id: "fishing",
        label: "Fishing",
        icon: "🎣",
        location: "Beach",
        tagline: "Cast your line — every correct answer reels in a fish.",
        available: true,
    },
];

export function getActivity(id: ActivityId): ActivityDefinition {
    return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
}
