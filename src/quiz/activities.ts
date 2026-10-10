import type { ActivityId } from "./types";

export type ActivityDefinition = {
    id: ActivityId;
    label: string;
    tagline: string;
    available: boolean;
};

/**
 * The registry of playable activities. Fishing is the first activity;
 * future activities register here without touching quiz/session logic.
 */
export const ACTIVITIES: ActivityDefinition[] = [
    {
        id: "fishing",
        label: "Fishing",
        tagline: "Cast your line — every correct answer reels in a fish.",
        available: true,
    },
];

export function getActivity(id: ActivityId): ActivityDefinition {
    return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
}
